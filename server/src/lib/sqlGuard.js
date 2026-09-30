import { HttpError } from '../middleware/errorHandler.js';

/**
 * Friendly pre-check for user SQL. The real safety net is the read-only transaction
 * and the app_readonly role (see routes/query.js); this just gives clear error messages.
 * Returns the statement without trailing semicolons.
 */
export function assertReadOnlySql(sql) {
  const cleaned = String(sql || '').trim().replace(/;+\s*$/, '');
  if (!cleaned) throw new HttpError(400, 'Query is empty');
  if (cleaned.length > 5000) throw new HttpError(400, 'Query is too long');
  if (cleaned.includes(';')) throw new HttpError(400, 'Only a single statement is allowed');
  if (!/^(select|with|values|table)\b/i.test(cleaned)) {
    throw new HttpError(400, 'Only SELECT queries (including WITH ... SELECT) are allowed');
  }
  return cleaned;
}
