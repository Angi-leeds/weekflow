interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  titleExtra?: React.ReactNode
}

export function SectionHeader({ title, subtitle, action, titleExtra }: SectionHeaderProps) {
  return (
    <header className="mb-4 flex items-end justify-between px-1">
      <div className="min-w-0">
        {subtitle && (
          <p className="text-subhead font-medium text-wf-text-secondary">{subtitle}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <h2 className="font-display text-large-title font-bold tracking-tight text-wf-text">
            {title}
          </h2>
          {titleExtra}
        </div>
      </div>
      {action}
    </header>
  )
}
