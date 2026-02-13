import s from './Progress.module.scss'

type ProgressTone = 'accent' | 'success' | 'warning' | 'danger'
type ProgressSize = 'sm' | 'md' | 'lg'

type ProgressProps = {
  value: number
  size?: ProgressSize
  tone?: ProgressTone
}

const sizeClassMap: Record<ProgressSize, string> = {
  sm: s.sizeSm,
  md: s.sizeMd,
  lg: s.sizeLg,
}

const toneClassMap: Record<ProgressTone, string | null> = {
  accent: null,
  success: s.toneSuccess,
  warning: s.toneWarning,
  danger: s.toneDanger,
}

export function Progress({ value, size = 'md', tone = 'accent' }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div
      className={[s.track, sizeClassMap[size], toneClassMap[tone]]
        .filter(Boolean)
        .join(' ')}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={s.bar} style={{ width: `${clamped}%` }} />
    </div>
  )
}
