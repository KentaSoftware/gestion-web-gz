/**
 * Page-level loading skeleton for the home dashboard.
 * Shown during initial JS bundle load and SSR streaming.
 * (Client-side data-fetch loading is handled inside page.tsx itself.)
 */
export default function HomeLoading() {
  return (
    <main className="flex min-h-full w-full flex-1 bg-background-canvas py-4 md:py-6">
      <div className="mx-auto flex w-full min-w-0 max-w-[1440px] flex-col gap-4 px-5 md:px-6 lg:gap-5 lg:px-8 max-md:px-4">
        {/* ── Filter bar skeleton ────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-raised p-3 shadow-sm">
          <div className="h-8 w-28 animate-pulse rounded-lg bg-background-subtle" />
          <div className="h-5 w-px bg-border-subtle" aria-hidden="true" />
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-background-subtle" />
            ))}
          </div>
          <div className="h-5 w-px bg-border-subtle" aria-hidden="true" />
          <div className="h-4 w-44 animate-pulse rounded bg-background-subtle" />
        </div>

        {/* ── KPI band skeleton ──────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-hidden="true">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="min-w-0 rounded-xl bg-surface-base p-4 md:p-5">
              <div className="h-3 w-20 animate-pulse rounded bg-background-subtle" />
              <div className="mt-4 h-7 w-28 animate-pulse rounded bg-background-subtle" />
              <div className="mt-3 h-5 w-16 animate-pulse rounded-full bg-background-subtle" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
