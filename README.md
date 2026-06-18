# Safety First

Local-first construction safety admin prototype with a Vercel/Supabase worker sign-in backend.

## Local development

```bash
npm install
npm run dev
```

The existing safety tracker remains browser-local. The worker sign-in backend endpoints are designed for Vercel Functions and require the environment variables in `.env.example`.

## Backend setup

1. Create a Supabase project.
2. Run `supabase/migrations/001_worker_signins.sql` in the Supabase SQL editor.
3. Add the environment variables from `.env.example` to Vercel.
4. Seed the testing staff user:

```bash
SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..." npm run seed:staff
```

The default seeded staff account is:

- Username: `lbird`
- Password: `123`
- Email/report recipient: `garnobird@gmail.com`

Change this password before using real production data.

## Routes

- `/worker-sign-in-qr`: QR poster page.
- `/worker-sign-in`: public worker sign-in form.
- `/staff-login`: staff login.
- `/staff/sign-ins`: staff sign-in records, grouping, export, and manual email report.

## Reports

The Vercel cron runs once daily at 15:00 UTC, which is 8am Vancouver during daylight time. It skips if there are no sign-ins or if the automatic report already sent for that date. Exact year-round 8am Vancouver scheduling requires Vercel Pro hourly cron or an external scheduler.
