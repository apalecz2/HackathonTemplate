import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { assertReadOnlySql } from '../lib/sqlGuard.js';
import { HttpError, wrap } from '../middleware/errorHandler.js';

const router = Router();
const ROW_LIMIT = 1000;

// Examples written for db/seed/sample.csv (orders). {{table}} is replaced by the client.
const SAVED = [
  {
    title: 'Revenue by region (GROUP BY + HAVING)',
    sql: `SELECT region, COUNT(*) AS orders, ROUND(SUM(quantity * unit_price), 2) AS revenue
FROM {{table}}
GROUP BY region
HAVING COUNT(*) > 5
ORDER BY revenue DESC`,
  },
  {
    title: 'Average order value by region (CTE)',
    sql: `WITH order_totals AS (
  SELECT region, quantity * unit_price AS total FROM {{table}}
)
SELECT region, ROUND(AVG(total), 2) AS avg_order_value
FROM order_totals
GROUP BY region
ORDER BY avg_order_value DESC`,
  },
  {
    title: 'Monthly revenue (date_trunc)',
    sql: `SELECT date_trunc('month', order_date)::date AS month,
       ROUND(SUM(quantity * unit_price), 2) AS revenue
FROM {{table}}
GROUP BY 1
ORDER BY 1`,
  },
  {
    title: 'Top product per region (window function)',
    sql: `SELECT region, product, revenue FROM (
  SELECT region, product,
         ROUND(SUM(quantity * unit_price), 2) AS revenue,
         RANK() OVER (PARTITION BY region ORDER BY SUM(quantity * unit_price) DESC) AS rnk
  FROM {{table}}
  GROUP BY region, product
) ranked
WHERE rnk = 1
ORDER BY region`,
  },
  {
    title: 'Order status mix (CASE WHEN + NULLs)',
    sql: `SELECT CASE WHEN status = 'completed' THEN 'Completed'
            WHEN status IS NULL THEN 'Unknown'
            ELSE 'Not completed' END AS outcome,
       COUNT(*) AS orders
FROM {{table}}
GROUP BY 1`,
  },
];

router.get('/saved', (req, res) => res.json(SAVED));

const bodySchema = z.object({ sql: z.string() });

router.post('/', wrap(async (req, res) => {
  const { sql } = bodySchema.parse(req.body);
  const statement = assertReadOnlySql(sql);

  const client = await pool.connect();
  try {
    await client.query('BEGIN READ ONLY');
    // Drop to a role that can only read the uploads schema, cap runtime, and default to uploads.
    await client.query('SET LOCAL ROLE app_readonly');
    await client.query("SET LOCAL statement_timeout = '5s'");
    await client.query('SET LOCAL search_path = uploads');
    // Newlines around the statement so a trailing "-- comment" can't swallow the closing paren.
    const result = await client.query(`SELECT * FROM (\n${statement}\n) AS q LIMIT ${ROW_LIMIT + 1}`);
    await client.query('ROLLBACK');
    const truncated = result.rows.length > ROW_LIMIT;
    res.json({
      columns: result.fields.map((f) => f.name),
      rows: truncated ? result.rows.slice(0, ROW_LIMIT) : result.rows,
      truncated,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    // Postgres error classes 42 (syntax/permission), 22 (data), 57 (timeout), 0A are user-SQL problems.
    if (err.code && /^(42|22|57|0A)/.test(err.code)) throw new HttpError(400, err.message);
    throw err;
  } finally {
    client.release();
  }
}));

export default router;
