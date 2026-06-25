import {
  Calendar,
  CheckSquare,
  LayoutGrid,
  Mail,
  Settings,
  StickyNote,
  Sun,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { AppSection } from '../types'

interface BottomNavProps {
  active: AppSection
  settingsOpen: boolean
  onChange: (section: AppSection) => void
  onSettingsToggle: () => void
  unreadEmails: number
}

const TABS: { id: AppSection; label: string; icon: LucideIcon; activeIcon?: LucideIcon }[] = [
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'planner', label: 'Planner', icon: CheckSquare },
  { id: 'board', label: 'Board', icon: LayoutGrid },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function BottomNav({
  active,
  settingsOpen,
  onChange,
  onSettingsToggle,
  unreadEmails,
}: BottomNavProps) {
  return (
    <nav className="shrink-0 border-t border-wf-border bg-wf-surface/95 backdrop-blur-xl safe-bottom">
      <div className="flex items-stretch justify-around px-1 pt-1.5 pb-1">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = id === 'settings' ? settingsOpen : active === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => (id === 'settings' ? onSettingsToggle() : onChange(id))}
              className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 transition-colors ${
                isActive ? 'text-wf-accent' : 'text-wf-text-tertiary'
              }`}
            >
              <span className="relative flex h-6 items-center justify-center">
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.25 : 1.75}
                  fill={isActive ? 'currentColor' : 'none'}
                  className="transition-all"
                />
                {id === 'email' && unreadEmails > 0 && (
                  <span className="absolute -right-2.5 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-wf-red px-1 text-[10px] font-bold text-white">
                    {unreadEmails > 9 ? '9+' : unreadEmails}
                  </span>
                )}
              </span>
              <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
