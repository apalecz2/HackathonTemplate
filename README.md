# Hackathon Template: React + Express + Supabase

A working full-stack skeleton: auth, Postgres, a REST API and a React UI. The included **Data Explorer** example (upload a CSV, query it with SQL, see a table and chart) is meant to be modified or deleted.

```
client/   Vite + React app
server/   Express API, SQL migrations, sample data
docs/     Notes
```

## Setup

### 1. Install

```
npm install
```

This installs both the client and server (npm workspaces).

### 2. Create a Supabase project

Create a free project at [supabase.com](https://supabase.com). When asked about the Data API options:

- Enable Data API: on
- Automatically expose new tables: off
- Enable automatic RLS: on

Then collect these values:

| Value | Where to find it |
|---|---|
| Project URL | Project Settings > API |
| anon / publishable key | Project Settings > API |
| Database connection string | Click **Connect** > **Session pooler** URI |

Use the **Session pooler** string (`...pooler.supabase.com:5432`), not the Direct connection. The direct host is IPv6-only on the free tier and fails on many networks. Replace `[YOUR-PASSWORD]` with your database password (no square brackets; URL-encode special characters).

Optionally, under Authentication > Providers > Email, turn off "Confirm email" so new accounts can sign in immediately.

### 3. Configure environment variables

```
cp .env.example .env
```

Fill in `.env`. One file at the repo root is used by both the client and the server. Variables are documented in `.env.example`.

### 4. Create the database tables

```
npm run db:migrate
```

### 5. Run it

```
npm run dev
```

- Client: http://localhost:5173
- API: http://localhost:4000 (health check at `/api/health`)

Sign up, open **Upload**, upload `server/db/seed/sample.csv`, and try the example queries.

### Tests

```
npm test
```

Runs the API tests. They need no database or credentials.

## Deploy (Vercel + Supabase, free tiers)

The repo root `vercel.json` defines one Vercel project with two services on a single domain:

| Service | Root | Public path | Notes |
|---|---|---|---|
| `client` | `client/` | `/*` (everything else) | Vite build, with a fallback to `index.html` for client-side routes |
| `server` | `server/` | `/api/*` | Express app exported from `server/src/app.js`; receives the original `/api/...` path |

The browser and the API share a domain, so the client calls `/api/...` directly. No service-to-service calls exist, so no bindings are configured.

1. Import the GitHub repo in Vercel (repo root as the project root).
2. Add these environment variables to the project: `DATABASE_URL` (Session pooler string), `SUPABASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `CLIENT_ORIGIN` (your Vercel URL), and `SUPABASE_JWT_SECRET` only for legacy projects. Leave `VITE_API_URL` unset.
3. Run `npm run db:migrate` once from your machine against the Supabase database.
4. Add your Vercel URL in Supabase under Authentication > URL Configuration > Site URL.

`npm run dev` still works for local development (API on 4000, Vite proxying `/api`). `vercel dev` runs both services together the way production does.

Free-tier limitations:
- Supabase free projects pause after about a week of inactivity and must be resumed from the dashboard.
- Each serverless instance keeps its own small DB pool (2 connections on Vercel) to stay under Supabase's pooler limit.

## Updating the code

**Add an API endpoint**
1. Create `server/src/routes/thing.js` exporting an Express `Router`.
2. Mount it in `server/src/app.js`. Put `requireAuth` in front of it if it needs a logged-in user; the user is then available as `req.user.id` and `req.user.email`.
3. Wrap async handlers in `wrap(...)` (from `middleware/errorHandler.js`) so errors return a JSON error response.
4. Validate input with `zod`. Throw `new HttpError(status, message)` for expected failures.

**Change the database**
1. Add a new numbered file, e.g. `server/db/migrations/002_add_thing.sql`. Files run in filename order and each runs once.
2. Run `npm run db:migrate`.
3. Query from routes with `query(sql, params)` from `server/src/db/pool.js`. Always pass values as parameters (`$1`, `$2`), never by string concatenation. Use `withTransaction(fn)` for multi-step writes.
4. New tables in `public` are not reachable from the browser's Supabase API by default (see the Supabase settings above). Access data through your Express API.

**Add a page**
1. Create `client/src/pages/Thing.jsx`.
2. Add a `<Route>` for it in `client/src/App.jsx`, inside the `ProtectedRoute` block if it requires login, and a link in `components/Layout.jsx`.
3. Call the API with `api('/thing')` from `client/src/lib/api.js`. It attaches the auth token and throws an `Error` with the server's message on failure.
4. Get the current user and sign-out with `useAuth()` from `context/AuthContext.jsx`.

**Add an environment variable**
Add it to `.env` and `.env.example`. Server variables go through the schema in `server/src/env.js`, which stops the app at startup with a clear message if one is missing. Client variables must be prefixed `VITE_` and are visible in the browser, so never put secrets in them.

**Replace or remove the Data Explorer example**
Delete `client/src/pages/Dashboard.jsx` and `Upload.jsx`, `client/src/components/DataTable.jsx` and `ResultChart.jsx`, and `server/src/routes/datasets.js` and `query.js`. Then remove their routes from `client/src/App.jsx` and `server/src/app.js`. Auth, layout, the API helper, migrations and error handling stay. You can also delete the `uploads` schema and `app_readonly` role setup from `001_init.sql` if you start from a fresh database.

## Stack and services

**Frontend** (`client/`)
- React 18 with Vite (dev server, production build)
- React Router for routing
- `@supabase/supabase-js` for sign-in, sign-up and session handling
- Recharts for charts
- Plain CSS with light/dark support (`client/src/styles.css`)

**Backend** (`server/`)
- Node.js with Express 4 (ES modules)
- `pg` for PostgreSQL, using plain SQL and a small migration runner (`src/db/migrate.js`)
- `jose` to verify Supabase JWTs (via the project's public keys, or a shared secret for legacy projects)
- `zod` for input validation and environment checks
- `multer` and `csv-parse` for CSV upload
- `helmet`, `cors`, `express-rate-limit` and `morgan` for security headers, CORS, rate limiting and request logs
- Node's built-in test runner with `supertest`

**Services**
- **Supabase**: hosted PostgreSQL and authentication (email and password). Users sign in from the browser and get a token; the API trusts that token. The API connects to Postgres directly with `DATABASE_URL`.
- **Vercel**: hosts the built React app and runs the Express API as a serverless function, as two services in one project.
- **GitHub Actions**: `.github/workflows/ci.yml` runs the tests and a production build on every pull request and push to `main`.

**How a request flows**
1. The browser signs in through Supabase Auth and receives a JWT.
2. `client/src/lib/api.js` sends it as `Authorization: Bearer <token>` to the Express API.
3. `server/src/middleware/requireAuth.js` verifies the token and sets `req.user`.
4. The route runs SQL against Postgres and returns JSON.

**Query safety (Data Explorer)**
User-written SQL runs in a read-only transaction as the `app_readonly` role, which can only read the `uploads` schema where CSVs are stored. It has a 5-second timeout and a 1000-row limit. Datasets are shared by all signed-in users.
