/** Tiny fallback while lazy route chunks load — keeps shell fast, content streams in. */
export default function RoutePageFallback() {
  return (
    <div className="flex min-h-[min(50vh,420px)] flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
      <div
        className="h-9 w-9 animate-spin rounded-full border-2 border-brand-500 border-t-transparent dark:border-brand-400"
        aria-hidden
      />
      <p className="text-sm font-medium">Loading…</p>
    </div>
  )
}
