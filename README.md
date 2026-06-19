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

- `/wiki`: public BC Construction Safety Wiki section with plain wiki-style styling.
- `/wiki/articles/fall-protection`: example wiki article route.
- `/worker-sign-in-qr`: QR poster page.
- `/worker-sign-in`: public worker sign-in form.
- `/worker-sign-out-qr`: QR poster page for worker sign-out.
- `/worker-sign-out`: public worker sign-out confirmation.
- `/staff-login`: staff login.
- `/staff/home`: staff landing page with roster counts, QR links, reports, and settings access.
- `/staff/sign-ins`: staff "Who's Here" records, grouping, export, and manual email report.
- `/staff/settings`: staff-only site settings, editable email report settings, reminder placeholder, and privacy notes.

## Email Reports

Auto Report sends once daily at 8:00 a.m. when sign-ins exist. Staff can edit the recipient, turn Auto Report on or off, choose CSV, XML, or both, and send a report immediately from Settings or Who's Here.

## Wiki content validation

```bash
npm run validate:wiki
```

The wiki is isolated under `/wiki` and does not use the dashboard styling. The
current prototype renders structured content from `src/wikiContent.js`; the
planned long-term editorial structure is documented under `content/`.
