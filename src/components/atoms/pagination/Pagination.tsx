import s from './Pagination.module.scss'

type PaginationProps = {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)

  return (
    <div className={s.pagination} role="navigation" aria-label="Pagination">
      <button
        className={[s.button, page === 1 && s.disabled].filter(Boolean).join(' ')}
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
      >
        Prev
      </button>
      {pages.map((p) => (
        <button
          key={p}
          className={[s.button, p === page && s.active].filter(Boolean).join(' ')}
          type="button"
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
      <button
        className={[s.button, page === totalPages && s.disabled]
          .filter(Boolean)
          .join(' ')}
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
      >
        Next
      </button>
    </div>
  )
}
