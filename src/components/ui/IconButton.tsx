import type { LucideIcon } from 'lucide-react'

interface IconButtonProps {
  icon: LucideIcon
  label: string
  onClick?: () => void
  variant?: 'default' | 'ghost' | 'accent'
  size?: 'sm' | 'md'
}

export function IconButton({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
  size = 'md',
}: IconButtonProps) {
  const sizeClass = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'
  const iconSize = size === 'sm' ? 18 : 20

  const variantClass = {
    default: 'bg-wf-surface text-wf-accent shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]',
    ghost: 'text-wf-text-secondary hover:bg-black/[0.04] hover:text-wf-text',
    accent: 'bg-wf-accent text-white shadow-[var(--shadow-card)]',
  }[variant]

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full transition-all active:scale-95 ${variantClass}`}
    >
      <Icon size={iconSize} strokeWidth={1.75} />
    </button>
  )
}
