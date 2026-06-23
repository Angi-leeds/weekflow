interface BadgeProps {
  label: string
  colour?: string
  variant?: 'default' | 'muted' | 'outline'
}

export function Badge({ label, colour, variant = 'muted' }: BadgeProps) {
  if (variant === 'outline') {
    return (
      <span
        className="inline-flex items-center rounded-md border border-wf-border px-1.5 py-0.5 text-caption font-medium text-wf-text-secondary"
        style={colour ? { borderColor: `${colour}40`, color: colour } : undefined}
      >
        {label}
      </span>
    )
  }

  if (variant === 'default' && colour) {
    return (
      <span
        className="inline-flex items-center rounded-md px-1.5 py-0.5 text-caption font-semibold"
        style={{ backgroundColor: `${colour}18`, color: colour }}
      >
        {label}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center rounded-md bg-wf-bg px-1.5 py-0.5 text-caption font-medium text-wf-text-secondary">
      {label}
    </span>
  )
}
