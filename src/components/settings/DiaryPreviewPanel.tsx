import { useMemo } from 'react'
import type {
  CalendarItem,
  CalendarPreferences,
  CalendarSourcePreferences,
  Category,
  ItemDisplayOptions,
} from '../../types'
import { toISODate } from '../../dateUtils'
import { shouldShowInDiary } from '../../lib/diaryVisibility'
import { CalendarItemRow } from '../CalendarItem'

interface DiaryPreviewPanelProps {
  categories: Category[]
  calendarPreferences: CalendarPreferences
  calendarSourcePrefs: CalendarSourcePreferences
  usingRealMicrosoft: boolean
  displayOptions: ItemDisplayOptions
}

export function DiaryPreviewPanel({
  categories,
  calendarPreferences,
  calendarSourcePrefs,
  usingRealMicrosoft,
  displayOptions,
}: DiaryPreviewPanelProps) {
  const jobsCategory =
    categories.find((cat) => cat.name.toLowerCase().includes('jobs')) ??
    categories.find((cat) => cat.kind === 'task' && cat.showInDiary) ??
    categories.find((cat) => cat.kind === 'task')
  const shoppingCategory =
    categories.find((cat) => cat.name.toLowerCase().includes('shopping')) ??
    categories.find((cat) => cat.kind === 'task' && !cat.showInDiary) ??
    jobsCategory

  const previewItems = useMemo((): CalendarItem[] => {
    const today = toISODate(new Date())
    if (usingRealMicrosoft) {
      return [
        {
          id: 'diary-preview-ms-todo',
          title: 'Pick up prescription',
          date: today,
          allDay: true,
          categoryId: 'task',
          colour: '#4A5A9C',
          accountId: 'demo',
          completed: false,
          provider: 'microsoft',
          externalId: 'preview',
          todoListId: 'preview-list',
        },
      ]
    }
    if (!jobsCategory || !shoppingCategory) return []
    return [
      {
        id: 'diary-preview-jobs',
        title: 'Fix boiler',
        date: today,
        allDay: true,
        categoryId: jobsCategory.id,
        colour: jobsCategory.colour,
        accountId: 'demo',
        completed: false,
      },
      {
        id: 'diary-preview-shopping',
        title: 'Milk',
        date: today,
        allDay: true,
        categoryId: shoppingCategory.id,
        colour: shoppingCategory.colour,
        accountId: 'demo',
        completed: false,
      },
    ]
  }, [jobsCategory, shoppingCategory, usingRealMicrosoft])

  if (previewItems.length === 0) return null

  return (
    <div className="mx-4 mb-3 rounded-2xl border border-wf-border bg-wf-bg p-2">
      <p className="mb-2 px-1 text-caption font-semibold text-wf-text-secondary">Preview</p>
      <div className="space-y-1">
        {previewItems.map((item) => {
          const visible = shouldShowInDiary(
            item,
            categories,
            calendarPreferences,
            calendarSourcePrefs,
          )
          return (
            <div key={item.id}>
              <CalendarItemRow
                item={item}
                categories={categories}
                displayOptions={displayOptions}
                dense
              />
              <p className="px-1 text-caption text-wf-text-tertiary">
                {visible ? 'Shows on diary' : 'To Do only'}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
