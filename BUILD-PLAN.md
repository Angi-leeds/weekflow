# MyAxis (WeekFlow repo) — Phased Build Plan

**Handoff document for implementation agents (Opus 4.8+).**  
Read this fully before writing code. All product decisions below are **locked** unless marked *open* or *deferred*.

**Naming:** User-facing product name is **MyAxis** (`src/branding.ts`). GitHub/Replit repo stays **`weekflow`** — do not rename the repo or `package.json` name (avoids Replit/deploy breakage).

---

## 1. Product summary

**MyAxis** (repo: WeekFlow) is a mobile-first personal hub: week-list calendar, email, tasks, contacts, notes, and settings. It includes an integrated **family noticeboard** (formerly a separate app called **Corky**) as a **view/mode inside the app** — not a separate product.

**Signature UX:** week-list-first calendar on phone; landscape → week board.  
**North star:** MyAxis is a **smart client** — calendar, mail, tasks, notes, contacts, and their attachments live in the user's **own accounts** (Microsoft 365, Gmail, Apple). MyAxis cloud (Replit PostgreSQL) holds only the **enhancement layer**: household sharing, link graph, board layout, voice pins.

**Primary user story (bill email):** Mum receives bill → one action flow creates calendar entry + pay-before task + tags OneDrive folder + optional auto-copy of email + optional share to family board → everything linked → on due date she opens calendar item and jumps to email, folder, and task in one place.

**Account model (locked for Phase 9b+):** Every provider item is associated with a **connected account** (`accountId`). Where the provider has sub-containers (mail folder, calendar, To Do list, note folder), the user picks a target on create or sets a **default** in Settings — mirroring Outlook/Gmail UX, not a single global bucket.

---

## 2. Current state (as of 2026-06-23)

### 2.1 Repository & hosting

| Item | Value |
|------|--------|
| Product name (UI) | **MyAxis** |
| GitHub | `https://github.com/Angi-leeds/weekflow` |
| Branch | `main` |
| Hosting | **Replit** (import from GitHub) |
| Dev URL | Replit published URL, port **5000** |
| Platform | **Web app** in browser (prototype). Native iOS/Android = Phase 10. |

### 2.2 Infrastructure on Replit

