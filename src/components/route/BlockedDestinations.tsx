import {
  CANDIDATE_BLOCK_REASON_LABEL,
  type BlockedCandidateEntry,
  type CandidateBlockReason,
} from '@/interfaces/routePlan.interface'

interface BlockedDestinationsProps {
  candidates: BlockedCandidateEntry[]
}

/** Falls back to the stable code so an unknown backend reason is never hidden. */
const reasonLabel = (reason: CandidateBlockReason): string =>
  CANDIDATE_BLOCK_REASON_LABEL[reason] ?? reason

/**
 * Read-only list of blocked destinations with their stable reasons.
 *
 * Every blocked candidate is rendered together with every reason it reported,
 * so no blocker is hidden behind a summary count.
 */
export function BlockedDestinations({ candidates }: BlockedDestinationsProps) {
  return (
    <section
      aria-labelledby="blocked-destinations-title"
      className="rounded-lg border border-border-subtle bg-surface-base p-4 shadow-md"
    >
      <h3 id="blocked-destinations-title" className="text-sm font-semibold text-state-error">
        Destinos bloqueados ({candidates.length})
      </h3>
      <p className="mt-1 text-xs text-text-secondary">
        Estas ventas quedan fuera del recorrido hasta que se resuelvan sus datos.
      </p>
      <ul className="mt-3 flex flex-col gap-3" aria-label="Destinos bloqueados">
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
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
              {candidate.reasons.map((reason) => (
                <li key={reason} data-reason={reason} className="text-xs text-state-error">
                  {reasonLabel(reason)}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  )
}
