# Engagement Guest Management & RSVP System

A private admin panel for managing guests and RSVPs for **Abbas's Engagement Ceremony — 25 October 2026**.

**Guests never touch this system.** You send them the invitation card and a short message on
WhatsApp, they reply "Yes" or "No" like a normal conversation, and you tap one button here to
record it. No guest website, no login, no form, no RSVP link, no QR code.

---

## The daily workflow

1. **Add guest** → name, mobile number, family, then tick which functions they're
   invited to (Engagement, DAREES, or both) and how many people for each.
2. **Send WhatsApp** → WhatsApp opens with the invitation text already written. You attach the
   invitation card yourself and press send.
3. **Guest replies** on WhatsApp: *"Yes, InshaAllah coming."*
4. **Tap `Yes`** on their row, set the number of people coming.
5. That function's headcount updates immediately.

The Guests page has a tab per function, so the Engagement and DAREES lists stay
completely separate. The dashboard shows a headcount card for each.

Guests still pending? Tap the bell icon to open WhatsApp with the reminder message.

---

## Tech stack

| Layer     | Choice                                        |
| --------- | --------------------------------------------- |
| Frontend  | React 18 + Vite + Tailwind CSS + Lucide React |
| Backend   | Node.js + Express (REST API)                  |
| Database  | Supabase PostgreSQL                           |
| ORM       | Prisma (with SQL migrations)                  |
| Auth      | JWT + bcrypt admin login                      |
| Hosting   | Vercel (frontend and backend)                 |

Database credentials live **only** on the server. Nothing secret is ever shipped to the browser.

---

## Project structure

```
/client                     React admin panel
  src/
    components/             Reusable UI (KpiCard, GuestRow, GuestCard, Modal, …)
    context/                Auth + toast notifications
    lib/                    API client, WhatsApp helper, formatters, constants
    pages/                  Dashboard, Guests, AddGuest, Settings, Login

/server                     Express API
  prisma/
    schema.prisma           Database schema
    migrations/             Versioned SQL — recreates the whole database
    seed.js                 Admin, event, message templates, sample guests
  src/
    config/                 Environment loading, Prisma client
    controllers/            Request handling
    routes/                 API route definitions
    middleware/             Auth, validation, error handling
    services/               WhatsApp delivery layer (Cloud-API-ready)
    utils/                  Phone validation, template rendering, errors
  api/index.js              Vercel serverless entry point
```

---

## Database schema

Eight tables, UUID primary keys, `created_at` / `updated_at` everywhere.

```
events ──┬──< event_functions ──< guest_invitations >── guests
         │                              │                 │
         ├──< message_templates         └──< rsvp_responses
         └──< guests                                      └──< invitation_logs

admins                                          (standalone login table)
```

| Table               | Purpose                                                                 |
| ------------------- | ----------------------------------------------------------------------- |
| `admins`            | Your login. Password stored as a bcrypt hash, never in plain text.       |
| `events`            | The occasion: name, date, host. Editable in Settings.                    |
| `event_functions`   | **Engagement and DAREES** — each with its own name, time and venue.      |
| `guests`            | The contact: name, phone, family, notes, WhatsApp invitation status.     |
| `guest_invitations` | **Who is invited to which function**, how many people, and their RSVP.   |
| `rsvp_responses`    | One row per RSVP change, tied to a function. Never overwritten.          |
| `message_templates` | Your editable WhatsApp wording, one row per template per event.          |
| `invitation_logs`   | Which message was sent to whom and when, with the exact text.            |

### Why guests and invitations are separate tables

Engagement and DAREES have **separate guest lists**. Someone can be on one list,
the other, or both — with a different headcount for each (5 people for the
engagement, 2 for DAREES).

Keeping the person (`guests`) apart from their invitation (`guest_invitations`)
means a phone number is stored once, one WhatsApp message covers every ceremony
that person is invited to, and each ceremony still keeps its own RSVP and
headcount. A guest invited only to DAREES simply has no engagement row.

**Why the history tables matter:** `guests` and `guest_invitations` hold current
state so the list loads fast even with thousands of rows. `rsvp_responses` and
`invitation_logs` are append-only, so a future WhatsApp webhook can write to them
without touching anything you see day to day.

**Indexes:** guest name (and lowercase), phone, family name (and lowercase),
invitation status, `(event_id, created_at)` for paging, and
`(function_id, rsvp_status)` so each ceremony's counts stay fast.

**Constraints enforced by the database itself, not just the app:**

- `invited_count` between 1 and 500
- `confirmed_count` between 0 and `invited_count` — you can never confirm more people than invited
- an invitation marked `NOT_ATTENDING` must have `confirmed_count = 0`
- one invitation per guest per function (no duplicates)
- names cannot be blank, phone numbers must be at least 7 characters
- one phone number per guest per event
- only one active event at a time

**Expected guest count** is `SUM(confirmed_count)` across confirmed invitations
**for that function**, not the number of guests. For the engagement:
Ahmed (4) + Mohammed (3) + Ali (5) = **12 expected**. DAREES is counted
completely separately.

## Local setup

