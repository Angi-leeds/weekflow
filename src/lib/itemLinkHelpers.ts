import type { CalendarItem, Category, EmailMessage } from '../types'
import type { EntityType, ItemLink } from '../../shared/links'
import { getOtherEnd } from './links'
import { getMockCloudFolder } from '../mockData'
import { getCategoryById } from '../categories'

export function getItemLinkType(
  item: CalendarItem,
  categories: Category[],
): 'calendar' | 'task' {
  const cat = getCategoryById(categories, item.categoryId)
  if (cat?.kind === 'task' || cat?.kind === 'reminder') return 'task'
  return 'calendar'
}

export function resolveLinkTargetLabel(
  type: EntityType,
  id: string,
  items: CalendarItem[],
  emails: EmailMessage[],
  links?: ItemLink[],
): string {
  if (type === 'email') {
    const email = emails.find((entry) => entry.id === id)
    return email?.subject ?? 'Email'
  }

  if (type === 'folder_ref') {
    const folder = getMockCloudFolder(id)
    if (folder) return folder.label
    const link = links?.find(
      (entry) =>
        (entry.toType === 'folder_ref' && entry.toId === id) ||
        (entry.fromType === 'folder_ref' && entry.fromId === id),
    )
    return link?.folderUrl ?? 'Folder'
  }

  const item = items.find((entry) => entry.id === id)
  if (item) return item.title

  if (type === 'board_pin') return 'Board pin'
  return 'Linked item'
}

export function linkTargetIcon(type: EntityType): string {
  switch (type) {
    case 'email':
      return '📧'
    case 'calendar':
      return '📅'
    case 'task':
      return '✓'
    case 'note':
      return '📝'
    case 'folder_ref':
      return '📁'
    case 'board_pin':
      return '📌'
    default:
      return '🔗'
  }
}

export function isAlreadyLinked(
  links: ItemLink[],
  fromType: EntityType,
  fromId: string,
  toType: EntityType,
  toId: string,
): boolean {
  return links.some(
    (link) =>
      (link.fromType === fromType &&
        link.fromId === fromId &&
        link.toType === toType &&
        link.toId === toId) ||
      (link.fromType === toType &&
        link.fromId === toId &&
        link.toType === fromType &&
        link.toId === fromId),
  )
}

/** Direct calendar↔task partner linked via follow_up or relates_to. */
export function getLinkedPartnerItem(
  links: ItemLink[],
  entityType: EntityType,
  entityId: string,
  items: CalendarItem[],
): CalendarItem | undefined {
  for (const link of links) {
    const touches =
      (link.fromType === entityType && link.fromId === entityId) ||
      (link.toType === entityType && link.toId === entityId)
    if (!touches) continue
    if (link.kind !== 'follow_up' && link.kind !== 'relates_to') continue

    const other = getOtherEnd(link, entityType, entityId)
    if (other.type !== 'task' && other.type !== 'calendar') continue
    const partner = items.find((entry) => entry.id === other.id)
    if (partner) return partner
  }
  return undefined
}
