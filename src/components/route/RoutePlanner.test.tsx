import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Permission } from '@/interfaces/auth.interface'
import type { RoutePreview as RoutePreviewData } from '@/interfaces/routePlan.interface'

const { getActiveDeliveryZones, getCandidates, preview, hasPermission } = vi.hoisted(() => ({
  getActiveDeliveryZones: vi.fn(),
  getCandidates: vi.fn(),
  preview: vi.fn(),
  hasPermission: vi.fn(),
}))

vi.mock('@/services/routePlan.service', () => ({
  routePlanService: { getActiveDeliveryZones, getCandidates, preview },
}))

vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ hasPermission }),
}))

import { RoutePlanner } from './RoutePlanner'

const ZONE_A = 'a'.repeat(24)
const ZONE_B = 'b'.repeat(24)
const SALE_ID = 'c'.repeat(24)
const CLIENT_ID = 'd'.repeat(24)

const zoneA = { _id: ZONE_A, code: 'NORTE', name: 'Zona Norte', active: true }
const zoneB = { _id: ZONE_B, code: 'SUR', name: 'Zona Sur', active: true }

const ELIGIBLE_A = {
  saleId: SALE_ID,
  clientId: CLIENT_ID,
  displayName: 'Almacén Sur',
  addressSummary: 'Av. Siempre Viva 742',
}
const ELIGIBLE_B = {
  saleId: 'e'.repeat(24),
  clientId: 'f'.repeat(24),
  displayName: 'Kiosco Norte',
  addressSummary: 'Calle Falsa 123',
}

const PREVIEW: RoutePreviewData = {
  route: {
    depot: { id: 'deposito_1', name: 'Depósito Central', latitude: -34.6, longitude: -58.4 },
    stops: [{ clientId: CLIENT_ID, saleIds: [SALE_ID], latitude: -34.61, longitude: -58.41 }],
    segments: [{ fromId: 'deposito_1', toId: CLIENT_ID, distanceMeters: 3500, durationSeconds: 900 }],
    encodedPolyline: 'encoded-polyline',
  },
  metrics: { distanceMeters: 3500, durationSeconds: 900, stopCount: 1, fuelLiters: 0.3 },
  warnings: ['TIME_WINDOWS_NOT_CONSIDERED'],
  factorsConsidered: ['DISTANCE', 'DURATION', 'FUEL_CONSUMPTION'],
  algorithmVersion: 'nearest-neighbor-2opt-v1',
  algorithmProvider: 'google-routes',
  routingConfigRevision: 3,
  ruleVersion: 'candidate-eligibility-v1',
}

const selectDateAndZone = async (): Promise<void> => {
  fireEvent.change(screen.getByLabelText('Fecha de reparto'), { target: { value: '2026-10-04' } })
  await screen.findByRole('option', { name: 'Zona Norte' })
  await userEvent.selectOptions(screen.getByLabelText('Zona de entrega'), ZONE_A)
}

const loadCandidates = async (
  result: {
    eligible: typeof ELIGIBLE_A[]
    blocked: unknown[]
    ruleVersion: string
  } = { eligible: [ELIGIBLE_A], blocked: [], ruleVersion: 'candidate-eligibility-v1' }
): Promise<void> => {
  getCandidates.mockResolvedValue(result)
  render(<RoutePlanner />)
  await selectDateAndZone()
  await userEvent.click(screen.getByRole('button', { name: 'Cargar candidatos' }))
}

