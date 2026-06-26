import type { CSSProperties } from 'react'
import type { TodayHighlightOptions, TodayPulseMode } from '../types'

export type TodayHighlightTarget =
  | 'day-card'
  | 'day-card-header'
  | 'column-header'
  | 'column-root'
  | 'month-cell'
  | 'month-date-button'

export interface TodayHighlightSlice {
  className: string
  style?: CSSProperties
}

export type TodayDateSize = 'xs' | 'sm' | 'md' | 'lg' | 'title'

export interface TodayTextPresentation {
  className: string
  style?: CSSProperties
}

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

export function accentCssVars(options: TodayHighlightOptions): CSSProperties {
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

function borderStyle(options: TodayHighlightOptions): CSSProperties | undefined {
  const w = options.borderWidth
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
  const opacity = options.backgroundOpacity / 100
  switch (options.backgroundMode) {
    case 'soft':
      return { backgroundColor: hexToRgba(options.accentColor, opacity * 0.55) }
    case 'strong':
      return { backgroundColor: hexToRgba(options.accentColor, Math.min(1, opacity * 0.85)) }
    case 'solid':
      return { backgroundColor: options.accentColor }
    default:
      return undefined
  }
}

/** Unified container styling — same rules in week, month, list, agenda, and Today tab. */
export function todayContainerStyle(options: TodayHighlightOptions): CSSProperties {
  return {
    ...accentCssVars(options),
    ...backgroundStyle(options),
    ...borderStyle(options),
  }
}

/** Header areas always get at least a soft tint when background is "none" so today is visible. */
function todayHeaderStyle(options: TodayHighlightOptions): CSSProperties {
  const opacity = options.backgroundOpacity / 100
  const bg =
    backgroundStyle(options) ??
    (options.backgroundMode === 'none'
      ? { backgroundColor: hexToRgba(options.accentColor, opacity * 0.35) }
      : undefined)
  return {
    ...accentCssVars(options),
    ...bg,
    ...borderStyle(options),
  }
}

export function resolveTodayHighlight(
  isToday: boolean,
  options: TodayHighlightOptions,
  target: TodayHighlightTarget,
): TodayHighlightSlice {
  if (!isToday) return { className: '' }

  const pulse = pulseClass(options.pulse)

  if (target === 'day-card-header' || target === 'column-header' || target === 'month-date-button') {
    return {
      className: [pulse, target === 'column-header' && options.pulse !== 'off' ? 'relative' : '']
        .filter(Boolean)
        .join(' '),
      style: todayHeaderStyle(options),
    }
  }

  if (target === 'column-root') {
    const colBg =
      backgroundStyle(options) ??
      (options.backgroundMode === 'none'
        ? { backgroundColor: hexToRgba(options.accentColor, (options.backgroundOpacity / 100) * 0.2) }
        : undefined)
    return {
      className: pulse,
      style: { ...accentCssVars(options), ...colBg },
    }
  }

  return {
    className: pulse,
    style: todayContainerStyle(options),
  }
}

export function resolveTodayWeekdayPresentation(
  isToday: boolean,
  options: TodayHighlightOptions,
  size: TodayDateSize,
): TodayTextPresentation {
  const base = `${WEEKDAY_SIZE_CLASS[size]} font-semibold truncate`
  if (!isToday) return { className: `${base} text-wf-text-secondary` }
  if (!options.showWeekdayAccent) return { className: `${base} text-wf-text-secondary` }
  return {
    className: base,
    style: { color: options.accentColor },
  }
}

export function resolveTodayDatePresentation(
  isToday: boolean,
  options: TodayHighlightOptions,
  size: TodayDateSize,
  onSolidBackground = false,
): TodayTextPresentation {
  const base = `${DATE_SIZE_CLASS[size]} font-bold leading-none font-display tabular-nums`
  if (!isToday) return { className: `${base} text-wf-text` }

  switch (options.dateStyle) {
    case 'accent-text':
      return { className: base, style: { color: options.accentColor } }
    case 'filled-circle':
      return {
        className: `${base} inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1`,
        style: { backgroundColor: options.accentColor, color: '#ffffff' },
      }
    case 'filled-pill':
      return {
        className: `${base} inline-flex items-center justify-center rounded-full px-2.5 py-0.5`,
        style: { backgroundColor: options.accentColor, color: '#ffffff' },
      }
    case 'outlined-circle':
      return {
        className: `${base} inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1`,
        style: { border: `2px solid ${options.accentColor}`, color: options.accentColor },
      }
    case 'scaled':
      return {
        className: `${base} inline-block scale-110`,
        style: { color: options.accentColor },
      }
    case 'default':
    default:
      return {
        className: base,
        style: { color: onSolidBackground ? '#ffffff' : undefined },
      }
  }
}

export function resolveTodayTitlePresentation(
  isToday: boolean,
  options: TodayHighlightOptions,
  onSolidBackground = false,
): TodayTextPresentation {
  const base = 'font-display text-body font-bold tracking-tight'
  if (!isToday) return { className: `${base} text-wf-text` }
  if (options.dateStyle === 'default' && !options.showWeekdayAccent) {
    return { className: `${base} text-wf-text` }
  }
  if (onSolidBackground && options.backgroundMode === 'solid') {
    return { className: base, style: { color: '#ffffff' } }
  }
  return { className: base, style: { color: options.accentColor } }
}

/** @deprecated Use resolveTodayWeekdayPresentation — kept for gradual migration */
export function resolveTodayWeekdayClass(
  isToday: boolean,
  options: TodayHighlightOptions,
  size: TodayDateSize,
): string {
  return resolveTodayWeekdayPresentation(isToday, options, size).className
}

/** @deprecated Use resolveTodayDatePresentation */
export function resolveTodayDateClass(
  isToday: boolean,
  options: TodayHighlightOptions,
  size: TodayDateSize,
  onSolidBackground = false,
): string {
  return resolveTodayDatePresentation(isToday, options, size, onSolidBackground).className
}

/** @deprecated Use resolveTodayTitlePresentation */
export function resolveTodayTitleClass(
  isToday: boolean,
  options: TodayHighlightOptions,
  onSolidBackground = false,
): string {
  return resolveTodayTitlePresentation(isToday, options, onSolidBackground).className
}

export function shouldShowTodayBadge(isToday: boolean, options: TodayHighlightOptions): boolean {
  return isToday && options.badge !== 'none'
}

export function todayBadgePresentation(options: TodayHighlightOptions): TodayTextPresentation {
  switch (options.badge) {
    case 'pill':
      return {
        className: 'rounded-full px-2.5 py-0.5 text-caption font-semibold',
        style: { backgroundColor: options.accentColor, color: '#ffffff' },
      }
    case 'dot':
      return {
        className: 'h-2.5 w-2.5 shrink-0 rounded-full',
        style: { backgroundColor: options.accentColor },
      }
    case 'label':
      return {
        className: 'text-caption font-bold uppercase tracking-wider',
        style: { color: options.accentColor },
      }
    case 'corner':
      return {
        className:
          'absolute -right-1 -top-1 rounded-bl-lg rounded-tr-lg px-1.5 py-0.5 text-[9px] font-bold uppercase',
        style: { backgroundColor: options.accentColor, color: '#ffffff' },
      }
    default:
      return { className: '' }
  }
}

export function todayBadgeClass(options: TodayHighlightOptions): string {
  return todayBadgePresentation(options).className
}

export function todayBadgeLabel(options: TodayHighlightOptions): string {
  return 'Today'
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

/** Month grid: skip the generic selected ring when today styling already draws a border. */
export function monthCellSelectionClass(selected: boolean, isTodayDate: boolean): string {
  if (!selected || isTodayDate) return ''
  return 'ring-1 ring-inset ring-wf-accent/35'
}
