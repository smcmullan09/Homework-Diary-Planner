# SMM Homework Planner

A private, single-owner homework planner with a calm dashboard, homework tracking, a fully custom timetable, calendar, persistent study timer and optional email/SMS reminders. No public registration, school administration or shared classrooms.

## Stack

- Next.js App Router, React, strict TypeScript and Tailwind CSS.
- Radix Dialog for focus management/accessible modal interactions, Lucide icons, responsive custom components.
- Prisma ORM, SQLite for easy local development, a matching PostgreSQL schema and initial migration for deployment.
- Luxon for timezone and daylight-saving calculations; Zod for server validation.
- Database-backed authentication sessions, scrypt password hashing and a single provisioned owner.
- Replaceable Resend and Twilio provider adapters; a protected server-side reminder processor.
- Vitest business-logic tests, isolated database integration tests and Playwright UI tests.

## Start locally

Use Node.js 22.12+ (tested on Node.js 24). In Windows PowerShell, use `npm.cmd` in place of `npm` if script execution policy blocks `npm.ps1`.

```sh
npm install
npm run setup
npm run db:owner
npm run dev
```

Open **http://127.0.0.1:3000**. Use that exact origin: the default generated `APP_URL` is `http://127.0.0.1:3000`, and mutating requests enforce same-origin protection. If you prefer `localhost`, set `APP_URL=http://localhost:3000` and restart the server.

`setup` creates an ignored `.env` with unique authentication/cron secrets, generates Prisma Client, creates the empty SQLite file (needed by Prisma on some Windows systems), and applies migrations. It does not overwrite an existing `.env`.

On Windows, stop the development server before running a build or regenerating Prisma Client: the running process holds the native database engine DLL open. Start the development server again after the build completes.

`db:owner` asks for an email and a hidden password of at least 12 characters. This provisions the only owner account. Run it again to change the email/password; doing so signs out existing sessions. There is no public sign-up endpoint. You can supply `OWNER_EMAIL` and `OWNER_PASSWORD` through the process environment for noninteractive provisioning; remove the password from the environment after use. The database stores only a salted password hash.

On the first visit, the dashboard offers a setup guide covering your account, timezone, subjects, timetable and optional notifications. Complete the guide once to dismiss onboarding permanently. Settings remain editable later.

### Local review data

This workspace was prepared with optional demo subjects, homework and a sample week. A generated local review account is recorded in the ignored `.env` as `OWNER_EMAIL` and `OWNER_PASSWORD`. Read those values locally to sign in, or replace them with your own credentials and run `npm run db:owner`. **Do not deploy a development `.env` or demo account.**

On a fresh checkout, demo data is opt-in:

```sh
npm run db:seed
```

Seeding is repeatable and preserves existing records. Demo IDs start with `demo-`; dates are relative to the current day in the configured timezone. Remove sample data with:

```sh
npm run db:reset-demo
```

This explicitly deletes demo homework, its reminders and associated demo study history. It removes untouched demo timetable days, detaches demo subjects from edited timetable periods and preserves demo subjects used by your own homework. Export first if you have adapted demo records and want to keep them.

## Features and routes

| Route              | What you can do                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| `/login`           | Sign in to the configured owner account                                                                       |
| `/`                | See due-today/upcoming/overdue/completed counts, today’s homework and lessons, weekly workload and study time |
| `/homework`        | Search, sort and filter all homework by view, subject, priority, status and due date                          |
| `/homework/new`    | Add a task, deadline, subject, estimated effort, notes and reminder overrides                                 |
| `/homework/[id]`   | View/edit/complete/reopen/delete homework or start studying it                                                |
| `/calendar`        | Month, week and agenda views; click an event or add from a date                                               |
| `/timetable`       | Weekly timetable; click a period to edit it                                                                   |
| `/timetable/setup` | Choose any school days, add custom periods/breaks, quick-build evenly spaced lessons or copy a day            |
| `/subjects`        | Create/rename/delete subjects, pick a colour and icon                                                         |
| `/timer`           | Countdown/custom duration or stopwatch; pause/resume/reset/finish and record sessions                         |
| `/notifications`   | Provider availability, pending reminders and recorded send outcomes                                           |
| `/settings`        | Timezone, display formats, light/dark/system theme, reminder settings and JSON export/restore                 |
| `/setup`           | First-run setup guide                                                                                         |

