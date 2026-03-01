export default function Loading() {
  return (
    <div className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2 mb-8">
        <div className="h-3 w-10 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="h-3 w-3 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
      </div>

      {/* Title skeleton */}
      <div className="mb-10 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-5 w-20 rounded-full bg-indigo-100 dark:bg-indigo-950/60 animate-pulse" />
          <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
        </div>
        <div className="h-8 w-3/4 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
      </div>

      {/* Content skeleton */}
      <div className="space-y-4">
        {[100, 90, 95, 70, 85, 75, 60, 90, 80, 65, 95, 88].map((w, i) => (
          <div
            key={i}
            style={{ width: `${w}%` }}
            className="h-4 rounded bg-slate-200 dark:bg-slate-800 animate-pulse"
          />
        ))}
        <div className="my-6 h-px w-full bg-slate-200 dark:bg-slate-800" />
        {[85, 70, 90, 60, 80].map((w, i) => (
          <div
            key={`b${i}`}
            style={{ width: `${w}%` }}
            className="h-4 rounded bg-slate-200 dark:bg-slate-800 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
