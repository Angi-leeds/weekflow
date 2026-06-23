import { X } from 'lucide-react'
import type { EntityType, ItemLink } from '../../shared/links'
import { LINK_KIND_LABELS } from '../../shared/links'
import type { CalendarItem, EmailMessage } from '../types'
import { getOtherEnd } from '../lib/links'
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
  const entityLinks = links.filter(
    (link) =>
      (link.fromType === entityType && link.fromId === entityId) ||
      (link.toType === entityType && link.toId === entityId),
  )

  if (entityLinks.length === 0) return null

  return (
    <div className={compact ? 'flex flex-wrap gap-1.5' : 'space-y-2'}>
      {!compact && (
        <p className="text-caption font-semibold text-wf-text-secondary">Linked items</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {entityLinks.map((link) => {
          const other = getOtherEnd(link, entityType, entityId)
          const label = resolveLinkTargetLabel(other.type, other.id, items, emails)
          const kindLabel = LINK_KIND_LABELS[link.kind]

          return (
            <span
              key={link.id}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-wf-accent-soft pl-2.5 pr-1 py-1 text-caption font-semibold text-wf-accent"
            >
              <button
                type="button"
                onClick={() => onNavigate(other.type, other.id)}
                className="inline-flex min-w-0 items-center gap-1 truncate hover:underline"
                title={`${kindLabel}: ${label}`}
              >
                <span aria-hidden>{linkTargetIcon(other.type)}</span>
                <span className="truncate">{label}</span>
              </button>
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(link.id)}
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