describe('RoutePlanner', () => {
  beforeEach(() => {
    getActiveDeliveryZones.mockReset()
    getCandidates.mockReset()
    preview.mockReset()
    hasPermission.mockReset()
    getActiveDeliveryZones.mockResolvedValue([zoneA, zoneB])
    hasPermission.mockReturnValue(true)
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
      eligible: [ELIGIBLE_A],
      blocked: [
        {
          saleId: 'g'.repeat(24),
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
    expect(screen.getByText('Av. Siempre Viva 742')).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: 'Destinos bloqueados (1)' })).toBeInTheDocument()
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

  it('selects every eligible sale and clears the selection', async () => {
    await loadCandidates({ eligible: [ELIGIBLE_A, ELIGIBLE_B], blocked: [], ruleVersion: 'candidate-eligibility-v1' })

    const first = await screen.findByRole('checkbox', { name: 'Almacén Sur' })
    const second = screen.getByRole('checkbox', { name: 'Kiosco Norte' })
    expect(first).not.toBeChecked()
    expect(second).not.toBeChecked()

    await userEvent.click(screen.getByRole('button', { name: 'Seleccionar todo' }))
    expect(first).toBeChecked()
    expect(second).toBeChecked()

    await userEvent.click(screen.getByRole('button', { name: 'Limpiar selección' }))
    expect(first).not.toBeChecked()
    expect(second).not.toBeChecked()
  })

  it('toggles an individual eligible sale', async () => {
    await loadCandidates()

    const checkbox = await screen.findByRole('checkbox', { name: 'Almacén Sur' })

    await userEvent.click(checkbox)
    expect(checkbox).toBeChecked()

    await userEvent.click(checkbox)
    expect(checkbox).not.toBeChecked()
  })

  it('explains that sales from the same client are grouped into one stop', async () => {
    await loadCandidates()

    expect(
      await screen.findByText(/Las ventas del mismo cliente se agrupan en una sola parada\./)
    ).toBeInTheDocument()
  })

  it('only renders the preview action with the create route plan permission', async () => {
    hasPermission.mockReturnValue(false)

    await loadCandidates()

    expect(screen.queryByRole('button', { name: 'Calcular recorrido' })).not.toBeInTheDocument()
    expect(
      screen.getByText('Necesitás el permiso de creación de rutas para calcular el recorrido.')
    ).toBeInTheDocument()
  })

  it('rejects a preview without a selection and does not call the service', async () => {
    await loadCandidates()

    await userEvent.click(await screen.findByRole('button', { name: 'Calcular recorrido' }))

    expect(screen.getByRole('alert')).toHaveTextContent('al menos una parada')
    expect(preview).not.toHaveBeenCalled()
  })

  it('announces the preview loading state', async () => {
    preview.mockReturnValue(new Promise(() => undefined))
    await loadCandidates()

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Almacén Sur' }))
    await userEvent.click(screen.getByRole('button', { name: 'Calcular recorrido' }))

    expect(await screen.findByText(/Calculando recorrido/)).toBeInTheDocument()
  })

  it('requests a preview with the selected sale ids and renders the result', async () => {
    preview.mockResolvedValue(PREVIEW)
    await loadCandidates()

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Almacén Sur' }))
    await userEvent.click(screen.getByRole('button', { name: 'Calcular recorrido' }))

    expect(await screen.findByRole('heading', { name: 'Recorrido propuesto' })).toBeInTheDocument()
    expect(screen.getByText('3,5 km')).toBeInTheDocument()
    expect(preview).toHaveBeenCalledWith({
      serviceDate: '2026-10-04',
      deliveryZoneId: ZONE_A,
      saleIds: [SALE_ID],
    })
  })

  it('renders a terminal error when the preview fails', async () => {
    preview.mockRejectedValue({
      response: { data: { code: 'ROUTING_PROVIDER_UNAVAILABLE', message: 'provider down' } },
    })
    await loadCandidates()

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Almacén Sur' }))
    await userEvent.click(screen.getByRole('button', { name: 'Calcular recorrido' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El proveedor de rutas no está disponible')
  })

  it('clears the selection and preview when candidates are reloaded', async () => {
    preview.mockResolvedValue(PREVIEW)
    await loadCandidates()

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Almacén Sur' }))
    await userEvent.click(screen.getByRole('button', { name: 'Calcular recorrido' }))
    expect(await screen.findByRole('heading', { name: 'Recorrido propuesto' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Cargar candidatos' }))

    expect(await screen.findByRole('checkbox', { name: 'Almacén Sur' })).not.toBeChecked()
    expect(screen.queryByRole('heading', { name: 'Recorrido propuesto' })).not.toBeInTheDocument()
  })
})
