interface Segment<T extends string> {
  id: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[]
  active: T
  onChange: (id: T) => void
  className?: string
}

export function SegmentedControl<T extends string>({
  segments,
  active,
  onChange,
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`flex rounded-xl bg-black/[0.05] p-1 ${className}`}
      role="tablist"
    >
      {segments.map(({ id, label }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(id)}
            className={`flex-1 rounded-lg py-2 text-subhead font-semibold transition-all duration-200 ${
              isActive
                ? 'bg-wf-surface text-wf-text shadow-[var(--shadow-card)]'
                : 'text-wf-text-secondary hover:text-wf-text'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
