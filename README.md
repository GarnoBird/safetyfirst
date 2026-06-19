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
- `/worker-sign-out-qr`: QR poster page for worker sign-out.
- `/worker-sign-out`: public worker sign-out confirmation.
- `/staff-login`: staff login.
- `/staff/home`: staff landing page with roster counts, QR links, reports, and settings access.
- `/staff/sign-ins`: staff "Who's Here" records, grouping, export, and manual email report.
- `/staff/settings`: staff-only site settings, editable email report settings, reminder placeholder, and privacy notes.

## Email Reports

The current Vercel Hobby deploy runs the automatic report check once daily at 15:00 UTC. Staff can edit the recipient, turn auto-reports on or off, and choose CSV, XML, or both. The preferred auto-report time is saved in settings, but arbitrary delivery times require Vercel Pro cron frequency or an external scheduler that calls `/api/cron/morning-report` more than once per day.
