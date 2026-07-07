# Safety First

Local-first construction safety admin prototype with a Vercel/Supabase worker sign-in backend.

## Local development

```bash
npm install
npm run dev
```

The worker sign-in backend endpoints are designed for Vercel Functions and require the environment variables in `.env.example`.

## Backend setup

1. Create a Supabase project.
2. Run `supabase/migrations/001_worker_signins.sql` in the Supabase SQL editor.
   Run the later migrations in order as well, including `007_form_submissions.sql`
   for worker accounts, submissions, and the private submission storage bucket,
   then `008_form_submission_form_data.sql` for digital form answers.
3. Add the environment variables from `.env.example` to Vercel.
4. Seed the testing staff user:

```bash
SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..." npm run seed:staff
```

The default seeded staff account is:

- Username: `lbird`
- Password: `123`
- Role: `admin`
- Email/report recipient: `garnobird@gmail.com`

Change this password before using real production data.

## Final release checklist

Before real production data is entered, complete these release cleanup items:

- Delete or rotate the prototype `lbird` / `123` staff credentials.
- Replace the default `garnobird@gmail.com` report recipient wherever it appears in production settings.
- Set a strong `SESSION_SECRET` that is different from `CRON_SECRET` / `SUPABASE_CRON_SECRET`.
- Keep production Supabase, Resend, Microsoft, cron, and session secrets out of Vercel preview deployments.
- Run every Supabase migration, including the security hardening migration, before enabling production traffic.

### OneDrive backup

Safety form submissions use Microsoft Graph for staff-only OneDrive backup. Add
these server-side Vercel environment variables before relying on backup status:

- `MS_TENANT_ID`
- `MS_CLIENT_ID`
- `MS_CLIENT_SECRET`
- `MS_DRIVE_ID`
- `MS_FORMS_FOLDER_ID`

Staff Settings includes a `OneDrive Backup` checkbox. It is off by default while
Microsoft details are missing. While off, submissions still save in Supabase with
backup status `Pending`, and can be retried from Staff Forms after Microsoft is
configured and the checkbox is turned on.

## Routes

- `/worker-sign-in-qr`: QR poster page.
- `/worker-sign-in`: public worker sign-in form.
- `/worker-sign-out-qr`: QR poster page for worker sign-out.
- `/worker-sign-out`: public worker sign-out confirmation.
- `/worker-login`: worker login for safety form submission accounts.
- `/forms`: worker form picker for toolbox talk, site inspection, and daily hazard assessment submissions.
- `/forms/toolbox_talk`: toolbox talk submission flow.
- `/forms/site_inspection`: site inspection submission flow.
- `/forms/daily_hazard_assessment`: daily hazard assessment submission flow.
- `/my-submissions`: worker submission history and app-side deletion.
- `/staff-login`: staff login.
- `/staff/home`: staff landing page with roster counts, QR links, reports, and settings access.
- `/staff/sign-ins`: staff "Who's Here" records, grouping, export, and manual email report.
- `/staff/sign-ins/company`: company summary view.
- `/staff/forms`: staff form submission filtering, detail view, and OneDrive backup retry.
- `/staff/forms-to-fill-out`: staff form picker.
- `/staff/form-templates`: staff form template and QR code builder.
- `/staff/action-items`: staff action items created from Site Inspection deficiencies.
- `/staff/certificates`: staff certificate tracking.
- `/staff/assets`: asset register and detail pages.
- `/staff/workers`: staff worker account creation, editing, deactivation, and password reset.
- `/staff/users`: staff user management.
- `/staff/backups`: OneDrive backup status tools.
- `/staff/health`: system health.
- `/staff/audit`: audit log.
- `/staff/trends`: trend reporting.
- `/staff/settings`: staff-only site settings, editable email report settings, reminder placeholder, and privacy notes.

Retired prototype routes such as `/wiki`, `/safety-lab`, `/training-quiz`, `/demo`, and unknown legacy dashboard URLs redirect to `/`.

## Email Reports

Auto Report sends once daily at 8:00 a.m. when sign-ins exist. Staff can edit the recipient, turn Auto Report on or off, choose CSV, XML, or both, and send a report immediately from Settings or Who's Here.

## Archived Wiki

The retired BC Construction Safety Wiki is preserved under `archived/wiki`. It
is no longer part of the live Vite app or deployed routes, but the old Wiki
component, generated content, Markdown source, docs, and build/verification
scripts are kept there for future recovery.
