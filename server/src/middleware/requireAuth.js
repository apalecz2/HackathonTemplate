import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from '../env.js';

// New Supabase projects sign JWTs with an asymmetric key (verify via JWKS).
// Legacy projects use a shared HS256 secret. Support both.
const secret = env.SUPABASE_JWT_SECRET ? new TextEncoder().encode(env.SUPABASE_JWT_SECRET) : null;
const jwks = secret
  ? null
  : createRemoteJWKSet(new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`));

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });

  try {
    const { payload } = secret ? await jwtVerify(token, secret) : await jwtVerify(token, jwks);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
