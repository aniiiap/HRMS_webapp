/** Tiny fallback while lazy route chunks load — keeps shell fast, content streams in. */
export default function RoutePageFallback() {
  return (
    <div className="flex min-h-[min(50vh,420px)] flex-col items-center justify-center gap-4">
      <div className="relative">
        <div
          className="h-11 w-11 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600 dark:border-brand-900 dark:border-t-brand-400"
          aria-hidden
        />
        <div className="absolute inset-0 animate-pulse-soft rounded-full bg-brand-400/20 blur-md" aria-hidden />
      </div>
      <p className="text-sm font-medium text-stone-500 dark:text-stone-400">Loading your page…</p>
    </div>
  )
}