The catch-all page dispatches these sections inside a shared protected layout. UI, validation, date logic, database access, provider adapters and reminder scheduling are separated under `src/components`, `src/lib` and `src/server`.

## Environment variables

See `.env.example`. No variables beginning with `NEXT_PUBLIC_` contain secrets.

| Variable              | Purpose                                                                            |
| --------------------- | ---------------------------------------------------------------------------------- |
| `DATABASE_URL`        | Local `file:./dev.db`, or a PostgreSQL connection URL with TLS where supported     |
| `APP_URL`             | Exact canonical origin, no path, e.g. `https://planner.example.com`                |
| `AUTH_SECRET`         | At least 32 characters; signs/hashes database session tokens                       |
| `CRON_SECRET`         | At least 32 characters; bearer token for the reminder job                          |
| `OWNER_EMAIL`         | Optional owner provisioning email                                                  |
| `OWNER_PASSWORD`      | Optional provisioning/test password; not used for normal login verification        |
| `RESEND_API_KEY`      | Optional email provider secret                                                     |
| `EMAIL_FROM`          | Verified sender, e.g. `SMM Planner <reminders@example.com>`                        |
| `TWILIO_ACCOUNT_SID`  | Optional SMS account identifier                                                    |
| `TWILIO_AUTH_TOKEN`   | Optional SMS provider secret                                                       |
| `TWILIO_PHONE_NUMBER` | SMS-enabled sender in international format                                         |
| `COOKIE_SECURE`       | Set `true` for HTTPS development if desired. Production always uses Secure cookies |

Generate secrets with:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The application works without notification credentials. Availability badges clearly indicate unconfigured channels. Recipient addresses/numbers are configured privately in Settings; provider credentials only exist on the server.

## Database and migrations

The relational model has `Owner`, `AuthSession`, `LoginAttempt`, `Subject`, `Homework`, `HomeworkReminder`, `TimetableDay`, `TimetablePeriod` and `StudySession`. Periods contain their own optional assignment fields rather than needing a separate one-to-one entry table. Each day owns an independent period list; there is no fixed period count.

- Subject deletion is restricted while homework or timetable periods use it.
- Homework deletion cascades reminders. Study sessions survive deletion, with the deleted relation set to null.
- Reminder schedule keys are unique; indexes cover deadline/status lookups and reminder processing.
- Settings and task reminder overrides are validated JSON serialized into text columns for portability across both databases.
- Dates and optional times are stored as local calendar values plus a derived UTC `dueAt`. Changing timezone recalculates deadlines and reconciles schedules transactionally.

For local schema changes:

```sh
npm run db:dev -- --name describe_change
npm run db:generate
```

For existing deployments, apply committed migrations with `npm run db:migrate`. Back up before applying schema changes.

### PostgreSQL deployment

The checked-in `prisma/postgres/schema.prisma` mirrors the local schema and has its own PostgreSQL migration history. **Never apply SQLite migration SQL to PostgreSQL.**

1. Create an empty PostgreSQL database and set `DATABASE_URL` to its server-side connection URL.
2. Set a production HTTPS `APP_URL`, new `AUTH_SECRET`/`CRON_SECRET`, and any provider variables.
3. Install dependencies and apply the PostgreSQL migration:

   ```sh
   npm ci
   npx prisma migrate deploy --schema prisma/postgres/schema.prisma
   npm run build:postgres
   npm run db:owner
   npm start
   ```

   Provision the owner using your deployment terminal/one-off command, with environment variables if the terminal is noninteractive. `build:postgres` generates the correct PostgreSQL Prisma Client before building. **Do not use the SQLite `build` command for a PostgreSQL deployment.**

