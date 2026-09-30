import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { pool, query, withTransaction } from '../db/pool.js';
import { parseCsv } from '../lib/csv.js';
import { HttpError, wrap } from '../middleware/errorHandler.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const nameSchema = z.string().trim().min(1).max(100);
const idSchema = z.coerce.number().int().positive();

router.get('/', wrap(async (req, res) => {
  const { rows } = await query(
    'SELECT id, name, table_name, columns, row_count, owner_id, created_at FROM datasets ORDER BY created_at DESC',
  );
  res.json(rows);
}));

router.post('/', upload.single('file'), wrap(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Attach a CSV file in the "file" field');
  const name = nameSchema.parse(req.body.name || req.file.originalname.replace(/\.csv$/i, ''));
  const { columns, rows } = parseCsv(req.file.buffer);

  const dataset = await withTransaction(async (client) => {
    const { rows: [{ id }] } = await client.query("SELECT nextval('datasets_id_seq') AS id");
    const tableName = `ds_${id}`;
    // Column names were sanitized to [a-z0-9_] in lib/csv.js, and types come from a fixed set,
    // so interpolating them into DDL is safe. Values always go through parameters.
    const colDefs = columns.map((c) => `"${c.name}" ${c.type}`).join(', ');
    await client.query(`CREATE TABLE uploads."${tableName}" (${colDefs})`);

    const batchSize = Math.max(1, Math.floor(60000 / columns.length));
    const colList = columns.map((c) => `"${c.name}"`).join(', ');
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const placeholders = batch
        .map((_, r) => `(${columns.map((__, c) => `$${r * columns.length + c + 1}`).join(', ')})`)
        .join(', ');
      try {
        await client.query(
          `INSERT INTO uploads."${tableName}" (${colList}) VALUES ${placeholders}`,
          batch.flat(),
        );
      } catch (err) {
        throw new HttpError(400, `Could not load CSV data: ${err.message}`);
      }
    }

    const { rows: [created] } = await client.query(
      `INSERT INTO datasets (id, name, table_name, columns, row_count, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, name, tableName, JSON.stringify(columns), rows.length, req.user.id],
    );
    return created;
  });

  res.status(201).json(dataset);
}));

router.get('/:id', wrap(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const { rows: [dataset] } = await query('SELECT * FROM datasets WHERE id = $1', [id]);
  if (!dataset) throw new HttpError(404, 'Dataset not found');
  const preview = await pool.query(`SELECT * FROM uploads."${dataset.table_name}" LIMIT 100`);
  res.json({ ...dataset, preview: preview.rows });
}));

router.delete('/:id', wrap(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const { rows: [dataset] } = await query('SELECT * FROM datasets WHERE id = $1', [id]);
  if (!dataset) throw new HttpError(404, 'Dataset not found');
  if (dataset.owner_id !== req.user.id) throw new HttpError(403, 'Only the uploader can delete this dataset');
  await withTransaction(async (client) => {
    await client.query(`DROP TABLE IF EXISTS uploads."${dataset.table_name}"`);
    await client.query('DELETE FROM datasets WHERE id = $1', [id]);
  });
  res.status(204).end();
}));

export default router;
