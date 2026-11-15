import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FinanceKpiCards } from './FinanceKpiCards'

describe('FinanceKpiCards', () => {
  it('distinguishes unavailable data from actual zero and does not truncate amounts', () => {
    const { rerender } = render(<FinanceKpiCards kpis={null} loading={false} />)
    expect(screen.getAllByText('No disponible')).toHaveLength(5)
    expect(screen.queryByText(/\$\s*0,00/)).not.toBeInTheDocument()

    rerender(<FinanceKpiCards loading={false} kpis={{ currentBalance: 123456789, totalInflows: 0, totalOutflows: 0, netCashFlow: 0, idleCapital: 0, effectiveReserve: 0 }} />)
    const amount = screen.getByText(/123\.456\.789,00/)
    expect(amount).not.toHaveClass('truncate')
    expect(screen.getAllByText(/\$\s*0,00/)).toHaveLength(4)
  })
})
