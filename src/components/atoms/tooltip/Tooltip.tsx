import type { ReactNode } from 'react'
import { Tooltip as RadixTooltip } from '@radix-ui/themes'

type TooltipProps = {
  content: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  delayDuration?: number
  disabled?: boolean
  children: ReactNode
}

export function Tooltip({
  content,
  side = 'top',
  align = 'center',
  delayDuration = 200,
  disabled = false,
  children,
}: TooltipProps) {
  if (!content || disabled) {
    return <>{children}</>
  }

  return (
    <RadixTooltip
      content={content}
      side={side}
      align={align}
      delayDuration={delayDuration}
    >
      {children}
    </RadixTooltip>
  )
}
