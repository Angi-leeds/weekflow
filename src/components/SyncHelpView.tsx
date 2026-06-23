export interface SyncMatrixRow {
  dataType: string
  safeAtSource: boolean
  weekflowOnly: boolean
  notes: string
}

export const SYNC_MATRIX: SyncMatrixRow[] = [
  {
    dataType: 'Email messages',
    safeAtSource: true,
    weekflowOnly: false,
    notes: 'Read from Gmail / Outlook; WeekFlow stores links and metadata only in prototype.',
  },
  {
    dataType: 'Calendar events',
    safeAtSource: true,
    weekflowOnly: false,
    notes: 'Created events sync back to provider when Graph is connected (Phase 9).',
  },
  {
    dataType: 'Tasks / reminders',
    safeAtSource: true,
    weekflowOnly: false,
    notes: 'Tasks can live in Microsoft To Do or stay local until connected.',
  },
  {
    dataType: 'Link graph',
    safeAtSource: false,
    weekflowOnly: true,
    notes: 'Connections between email, calendar, task, and folder refs live in WeekFlow PostgreSQL.',
  },
  {
    dataType: 'Share to family board',
    safeAtSource: false,
    weekflowOnly: true,
    notes: 'Opt-in per item; visibility controlled by household share flags.',
  },
  {
    dataType: 'Board pin positions',
    safeAtSource: false,
    weekflowOnly: true,
    notes: 'Cork board layout is household-specific WeekFlow data.',
  },
  {
    dataType: 'Cloud folder tags',
    safeAtSource: true,
    weekflowOnly: false,
    notes: 'Folder paths reference OneDrive / SharePoint; files stay at source.',
  },
  {
    dataType: 'Attachments (photos)',
    safeAtSource: false,
    weekflowOnly: true,
    notes: 'Uploaded via attachment API; Replit object storage when configured, local filesystem in dev.',
  },
  {
    dataType: 'Categories & colours',
    safeAtSource: false,
    weekflowOnly: true,
    notes: 'User-managed labels; localStorage in prototype, DB later.',
  },
  {
    dataType: 'Kiosk PIN',
    safeAtSource: false,
    weekflowOnly: true,
    notes: 'Device-local setting for leaving fullscreen board mode.',
  },
]

export function SyncHelpView({ onBack }: { onBack?: () => void }) {
  return (
    <div className="px-4 pb-6 pt-2 safe-top">
      <div className="mb-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mb-2 text-body font-medium text-wf-accent"
          >
            ← Settings
          </button>
        )}
        <h1 className="font-display text-title font-bold tracking-tight">Data &amp; sync</h1>
        <p className="mt-1 text-subhead text-wf-text-secondary">
          What stays at the provider vs what WeekFlow owns.
        </p>
      </div>

      <div className="mb-4 overflow-hidden rounded-2xl bg-wf-surface shadow-[var(--shadow-card)]">
        <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-wf-border bg-wf-bg px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-wf-text-tertiary">
          <span>Data type</span>
          <span className="text-center">Source</span>
          <span className="text-center">WF only</span>
        </div>
        {SYNC_MATRIX.map((row) => (
          <div
            key={row.dataType}
            className="border-b border-wf-border/50 px-3 py-3 last:border-0"
          >
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
              <span className="text-body font-medium text-wf-text">{row.dataType}</span>
              <SyncBadge active={row.safeAtSource} label="✓" />
              <SyncBadge active={row.weekflowOnly} label="WF" />
            </div>
            <p className="mt-1.5 text-caption text-wf-text-tertiary">{row.notes}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-wf-accent-soft px-4 py-3 text-caption text-wf-text-secondary">
        <p className="font-semibold text-wf-accent">Safe at source</p>
        <p className="mt-1">
          Your email, calendar, and cloud files remain authoritative in Gmail, Outlook, or
          OneDrive. WeekFlow reads and links — it does not replace those systems in the
          prototype.
        </p>
      </div>
    </div>
  )
}

function SyncBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`inline-flex h-6 w-8 items-center justify-center rounded-md text-[11px] font-bold ${
        active ? 'bg-wf-green/15 text-wf-green' : 'bg-wf-bg text-wf-text-tertiary'
      }`}
    >
      {active ? label : '—'}
    </span>
  )
}
