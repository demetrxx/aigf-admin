import type { ReactNode } from 'react'
import { useState } from 'react'
import { Popover } from '../popover/Popover'
import s from './Dropdown.module.scss'

type DropdownItem = {
  label: ReactNode
  value: string
}

type DropdownProps = {
  trigger: ReactNode
  items: DropdownItem[]
  onSelect: (value: string) => void
}

export function Dropdown({ trigger, items, onSelect }: DropdownProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      content={
        <div className={s.menu}>
          {items.map((item) => (
            <button
              key={item.value}
              className={s.item}
              type="button"
              onClick={() => {
                onSelect(item.value)
                setOpen(false)
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      }
    />
  )
}
