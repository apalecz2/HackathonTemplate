import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

// Liveness: always 200 if the process is up (Render uses this).
router.get('/', (req, res) => res.json({ status: 'ok' }));

// Readiness: also checks the database.
router.get('/db', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', db: 'up' });
  } catch {
    res.status(503).json({ status: 'error', db: 'down' });
  }
});

export default router;
