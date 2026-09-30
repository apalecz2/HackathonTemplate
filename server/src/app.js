import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { env } from './env.js';
import { requireAuth } from './middleware/requireAuth.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import health from './routes/health.js';
import datasets from './routes/datasets.js';
import query from './routes/query.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1); // behind Render's proxy
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN.split(',').map((s) => s.trim()) }));
  app.use(express.json({ limit: '100kb' }));
  if (env.NODE_ENV !== 'test') app.use(morgan('dev'));

  app.use('/api/health', health);

  // Everything below requires a valid Supabase session token.
  app.use('/api/datasets', requireAuth, datasets);
  app.use(
    '/api/query',
    requireAuth,
    rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: true, legacyHeaders: false }),
    query,
  );
  app.use('/api', notFound);

  // Optional: serve the built React app from the API (single-host deploy).
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}

// Vercel runs this file as the serverless entrypoint and needs the app as the default export.
// Locally, src/index.js imports createApp and calls listen().
export default createApp();