### 1. Prerequisites

- Node.js 18 or newer
- A PostgreSQL database — either a Supabase project, or local Postgres for development

### 2. Backend

```bash
cd server
npm install
cp .env.example .env      # then fill in the values (see below)
npx prisma migrate deploy # create all the tables
npm run db:seed           # admin + event + templates + 12 sample guests
npm run dev               # http://localhost:4000
```

### 3. Frontend

In a second terminal:

```bash
cd client
npm install
npm run dev               # http://localhost:5173
```

Open **http://localhost:5173** and sign in with the `ADMIN_USERNAME` / `ADMIN_PASSWORD` you set
in `server/.env`.

In development, Vite proxies `/api` to the backend, so no API URL configuration is needed.

---

## Environment variables

All of these go in `server/.env`. Never commit this file.

| Variable         | What it is                                                              |
| ---------------- | ----------------------------------------------------------------------- |
| `DATABASE_URL`   | Supabase **pooled** connection string (port 6543, `?pgbouncer=true`)     |
| `DIRECT_URL`     | Supabase **direct** connection string (port 5432) — used by migrations   |
| `PORT`           | API port (default 4000)                                                 |
| `NODE_ENV`       | `development` or `production`                                           |
| `CLIENT_ORIGIN`  | Allowed frontend origin(s), comma-separated                             |
| `JWT_SECRET`     | Long random string — generate with `openssl rand -base64 48`             |
| `JWT_EXPIRES_IN` | Session length (default `7d`)                                           |
| `ADMIN_USERNAME` | Your login username                                                     |
| `ADMIN_PASSWORD` | Your login password — hashed on seed, never stored as text              |

The frontend needs `VITE_API_URL` **only** if the API is on a different domain than the site.

> Never put a Supabase service-role key in `client/`. Anything in the client is public.

---

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → Database → Connection string**.
3. Copy the **Transaction pooler** string into `DATABASE_URL` (add `?pgbouncer=true&connection_limit=1`).
4. Copy the **Session/direct** string into `DIRECT_URL`.
5. Run the migrations:

```bash
cd server
npx prisma migrate deploy
npm run db:seed
```

Your tables, indexes and constraints are now created from the codebase — no clicking around in
the Supabase UI, and the whole database can be recreated from scratch at any time.

---

## Commands

### Server

| Command                  | What it does                                            |
| ------------------------ | ------------------------------------------------------- |
| `npm run dev`            | Start the API with auto-reload                          |
| `npm start`              | Start the API for production                            |
| `npm run migrate:dev`    | Create a new migration after editing the schema         |
| `npm run migrate:deploy` | Apply existing migrations (use this in production)      |
| `npm run db:seed`        | Seed admin, event, templates and sample guests          |
| `npm run db:reset`       | **Wipes the database** and re-runs migrations + seed    |
| `npx prisma studio`      | Browse the database in your browser                     |

### Client

| Command           | What it does                     |
| ----------------- | -------------------------------- |
| `npm run dev`     | Dev server on port 5173          |
| `npm run build`   | Production build into `dist/`    |
| `npm run preview` | Preview the production build     |

---

## Deployment (Vercel)

Deploy the two folders as **two separate Vercel projects**.

### Backend

- **Root directory:** `server`
- **Build command:** `npm run vercel-build` (generates the Prisma client and applies migrations)
- **Environment variables:** everything from the table above, with `NODE_ENV=production` and
  `CLIENT_ORIGIN` set to your frontend URL.

`server/vercel.json` routes all traffic to `api/index.js`, which exports the same Express app you
run locally. If you would rather use a long-lived server (Render, Railway, Fly.io), run
`npm start` instead — no code changes needed.

### Frontend

- **Root directory:** `client`
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Environment variable:** `VITE_API_URL` = your deployed backend URL

`client/vercel.json` handles SPA routing so deep links like `/guests` work on refresh.

### After deploying

Change your admin password from the **Settings** page.

---

## Future: WhatsApp Cloud API

Today every message is click-to-chat: the app writes the text, you press send. Nothing is ever
sent automatically, which is deliberate — no risk of blasting real guests by accident.

The architecture is already prepared for automation:

- `server/src/services/whatsappService.js` has `sendMessage()`, which becomes a real Cloud API
  call as soon as `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN` are set.
- The same file has `parseInboundReply()`, which already understands replies like `yes`,
  `coming`, `can't come`, `2 people`, and `InshaAllah`.
- `rsvp_responses` has a `source` column (`MANUAL` / `WHATSAPP_API` / `IMPORT`) and a
  `raw_message` column, so automatic updates can be recorded and told apart from yours.

Adding a webhook route later requires no schema change and no rewrite of existing screens.

---

## Data safety

- Deleting a guest always asks for confirmation, and says it cannot be undone.
- Phone numbers are validated in the browser, on the server, and in the database.
- Duplicate phone numbers are rejected with a clear message.
- If the database is unreachable, you get an explicit error — the app never pretends a save
  worked. Nothing is stored in memory or in local JSON files.
- Every screen has proper loading, empty and error states.
- Every action gives a success or error notification.
