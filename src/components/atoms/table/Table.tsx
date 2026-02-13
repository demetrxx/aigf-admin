import type { HTMLAttributes, ReactNode } from 'react'
import s from './Table.module.scss'

type TableColumn = {
  key: string
  label: ReactNode
}

type TableRow = Record<string, ReactNode>

type TableProps = {
  columns: TableColumn[]
  rows: TableRow[]
  getRowProps?: (row: TableRow, index: number) => HTMLAttributes<HTMLTableRowElement>
}

export function Table({ columns, rows, getRowProps }: TableProps) {
  return (
    <table className={s.table}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key}>{column.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => {
          const rowProps = getRowProps ? getRowProps(row, index) : undefined
          return (
            <tr key={index} {...rowProps}>
            {columns.map((column) => (
              <td key={column.key}>{row[column.key]}</td>
            ))}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