4. Terminate HTTPS at your hosting platform/reverse proxy. `npm start` binds loopback by default for a local reverse proxy; for containers use `npx next start --hostname 0.0.0.0` behind your platform’s ingress.
5. Configure cron as described below and verify job logs/provider dashboards.

When editing the schema later, run `npm run db:postgres` to sync the schema definition, then create a PostgreSQL migration against a development PostgreSQL database:

```sh
npx prisma migrate dev --schema prisma/postgres/schema.prisma --name describe_change
```

Keep both schemas and their migration histories in sync. Switching existing data from SQLite to PostgreSQL is a deliberate migration: export JSON, provision the fresh PostgreSQL app, then restore. Backups omit authentication credentials and delivery attempt history is exported for reference but is not replayed/restored as live sends.

SQLite production is suitable only for a single server with a persistent disk and backups. Do not put SQLite on ephemeral serverless storage or run multiple replicas sharing a local file. PostgreSQL is the preferred deployment backend. Its schema and migration are included; live PostgreSQL connectivity still needs validation on your chosen host.

## Email and SMS setup

For email, configure a Resend key and verified `EMAIL_FROM` sender. For SMS, configure a Twilio account, authentication token and an SMS-capable sender. Trial/provider account restrictions still apply. In Settings, supply your recipient email/mobile number, enable the desired channels and select reminder times. Mobile numbers use international `+countrycode...` format.

The adapter interface is in `src/server/providers.ts`. To change providers, implement its `send(message)` contract and swap the adapter selected in `src/server/reminders.ts`. Email HTML escapes homework content, includes due information/priority/estimate and links to the protected task page. SMS titles/subject names are shortened to limit length, though some messages may still use multiple SMS segments.

Credentials alone do not send messages: preferences must enable the channel, the task must have an applicable future reminder and the cron job must run. End-to-end external delivery cannot be tested without your credentials; automated tests inject fake providers and never send real email or SMS.

## Scheduled reminders

Schedule an authenticated request every minute (or every five minutes if that accuracy is sufficient):

```sh
curl --fail --silent --show-error \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$APP_URL/api/cron/reminders"
```

The endpoint accepts GET or POST. Keep the token in the scheduler’s secret storage, never in the URL, client code or public logs. Without a configured secret of at least 32 characters, the endpoint denies all requests.

For a Linux cron host, add a private wrapper script that loads environment variables from a protected file and calls the command above, then schedule that wrapper with `* * * * *`. For a hosting platform’s scheduled functions, configure a one-minute schedule invoking this same endpoint with the bearer header. A Vercel-style configuration example is in `deployment/vercel.example.json`; copy it to `vercel.json` only when using that platform and check your plan’s schedule frequency/duration limits. Its scheduler supplies `Authorization: Bearer <CRON_SECRET>` when configured. Set the build command to `npm run build:postgres` and run migrations in your release workflow.

The processor:

1. Loads due pending reminder rows (up to 100 per invocation).
2. Atomically changes each row from PENDING to SENDING; concurrent invocations cannot claim it twice.
3. Rechecks the task, deadline, completion status, channel preference and current schedule key before sending.
4. Sends using the server-only provider adapter. Resend also receives an idempotency key.
5. Records provider acceptance, time and provider ID, or a failure message.
6. Cancels invalid or already-overdue reminders. Completing/deleting a task and changing its due date reconcile/cancel applicable reminders.

No database can atomically commit a third-party SMS delivery. To favour avoiding duplicate SMS, FAILED/UNKNOWN rows are **not automatically retried**. A SENDING row left after a crash becomes UNKNOWN after ten minutes; check the provider dashboard before manually creating another reminder. This is an at-most-once attempt strategy, not a promise of exactly-once delivery. “Sent to provider” means API acceptance; final inbox/handset delivery is not tracked by webhook. Delivery already in flight cannot always be recalled when a task is edited at precisely the same moment.

Channels without credentials remain pending and are shown as unavailable. If configured after the task is already due, those stale messages are cancelled instead of sent. Initial scheduling skips offsets whose reminder time has already passed. Channels globally disabled in Settings cannot be enabled solely by a per-task override.

## Dates and timers

