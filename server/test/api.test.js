import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.SKIP_ENV_CHECK = '1';
process.env.NODE_ENV = 'test';

const { default: request } = await import('supertest');
const { createApp } = await import('../src/app.js');
const { assertReadOnlySql } = await import('../src/lib/sqlGuard.js');
const { parseCsv, inferType, sanitizeHeaders } = await import('../src/lib/csv.js');

const app = createApp();

test('GET /api/health is public', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});

test('protected routes reject missing or bad tokens', async () => {
  assert.equal((await request(app).get('/api/datasets')).status, 401);
  const bad = await request(app).post('/api/query').set('Authorization', 'Bearer nope').send({ sql: 'select 1' });
  assert.equal(bad.status, 401);
});

test('unknown API routes 404 as JSON', async () => {
  const res = await request(app).get('/api/nope');
  assert.equal(res.status, 404);
  assert.ok(res.body.error);
});

test('sqlGuard allows selects and rejects everything else', () => {
  assert.equal(assertReadOnlySql('SELECT 1;'), 'SELECT 1');
  assert.ok(assertReadOnlySql('with a as (select 1) select * from a'));
  for (const bad of ['DROP TABLE x', 'DELETE FROM x', 'select 1; drop table x', '', 'update x set a=1']) {
    assert.throws(() => assertReadOnlySql(bad), /allowed|empty/i);
  }
});

test('csv parsing infers types and sanitizes headers', () => {
  const csv = 'Order ID,Order Date,Price,Zip,Paid,Note\n1,2024-01-05,9.5,01234,true,hi\n2,2024-02-01,10,02345,false,\n';
  const { columns, rows } = parseCsv(Buffer.from(csv));
  assert.deepEqual(columns.map((c) => [c.name, c.type]), [
    ['order_id', 'bigint'], ['order_date', 'date'], ['price', 'numeric'],
    ['zip', 'text'], ['paid', 'boolean'], ['note', 'text'],
  ]);
  assert.equal(rows[1][5], null);
  assert.deepEqual(sanitizeHeaders(['A', 'a', '']), ['a', 'a_2', 'col_3']);
  assert.equal(inferType(['1', '2.5']), 'numeric');
});
