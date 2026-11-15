import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import FinancePage from './page'
import { Permission } from '@/interfaces/auth.interface'
import { createFinanceDemo } from './financeDemo'

const mocks = vi.hoisted(() => ({ demo: true, allowed: true, permission: '', getDashboard: vi.fn(), getRules: vi.fn(), updateRules: vi.fn(), exportReportPdf: vi.fn() }))
vi.mock('./financeDemo', async importOriginal => ({ ...(await importOriginal<typeof import('./financeDemo')>()), get demo() { return mocks.demo } }))
vi.mock('@/services/finance.service', () => ({ financeService: mocks }))
vi.mock('@/components/ProtectedRoute', () => ({ default: ({ children, requiredPermission }: { children: ReactNode, requiredPermission: string }) => { mocks.permission = requiredPermission; return mocks.allowed ? <>{children}</> : <div>Denied</div> } }))
vi.mock('@/components/finance/FinanceChartsPanel', () => ({ FinanceChartsPanel: () => null, FinanceProjectionChart: () => null }))
vi.mock('@/components/finance/RegisterExpenseModal', () => ({ RegisterExpenseModal: ({ open }: { open: boolean }) => open ? <div>Expense form</div> : null }))

describe('finance page source switch', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.demo = true; mocks.allowed = true; mocks.permission = '' })

  it('renders fixtures without service calls, mutation controls or real movement navigation', async () => {
    render(<FinancePage />)
    expect((await screen.findAllByText(/Cobros de ventas/)).length).toBeGreaterThan(0)
    expect(screen.getByText('Capital ocioso')).toBeInTheDocument()
    expect(screen.getByText(/Yerba mate 1 kg: 120 unidades vendidas en los 30 días hasta el/)).toBeInTheDocument()
    expect(screen.getByText(/Arroz largo fino 1 kg: 8 unidades disponibles/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))
    expect(mocks.getDashboard).not.toHaveBeenCalled()
    expect(mocks.getRules).not.toHaveBeenCalled()
    expect(mocks.updateRules).not.toHaveBeenCalled()
    expect(mocks.exportReportPdf).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /Exportar Reporte|Nuevo Movimiento|Actualizar/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Ver Todos los Movimientos/ })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-03-10' } })
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-03-10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))
    expect(screen.getByText(/Ingresos: 180.000 · Egresos: 120.000/)).toBeInTheDocument()
    expect(screen.getByText(/30 días hasta el 10\/03\/2026 inclusive/)).toBeInTheDocument()
    expect(screen.getByText(/8 unidades disponibles al 10\/03\/2026/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2020-01-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))
    expect(screen.getByText(/no puede superar 366 días/)).toBeInTheDocument()
    expect(mocks.getDashboard).not.toHaveBeenCalled()
    expect(mocks.updateRules).not.toHaveBeenCalled()
    expect(mocks.exportReportPdf).not.toHaveBeenCalled()
  })

  it('uses live services and exposes actions when disabled', async () => {
    mocks.demo = false
    mocks.getDashboard.mockRejectedValue(new Error('offline'))
    mocks.getRules.mockRejectedValue(new Error('offline'))
    render(<FinancePage />)
    await waitFor(() => expect(mocks.getDashboard).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(mocks.getRules).toHaveBeenCalledTimes(1))
    expect(await screen.findByText(/No se pudo cargar el panel financiero/)).toBeInTheDocument()
    expect(screen.queryByText(/Cobros de ventas/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ver Todos los Movimientos/ })).toHaveAttribute('href', '/cashflow')
    mocks.updateRules.mockRejectedValue(new Error('offline'))
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }))
    expect(mocks.updateRules).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: /Nuevo Movimiento/ }))
    expect(screen.getByText('Expense form')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Exportar Reporte/ }))
    expect(mocks.exportReportPdf).toHaveBeenCalledTimes(1)
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))
    expect(mocks.getDashboard).toHaveBeenCalledTimes(2)
  })

  it('renders a successful live response without replacing it with fixtures', async () => {
    mocks.demo = false
    const live = createFinanceDemo({ startDate: '2026-03-10', endDate: '2026-03-10' })
    live.insights = []
    live.opportunity.title = 'Oportunidad real'
    live.recentMovements[0].description = 'Registro real'
    mocks.getDashboard.mockResolvedValue(live)
    mocks.getRules.mockResolvedValue({ rulesVersion: 'live', config: { reserveMinimumAmount: 12 } })
    render(<FinancePage />)
    expect(await screen.findByText(/Registro real/)).toBeInTheDocument()
    expect(screen.queryByText(/Yerba mate 1 kg/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Arroz largo fino 1 kg/)).not.toBeInTheDocument()
    expect(screen.getByText('Oportunidad real')).toBeInTheDocument()
    expect(await screen.findByText(/CUR-6 \/ CU-012 · live/)).toBeInTheDocument()
    expect(mocks.permission).toBe(Permission.READ_CASHFLOW)
    expect(mocks.getDashboard).toHaveBeenCalledTimes(1)
    expect(mocks.getRules).toHaveBeenCalledTimes(1)
  })

  it('keeps the permission wrapper in demo mode', () => {
    mocks.allowed = false
    render(<FinancePage />)
    expect(screen.getByText('Denied')).toBeInTheDocument()
    expect(mocks.permission).toBe(Permission.READ_CASHFLOW)
    expect(mocks.getDashboard).not.toHaveBeenCalled()
    expect(mocks.getRules).not.toHaveBeenCalled()
  })
})
