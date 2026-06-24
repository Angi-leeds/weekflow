# MyAxis (WeekFlow repo)

## Overview
MyAxis is a mobile-first personal hub (week-list calendar, email, tasks, contacts, notes) with an integrated family noticeboard mode (formerly Corky). Prototype uses mock data locally; Microsoft Graph when OAuth env vars are set on Replit.

**Build order:** Phase **9b** (multi-account Outlook) → Phase **11** (login + super admin) → Phase **11b** (invites, reset, 2FA) → Phase 9c/10. See `BUILD-PLAN.md`.

**Security:** When `SESSION_SECRET` is set, the app requires login. Optional Cloudflare Access in front of the custom domain adds an edge gate before MyAxis sessions (see below).

## User preferences
- Mobile-first; week list is the signature calendar view.
- Family board is opt-in per item (private by default).
- Core PIM data lives in the user's own accounts, not a proprietary silo.
- Microsoft-first for real integrations (Graph API).

## Stack (this repo)
- **Frontend**: React 19, Vite, TypeScript, Tailwind v4, lucide-react
- **Backend**: Express (`server/`) — scaffold only in prototype; ready for Replit PostgreSQL + Object Storage
- **Hosting**: Replit (port 5000)

## Replit setup (for agent)
1. Import this repo from GitHub (`Angi-leeds/weekflow`).
2. Run `npm install` then `npm run dev` — app on port 5000.
3. **Database:** Replit PostgreSQL → `DATABASE_URL`. Migrations run automatically on server start (or run `npm run db:migrate`).
4. **Object storage:** attach Replit Object Storage for attachment uploads.
5. Check `/api/status` — `database: "ready"` when all 6 WeekFlow tables exist.

### Database commands
| Command | Purpose |
|---------|---------|
| `npm run db:migrate` | Apply pending SQL migrations |
| `npm run db:push` | Drizzle-kit push (dev schema sync) |

## Scripts
| Command | Purpose |
|---------|---------|
| `npm run dev` | Express + Vite HMR (development) |
| `npm run build` | Vite client → `dist/public`, server → `dist/index.js` |
| `npm run start` | Production server (after build) |

## Auth env vars (Phase 11–11b)

| Var | Purpose |
|-----|---------|
| `SESSION_SECRET` | Enables auth gateway (required for production) |
| `SUPER_ADMIN_EMAIL` | Bootstrap super admin on first register |
| `SIGNUP_MODE` | `closed` (default), `allowlist`, or `open` |
| `SIGNUP_ALLOWLIST_EMAILS` | Comma-separated emails allowed to register |
| `APP_URL` | Public app URL for invite/reset links |
| `SMTP_URL` | Optional HTTP webhook — POST `{ to, subject, text, html }` to send auth emails |

When `SMTP_URL` is not set, reset and invite links are logged on the server and surfaced in the UI for dev preview.

## Cloudflare Access (optional edge gate)

For a custom domain on Replit, you can put **Cloudflare Access** in front of the app so only approved identities reach MyAxis at all:

1. Point the domain through Cloudflare and proxy the Replit deploy origin.
2. In Zero Trust → Access → Applications, create a self-hosted app for your hostname.
3. Add an Allow policy (e.g. emails in your Google Workspace or a one-time PIN).
4. MyAxis session login (Phase 11) still applies **after** the edge gate — Access protects the origin; MyAxis protects household data and OAuth tokens.

This is optional but recommended for owner-only deployments before wider household invites.

## Prototype vs full build
- **Now**: client state in localStorage; mock email/calendar data; optional Microsoft Graph when OAuth env vars are set.
- **Later**: Gmail OAuth, household cloud sync, OneDrive folder picker UI.

## Key paths
- `src/` — React app
- `server/` — Express API (extend here)
- `src/types.ts` — item/category models
