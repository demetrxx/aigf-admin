import type { ReactNode } from 'react'
import s from './Tabs.module.scss'

type TabItem = {
  value: string
  label: ReactNode
}

type TabsProps = {
  items: TabItem[]
  value: string
  onChange: (value: string) => void
}

export function Tabs({ items, value, onChange }: TabsProps) {
  return (
    <div className={s.tabs} role="tablist">
      {items.map((item) => {
        const isActive = item.value === value
        return (
          <button
            key={item.value}
            className={[s.tab, isActive && s.tabActive].filter(Boolean).join(' ')}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
