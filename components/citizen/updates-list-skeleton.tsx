// Loading state for the Latest Updates section, used as the <Suspense> fallback
// while the UpdatesList Server Component fetches. Mirrors the card layout.
export function UpdatesListSkeleton() {
  return (
    <div className="surface p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Latest Updates</h3>
        <span className="text-sm font-medium text-info">View All</span>
      </div>

      <ul className="mt-2 divide-y divide-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="flex gap-3 p-3">
            <div className="size-16 shrink-0 animate-pulse rounded-xl bg-secondary max-sm:size-14" />
            <div className="min-w-0 flex-1 space-y-2 py-1">
              <div className="h-3 w-1/3 animate-pulse rounded bg-secondary" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-secondary" />
              <div className="h-3 w-full animate-pulse rounded bg-secondary" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