| Service | Status | Env var |
|---------|--------|---------|
| PostgreSQL | **Attached** — migrations on server start | `DATABASE_URL` |
| Object Storage | Optional — local fallback in dev | `DEFAULT_OBJECT_STORAGE_BUCKET_ID` |
| Microsoft OAuth | Optional — real Outlook when secrets set | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_REDIRECT_URI`, `APP_URL` |
| Health check | `GET /api/health` | — |
| Status check | `GET /api/status` | — |

**Migrations:** Drizzle + SQL migrations in `migrations/`; `applyPendingMigrations()` runs on server start.

### 2.3 Stack

- **Frontend:** React 19, Vite 8, TypeScript, Tailwind v4, lucide-react
- **Backend:** Express 5, `tsx` dev, esbuild production bundle
- **Server entry:** `server/index.ts` → `registerRoutes` → Vite middleware (dev) or static `dist/public` (prod)
- **Important:** Express 5 — **do not use** legacy `app.use("*", ...)` catch-all routes (crashes). Use pathless middleware (see `server/vite.ts`).

### 2.4 What's already built

| Area | Status | Key files |
|------|--------|-----------|
| Week-list calendar + day/month/agenda/year | ✅ | `WeekView.tsx`, `MonthView.tsx`, etc. |
| Categories + interactive Settings | ✅ | `SettingsView.tsx`, `appSettings.ts` |
| Email (merged / account / folder UI) | ✅ UI; real mail when OAuth | `EmailView.tsx` |
| Contacts hub (local + mock; Outlook fields) | ✅ | `ContactsView.tsx`, `contacts.ts` |
| Notes hub (Outlook sticky notes sync) | ✅ single account | `NotesView.tsx`, `microsoft-graph-service.ts` |
| Planner / tasks | ✅ mock + Graph To Do create | `PlannerView.tsx` |
| Family board + kiosk + kanban + voice mock | ✅ | `FamilyBoardView.tsx`, `BoardSplitView.tsx` |
| Link graph + share to board | ✅ | `links.ts`, `itemShares.ts`, `ShareToBoardFields.tsx` |
| Share notes/email/calendar/tasks to board | ✅ | `boardItemHelpers.ts` |
| Attachments API | ✅ | `attachments.ts`, object storage or local |
| Household permissions matrix | ✅ | `HouseholdPermissionsView.tsx` |
| **Microsoft Graph Phase 9a** | ✅ **single account** | `microsoft.ts`, `connected-account-service.ts` |
| **Microsoft Graph Phase 9b** | ❌ **NEXT** | multi-account fetch, pickers, defaults — see §7 Phase 9b |
| **Auth gateway + super admin** | ❌ **Phase 11** | custom domain currently **open** — see §7 Phase 11 |

### 2.5 Security note (custom domain — interim)

MyAxis may be live on a **custom domain** before Phase 11. There is **no login wall** yet — anyone with the URL can use the app. Household/kiosk PIN is **not** app authentication.

**Until Phase 11 ships:** owner may use Replit deployment access control, Cloudflare Access, or similar at the edge. **Do not** share the public URL widely. Phase 11 is **required before general availability**.

### 2.6 Data today

- **Provider PIM (mail, calendar, notes):** Microsoft Graph when connected; mock hidden when real account connected
- **Contacts, local notes:** `localStorage` + in-memory state
- **Enhancement layer (links, shares, pins):** PostgreSQL when `DATABASE_URL` set; localStorage fallback
- **OAuth tokens:** PostgreSQL `connected_accounts` or `.local-connected-accounts/` fallback

### 2.7 Related repos (reference only — do not merge)

| Repo | Use |
|------|-----|
| `Corky/index.html` | Mature v2.2 corkboard UX — **borrow UX patterns**, not code architecture |
| `menagerie` | Replit + Drizzle + PostgreSQL + Object Storage; **auth, sessions, super admin console** — primary reference for Phase 11 |

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
CalendarItem { id, title, date, …, accountId, externalId?, provider?, connectedAccountId?, calendarId?, calendarName? }
EmailMessage { id, accountId, folderId, …, externalId?, provider?, connectedAccountId? }
Note { id, title, body, accountId?, externalId?, provider?, connectedAccountId?, … }
Contact { id, name, …, source?, externalId?, connectedAccountId? }
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
  itemType: 'email'|'calendar'|'task'|'note'
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

### 4.3 Provider IDs & account association (Phase 9+)

When Graph is wired, items get `externalId` + `provider` + `accountId` (+ `connectedAccountId` UUID). Phase 9b adds sub-container IDs where needed:

| Item type | Account field | Sub-container (Phase 9b) |
|-----------|---------------|---------------------------|
| Email | `accountId` | `folderId` (Inbox, Sent, … from Graph) |
| Calendar event | `accountId` | `calendarId` + display name |
| Note | `accountId` | note folder (default Notes; optional folder picker later) |
| Contact | `connectedAccountId` | address book / source account |
| To Do task | `accountId` | `todoListId` + list name |

**Defaults (Phase 9b):** Settings stores per-user preferences: default connected account and default sub-container per item type (see §7 Phase 9b).

### 4.4 Integration preferences (Phase 9b — add to client + optional DB)

```typescript
IntegrationAccountDefaults {
  defaultMicrosoftAccountId?: string   // connected_accounts.id
  email: { defaultAccountId?, defaultFolderId? }
  calendar: { defaultAccountId?, defaultCalendarId? }
  notes: { defaultAccountId? }
  tasks: { defaultAccountId?, defaultTodoListId? }
  contacts: { defaultAccountId? }
}
```

Persist in `appSettings.ts` (localStorage) for prototype; migrate to `household_members` or user prefs row in full build.

---

## 5. Locked product decisions (d1–d74)

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
| d64 | **Every provider item carries `accountId`** — no orphan mail/calendar/notes/tasks |
| d65 | **Create flows offer account + sub-container picker** (calendar, folder, To Do list) with remembered defaults |
| d66 | **Multi-account Graph fetch** — sync all connected Microsoft accounts, not first-only |
| d67 | **Context-aware defaults** — e.g. create task from email pre-selects that email's account |
| d68 | **Contacts sync per account** — Graph `Contacts.Read`; local + provider contacts tagged by source |
| d69 | **App auth gateway** — MyAxis UI + `/api/*` (except health/auth/oauth callback) require logged-in user |
| d70 | **Super admin** — `users.is_super_admin` in DB; seeded for owner only; never set via public API |
| d71 | **Registration mode** — `closed` \| `allowlist` \| `open`; launch on custom domain starts **`closed`** / allowlist owner email only |
| d72 | **Super admin console** — separate admin UI + `/api/super-admin/*`; pattern copied from **menagerie** |
| d73 | **Household scoped to user** — each signup creates or joins a household; enhancement data keyed by `householdId` + `userId` |
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

### Phase 9 — Microsoft Graph integration

**Goal:** Real Outlook mail, calendar, To Do, notes, OneDrive. **d47, d60**

Split into three slices. **Do Phase 9b before Phase 10** — Google/Apple build on the same account model.

---

#### Phase 9a — Single-account Graph ✅ (Done)

**Goal:** Prove OAuth + read/write against one Microsoft 365 / Outlook account.

**Done:**
1. OAuth Microsoft identity + Graph scopes (`Mail.Read`, `Calendars.ReadWrite`, `Tasks.ReadWrite`, `Notes.ReadWrite`, `Files.Read.All`, …)
2. `connected_accounts` + token refresh; PostgreSQL or local fallback
3. Mail read (inbox), calendar read + event create/sync, notes read/write, To Do task create
4. Mock data auto-hide when real account connected
5. Contacts UI (local/mock), Notes UI, interactive Settings, share to family board (incl. notes)
6. UI patterns for merged / per-account email and calendar filters (ready for 9b data)

**Known limitation (intentional until 9b):** `refreshMicrosoft()` uses `status.accounts[0]` only; "Add another account" stores extra accounts but does not sync them.

**Acceptance criteria:** ✅ Connect one Outlook account on Replit → real mail, calendar, notes in app.

---

#### Phase 9b — Multi-account & account-aware sync ⬅ **NEXT**

**Goal:** Multiple Outlook accounts + every item tied to the right account and sub-container, like Outlook. **d57–d59, d64–d68**

**Priority order:**

1. **Multi-account fetch (foundation)**
   - Loop all `connected_accounts` (Microsoft) in `refreshMicrosoft()` — parallel Graph calls
   - Merge mail, calendar events, notes with stable `accountId` / `connectedAccountId` on every item
   - Remove "uses first account for now" copy in `MicrosoftConnectPanel.tsx`

2. **Settings — Connected accounts & defaults**
   - Section: list all connected accounts (disconnect per account)
   - **Default account** pickers per data type: Email, Calendar, Notes, Tasks, Contacts
   - **Default sub-container** where applicable: calendar, mail folder, To Do list
   - Persist via `IntegrationAccountDefaults` (§4.4) in `appSettings.ts`
   - Reconnect prompt when scopes change (e.g. after adding `Contacts.Read`)

3. **Email — multi-account like Outlook**
   - Merged inbox: all accounts, **account badge** on each message (UI exists — wire data)
   - Per-account view: filter chips / sidebar (exists — wire data)
   - **Folder tree from Graph** per account: Inbox, Sent, Drafts, Deleted, custom folders — **d59**
   - `GET /api/microsoft/mail/folders?accountId=` + `GET .../mail?accountId=&folderId=`
   - Send mail (defer compose UI to 9c if needed; defaults must be set in 9b)

4. **Calendar — account + calendar picker**
   - Fetch events from **all calendars** (or user-selected calendar set in Settings)
   - `GET /api/microsoft/calendars?accountId=` → list calendars
   - Tag each event with `calendarId` + human-readable name
   - **ItemFormModal:** "Save to calendar" dropdown (grouped by account)
   - Default calendar per account in Settings; fallback to provider default calendar
   - Create/update event → `POST/PATCH /me/calendars/{calendarId}/events` (not only default)

5. **Notes — per account**
   - Fetch notes from every connected account; merge in Notes tab
   - Account badge + filter (All / account chips)
   - Create note: account selector + "Save to Outlook" uses chosen account
   - Default notes account in Settings

6. **Tasks / To Do — per account + list picker**
   - `GET /api/microsoft/todo/lists?accountId=` for each account
   - **ItemFormModal / email→task flow:** pick account + To Do list
   - Default list per account in Settings (replace hard-coded `defaultList` only)
   - Planner shows source account/list label on synced tasks

7. **Contacts — Outlook sync per account**
   - Add Graph scope: `Contacts.Read` (and `Contacts.ReadWrite` if editing back)
   - `GET /api/microsoft/contacts?accountId=`
   - Merge with local contacts; tag `source: 'microsoft'`, `connectedAccountId`
   - Contacts view: filter by account; default account for new contacts
   - Dedupe same email across accounts: *open* — show both with account badge in v1; merge UI later

8. **Create-from-context rules (d67)**
   - Email action flow → calendar/task/note uses **source email's `accountId`**
   - Board share / links unchanged — already keyed by item id + type

**Files likely touched:**
- `src/App.tsx` (`refreshMicrosoft`, create handlers)
- `src/lib/connectedAccounts.ts`, `src/lib/appSettings.ts`
- `src/components/EmailView.tsx`, `CalendarNav.tsx`, `ItemFormModal.tsx`, `NotesView.tsx`, `ContactsView.tsx`, `SettingsView.tsx`
- `server/services/microsoft-graph-service.ts`, `server/routes/microsoft.ts`
- `shared/microsoftGraph.ts` (scopes)
- `migrations/0003_*.sql` — optional `provider_item_mappings.calendar_id`, user prefs JSON

**Acceptance criteria:**
- Connect **two** Outlook accounts (e.g. work + personal) → both appear in Settings
- Merged email shows messages from **both**; tap account chip → single-account view
- Calendar week list shows events from both; filter by account works
- Create event → choose **which calendar**; default remembered
- Notes from both accounts; create note → pick account
- Create task → pick **account + To Do list**; default remembered
- Contacts import from connected account(s); contact shows source account
- Disconnect one account → its items disappear from merged views; other account unaffected

**Do NOT in 9b:** Gmail/Apple (Phase 10), native apps, billing, full mail compose UI (can stub).

---

#### Phase 9c — Graph polish (remaining Phase 9)

**Goal:** Complete Microsoft parity for power features. **d41, d42, d46, d48–d56**

**Tasks:**
1. Mail **send** + reply from MyAxis — **d57**
2. OneDrive folder picker + auto-copy in email action flow — **d48–d56**
3. Extended properties / open extensions for link graph on Exchange items — **d46**
4. Calendar attachment sync polish (photos → Exchange)
5. Outlook **category** sync — **deferred (d3)** unless owner prioritises

**Acceptance criteria:**
- Send email from connected account
- Tag OneDrive folder from bill flow; link chip opens folder
- Create event with photo → attachment on Outlook event

---

### Phase 10 — Google + Apple + native apps (deferred overview)

**Prerequisite:** Phase 9b account model complete — Phase 10 **reuses** the same merged/per-account UI and defaults pattern for Gmail and Apple.

- Google Gmail/Calendar/Drive OAuth — same account picker / defaults UX as 9b
- Apple iCloud (limited APIs — hyperlink fallbacks in notes — **d50**)
- Native iOS/Android wrapper or Capacitor — **d61**
- Voice recording + push notifications — **d37** full
- Billing / household subscription — **d15**

**Not in Phase 10:** Finishing Outlook multi-account (that is **Phase 9b**).

---

### Phase 11 — Auth gateway, closed signup & super admin console

**Goal:** Protect custom-domain deployment with login; owner super admin; **no public signups at launch**. **d69–d73**

**Reference implementation (copy patterns, adapt to MyAxis household model):**

| Menagerie (My-Menagerie) | Use for MyAxis |
|--------------------------|----------------|
| `menagerie/export-docs/05-AUTHZ-ROLES-PERMISSIONS.md` | Role model, middleware patterns |
| `menagerie/shared/schema.ts` → `users.isSuperAdmin` | `users.is_super_admin` flag |
| `menagerie/server/routes.ts` → Passport local, `/api/auth/login`, `/api/auth/register`, sessions | Same stack (express-session + passport-local + bcrypt) |
| `menagerie/server/routes.ts` → `/api/super-admin/*` + `requireSuperAdmin` | Super admin API namespace |
| `menagerie/client/src/pages/super-admin/app-control-centre.tsx` | Super admin dashboard UX reference |
| `menagerie/client/src/lib/super-admin-usage.ts` | Client helpers for admin API |

**Do not merge menagerie code wholesale** — MyAxis uses **households** (not orgs/tenants) but the auth + super-admin *shape* is the same: session gate, DB flag, admin-only routes.

**Priority order:**

1. **Database — users & sessions**
   - Migration: `users` (`id`, `email`, `username`, `password` bcrypt, `display_name`, `is_super_admin`, `household_id`, `created_at`)
   - Link existing `households` / `household_members` to real `userId` (replace demo `demo-user` string gradually)
   - Session store: PostgreSQL (`connect-pg-simple`) on Replit — match menagerie

2. **Auth gateway (backend)**
   - `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/user`
   - `isAuthenticated` middleware on all `/api/*` except: `/api/health`, `/api/status`, `/api/auth/*`, `/api/microsoft/auth/callback`
   - Rate limit auth routes (menagerie `RateLimiters.auth` pattern)

3. **Registration lock (owner-only at launch) — d71**
   - Env: `SIGNUP_MODE=closed|allowlist|open` (default **`closed`** for production)
   - Env: `SIGNUP_ALLOWLIST_EMAILS=owner@example.com` (comma-separated)
   - `closed` → register returns 403 unless email on allowlist **or** first user bootstrap
   - **Bootstrap:** seed migration or `SUPER_ADMIN_EMAIL` env creates first user with `is_super_admin=true` on first deploy
   - No public "Sign up" link when closed; login page only (+ optional "Request access" mailto stub)

4. **Auth gateway (frontend)**
   - `/login`, `/register` routes (register hidden/disabled when `SIGNUP_MODE=closed`)
   - App shell (`App.tsx`) wrapped: if `GET /api/auth/user` → 401, show login — no calendar/email/board until authenticated
   - Persist session cookie; mobile-friendly login form

5. **Super admin — owner only — d70, d72**
   - Route: `/super-admin` (client) — menagerie-style wrapper: check `user.isSuperAdmin` before render
   - API: `/api/super-admin/*` behind `requireSuperAdmin` (401 if not flag)
   - **v1 admin tools (MyAxis-specific):**
     - System stats (`/api/status` deep: DB, storage, Graph configured, user count, household count)
     - User list + disable/delete (non-admin users)
     - Toggle `SIGNUP_MODE` / edit allowlist (stored in DB `global_settings` or env override table)
     - View connected Microsoft accounts count (not tokens)
     - Audit log tail (optional v1 — link to menagerie audit pattern)
   - Owner account: **`is_super_admin=true`** set only via seed/SQL/env — admin UI cannot self-promote

6. **Scope Microsoft OAuth per user**
   - `connected_accounts` → add `user_id` (FK) so tokens belong to logged-in user, not global demo household
   - Graph connect in Settings requires app login first

7. **Household invite flow (minimal)**
   - Defer full invite emails to Phase 11b or Phase 15 billing — for v1 super admin can create user rows manually

**Env vars (Phase 11):**

| Var | Purpose |
|-----|---------|
| `SESSION_SECRET` | Express session signing (required) |
| `SUPER_ADMIN_EMAIL` | Bootstrap super admin on first run |
| `SIGNUP_MODE` | `closed` (default prod), `allowlist`, `open` |
| `SIGNUP_ALLOWLIST_EMAILS` | Comma-separated emails allowed to register when closed/allowlist |

**Acceptance criteria:**
- Unauthenticated visitor to custom domain → **login page only** (no app data)
- Owner logs in with seeded super admin → full app + link to **Super Admin** in Settings or `/super-admin`
- Stranger attempts register → **403** when `SIGNUP_MODE=closed`
- Allowlisted email can register → normal user, **not** super admin
- Super admin page shows user/household stats; non-admin gets 401 on `/api/super-admin/*`
- Microsoft connect works **after** login; tokens scoped to that user

**Phase 11b (optional follow-up):** Invite links, password reset email, 2FA, Cloudflare Access integration docs.

**Interim (before Phase 11):** Document in `replit.md` that custom domain is owner-trusted only; recommend Replit "Deploy" access or Cloudflare until gateway ships.

---

## 8. UI conventions

- **Mobile-first** — test at 390px width; Replit wide preview will look empty (expected).
- **Tailwind v4** — `src/index.css` for theme tokens.
- **Categories** propagate colour to items via `categoryId`.
- **Bottom nav:** Calendar | Planner | Board | Email | Contacts | Notes | Today | Settings (`BottomNav.tsx`).
- **Do not** prop-drill excessively — small app OK to extend existing patterns in `App.tsx`.
- **Minimise scope** — each PR/phase should be reviewable; no drive-by refactors.
- **Auth (Phase 11):** unauthenticated users see login only; `/super-admin` is not in bottom nav — owner link in Settings or direct URL.

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

### Scenario E — Multi-account Outlook (Phase 9b acceptance)
1. Connect work + personal Microsoft accounts in Settings
2. Set default calendar on personal account
3. Merged email shows both inboxes; filter to work only
4. Create school event → pick personal calendar → appears in Outlook personal calendar
5. Create note on work account → appears in work Outlook Notes
6. Email from work → Create task → defaults to work account + chosen To Do list
7. Disconnect work account → work mail/events/notes vanish; personal unchanged

### Scenario F — Auth gateway (Phase 11 acceptance)
1. Open custom domain logged out → login screen; `/api/links` returns 401
2. Owner logs in → app loads; Settings shows Super Admin entry
3. Random visitor tries `POST /api/auth/register` → 403 (closed mode)
4. Owner adds test email to allowlist → that email can register
5. New user is not super admin; `/super-admin` redirects or 401
6. Owner super admin: user list shows both users; can disable test user

---

## 10. Open items (not blocking — use sensible defaults)

| Topic | Recommended default |
|-------|---------------------|
| Multi-account merged views | Phase 9b — fetch all connected accounts |
| Default account when none set | First connected Microsoft account (chronological `connectedAt`) |
| Default calendar | Provider `defaultCalendar` from Graph for chosen account |
| Default To Do list | Graph `wellknownListName: defaultList` for chosen account |
| Default mail folder | Inbox of chosen account |
| Contact dedupe across accounts | Show separate entries with account badge in 9b; smart merge Phase 10+ |
| Multi-calendar merged view | All calendars from all connected accounts; filter by account in UI |
| Kiosk: show targeted voice pins? | Household-wide on board; targeted on personal devices |
| Extended properties for links on Exchange | Try Graph open extensions; fallback PostgreSQL (9c) |
| Recent folders in picker | Last 5 paths, user-specific in DB (9c) |
| Export household data | Phase 10 |
| Public custom domain without auth | **Blocked until Phase 11** — use edge gate interim |
| Who can register at launch | Owner allowlist only (`SIGNUP_MODE=closed`) — **d71** |

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

**Recommended phase order before marketing:** 9b → 9c → **11** → 10 (Google/Apple can wait; auth cannot).

1. **Read** `replit.md`, `BUILD-PLAN.md` §7, menagerie `05-AUTHZ-ROLES-PERMISSIONS.md` before auth work.
2. **Start at Phase 9b** unless owner specifies otherwise (Phases 0–9a complete).
3. **Do not** wire Stripe, OpenAI, or unrelated integrations.
4. **Do not** merge Corky as separate app — board is a mode in MyAxis.
5. **Do not** move calendar/email to PostgreSQL as system of record — only enhancement layer.
6. **Do not** rename GitHub repo or `package.json` — UI name is MyAxis only.
7. **Match** menagerie Drizzle/Replit patterns for DB and object storage.
8. **Test** mobile viewport after UI changes.
9. **One phase slice per PR** where possible (9b may be 2–3 PRs: fetch → pickers → contacts).
10. After completing a slice on Replit: **push to GitHub**; tell owner to pull in Cursor.

---

## 13. Decision log location

Full interactive decision canvas (63 decisions):  
`_app-review-kit/canvases/weekflow-firm-decisions.canvas.tsx`  
(Owner resets to seed for latest entries.)

---

*Document version: 2026-06-23 — Phase 9b + Phase 11 auth/super-admin locked; MyAxis branding.*
