import type { ImgHTMLAttributes } from 'react'
import s from './Avatar.module.scss'

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'

type AvatarProps = {
  size?: AvatarSize
  fallback: string
  src?: string
} & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'>

const sizeClassMap: Record<AvatarSize, string> = {
  sm: s.sizeSm,
  md: s.sizeMd,
  lg: s.sizeLg,
  xl: s.sizeXl,
}

export function Avatar({ size = 'md', fallback, src, alt, ...props }: AvatarProps) {
  const initials = fallback.slice(0, 2).toUpperCase()

  return (
    <span className={[s.avatar, sizeClassMap[size]].join(' ')}>
      {src ? <img className={s.img} src={src} alt={alt ?? fallback} {...props} /> : initials}
    </span>
  )
}
