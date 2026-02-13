import type { CSSProperties } from 'react'
import s from './Skeleton.module.scss'

type SkeletonProps = {
  width?: number | string
  height?: number | string
  circle?: boolean
}

export function Skeleton({ width = '100%', height = 12, circle = false }: SkeletonProps) {
  const style: CSSProperties = {
    width,
    height,
  }

  return (
    <div
      className={[s.skeleton, circle && s.circle].filter(Boolean).join(' ')}
      style={style}
    />
  )
}
