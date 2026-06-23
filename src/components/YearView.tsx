export function YearView() {
  const currentYear = new Date().getFullYear()

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-wf-accent/20 to-wf-purple/20">
        <span className="font-display text-[32px] font-bold text-wf-accent">{currentYear}</span>
      </div>
      <h2 className="font-display text-[22px] font-bold tracking-tight text-wf-text">
        Year overview
      </h2>
      <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-wf-text-secondary">
        A beautiful year-at-a-glance view is coming soon. Scroll through months, spot busy periods, and jump to any week.
      </p>
      <span className="mt-6 rounded-full bg-wf-accent-soft px-4 py-2 text-[13px] font-semibold text-wf-accent">
        Coming in a future release
      </span>
    </div>
  )
}
