import type { CSSProperties } from 'react'
import type { TodayHighlightOptions, TodayPulseMode } from '../types'

export type TodayHighlightTarget =
  | 'day-card'
  | 'day-card-header'
  | 'column-header'
  | 'column-root'
  | 'month-date-button'
  | 'month-cell'

export interface TodayHighlightSlice {
  className: string
  style?: CSSProperties
}

export type TodayDateSize = 'xs' | 'sm' | 'md' | 'lg' | 'title'

const DATE_SIZE_CLASS: Record<TodayDateSize, string> = {
  xs: 'text-[10px]',
  sm: 'text-[15px]',
  md: 'text-[18px]',
  lg: 'text-[20px]',
  title: 'text-body',
}

const WEEKDAY_SIZE_CLASS: Record<TodayDateSize, string> = {
  xs: 'text-[10px]',
  sm: 'text-[10px]',
  md: 'text-[11px]',
  lg: 'text-caption',
  title: 'text-subhead',
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return `rgba(45, 106, 106, ${alpha})`
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function accentCssVars(options: TodayHighlightOptions): CSSProperties {
  const opacity = options.backgroundOpacity / 100
  return {
    '--wf-today-accent': options.accentColor,
    '--wf-today-bg': hexToRgba(options.accentColor, opacity * 0.55),
    '--wf-today-bg-strong': hexToRgba(options.accentColor, Math.min(1, opacity * 0.85)),
    '--wf-today-solid': options.accentColor,
    '--wf-today-glow': hexToRgba(options.accentColor, 0.5),
    '--wf-today-border': options.accentColor,
  } as CSSProperties
}

function pulseClass(pulse: TodayPulseMode): string {
  switch (pulse) {
    case 'soft':
      return 'wf-today-pulse-soft'
    case 'strong':
      return 'wf-today-pulse-strong'
    case 'glow':
      return 'wf-today-pulse-glow'
    default:
      return ''
  }
}

function borderWidthPx(width: TodayHighlightOptions['borderWidth']): number {
  return width
}

function borderStyle(options: TodayHighlightOptions): CSSProperties | undefined {
  const w = borderWidthPx(options.borderWidth)
  const color = 'var(--wf-today-border)'
  switch (options.borderMode) {
    case 'ring':
      return { boxShadow: `inset 0 0 0 ${w}px ${options.accentColor}` }
    case 'full':
      return { border: `${w}px solid ${options.accentColor}` }
    case 'left-bar':
      return { borderLeft: `${w}px solid ${options.accentColor}` }
    case 'dashed':
      return { border: `${w}px dashed ${options.accentColor}` }
    case 'double':
      return { border: `${Math.max(w, 3)}px double ${options.accentColor}` }
    default:
      return undefined
  }
}

function backgroundStyle(options: TodayHighlightOptions): CSSProperties | undefined {
  switch (options.backgroundMode) {
    case 'soft':
      return { backgroundColor: 'var(--wf-today-bg)' }
    case 'strong':
      return { backgroundColor: 'var(--wf-today-bg-strong)' }
    case 'solid':
      return { backgroundColor: 'var(--wf-today-solid)' }
    default:
      return undefined
  }
}

/** Container / column / cell backgrounds and borders */
export function resolveTodayHighlight(
  isToday: boolean,
  options: TodayHighlightOptions,
  target: TodayHighlightTarget,
): TodayHighlightSlice {
  if (!isToday) return { className: '' }

  const vars = accentCssVars(options)
  const pulse = pulseClass(options.pulse)
  const border = borderStyle(options)

  if (target === 'day-card') {
    return {
      className: pulse,
      style: { ...vars, ...backgroundStyle(options), ...border },
    }
  }

  if (target === 'day-card-header') {
    const headerBg =
      options.backgroundMode === 'none'
        ? { backgroundColor: 'var(--wf-today-bg)' }
        : backgroundStyle(options)
    return {
      className: pulse,
      style: {
        ...vars,
        ...headerBg,
        ...(options.borderMode === 'left-bar' ? border : undefined),
      },
    }
  }

  if (target === 'column-header') {
    const bg =
      options.backgroundMode === 'none'
        ? { backgroundColor: 'var(--wf-today-bg)' }
        : backgroundStyle(options)
    return {
      className: [pulse, options.pulse !== 'off' ? 'relative' : ''].filter(Boolean).join(' '),
      style: { ...vars, ...bg, ...border },
    }
  }

  if (target === 'column-root') {
    if (!options.tintColumn) return { className: '', style: vars }
    return {
      className: '',
      style: { ...vars, backgroundColor: 'var(--wf-today-bg)' },
    }
  }

  if (target === 'month-cell') {
    if (!options.tintMonthCell) return { className: '', style: vars }
    return {
      className: pulse,
      style: { ...vars, ...backgroundStyle(options), ...border },
    }
  }

  if (target === 'month-date-button') {
    return { className: pulse, style: vars }
  }

  return { className: '', style: vars }
}

export function resolveTodayWeekdayClass(
  isToday: boolean,
  options: TodayHighlightOptions,
  size: TodayDateSize,
): string {
  const base = `${WEEKDAY_SIZE_CLASS[size]} font-semibold`
  if (!isToday) return `${base} text-wf-text-secondary`
  if (options.showWeekdayAccent) return `${base} text-[var(--wf-today-accent)]`
  return `${base} text-wf-text-secondary`
}

export function resolveTodayDateClass(
  isToday: boolean,
  options: TodayHighlightOptions,
  size: TodayDateSize,
  onSolidBackground = false,
): string {
  const base = `${DATE_SIZE_CLASS[size]} font-bold leading-none font-display tabular-nums`
  if (!isToday) return `${base} text-wf-text`

  switch (options.dateStyle) {
    case 'accent-text':
      return `${base} text-[var(--wf-today-accent)]`
    case 'filled-circle':
      return `${base} inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[var(--wf-today-solid)] px-1 text-white`
    case 'filled-pill':
      return `${base} inline-flex items-center justify-center rounded-full bg-[var(--wf-today-solid)] px-2.5 py-0.5 text-white`
    case 'outlined-circle':
      return `${base} inline-flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-[var(--wf-today-accent)] px-1 text-[var(--wf-today-accent)]`
    case 'scaled':
      return `${base} scale-110 text-[var(--wf-today-accent)]`
    case 'default':
    default:
      return onSolidBackground ? `${base} text-white` : `${base} text-wf-text`
  }
}

export function resolveTodayTitleClass(
  isToday: boolean,
  options: TodayHighlightOptions,
  onSolidBackground = false,
): string {
  const base = 'font-display text-body font-bold tracking-tight'
  if (!isToday) return `${base} text-wf-text`
  if (options.dateStyle === 'default' && !options.showWeekdayAccent) return `${base} text-wf-text`
  if (onSolidBackground && options.backgroundMode === 'solid') return `${base} text-white`
  return `${base} text-[var(--wf-today-accent)]`
}

export function shouldShowTodayBadge(isToday: boolean, options: TodayHighlightOptions): boolean {
  return isToday && options.badge !== 'none'
}

export function todayBadgeClass(options: TodayHighlightOptions): string {
  switch (options.badge) {
    case 'pill':
      return 'rounded-full bg-[var(--wf-today-solid)] px-2.5 py-0.5 text-caption font-semibold text-white'
    case 'dot':
      return 'h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--wf-today-solid)]'
    case 'label':
      return 'text-caption font-bold uppercase tracking-wider text-[var(--wf-today-accent)]'
    case 'corner':
      return 'absolute -right-1 -top-1 rounded-bl-lg rounded-tr-lg bg-[var(--wf-today-solid)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-white'
    default:
      return ''
  }
}

export function todayBadgeLabel(options: TodayHighlightOptions): string {
  switch (options.badge) {
    case 'label':
      return 'Today'
    case 'corner':
      return 'Today'
    default:
      return 'Today'
  }
}

export function mergeHighlightStyle(
  ...slices: Array<TodayHighlightSlice | undefined>
): { className: string; style?: CSSProperties } {
  const className = slices
    .map((s) => s?.className ?? '')
    .filter(Boolean)
    .join(' ')
  const style = slices.reduce<CSSProperties | undefined>((acc, slice) => {
    if (!slice?.style) return acc
    return { ...acc, ...slice.style }
  }, undefined)
  return { className, style }
}