- Untimed deadlines expire at 23:59:59 in the configured timezone.
- Completed work never counts as overdue. “Due today” and “Due soon” exclude completed tasks; “due soon” means the next seven local calendar days.
- Timetable start boundaries are inclusive and end boundaries exclusive. Adjacent periods are valid; overlap and overnight/reversed periods are rejected. School-day selection supports all seven days.
- Spring daylight-saving gap times are rejected with a validation message. A repeated autumn time resolves to the earlier occurrence consistently.
- Timers store an ID, accumulated active time, start time and running timestamp in local storage. Paused time is excluded; countdown time is capped at the chosen duration. Running sessions survive refresh/navigation and update between tabs via the storage event.
- Finish Session explicitly records time (or discards it if recording is unchecked). Submitting the same session ID twice never double-counts study time. Unfinished timers remain local to that browser and device; recorded sessions are in the database.

## Export and restore

Settings provides JSON export of subjects, homework, timetable, study history, preferences and reminder history. Password hashes, authentication sessions and provider credentials are excluded. Backups still contain private homework and contact information: store them privately.

Restore validates the version, field types, dates, time intervals, IDs and relational references, then replaces data in a transaction. Invalid imports roll back completely. The UI asks for confirmation first. Notifications are disabled on restore and historical delivery records are not replayed; review preferences before re-enabling. Maximum import size is 5 MB. Export before a restore if you may want to undo it.

## Security notes

All private pages check a database session; all data endpoints independently authenticate. Session cookies are HttpOnly, SameSite=Lax and Secure in production, expire after seven days, and contain random opaque tokens whose HMAC hashes are stored in the database. Password hashing uses a per-password random salt and scrypt. Sensitive login attempts share a database-backed limit of 10 per 15 minutes; this simple global limit suits a one-owner app. It can temporarily lock out the owner during an attack, so production edge rate limiting is also useful.

Mutations validate the exact Origin, validate input with Zod and use Prisma parameterization. The cron endpoint uses timing-safe secret comparison. Security headers deny framing, disable MIME sniffing and limit browser permissions. The initial CSP accommodates Next.js hydration/development scripts; a nonce-based strict CSP is a possible future hardening step. Secrets never enter client props. In production use HTTPS, database backups and environment secret storage.

## Development and verification

```sh
npm run dev                 # local server
npm run typecheck           # strict TypeScript
npm test                    # business logic tests
npm run test:integration    # separate temporary SQLite DB, never the planner DB
npm run build               # SQLite production build
npm run build:postgres      # PostgreSQL production build
npm start                   # serve the built app
npm run format              # format tracked source/config/docs
```

UI tests require a development/test owner with `OWNER_EMAIL` and `OWNER_PASSWORD` available to the test process, plus the local database. They create clearly labelled test records, clean up homework/subjects and leave a tiny recorded study session to verify history retention. Use a test database/account, not production.

```sh
npx playwright install chromium
npm run test:ui
```

The runner starts/reuses the local server, verifies sign-in/protection, subject/homework CRUD, reference restrictions, timer refresh/session recording, export/import rejection, all major routes, mobile navigation, responsive overflow and persistent dark mode. Screenshots are written to ignored `artifacts/`; failed-test screenshots go to `test-results/`. Unit tests cover overdue/status logic, reminder scheduling, timezone/DST boundaries, current/next periods, interval validation and elapsed-time calculations. Integration tests cover real foreign keys, password verification, unique reminders, concurrent claims, failure handling and idempotent session saves.

## Layout

```text
src/app/                  Next routes, protected layout and API handlers
src/components/           Responsive UI and shared accessible primitives
src/lib/                  Types, Zod schemas and pure business logic
src/server/               Prisma, authentication, data and notifications
prisma/                   SQLite schema and migrations
prisma/postgres/          PostgreSQL schema and migrations
scripts/                  Setup, owner provisioning, seed and integration checks
tests/                    Logic and browser tests
deployment/               Optional scheduler configuration
```

The app deliberately keeps a single service and one owner. It does not need teacher accounts, an external authentication service, a message queue or notification credentials for basic local use.
