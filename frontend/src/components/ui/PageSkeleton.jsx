export default function PageSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-14 rounded-2xl"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  )
}
