# WeekFlow

## Overview
WeekFlow is a mobile-first personal hub (week-list calendar, email, tasks) with an integrated family noticeboard mode (formerly Corky). Prototype uses mock data locally; full build syncs to Microsoft 365 / Google / Apple accounts.

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

## Prototype vs full build
- **Now**: client state in localStorage; mock email/calendar data; API health endpoints only.
- **Later**: Graph/Gmail OAuth, household cloud sync, folder tagging via OneDrive API.

## Key paths
- `src/` — React app
- `server/` — Express API (extend here)
- `src/types.ts` — item/category models
