import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  CANDIDATE_BLOCK_REASON,
  type BlockedCandidateEntry,
  type CandidateBlockReason,
} from '@/interfaces/routePlan.interface'
import { BlockedDestinations } from './BlockedDestinations'

/** A backend reason the client does not know yet; it must never be hidden. */
const UNKNOWN_REASON = 'FUTURE_BLOCK_REASON' as unknown as CandidateBlockReason

const blocked = (overrides: Partial<BlockedCandidateEntry> = {}): BlockedCandidateEntry => ({
  saleId: 'sale-1',
  displayName: 'Kiosco Norte',
  addressSummary: 'Calle Falsa 123',
  reasons: [CANDIDATE_BLOCK_REASON.CLIENT_INACTIVE],
  ...overrides,
})

describe('BlockedDestinations', () => {
  it('renders every blocked destination with its stable reason labels', () => {
    render(
      <BlockedDestinations
        candidates={[
          blocked({
            reasons: [
              CANDIDATE_BLOCK_REASON.CLIENT_INACTIVE,
              CANDIDATE_BLOCK_REASON.CLIENT_LOCATION_UNCONFIRMED,
            ],
          }),
        ]}
      />
    )

    expect(screen.getByRole('heading', { name: 'Destinos bloqueados (1)' })).toBeInTheDocument()
    expect(screen.getByText('Kiosco Norte')).toBeInTheDocument()
    expect(screen.getByText('Calle Falsa 123')).toBeInTheDocument()
    expect(screen.getByText('El cliente está inactivo')).toBeInTheDocument()
    expect(screen.getByText('La ubicación del cliente no está confirmada')).toBeInTheDocument()
  })

  it('renders one entry per reason and exposes the stable code on each', () => {
    render(
      <BlockedDestinations
        candidates={[blocked({ reasons: [CANDIDATE_BLOCK_REASON.CLIENT_LOCATION_MISSING] })]}
      />
    )

    const list = screen.getByRole('list', { name: 'Destinos bloqueados' })
    const reasonItems = within(list)
      .getAllByRole('listitem')
      .filter((item) => item.getAttribute('data-reason') !== null)

    expect(reasonItems).toHaveLength(1)
    expect(reasonItems[0]).toHaveAttribute('data-reason', 'CLIENT_LOCATION_MISSING')
    expect(reasonItems[0]).toHaveTextContent('El cliente no tiene una ubicación cargada')
  })

  it('falls back to the raw code for an unknown backend reason', () => {
    render(<BlockedDestinations candidates={[blocked({ reasons: [UNKNOWN_REASON] })]} />)

    const reason = screen.getByText('FUTURE_BLOCK_REASON')
    expect(reason).toHaveAttribute('data-reason', 'FUTURE_BLOCK_REASON')
  })

  it('falls back to the sale id when the display name is missing', () => {
    render(
      <BlockedDestinations
        candidates={[blocked({ saleId: 'sale-42', displayName: undefined, addressSummary: undefined })]}
      />
    )

    expect(screen.getByText('sale-42')).toBeInTheDocument()
    expect(screen.queryByText('Calle Falsa 123')).not.toBeInTheDocument()
  })
})
