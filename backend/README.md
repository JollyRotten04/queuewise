# QueueWise API

Express 5 + PostgreSQL. The Next.js frontend forwards `/api/*` here (see `frontend/next.config.ts`), so the browser
only ever talks to the frontend's origin and no CORS is needed.

## First-time setup

1. **Create a database user and database** (once). Open `psql` as the `postgres` superuser and run the lines
   below, choosing your own strong password. Keep it out of git.

   ```sql
   CREATE ROLE queuewise LOGIN PASSWORD 'choose-a-strong-password';
   CREATE DATABASE queuewise OWNER queuewise;
   ```

   On Windows, psql is at `"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres`.

2. **Configure:** copy `.env.example` to `.env` and set `DATABASE_URL` with that password. `.env` is gitignored.

3. **Create tables and the demo branch:**

   ```bash
   npm install
   npm run db:migrate
   npm run db:seed
   ```

   The seed creates the public branch `main` (used by `/join` and `/display` when no `?b=` is given). To also create
   a demo admin, set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` (12+ characters) in `.env` first. Or just sign up
   from the frontend, which creates a new organization and branch with you as admin.

4. **Run:** `npm run dev` (auto-restarts on changes) or `npm start`. Then start the frontend with `npm run dev` in
   `frontend/`, and restart it if it was already running so it picks up the `/api` rewrite.

## API overview

| Method & path | Who | What |
|---|---|---|
| `POST /api/auth/register` | anyone | Create organization + branch + admin account, signs in |
| `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me` | staff | Session in an HttpOnly cookie |
| `POST /api/auth/forgot-password` · `POST /api/auth/reset-password` | anyone | 30-minute single-use reset link |
| `GET /api/branches/:slug` | public | Services, waiting counts, booking slots |
| `POST /api/branches/:slug/tickets` | public | Join (walk-in or appointment) |
| `GET /api/branches/:slug/tickets/:number?day=YYYY-MM-DD` | public | Ticket status (no personal data) |
| `POST /api/branches/:slug/tickets/:number/cancel` | ticket owner | Cancel (checked via a ticket cookie) |
| `GET /api/branches/:slug/display` | public | Lobby board: numbers and counters only |
| `GET /api/branches/:slug/events` | public | Server-Sent Events "something changed" pings |
| `GET /api/staff/overview` · `POST /api/staff/call-next` · `POST /api/staff/tickets/:id/(recall\|complete\|no-show)` | staff | Serving visitors |
| `GET /api/staff/queues` · `PATCH /api/staff/services/:id` | staff / admin | Queue status; admins pause queues and set counters |
| `GET /api/staff/analytics` | staff | Today's stats |

All writes must be JSON (`Content-Type: application/json`) and come from an allowed origin (`APP_ORIGIN`).

## Security notes

- Passwords: Node's built-in scrypt (OWASP parameters). Sessions: random tokens, stored only as SHA-256 hashes,
  sent as `HttpOnly; SameSite=Lax` cookies (`Secure` in production). Logout and password resets revoke sessions.
- Every staff query is scoped to the signed-in user's branch. Visitor names and phones are only returned to staff,
  and are erased from tickets older than `DATA_RETENTION_DAYS`.
- Rate limits and live-update events are kept in memory, so they assume a **single server process**. Before running
  more than one instance, move them to a shared store (Redis, or Postgres `LISTEN/NOTIFY`).

## Not done yet

- **Email delivery:** password reset links are only printed to the console in development (`src/lib/mailer.js`).
  Connect an email provider before production.
- **SMS alerts** for visitors who leave a phone number.
- **Inviting staff** to an existing branch (new accounts currently always create a new organization), and
  multiple branches per organization in the UI.
- **Automated tests:** the endpoints were checked with an end-to-end script during development, but there is no
  test suite in the repo yet.
