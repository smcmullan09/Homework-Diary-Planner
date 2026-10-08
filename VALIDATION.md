# Verification — 8 October 2026

The application was built and run locally on Windows with Node.js 24, Next.js 16.4 and Prisma 6.19.

## Passed checks

- **Production build:** all routes compiled; strict TypeScript passed.
- **20 Vitest tests:** incomplete/completed overdue logic, date validation, local end-of-day deadlines, timezone boundaries, spring DST gaps, repeated autumn hours, reminder offsets and unique keys, current/next periods, breaks, no-school/finished-school states, interval overlap, persistent timer calculations and notification-setting validation.
- **Database integration suite:** password hashing/verification; real SQLite migrations, CRUD and foreign keys; repeat scheduling; concurrent reminder claims; completed-task cancellation; provider failures; retry-safe session recording; an unavailable-channel backlog cannot block available SMS; valid JSON restoration, invalid-reference rejection and transactional rollback.
- **Four Playwright tests:** authenticated homework/subject CRUD; cross-origin and unauthenticated API rejection; safe subject deletion; custom 150-minute timer input; timer refresh and session recording; export and invalid-import rejection; desktop/mobile routes; no horizontal overflow at 390px; keyboard mobile navigation; persistent light/dark mode; nine-lesson timetable with eight editable breaks, custom labels, overlap rejection, day copying and persistence.
- **Automated accessibility:** no WCAG A/AA violations reported by axe on the tested primary screens in light mode or dashboard/calendar/timer/settings in dark mode. This is automated coverage, not a certification or a substitute for a comprehensive manual accessibility audit.
- **Dependency audit:** zero reported vulnerabilities.
- **PostgreSQL schema:** Prisma validation passed; provider-specific initial migration included.
- **Visual inspection:** desktop/light/dark dashboard, mobile dashboard/timer and custom mobile timetable screenshots inspected. Captures are in the ignored `artifacts/` directory.

The connected browser was unavailable, so browser verification used the repository’s local headless Chromium tests. Final screenshot capture avoids test-induced caret-style hydration warnings; the browser suite also checks for hydration errors.

## Configuration still needed for deployment

- Production PostgreSQL connectivity/migrations must be verified against the selected host. Live PostgreSQL was not available locally.
- Actual email and SMS delivery require the owner's provider credentials and recipient settings. Tests injected providers and sent no external messages.
- Schedule `/api/cron/reminders` in the deployment environment with its bearer secret. No hosted deployment or production scheduler was created.

See `README.md` for setup, owner provisioning, environment variables, deployment and cron instructions. The local review account is documented in the ignored `.env`; do not deploy those development credentials.
