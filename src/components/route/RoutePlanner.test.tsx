import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Permission } from '@/interfaces/auth.interface'
import type { RoutePreview as RoutePreviewData } from '@/interfaces/routePlan.interface'

const { getActiveDeliveryZones, getCandidates, getAssignmentOptions, preview, save, hasPermission, push } = vi.hoisted(() => ({
  getActiveDeliveryZones: vi.fn(),
  getCandidates: vi.fn(),
  getAssignmentOptions: vi.fn(),
  preview: vi.fn(),
  save: vi.fn(),
  hasPermission: vi.fn(),
  push: vi.fn(),
}))

vi.mock('@/services/routePlan.service', () => ({
  routePlanService: { getActiveDeliveryZones, getCandidates, getAssignmentOptions, preview, save },
}))

vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ hasPermission }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
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
  const driverSelect = screen.queryByLabelText('Repartidor')
  const vehicleSelect = screen.queryByLabelText('Vehículo')
  if (driverSelect !== null && vehicleSelect !== null) {
    await userEvent.selectOptions(driverSelect, 'driver-1')
    await userEvent.selectOptions(vehicleSelect, 'vehicle-1')
  }
}

describe('RoutePlanner', () => {
  beforeEach(() => {
    getActiveDeliveryZones.mockReset()
    getCandidates.mockReset()
    getAssignmentOptions.mockReset()
    preview.mockReset()
    save.mockReset()
    hasPermission.mockReset()
    push.mockReset()
    getActiveDeliveryZones.mockResolvedValue([zoneA, zoneB])
    getAssignmentOptions.mockResolvedValue({
      drivers: [{ id: 'driver-1', nickname: 'Ana Pérez', isActive: true }],
      vehicles: [{ id: 'vehicle-1', code: 'AA123BB', fuelConsumptionLitersPer100Km: 10.5, attributes: {}, availability: true }],
    })
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

  it('requires driver and vehicle assignments before preview', async () => {
    await loadCandidates()
    await userEvent.selectOptions(screen.getByLabelText('Repartidor'), '')
    await userEvent.selectOptions(screen.getByLabelText('Vehículo'), '')
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Almacén Sur' }))

    const previewButton = screen.getByRole('button', { name: 'Calcular recorrido' })
    expect(previewButton).toBeDisabled()
    expect(screen.getByLabelText('Repartidor')).toBeInTheDocument()
    expect(screen.getByLabelText('Vehículo')).toHaveTextContent('AA123BB')
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
      driverId: 'driver-1',
      vehicleId: 'vehicle-1',
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

  const SAVED_ID = 'f'.repeat(24)
  const SAVED_PLAN = {
    _id: SAVED_ID,
    snapshotVersion: 1,
    planningDate: '2026-10-04T03:00:00.000Z',
    zoneSnapshot: { code: 'NORTE', normalizedName: 'zona norte', name: 'Zona Norte' },
    selectedSaleIds: [SALE_ID],
    depot: { name: 'Depósito Central', latitude: -34.6, longitude: -58.4 },
    stops: [
      { clientId: CLIENT_ID, saleIds: [SALE_ID], sequence: 1, latitude: -34.61, longitude: -58.41 },
    ],
    segments: [
      { fromStopSequence: 0, toStopSequence: 1, distanceMeters: 3500, durationSeconds: 900 },
      { fromStopSequence: 1, toStopSequence: 0, distanceMeters: 3500, durationSeconds: 900 },
    ],
    metrics: { distanceMeters: 3500, durationSeconds: 900, stopCount: 1, fuelLiters: 0.3 },
    algorithm: { name: 'nearest-neighbor-2opt-v1', version: 'nearest-neighbor-2opt-v1', provider: 'google-routes' },
    routingConfigRevision: 3,
    ruleVersion: 'candidate-eligibility-v1',
    encodedPolyline: 'encoded-polyline',
    warnings: ['TIME_WINDOWS_NOT_CONSIDERED'],
    audit: { createdBy: 'user-1', createdAt: '2026-10-04T03:05:00.000Z' },
  }

  const loadPreview = async (): Promise<void> => {
    preview.mockResolvedValue(PREVIEW)
    await loadCandidates()
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Almacén Sur' }))
    await userEvent.click(screen.getByRole('button', { name: 'Calcular recorrido' }))
    await screen.findByRole('heading', { name: 'Recorrido propuesto' })
  }

  it('does not render the save action before a valid preview exists', async () => {
    await loadCandidates()

    expect(screen.queryByRole('button', { name: 'Guardar plan' })).not.toBeInTheDocument()
  })

  it('only renders the save action with the create route plan permission', async () => {
    hasPermission.mockReturnValue(false)

    await loadCandidates()

    expect(screen.queryByRole('button', { name: 'Guardar plan' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Calcular recorrido' })).not.toBeInTheDocument()
  })

  it('saves the current preview and navigates to the saved plan on success', async () => {
    save.mockResolvedValue(SAVED_PLAN)
    await loadPreview()

    await userEvent.click(screen.getByRole('button', { name: 'Guardar plan' }))

    expect(save).toHaveBeenCalledWith({
      serviceDate: '2026-10-04',
      deliveryZoneId: ZONE_A,
      saleIds: [SALE_ID],
      driverId: 'driver-1',
      vehicleId: 'vehicle-1',
    })
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/route/${SAVED_ID}`))
  })

  it('prevents duplicate submits while the plan is saving', async () => {
    save.mockReturnValue(new Promise(() => undefined))
    await loadPreview()

    const saveButton = screen.getByRole('button', { name: 'Guardar plan' })
    await userEvent.click(saveButton)
    await userEvent.click(saveButton)

    expect(await screen.findByText(/Guardando plan/)).toBeInTheDocument()
    expect(save).toHaveBeenCalledTimes(1)
    expect(push).not.toHaveBeenCalled()
  })

  it('renders an accessible error when the save fails', async () => {
    save.mockRejectedValue({
      response: { data: { code: 'ROUTING_PROVIDER_UNAVAILABLE', message: 'provider down' } },
    })
    await loadPreview()

    await userEvent.click(screen.getByRole('button', { name: 'Guardar plan' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El proveedor de rutas no está disponible')
    expect(push).not.toHaveBeenCalled()
  })

  it('does not offer the save action when the preview request fails', async () => {
    preview.mockRejectedValue(new Error('boom'))
    await loadCandidates()

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Almacén Sur' }))
    await userEvent.click(screen.getByRole('button', { name: 'Calcular recorrido' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo calcular el recorrido')
    expect(screen.queryByRole('button', { name: 'Guardar plan' })).not.toBeInTheDocument()
  })

  it('hides the save action when the selection is cleared after a preview', async () => {
    await loadPreview()

    expect(screen.getByRole('button', { name: 'Guardar plan' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Limpiar selección' }))

    expect(screen.queryByRole('button', { name: 'Guardar plan' })).not.toBeInTheDocument()
  })

  it('renders an error and does not navigate when the saved plan has no identifier', async () => {
    save.mockResolvedValue({ ...SAVED_PLAN, _id: undefined })
    await loadPreview()

    await userEvent.click(screen.getByRole('button', { name: 'Guardar plan' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo obtener el identificador del plan guardado'
    )
    expect(push).not.toHaveBeenCalled()
  })

  it('renders an error and does not navigate for an unknown saved identifier shape', async () => {
    save.mockResolvedValue({ ...SAVED_PLAN, _id: { toString: () => '' } })
    await loadPreview()

    await userEvent.click(screen.getByRole('button', { name: 'Guardar plan' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo obtener el identificador del plan guardado'
    )
    expect(push).not.toHaveBeenCalled()
  })
})
