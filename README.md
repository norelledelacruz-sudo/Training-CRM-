# Training CRM

An internal simulator for Homeaglow CS training. Trainers build fake customer
outreach scenarios; trainees resolve them in a CRM-like interface without
touching any real customer or backend system. Every trainee action is logged
and auto-flagged against an answer key so trainers can review it.

All data — customer names, messages, job/membership details — is synthetic.
Nothing here reads from or writes to Homeaglow's real systems.

## How it works

- **Trainers** sign in at `/admin` (a shared password for now — see
  [Known limitations](#known-limitations-phase-1)) to generate a unique link
  per trainee and review submitted sessions.
- **Trainees** open their link (`/t/<token>`) with no account or login at
  all. They see a fake case, reply to the customer, and choose a resolution.
  Every action is logged in the background.
- Each session is auto-graded against the scenario's answer key
  (`correct` / `partial` / `incorrect` / `pending`), and a trainer confirms or
  overrides that verdict from the session's detail page.

## Local development

Prerequisites: Node 20+, a Postgres database.

```bash
npm install
cp .env.example .env   # then edit DATABASE_URL / ADMIN_PASSWORD
npx prisma migrate dev # creates tables
npm run db:seed        # loads one demo scenario
npm run dev
```

Open http://localhost:3000/admin, sign in with `ADMIN_PASSWORD`, generate a
trainee link, and open it in another (or incognito) browser tab to try the
trainee side.

### Running Postgres locally without Docker

If you have `postgresql` installed locally:

```bash
sudo service postgresql start
sudo -u postgres psql -c "CREATE USER training_crm WITH PASSWORD 'training_crm_dev' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE training_crm OWNER training_crm;"
```

Or with Docker:

```bash
docker run --name training-crm-db -e POSTGRES_USER=training_crm \
  -e POSTGRES_PASSWORD=training_crm_dev -e POSTGRES_DB=training_crm \
  -p 5432:5432 -d postgres:16
```

## Deploying

This app has no dependency on Homeaglow's own infrastructure — it's meant to
be deployed independently:

1. **Database**: create a free Postgres instance on
   [Neon](https://neon.tech) or [Supabase](https://supabase.com). Copy its
   connection string into `DATABASE_URL`.
2. **Hosting**: push this repo to GitHub and import it into
   [Vercel](https://vercel.com). Set `DATABASE_URL` and `ADMIN_PASSWORD` as
   environment variables in the Vercel project settings.
3. After the first deploy, run `npx prisma migrate deploy` once against the
   production database to create the tables, then sign in at `/admin` and
   build scenarios directly through the authoring UI (`Manage scenarios` →
   `New scenario`) — no need to touch `prisma/seed.ts` in production.

Trainee links (`/t/<token>`) will then work for anyone with the URL — no
Claude account, no Homeaglow account, no VPN.

## Known limitations (Phase 1–5)

This is a multi-phase build-out. Deliberately out of scope for now:

- **Trainer auth is a single shared password**, not per-trainer accounts.
  Fine for a small pilot group; replace with Google OAuth restricted to the
  Homeaglow email domain before wider rollout.
- **Job details (cleaner, date, duration, price) are read-only context**,
  not actions a trainee takes — matches how CS actually uses that panel.
  Membership status, credits, manual charges, and dispute status are fully
  interactive and gradable (Phase 3).
- **Some chrome is decorative-only, matching the reference screenshot's
  look without live function yet**: the search box, "Clear Actions" button,
  NCW/OCW login shortcuts, and the "edit" link on the membership panel.
  Everything else that could plausibly be made real was: the message
  category tabs, date-range filter, per-sender legend (click a name to
  filter to just their messages), "Scroll to Oldest Action", and "Show All"
  membership history all actually work against the scenario's real data.
- A few very Homeaglow-specific internal details from the reference
  screenshot (payment-processor line items, reschedule/cancel counters,
  exact job IDs) aren't modeled — they'd need real fields added to the
  scenario schema first. Ask if you want those added.

## Project structure

- `prisma/schema.prisma` — data model (`Scenario`, `TraineeLink`, `ActionLog`, `Review`)
- `prisma/seed.ts` — one demo scenario, loaded once via `npm run db:seed`;
  further scenarios are created through the authoring UI, not this script
- `src/app/t/[token]` — trainee-facing CRM replica (no auth)
- `src/app/api/actions` — logs every trainee action and re-runs auto-grading
- `src/app/admin` — trainer dashboard, link generation, session review (password-gated via `src/proxy.ts`)
- `src/app/admin/scenarios` — scenario authoring UI (list, create, edit, archive)
- `src/lib/grading.ts` — auto-grading logic (resolution + reply vs. answer key)
