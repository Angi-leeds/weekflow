interface CategoryGroupHeaderProps {
  label: string
  colour?: string
  count: number
  compact?: boolean
}

export function CategoryGroupHeader({ label, colour, count, compact = false }: CategoryGroupHeaderProps) {
  if (!label) return null

  return (
    <div className={`flex items-center gap-2 ${compact ? 'px-1 py-1.5' : 'px-2 py-2'}`}>
      {colour && (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: colour }}
        />
      )}
      <span
        className={`shrink-0 font-semibold text-wf-text-secondary ${
          compact ? 'text-[10px]' : 'text-caption'
        }`}
      >
        {label}
      </span>
      <span className={`text-wf-text-tertiary ${compact ? 'text-[10px]' : 'text-caption'}`}>
        {count}
      </span>
      <span className="h-px min-w-0 flex-1 bg-wf-border" />
    </div>
  )
}
