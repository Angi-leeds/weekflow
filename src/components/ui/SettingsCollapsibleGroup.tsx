import { ChevronDown } from 'lucide-react'
import type { SettingsSectionId } from '../../lib/settingsSectionState'

interface SettingsCollapsibleGroupProps {
  sectionId: SettingsSectionId
  title: string
  summary?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

/** Top-level settings group — collapsible card with persisted state. */
export function SettingsCollapsibleGroup({
  sectionId,
  title,
  summary,
  open,
  onOpenChange,
  children,
}: SettingsCollapsibleGroupProps) {
  return (
    <section className="mb-5" id={sectionId}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-controls={`${sectionId}-panel`}
        className="mb-2 flex w-full items-center gap-2 px-3 text-left"
      >
        <ChevronDown
          size={18}
          strokeWidth={2.25}
          className={`shrink-0 text-wf-text-tertiary transition-transform ${open ? 'rotate-0' : '-rotate-90'}`}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="block text-subhead font-semibold text-wf-text-secondary">{title}</span>
          {!open && summary && (
            <span className="mt-0.5 block truncate text-caption text-wf-text-tertiary">{summary}</span>
          )}
        </span>
      </button>
      {open && (
        <div
          id={`${sectionId}-panel`}
          className="overflow-hidden rounded-2xl bg-wf-surface shadow-[var(--shadow-card)]"
        >
          {children}
        </div>
      )}
    </section>
  )
}

interface SettingsCollapsibleSectionProps {
  sectionId: SettingsSectionId
  title: string
  summary?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

/** Nested subsection inside a settings group. */
export function SettingsCollapsibleSection({
  sectionId,
  title,
  summary,
  open,
  onOpenChange,
  children,
}: SettingsCollapsibleSectionProps) {
  return (
    <div className="border-t border-wf-border/50" id={sectionId}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-controls={`${sectionId}-panel`}
        className="flex w-full items-center gap-2 px-4 py-3.5 text-left hover:bg-black/[0.02]"
      >
        <ChevronDown
          size={16}
          strokeWidth={2.25}
          className={`shrink-0 text-wf-text-tertiary transition-transform ${open ? 'rotate-0' : '-rotate-90'}`}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="block text-body font-medium text-wf-text">{title}</span>
          {!open && summary && (
            <span className="mt-0.5 block truncate text-caption text-wf-text-tertiary">{summary}</span>
          )}
        </span>
      </button>
      {open && <div id={`${sectionId}-panel`}>{children}</div>}
    </div>
  )
}
