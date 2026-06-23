interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <header className={`mb-4 flex items-end justify-between px-1 ${action ? '' : ''}`}>
      <div>
        {subtitle && (
          <p className="text-subhead font-medium text-wf-text-secondary">{subtitle}</p>
        )}
        <h2 className="font-display text-large-title font-bold tracking-tight text-wf-text">
          {title}
        </h2>
      </div>
      {action}
    </header>
  )
}
