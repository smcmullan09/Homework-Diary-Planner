# SMM Homework Planner implementation

## Repository inspection

The project directory is empty. There are no inherited project instructions or existing application files. The machine has Node.js 24; use npm.cmd on Windows where PowerShell execution policy blocks npm.ps1. The parent home directory is a Git repository, so commands must remain scoped to this project.

## Architecture and implementation plan

1. Next.js App Router, strict TypeScript, React, Tailwind and Radix accessible dialogs; a shared responsive application shell and reusable form/card components.
2. Prisma relational storage: SQLite for zero-service local development, a matching PostgreSQL schema for production. Database-backed owner sessions, scrypt password hashing, protected routes and same-origin mutations. Owner provisioning is an explicit local command; no public registration.
3. Subjects and homework CRUD with validated input, timezone-aware dates, completion and safe deletion.
4. Dashboard, calendar and a per-day timetable builder with unrestricted editable periods, break types, copying and overlap validation.
5. Timestamp-based persistent timer, recorded sessions and aggregate study statistics.
6. Pluggable Resend/Twilio adapters, durable reminders with unique schedule keys, atomic claims, cancellation, failure records and protected cron processing.
7. Settings, initial setup, theme persistence, JSON export/validated restore, optional demo seed.
8. Unit and database integration tests, production build and browser verification; setup/deployment documentation.

## Relational schema

- Owner: singleton ID, email, password hash, settings JSON (validated application schema), onboarding state, timestamps.
- AuthSession: hashed random token, owner foreign key, expiry.
- LoginAttempt: shared database-backed authentication rate limit.
- Subject: name, colour, icon, timestamps; restrict deletion while homework or periods reference it.
- Homework: subject foreign key, title, description, local assigned/due dates, optional due time, UTC dueAt, priority, status, estimated minutes, notes, reminder override JSON, completion and audit timestamps.
- TimetableDay: unique weekday, enabled flag; owns variable-length TimetablePeriod records.
- TimetablePeriod: custom name/type/start/end, optional subject, room, teacher and label. A period and its optional assignment live in one record for simplicity.
- StudySession: nullable homework/subject foreign keys (set null on deletion), start/end, duration, mode.
- HomeworkReminder: homework foreign key (cascade), channel, scheduled time, status, claimed/sent timestamps, provider ID/error and unique schedule key. Uncertain deliveries are not automatically retried.

## Routes and components

Public /login; protected /, /homework, /homework/new, /homework/[id], /calendar, /timetable, /timetable/setup, /subjects, /timer, /notifications, /settings, /setup.
JSON API: /api/auth/login, /api/auth/logout, /api/data, /api/subjects, /api/homework, /api/timetable, /api/settings, /api/sessions, /api/export, /api/import, /api/cron/reminders.
UI: AppShell/DataProvider, dashboard, homework list/form/detail, subject editor, calendar, timetable/editor, timer, settings/onboarding and notification history.

## Acceptance checks

Test overdue/status/timezone boundaries, DST due conversion, reminder schedules and duplicate processing, timetable boundaries and overlap, timer elapsed time, database CRUD and referential integrity, owner authentication. Build and inspect desktop/mobile/light/dark and core workflows in the browser. Provider delivery requires user-supplied credentials and remains explicitly unavailable without them.
