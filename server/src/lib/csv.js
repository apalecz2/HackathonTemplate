import { parse } from 'csv-parse/sync';
import { HttpError } from '../middleware/errorHandler.js';

const MAX_COLUMNS = 100;

/** snake_case-ify headers into safe, unique Postgres identifiers. */
export function sanitizeHeaders(headers) {
  const seen = new Map();
  return headers.map((raw, i) => {
    let name = String(raw).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (!name) name = `col_${i + 1}`;
    if (/^\d/.test(name)) name = `c_${name}`;
    name = name.slice(0, 50);
    const n = (seen.get(name) || 0) + 1;
    seen.set(name, n);
    return n > 1 ? `${name}_${n}` : name;
  });
}

const isBlank = (v) => v === '' || v === null || v === undefined;

export function inferType(values) {
  const vals = values.filter((v) => !isBlank(v)).map((v) => String(v).trim());
  if (vals.length === 0) return 'text';
  if (vals.every((v) => /^(true|false)$/i.test(v))) return 'boolean';
  // Leading zeros (zip codes, ids like "007") must stay text.
  if (vals.every((v) => /^-?(0|[1-9]\d{0,14})$/.test(v))) return 'bigint';
  if (vals.every((v) => /^-?(0|[1-9]\d*)?\.?\d+([eE][-+]?\d+)?$/.test(v) && !/^-?0\d/.test(v))) return 'numeric';
  if (vals.every((v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)))) return 'date';
  if (vals.every((v) => /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(v) && !Number.isNaN(Date.parse(v)))) return 'timestamptz';
  return 'text';
}

/** Parse a CSV buffer into { columns: [{name,type}], rows: any[][] }. */
export function parseCsv(buffer) {
  let records;
  try {
    records = parse(buffer, { bom: true, skip_empty_lines: true, relax_column_count: true, trim: true });
  } catch (err) {
    throw new HttpError(400, `Could not parse CSV: ${err.message}`);
  }
  if (records.length < 2) throw new HttpError(400, 'CSV needs a header row and at least one data row');

  const [header, ...body] = records;
  if (header.length > MAX_COLUMNS) throw new HttpError(400, `Too many columns (max ${MAX_COLUMNS})`);

  const names = sanitizeHeaders(header);
  const columns = names.map((name, i) => ({ name, type: inferType(body.map((r) => r[i])) }));
  const rows = body.map((r) => names.map((_, i) => (isBlank(r[i]) ? null : r[i])));
  return { columns, rows };
}
