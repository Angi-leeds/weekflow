# WeekFlow — Phased Build Plan

**Handoff document for implementation agents (Opus 4.8+).**  
Read this fully before writing code. All product decisions below are **locked** unless marked *open* or *deferred*.

---

## 1. Product summary

**WeekFlow** is a mobile-first personal hub: week-list calendar, email, tasks, and settings. It includes an integrated **family noticeboard** (formerly a separate app called **Corky**) as a **view/mode inside WeekFlow** — not a separate product.

**Signature UX:** week-list-first calendar on phone; landscape → week board.  
**North star:** WeekFlow is a **smart client** — calendar, mail, tasks, and their attachments live in the user's **own accounts** (Microsoft 365, Gmail, Apple). WeekFlow cloud (Replit PostgreSQL) holds only the **enhancement layer**: household sharing, link graph, board layout, voice pins.

**Primary user story (bill email):** Mum receives bill → one action flow creates calendar entry + pay-before task + tags OneDrive folder + optional auto-copy of email + optional share to family board → everything linked → on due date she opens calendar item and jumps to email, folder, and task in one place.

---

## 2. Current state (as of handoff)

### 2.1 Repository & hosting

| Item | Value |
|------|--------|
| GitHub | `https://github.com/Angi-leeds/weekflow` |
| Branch | `main` |
| Latest commit | `82fab61` — *Update server routing to fix wildcard compatibility issues* (Replit Agent) |
| Local path (owner) | `Apps Folders/Projects Git/weekflow` |
| Hosting | **Replit** (import from GitHub) |
| Dev URL | Replit published URL, port **5000** |
| Platform | **Web app** in browser (prototype). Native iOS/Android = later phase. |

### 2.2 Infrastructure on Replit

| Service | Status | Env var |
|---------|--------|---------|
| PostgreSQL | **Attached** — empty, no tables yet | `DATABASE_URL` |
| Object Storage | **Being attached / configured** | `DEFAULT_OBJECT_STORAGE_BUCKET_ID` |
| Health check | `GET /api/health` | — |
| Status check | `GET /api/status` — reports DB + storage configured or not | — |

