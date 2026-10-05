import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getActiveDeliveryZones, getCandidates } = vi.hoisted(() => ({
  getActiveDeliveryZones: vi.fn(),
  getCandidates: vi.fn(),
}))

vi.mock('@/services/routePlan.service', () => ({
  routePlanService: { getActiveDeliveryZones, getCandidates },
}))

import { RoutePlanner } from './RoutePlanner'

const ZONE_A = 'a'.repeat(24)
const ZONE_B = 'b'.repeat(24)
const SALE_ID = 'c'.repeat(24)
const CLIENT_ID = 'd'.repeat(24)

const zoneA = { _id: ZONE_A, code: 'NORTE', name: 'Zona Norte', active: true }
const zoneB = { _id: ZONE_B, code: 'SUR', name: 'Zona Sur', active: true }

const selectDateAndZone = async (): Promise<void> => {
  fireEvent.change(screen.getByLabelText('Fecha de reparto'), { target: { value: '2026-10-04' } })
  await screen.findByRole('option', { name: 'Zona Norte' })
  await userEvent.selectOptions(screen.getByLabelText('Zona de entrega'), ZONE_A)
}

describe('RoutePlanner', () => {
  beforeEach(() => {
    getActiveDeliveryZones.mockReset()
    getCandidates.mockReset()
    getActiveDeliveryZones.mockResolvedValue([zoneA, zoneB])
  })

  it('renders the review controls and loads active zones', async () => {
    render(<RoutePlanner />)

    expect(screen.getByRole('heading', { level: 2, name: 'Planificación de rutas' })).toBeInTheDocument()
    expect(screen.getByLabelText('Fecha de reparto')).toBeInTheDocument()
    expect(screen.getByLabelText('Zona de entrega')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cargar candidatos' })).toBeInTheDocument()

    expect(await screen.findByRole('option', { name: 'Zona Norte' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Zona Sur' })).toBeInTheDocument()
    expect(getActiveDeliveryZones).toHaveBeenCalledTimes(1)
  })

  it('rejects a missing date without calling the candidates endpoint', async () => {
    render(<RoutePlanner />)

    await screen.findByRole('option', { name: 'Zona Norte' })
    await userEvent.selectOptions(screen.getByLabelText('Zona de entrega'), ZONE_A)
    await userEvent.click(screen.getByRole('button', { name: 'Cargar candidatos' }))

    expect(screen.getByRole('alert')).toHaveTextContent('fecha de reparto válida')
    expect(getCandidates).not.toHaveBeenCalled()
  })

  it('rejects a missing zone without calling the candidates endpoint', async () => {
    render(<RoutePlanner />)

    await screen.findByRole('option', { name: 'Zona Norte' })
    fireEvent.change(screen.getByLabelText('Fecha de reparto'), { target: { value: '2026-10-04' } })
    await userEvent.click(screen.getByRole('button', { name: 'Cargar candidatos' }))

    expect(screen.getByRole('alert')).toHaveTextContent('zona de entrega')
    expect(getCandidates).not.toHaveBeenCalled()
  })

  it('announces the loading state while candidates are requested', async () => {
    getCandidates.mockReturnValue(new Promise(() => undefined))
    render(<RoutePlanner />)

    await selectDateAndZone()
    await userEvent.click(screen.getByRole('button', { name: 'Cargar candidatos' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Cargando candidatos')
  })

  it('renders eligible and blocked candidates with stable reasons', async () => {
    getCandidates.mockResolvedValue({
      eligible: [{ saleId: SALE_ID, clientId: CLIENT_ID, displayName: 'Almacén Sur', addressSummary: 'Av. Siempre Viva 742' }],
      blocked: [
        {
          saleId: 'e'.repeat(24),
          displayName: 'Kiosco Norte',
          reasons: ['CLIENT_LOCATION_UNCONFIRMED', 'CLIENT_INACTIVE'],
        },
      ],
      ruleVersion: 'candidate-eligibility-v1',
    })
    render(<RoutePlanner />)

    await selectDateAndZone()
    await userEvent.click(screen.getByRole('button', { name: 'Cargar candidatos' }))

    expect(await screen.findByRole('heading', { name: 'Destinos elegibles (1)' })).toBeInTheDocument()
    expect(screen.getByText('Almacén Sur')).toBeInTheDocument()
    expect(screen.getByText('Av. Siempre Viva 742')).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: 'Destinos bloqueados (1)' })).toBeInTheDocument()
    expect(screen.getByText('Kiosco Norte')).toBeInTheDocument()
    expect(screen.getByText('La ubicación del cliente no está confirmada')).toBeInTheDocument()
    expect(screen.getByText('El cliente está inactivo')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').map((item) => item.getAttribute('data-reason'))).toContain(
      'CLIENT_LOCATION_UNCONFIRMED'
    )
  })

  it('renders the explicit empty state when there are no candidates', async () => {
    getCandidates.mockResolvedValue({ eligible: [], blocked: [], ruleVersion: 'candidate-eligibility-v1' })
    render(<RoutePlanner />)

    await selectDateAndZone()
    await userEvent.click(screen.getByRole('button', { name: 'Cargar candidatos' }))

    expect(await screen.findByRole('status')).toHaveTextContent('No hay candidatos para la fecha y zona seleccionadas')
  })

  it('renders an error state when the candidates request fails', async () => {
    getCandidates.mockRejectedValue(new Error('boom'))
    render(<RoutePlanner />)

    await selectDateAndZone()
    await userEvent.click(screen.getByRole('button', { name: 'Cargar candidatos' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar los candidatos')
  })

  it('renders a retryable error when zones cannot be loaded', async () => {
    getActiveDeliveryZones.mockRejectedValueOnce(new Error('zones down'))
    getActiveDeliveryZones.mockResolvedValueOnce([zoneA])
    render(<RoutePlanner />)

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar las zonas de entrega')

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitFor(() => expect(getActiveDeliveryZones).toHaveBeenCalledTimes(2))
    expect(await screen.findByRole('option', { name: 'Zona Norte' })).toBeInTheDocument()
  })
})
