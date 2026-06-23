import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import type { AppSection, CalendarItem, CalendarViewMode, Category } from './types'
import { DEFAULT_LIST_OPTIONS, type ListDisplayOptions } from './types'
import { initialEmails, initialItems } from './mockData'
import { addWeeks, startOfWeek } from './dateUtils'
import {
  DEFAULT_CATEGORIES,
  generateCategoryId,
  loadStoredCategories,
  saveStoredCategories,
} from './categories'
import { BottomNav } from './components/BottomNav'
import { CalendarNav } from './components/CalendarNav'
import type { PrimaryCalendarTab } from './components/ui/ViewsMenu'
import { WeekView } from './components/WeekView'
import { TodayView } from './components/TodayView'
import { MonthView } from './components/MonthView'
import { DayView } from './components/DayView'
import { AgendaView } from './components/AgendaView'
import { YearView } from './components/YearView'
import { ItemFormModal } from './components/ItemFormModal'
import { EmailView } from './components/EmailView'
import { PlannerView } from './components/PlannerView'
import { SettingsView } from './components/SettingsView'

export default function App() {
  const [section, setSection] = useState<AppSection>('calendar')
  const [categories, setCategories] = useState<Category[]>(
    () => loadStoredCategories() ?? DEFAULT_CATEGORIES,
  )
  const [items, setItems] = useState<CalendarItem[]>(initialItems)
  const [emails, setEmails] = useState(initialEmails)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week-list')
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [monthDate, setMonthDate] = useState(new Date())

  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CalendarItem | null>(null)
  const [listOptions, setListOptions] = useState<ListDisplayOptions>(DEFAULT_LIST_OPTIONS)

  const unreadCount = useMemo(() => emails.filter((e) => e.unread).length, [emails])

  useEffect(() => {
    saveStoredCategories(categories)
  }, [categories])

  const handleSaveCategory = useCallback((incoming: Category) => {
    const savedId = incoming.id

    setCategories((prev) => {
      if (incoming.id) {
        const idx = prev.findIndex((c) => c.id === incoming.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = { ...incoming, isDefault: prev[idx].isDefault }
          return next
        }
      }
      const id = generateCategoryId(incoming.name, prev)
      return [...prev, { ...incoming, id }]
    })

    if (savedId) {
      setItems((prev) =>
        prev.map((item) =>
          item.categoryId === savedId ? { ...item, colour: incoming.colour } : item,
        ),
      )
    }
  }, [])

  const handleDeleteCategory = useCallback((id: string) => {
    const fallbackId = categories.find((c) => c.id === 'work')?.id ?? categories[0]?.id ?? id
    const fallbackColour =
      categories.find((c) => c.id === fallbackId)?.colour ?? '#8E8E93'

    setCategories((prev) => prev.filter((c) => c.id !== id))

    setItems((prev) =>
      prev.map((item) =>
        item.categoryId === id
          ? { ...item, categoryId: fallbackId, colour: fallbackColour }
          : item,
      ),
    )

    setListOptions((opts) => {
      if (!opts.categoryFilter) return opts
      const next = opts.categoryFilter.filter((cid) => cid !== id)
      if (next.length === 0) return { ...opts, categoryFilter: null }
      return { ...opts, categoryFilter: next }
    })
  }, [categories])

  const handleSaveItem = useCallback((item: CalendarItem) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = item
        return next
      }
      return [...prev, item]
    })
  }, [])

  const handleDeleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const handleToggleComplete = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, completed: !i.completed } : i)),
    )
  }, [])

  const openAddModal = () => {
    setEditingItem(null)
    setModalOpen(true)
  }

  const openEditModal = (item: CalendarItem) => {
    setEditingItem(item)
    setModalOpen(true)
  }

  const goToday = () => {
    const today = new Date()
    setWeekStart(startOfWeek(today))
    setSelectedDay(today)
    setMonthDate(today)
  }

  const handleDaySelect = (date: Date) => {
    setSelectedDay(date)
    setViewMode('day')
  }

  const handlePrimaryTabChange = (tab: PrimaryCalendarTab) => {
    if (tab === 'week') {
      setViewMode('week-list')
    } else if (tab === 'today') {
      setSelectedDay(new Date())
      setViewMode('day')
    } else if (tab === 'month') {
      setViewMode('month')
    }
  }

  const showFab =
    section === 'calendar' ||
    section === 'planner' ||
    section === 'today'

  return (
    <div className="flex h-full min-h-0 flex-col bg-wf-bg">
      <main className="relative min-h-0 flex-1 overflow-y-auto">
        {section === 'calendar' && (
          <>
            <CalendarNav
              weekStart={weekStart}
              displayDate={viewMode === 'month' ? monthDate : viewMode === 'day' ? selectedDay : weekStart}
              viewMode={viewMode}
              selectedDay={selectedDay}
              categories={categories}
              listOptions={listOptions}
              onListOptionsChange={setListOptions}
              onPrevWeek={() => setWeekStart((w) => addWeeks(w, -1))}
              onNextWeek={() => setWeekStart((w) => addWeeks(w, 1))}
              onToday={goToday}
              onViewChange={setViewMode}
              onPrimaryTabChange={handlePrimaryTabChange}
            />
            <div className={viewMode === 'week-board' || viewMode === 'week-list' ? 'h-[calc(100%-130px)] min-h-[400px]' : ''}>
              {viewMode === 'week-list' || viewMode === 'week-board' || viewMode === 'week-timeline' ? (
                <WeekView
                  weekStart={weekStart}
                  items={items}
                  categories={categories}
                  viewMode={viewMode}
                  listOptions={listOptions}
                  onItemTap={openEditModal}
                  onToggleComplete={handleToggleComplete}
                />
              ) : viewMode === 'day' ? (
                <DayView
                  date={selectedDay}
                  items={items}
                  categories={categories}
                  listOptions={listOptions}
                  onItemTap={openEditModal}
                  onToggleComplete={handleToggleComplete}
                />
              ) : viewMode === 'month' ? (
                <MonthView
                  currentDate={monthDate}
                  items={items}
                  onDaySelect={handleDaySelect}
                  onMonthChange={setMonthDate}
                />
              ) : viewMode === 'agenda' ? (
                <AgendaView
                  items={items}
                  categories={categories}
                  listOptions={listOptions}
                  onItemTap={openEditModal}
                  onToggleComplete={handleToggleComplete}
                />
              ) : (
                <YearView />
              )}
            </div>
          </>
        )}

        {section === 'planner' && (
          <PlannerView
            items={items}
            categories={categories}
            listOptions={listOptions}
            onListOptionsChange={setListOptions}
            onItemTap={openEditModal}
            onToggleComplete={handleToggleComplete}
          />
        )}

        {section === 'email' && (
          <EmailView
            emails={emails}
            onToggleStar={(id) =>
              setEmails((prev) =>
                prev.map((e) => (e.id === id ? { ...e, starred: !e.starred } : e)),
              )
            }
            onToggleRead={(id) =>
              setEmails((prev) =>
                prev.map((e) => (e.id === id ? { ...e, unread: false } : e)),
              )
            }
          />
        )}

        {section === 'today' && (
          <TodayView
            items={items}
            categories={categories}
            listOptions={listOptions}
            onListOptionsChange={setListOptions}
            onItemTap={openEditModal}
            onToggleComplete={handleToggleComplete}
          />
        )}

        {section === 'settings' && (
          <SettingsView
            categories={categories}
            items={items}
            listOptions={listOptions}
            onListOptionsChange={setListOptions}
            onSaveCategory={handleSaveCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        )}
      </main>

      {showFab && (
        <button
          type="button"
          onClick={openAddModal}
          className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-wf-accent text-white shadow-[var(--shadow-fab)] transition-transform active:scale-95"
          aria-label="Add item"
        >
          <Plus size={26} strokeWidth={2} />
        </button>
      )}

      <BottomNav active={section} onChange={setSection} unreadEmails={unreadCount} />

      <ItemFormModal
        open={modalOpen}
        item={editingItem}
        categories={categories}
        defaultDate={section === 'today' ? new Date() : selectedDay}
        onSave={handleSaveItem}
        onDelete={handleDeleteItem}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}