**Migrations:** Use **Drizzle ORM** + migration scripts (match pattern from owner's `menagerie` repo). Do **not** hand-create tables in Replit UI. First schema slice is Phase 1 below.

### 2.3 Stack

- **Frontend:** React 19, Vite 8, TypeScript, Tailwind v4, lucide-react
- **Backend:** Express 5, `tsx` dev, esbuild production bundle
- **Server entry:** `server/index.ts` → `registerRoutes` → Vite middleware (dev) or static `dist/public` (prod)
- **Important:** Express 5 — **do not use** legacy `app.use("*", ...)` catch-all routes (crashes). Use pathless middleware (see `server/vite.ts` on `main`).

### 2.4 What's already built (UI prototype)

| Area | Status | Key files |
|------|--------|-----------|
| Week-list calendar | ✅ Working | `src/components/WeekListPortrait.tsx`, `WeekView.tsx`, `WeekBoardLandscape.tsx` |
| Day / month / agenda / year views | ✅ Working | `DayView.tsx`, `MonthView.tsx`, etc. |
| User-managed categories + colours | ✅ Working, localStorage | `src/categories.ts`, `CategoriesManager.tsx`, `types.ts` |
| Planner / tasks view | ✅ Mock data | `PlannerView.tsx`, `mockData.ts` |
| Email view | ✅ Mock data, **action bar placeholder** | `EmailView.tsx` — Task/Event/Snooze/Link chips say "coming soon" |
| Settings | ✅ Categories manager | `SettingsView.tsx` |
| Item create/edit modal | ✅ Working | `ItemFormModal.tsx` |
| Link graph | ❌ Not built | — |
| Household / family board | ❌ Not built | — |
| Attachments | ❌ Not built | — |
| Real OAuth / Graph | ❌ Deferred | — |

### 2.5 Data today

- **Calendar items & emails:** in-memory React state seeded from `src/mockData.ts`
- **Categories:** `localStorage` key via `CATEGORIES_STORAGE_KEY` in `src/categories.ts`
- **No PostgreSQL tables yet** — intentional; Phase 1 creates schema

### 2.6 Related repos (reference only — do not merge)

| Repo | Use |
|------|-----|
| `Corky/index.html` | Mature v2.2 corkboard UX (~8900 lines) — **borrow UX patterns**, not code architecture |
| `menagerie` | Replit + Drizzle + PostgreSQL + Object Storage patterns |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (phone / laptop / iPad Safari)                      │
│  React app (src/) — week list, email, planner, board mode   │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST /api/*
┌──────────────────────────▼──────────────────────────────────┐
│  Express (server/) — port 5000                               │
│  Phase 1+: Drizzle → PostgreSQL                              │
│  Phase 4+: Object storage uploads                            │
└──────────┬─────────────────────────────┬────────────────────┘
           │                             │
    ┌──────▼──────┐              ┌───────▼────────┐
    │ PostgreSQL  │              │ Object Storage │
    │ (Replit)    │              │ (Replit)       │
    │ household,  │              │ photos, PDF,   │
    │ links, pins │              │ voice audio    │
    └─────────────┘              └────────────────┘

Future (Full build):
    ┌──────────────────────────────────────┐
    │ Microsoft Graph / Gmail / Apple      │
    │ Source of truth for mail, calendar,  │
    │ tasks, attachments on provider items │
    └──────────────────────────────────────┘
```

### 3.1 Data classification (document in Settings help page)

| Tier | What | Survives uninstalling WeekFlow? |
|------|------|----------------------------------|
| **Source (provider)** | Events, mail, tasks, attachments on those items, provider categories, folder URLs in link fields, copies in user's OneDrive/Drive | ✅ Yes — in Outlook/Gmail/Apple |
| **WeekFlow cloud (PostgreSQL + object storage)** | Household, share flags, link graph, board layout, voice pins, display presets | ⚠️ Only if WeekFlow account/household kept |
| **Device local** | Kiosk unlocked session, offline cache | ❌ Ephemeral |

---

## 4. Core data models (target)

### 4.1 Existing client types (`src/types.ts`)

```typescript
CalendarItem { id, title, date, endDate?, startTime?, endTime?, allDay, categoryId, colour, notes?, completed? }
EmailMessage { id, from, fromEmail, subject, preview, body, date, unread, starred, flagged, category, labels[] }
Category { id, name, colour, kind: 'event'|'task'|'reminder', isDefault? }
```

### 4.2 Add for Phase 1–2 (shared `shared/schema.ts` or `server/db/schema.ts`)

```typescript
// Link graph (d7)
Link {
  id: uuid
  fromType: 'email' | 'calendar' | 'task' | 'board_pin'
  fromId: string        // client item id or external id later
  toType: same enum + 'folder_ref'
  toId: string
  kind: 'created_from' | 'relates_to' | 'follow_up' | 'folder_ref'
  folderUrl?: string    // when kind = folder_ref
  folderProvider?: string // 'onedrive' | 'gdrive' | 'icloud'
  householdId: uuid
  createdAt
}

// Household enhancement layer
Household { id, name, ownerUserId, createdAt }
HouseholdMember { id, householdId, userId, role: 'owner'|'member', displayName, permissionsJson? }

ItemShare {
  id, householdId
  itemType: 'email'|'calendar'|'task'
  itemId: string          // references mock id now; external id later
  sharedToBoard: boolean
  boardDisplay: 'title_only'|'title_date'|'title_photo'|'invite_card'
  sharedBy: userId
}

BoardPin {
  id, householdId
  itemType?, itemId?      // optional link to calendar/task/email
  x, y, rotation?
  pinStyle?: string        // emoji or colour
  contentJson              // text, voice ref, photo ref
  dismissedAt?
}

Attachment {
  id, householdId
  itemType, itemId
  storageKey               // object storage path
  mimeType, filename
  kind: 'photo'|'pdf'|'voice'|'document'|'url'
}
```

### 4.3 Provider IDs (full build — defer)

When Graph is wired, items get `externalId` + `provider` + `accountId` fields. Prototype uses local string IDs from mock data.

---

## 5. Locked product decisions (d1–d63)

Implement these. Do not second-guess without explicit owner approval.

| ID | Decision |
|----|----------|
| d1 | Week-list-first; landscape → week board |
| d2 | User-managed categories + colour; kind = event/task/reminder |
| d4–d7 | Multi-directional link graph; unified action bar; Link entity with kinds including `folder_ref` |
| d8 | Connected accounts drive core data — not proprietary silo |
| d9 | Corky = view inside WeekFlow only |
| d10–d13 | Hub + household display; kiosk mode; PIN + timeout; opt-in share per item |
| d15–d17 | Invite-to-household; configurable permissions; private until shared |
| d18–d23 | Board layouts: freeform / split / kanban; drag-drop; pin styles; photos; sleep photo frame |
| d26–d33 | Attachments on any item; board display options; invite-style pins; email→calendar+task flow; link chips + click-through |
| d34–d39 | Voice messages; targeted recipients; pulsing unread; replies; stay until dismissed |
| d40–d46 | Full attachment types; sync mutations to provider; Data & sync help page; data classification |
| d48–d56 | Cloud folder refs; auto-copy; copy format prefs; per-item folder picker; cloud OAuth |
| d57–d59 | Multiple email accounts; merged/per-account/folder views |
| d60 | **Microsoft-first** for real integrations |
| d61 | Web app prototype; native apps later |
| d62–d63 | Replit PostgreSQL + object storage; hosted from early prototype |

**Deferred (do not build in prototype phases):** d3 Outlook category sync, d24 device photo folder sync, d37 voice full build, d47 provider OAuth, d53 folder picker full build.

**Prototype slices (build in phases below):** d6, d7, d14, d25, d33, d59.

---

## 6. Git workflow (CRITICAL)

Owner works in **two places**: Cursor (local) and **Replit**.

**Rules:**
1. **One writer at a time** — finish push/pull before starting work in the other environment.
2. After Cursor pushes → Replit: `git pull origin main`
3. After Replit pushes → Cursor: `git pull origin main`
4. **Never** fix the same bug in both places without syncing — causes diverged branches (already happened with Express 5 routing).
5. Replit Agent's routing fix on `main` is authoritative for Express 5.
6. Do **not** force-push `main` without owner approval.

---

## 7. Phased build plan

Each phase has **goal**, **tasks**, **acceptance criteria**, and **files likely touched**. Complete phases in order unless owner reprioritises.

---

### Phase 0 — Done ✅

- [x] React prototype with week list, categories, mock email/planner
- [x] Express + Vite on port 5000
- [x] GitHub repo + Replit import
- [x] PostgreSQL attached (empty)
- [x] Object storage attaching
- [x] Express 5 routing fix (Replit)

---

### Phase 1 — Database foundation

**Goal:** Drizzle schema, migrations, DB connection, prove `/api/status` shows tables exist.

**Tasks:**
1. Add dependencies: `drizzle-orm`, `drizzle-kit`, `pg`, `@types/pg`
2. Create `drizzle.config.ts`, `server/db/index.ts`, `server/db/schema.ts`
3. Initial migration: `households`, `household_members`, `links`, `item_shares`, `board_pins`, `attachments` (see §4.2)
4. Add scripts: `"db:push": "drizzle-kit push"`, `"db:migrate": "..."` (copy pattern from `menagerie`)
5. Wire `registerRoutes` — `/api/status` returns `{ database: "configured", tables: N }`
6. Add `[postMerge]` or document: run migrations after deploy
7. Update `replit.md` with migration commands

**Acceptance criteria:**
- `npm run db:push` (or migrate) creates tables on Replit PostgreSQL
- `/api/status` → `database: "configured"`
- `npm run build` passes
- No changes to calendar/email UI behaviour yet

**Do NOT yet:** auth, real household invites, move calendar data off mockData.

---

### Phase 2 — Link graph (prototype v1)

**Goal:** Prove email ↔ calendar ↔ task linking with visible back-links. **d6, d7**

**Tasks:**
1. API: `GET/POST/DELETE /api/links`, `GET /api/links/for/:type/:id`
2. Client: `src/lib/links.ts` — fetch/sync link store; fallback localStorage if offline
3. **EmailView action bar:** wire **Task** → create task from email + auto-link; **Link existing…** picker modal
4. **ItemFormModal / detail:** show link chips (📧 📅 ✓ 📁) — **d30**
5. Click chip → navigate to linked item — **d31**
6. Persist links to PostgreSQL (householdId = single mock household UUID for now)

**Acceptance criteria:**
- Select email → Create Task → task appears in planner with chip back to email
- Email detail shows task chip; tapping navigates
- Links survive page refresh (PostgreSQL)
- Link existing picker works for calendar items

**Reference UX:** unified action bar on email, calendar detail, planner — **d5**

---

### Phase 3 — Household share flag + multi-account email mock

**Goal:** Opt-in family board visibility + richer email UI. **d13, d17, d59**

**Tasks:**
1. Add `shareToHousehold` + `boardDisplay` to item share API and UI toggles on ItemFormModal + EmailView action flow
2. `ItemShare` rows in PostgreSQL keyed by itemType + itemId
3. **Email mock expansion:**
   - 2–3 mock accounts (work Outlook, personal Gmail, etc.)
   - Account/folder picker sidebar or dropdown
   - Merged inbox with account badge per message — **d58**
   - Per-account and folder tree views (static mock folders)
4. Settings: placeholder **Connected accounts** section (mock, no OAuth)

**Acceptance criteria:**
- Toggle "Share to family board" on an event — flag persists in DB
- Email view switches merged / single-account / folder mock
- Default = not shared

---

### Phase 4 — Family board mode (prototype v1 board)

**Goal:** Corky-style board inside WeekFlow. **d14, d25**

**Tasks:**
1. New section or mode: `AppSection` add `'board'` or toggle **Family board mode** in settings/device
2. **Layout v1:** calendar + board split (Corky-style) — **d18** preset locked for v1
3. Freeform board: render shared items as pins; drag to reposition — **d20**
4. Filter: only items with `shareToBoard = true` — **d13**
5. Display presets per item: title only / title+date / title+photo / invite card — **d27, d28**
6. Store pin positions in `board_pins` table
7. Kiosk shell (minimal): fullscreen board view; PIN gate stub for leaving — **d11, d12** (PIN = localStorage 4-digit for prototype)

**Acceptance criteria:**
- Share event with photo → appears on board as invite-style card
- Drag pin on board; position persists
- Split view shows calendar + board together
- Kiosk mode hides email nav without PIN (stub OK)

**Borrow from:** `Corky/index.html` — pin visuals, cork texture, drag behaviour.

---

### Phase 5 — Email action flow + mock attachments

**Goal:** Bill scenario end-to-end with mock data. **d29, d33, d40**

**Tasks:**
1. Email action bar full flow modal: ☑ Calendar ☑ Task ☑ Share to board ☑ Tag folder (mock path) ☑ Auto-copy (toast)
2. Single submit creates linked graph (email + calendar + task + optional folder_ref link)
3. Mock attachment picker on calendar/event — photo from file input; store in object storage when ready, else base64/mock URL
4. Connection chips on board pins for linked email/task/folder — **d30**
5. **Data & sync help page** in Settings — static tables, "Safe at source" vs "WeekFlow only" — **d43, d44**

**Acceptance criteria:**
- Bill email → one flow → calendar + task + links + optional board pin
- Open calendar item on due date → chips open email, mock folder, task
- Help page renders sync matrix

---

### Phase 6 — Object storage + attachment API

**Goal:** Real file uploads to Replit object storage. **d62, d26**

**Tasks:**
1. Object storage service module (see `menagerie` Replit storage patterns)
2. `POST /api/attachments` multipart upload → storage key + DB row
3. Wire photo attach on events; serve via signed URL or public path
4. `/api/status` → `objectStorage: "configured"`

**Acceptance criteria:**
- Attach photo to event → file in object storage → preview in UI
- Attachment metadata in PostgreSQL

---

### Phase 7 — Board v2 + voice mock

**Goal:** Richer board + voice UX mock. **d21–d23, d34–d38 (mock only)**

**Tasks:**
1. Kanban layout option (people OR status columns) — **d19**
2. Pin style picker (emoji pins) — **d21**
3. Photo pins on board — **d22**
4. Sleep mode: cycle board photos when idle — **d23**
5. Voice pin **mock:** waveform UI, pulsing CSS, reply thread stack — no real recording yet — **d37 prototype half**

**Acceptance criteria:**
- User can switch layout freeform / kanban / split
- Voice pin pulses; play shows mock audio; reply adds thread entry

---

### Phase 8 — Permissions settings + multi-calendar mock

**Goal:** Configurable household permissions; calendar account picker mock.

**Tasks:**
1. Settings → Household permissions matrix (defaults + per-member overrides) — **d45**
2. Mock multi-calendar: merged week view + per-account filter (mirror email pattern)
3. Voice dismiss permissions configurable — **d39**

---

### Phase 9 — Microsoft Graph integration (full build begins)

**Goal:** Real Outlook mail, calendar, To Do, OneDrive. **d47, d60**

**Priority order:**
1. OAuth Microsoft identity + Graph scopes
2. Mail read/send — multi-account — **d57, d58**
3. Calendar CRUD + attachments sync to Exchange — **d41, d42**
4. To Do tasks
5. OneDrive folder picker + auto-copy — **d48–d56**
6. Extended properties for link graph where possible — **d46**

**Acceptance criteria:**
- Connect real Microsoft account in Settings
- Real email appears in merged inbox
- Create event in WeekFlow → appears in Outlook
- Attach photo → Exchange event attachment

---

### Phase 10 — Google + Apple + native apps (deferred overview)

- Google Gmail/Calendar/Drive OAuth
- Apple iCloud (limited APIs — hyperlink fallbacks in notes — **d50**)
- Native iOS/Android wrapper or Capacitor — **d61** later phase
- Voice recording + push notifications — **d37** full
- Billing / household subscription — **d15**

---

## 8. UI conventions

- **Mobile-first** — test at 390px width; Replit wide preview will look empty (expected).
- **Tailwind v4** — `src/index.css` for theme tokens.
- **Categories** propagate colour to items via `categoryId`.
- **Bottom nav:** Calendar | Today | Planner | Email | Settings (`BottomNav.tsx`).
- **Do not** prop-drill excessively — small app OK to extend existing patterns in `App.tsx`.
- **Minimise scope** — each PR/phase should be reviewable; no drive-by refactors.

---

## 9. Key scenarios (acceptance test scripts)

### Scenario A — Party invite
1. Create event with date
2. Attach photo of paper invite
3. Share to board, display = invite card
4. Board shows photo + title; calendar shows attachment chip

### Scenario B — Bill email
1. Open bill email (mock)
2. Action: calendar (due date) + task (3 days before) + tag folder (mock OneDrive path) + share to board
3. Auto-copy toast
4. On due date: calendar item shows 📧 ✓ 📁 chips; each navigates correctly

### Scenario C — Voice message (Phase 7 mock)
1. Mum records "Feed the cat" to Dad + board
2. Dad's view: pulsing pin; play stops pulse for Dad
3. Dad replies "Cat fed ✓"
4. Pin stays until dismissed

### Scenario D — Kiosk
1. Enable family board mode on iPad
2. Shared items visible; email body not exposed without PIN
3. PIN timeout returns to board

---

## 10. Open items (not blocking — use sensible defaults)

| Topic | Recommended default |
|-------|---------------------|
| Multi-calendar merged view | Same as email — mock in Phase 8 |
| Kiosk: show targeted voice pins? | Household-wide on board; targeted on personal devices |
| Extended properties for links on Exchange | Try Graph open extensions; fallback PostgreSQL |
| Recent folders in picker | Last 5 paths, user-specific in DB |
| Export household data | Phase 10 |

---

## 11. Commands reference

```bash
# Development (Replit + local)
npm install
npm run dev          # → http://localhost:5000

# Production build
npm run build
npm run start

# Database (after Phase 1)
npm run db:push      # or db:migrate per setup

# Verify
curl http://localhost:5000/api/health
curl http://localhost:5000/api/status
```

---

## 12. Agent instructions

1. **Read** `replit.md`, `src/types.ts`, `src/App.tsx`, `server/routes.ts` before editing.
2. **Start at Phase 1** unless owner specifies otherwise.
3. **Do not** wire Stripe, OpenAI, or unrelated integrations.
4. **Do not** merge Corky as separate app — board is a mode in WeekFlow.
5. **Do not** move calendar/email to PostgreSQL as system of record — only enhancement layer.
6. **Match** menagerie Drizzle/Replit patterns for DB and object storage.
7. **Test** mobile viewport after UI changes.
8. **One phase per PR** where possible — easier review.
9. After completing a phase on Replit: **push to GitHub**; tell owner to pull in Cursor.

---

## 13. Decision log location

Full interactive decision canvas (63 decisions):  
`_app-review-kit/canvases/weekflow-firm-decisions.canvas.tsx`  
(Owner resets to seed for latest entries.)

---

*Document version: 2026-06-23 — prepared for Opus 4.8 agent handoff.*
