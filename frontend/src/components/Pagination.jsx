import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

export default function Pagination({ page, totalPages, total, pageSize, onPageChange, onPageSizeChange }) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline">Rows per page:</span>
        <select
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm outline-none transition focus:border-brand-400 dark:border-slate-600 dark:bg-slate-900"
          value={pageSize}
          onChange={(e) => {
            if (onPageSizeChange) {
              onPageSizeChange(Number(e.target.value))
            }
          }}
        >
          {[10, 20, 30, 50, 100].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <span className="ml-2 hidden sm:inline">
          {from}-{to} of {total}
        </span>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <span className="mr-2 sm:hidden text-xs">{from}-{to} of {total}</span>
        
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:hover:bg-transparent dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            disabled={page <= 1}
            onClick={() => onPageChange(1)}
            title="First Page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:hover:bg-transparent dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            title="Previous Page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        <span className="px-2 text-xs font-medium sm:text-sm">
          Page {page} of {totalPages}
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:hover:bg-transparent dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            disabled={page >= totalPages || totalPages === 0}
            onClick={() => onPageChange(page + 1)}
            title="Next Page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:hover:bg-transparent dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            disabled={page >= totalPages || totalPages === 0}
            onClick={() => onPageChange(totalPages)}
            title="Last Page"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
