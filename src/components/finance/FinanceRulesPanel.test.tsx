import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FinanceRulesPanel } from './FinanceRulesPanel'

const mocks = vi.hoisted(() => ({ getRules: vi.fn(), updateRules: vi.fn() }))
vi.mock('@/services/finance.service', () => ({ financeService: mocks }))

describe('FinanceRulesPanel', () => {
  beforeEach(() => vi.resetAllMocks())

  it('keeps update keyboard accessible without fetching or saving in read-only mode', async () => {
    const user = userEvent.setup()
    const onUpdated = vi.fn()
    render(<FinanceRulesPanel readOnly onUpdated={onUpdated} />)
    const button = screen.getByRole('button', { name: 'Actualizar' })
    expect(button).toBeVisible()
    expect(button).toBeEnabled()
    await user.tab()
    expect(button).toHaveFocus()
    await user.keyboard('{Enter}{Space}')
    await user.click(button)
    expect(screen.queryByText('Actualizando…')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Reserva mínima/)).toBeDisabled()
    expect(screen.queryByText(/CUR-6|CU-012|finance-rules-v2/i)).not.toBeInTheDocument()
    expect(mocks.getRules).not.toHaveBeenCalled()
    expect(mocks.updateRules).not.toHaveBeenCalled()
    expect(onUpdated).not.toHaveBeenCalled()
  })

  it('loads and updates rules in live mode without displaying the version', async () => {
    const user = userEvent.setup()
    const onUpdated = vi.fn()
    const config = { reserveMinimumAmount: 123, deficitAlertThresholdPercent: 20, minExpectedRoiPercent: 18, historyEvaluationDays: 90, riskProfile: 'moderado' }
    mocks.getRules.mockResolvedValue({ rulesVersion: 'finance-rules-v2', config })
    mocks.updateRules.mockResolvedValue({ rulesVersion: 'finance-rules-v2', config })
    render(<FinanceRulesPanel onUpdated={onUpdated} />)
    await waitFor(() => expect(screen.getByLabelText(/Reserva mínima/)).toHaveValue(123))
    expect(screen.queryByText(/CUR-6|CU-012|finance-rules-v2/i)).not.toBeInTheDocument()
    const button = screen.getByRole('button', { name: 'Actualizar' })
    expect(button).toBeEnabled()
    await user.click(button)
    expect(mocks.updateRules).toHaveBeenCalledWith(config)
    await waitFor(() => expect(onUpdated).toHaveBeenCalledTimes(1))
  })
})
