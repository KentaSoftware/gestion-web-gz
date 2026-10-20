import type { CandidateEntry } from '@/interfaces/routePlan.interface'

interface StopListProps {
  candidates: CandidateEntry[]
}

/**
 * Read-only list of eligible destinations.
 *
 * Presentational only: selection, preview and persistence belong to later work
 * units, so nothing here is interactive or mutating.
 */
export function StopList({ candidates }: StopListProps) {
  return (
    <section
      aria-labelledby="eligible-destinations-title"
      className="rounded-lg border border-border-subtle bg-surface-base p-4 shadow-md"
    >
      <h3 id="eligible-destinations-title" className="text-sm font-semibold text-brand-primary">
        Destinos elegibles ({candidates.length})
      </h3>
      <ul className="mt-3 flex flex-col gap-2" aria-label="Destinos elegibles">
        {candidates.map((candidate) => (
          <li
            key={candidate.saleId}
            className="rounded-md border border-border-subtle bg-background-subtle p-3"
          >
            <p className="text-sm font-medium text-text-primary">
              {candidate.displayName ?? candidate.saleId}
            </p>
            {candidate.addressSummary && (
              <p className="mt-0.5 text-xs text-text-secondary">{candidate.addressSummary}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
