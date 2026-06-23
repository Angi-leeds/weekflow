import type { CalendarItem, Category, EmailMessage } from '../types'
import type { EntityType, ItemLink } from '../../shared/links'
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
): string {
  if (type === 'email') {
    const email = emails.find((entry) => entry.id === id)
    return email?.subject ?? 'Email'
  }

  const item = items.find((entry) => entry.id === id)
  if (item) return item.title

  if (type === 'folder_ref') return 'Folder'
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
