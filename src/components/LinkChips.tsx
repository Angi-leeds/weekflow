import { X } from 'lucide-react'
import type { EntityType, ItemLink } from '../../shared/links'
import { LINK_KIND_LABELS } from '../../shared/links'
import type { CalendarItem, EmailMessage } from '../types'
import { getConnectedRelatedEntities } from '../lib/links'
import { linkTargetIcon, resolveLinkTargetLabel } from '../lib/itemLinkHelpers'

interface LinkChipsProps {
  entityType: EntityType
  entityId: string
  links: ItemLink[]
  items: CalendarItem[]
  emails: EmailMessage[]
  onNavigate: (type: EntityType, id: string) => void
  onRemove?: (linkId: string) => void
  compact?: boolean
}

export function LinkChips({
  entityType,
  entityId,
  links,
  items,
  emails,
  onNavigate,
  onRemove,
  compact = false,
}: LinkChipsProps) {
  const related = getConnectedRelatedEntities(links, entityType, entityId)

  if (related.length === 0) return null

  return (
    <div className={compact ? 'flex flex-wrap gap-1.5' : 'space-y-2'}>
      {!compact && (
        <p className="text-caption font-semibold text-wf-text-secondary">Linked items</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {related.map((entry) => {
          const label = resolveLinkTargetLabel(entry.type, entry.id, items, emails, links)
          const kindLabel = entry.directLink
            ? LINK_KIND_LABELS[entry.directLink.kind]
            : entry.hops > 1
              ? 'Related via link chain'
              : 'Related'

          return (
            <span
              key={`${entry.type}:${entry.id}`}
              className={`inline-flex max-w-full items-center gap-1 rounded-full pl-2.5 pr-1 py-1 text-caption font-semibold ${
                entry.directLink
                  ? 'bg-wf-accent-soft text-wf-accent'
                  : 'bg-wf-bg text-wf-text-secondary ring-1 ring-wf-border'
              }`}
            >
              <button
                type="button"
                onClick={() => onNavigate(entry.type, entry.id)}
                className="inline-flex min-w-0 items-center gap-1 truncate hover:underline"
                title={kindLabel ? `${kindLabel}: ${label}` : label}
              >
                <span aria-hidden>{linkTargetIcon(entry.type)}</span>
                <span className="truncate">{label}</span>
              </button>
              {onRemove && entry.directLink && (
                <button
                  type="button"
                  onClick={() => onRemove(entry.directLink!.id)}
                  className="shrink-0 rounded-full p-0.5 text-wf-accent/70 hover:bg-wf-accent/10 hover:text-wf-accent"
                  aria-label={`Remove link to ${label}`}
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}
