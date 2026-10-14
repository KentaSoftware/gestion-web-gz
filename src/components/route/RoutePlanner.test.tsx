import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RoutePreview as RoutePreviewData } from '@/interfaces/routePlan.interface'

const { getActiveDeliveryZones, getCandidates, getAssignmentOptions, preview, save, push } = vi.hoisted(() => ({
  getActiveDeliveryZones: vi.fn(), getCandidates: vi.fn(), getAssignmentOptions: vi.fn(), preview: vi.fn(), save: vi.fn(), push: vi.fn(),
}))

vi.mock('@/services/routePlan.service', () => ({ routePlanService: { getActiveDeliveryZones, getCandidates, getAssignmentOptions, preview, save } }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

import { RoutePlanner } from './RoutePlanner'

const ZONE_ID = 'a'.repeat(24)
const CLIENT_A = 'b'.repeat(24)
const CLIENT_B = 'c'.repeat(24)
const SALE_A1 = 'd'.repeat(24)
const SALE_A2 = 'e'.repeat(24)
const SALE_B1 = 'f'.repeat(24)

const candidates = {
  eligible: [
    { saleId: SALE_A1, clientId: CLIENT_A, displayName: 'Almacén Sur', addressSummary: 'Av. Siempre Viva 742' },
    { saleId: SALE_A2, clientId: CLIENT_A, displayName: 'Almacén Sur', addressSummary: 'Av. Siempre Viva 742' },
    { saleId: SALE_B1, clientId: CLIENT_B, displayName: 'Kiosco Norte', addressSummary: 'Calle Falsa 123' },
  ],
  blocked: [{ saleId: '1'.repeat(24), clientId: '9'.repeat(24), displayName: 'Cliente bloqueado', addressSummary: 'Otra calle', reasons: ['CLIENT_ZONE_MISMATCH'] }],
  ruleVersion: 'candidate-eligibility-v1',
}

const manyClientCandidates = {
  eligible: Array.from({ length: 9 }, (_, index) => ({
    saleId: `${index + 1}`.repeat(24),
    clientId: `${String(index + 1).repeat(24)}`,
    displayName: `Cliente ${index + 1}`,
    addressSummary: `Calle ${index + 1}`,
  })),
  blocked: [],
  ruleVersion: 'candidate-eligibility-v1',
}

const previewData: RoutePreviewData = {
  route: { depot: { id: 'deposito_1', name: 'Depósito Central', latitude: -34.6, longitude: -58.4 }, stops: [{ clientId: CLIENT_A, saleIds: [SALE_A1, SALE_A2], latitude: -34.61, longitude: -58.41 }, { clientId: CLIENT_B, saleIds: [SALE_B1], latitude: -34.62, longitude: -58.42 }], segments: [], encodedPolyline: '' },
  metrics: { distanceMeters: 3500, durationSeconds: 900, stopCount: 2, fuelLiters: 0.3 },
  warnings: ['TIME_WINDOWS_NOT_CONSIDERED'], factorsConsidered: ['DISTANCE'], algorithmVersion: 'nearest-neighbor-2opt-v1', algorithmProvider: 'google-routes', routingConfigRevision: 3, ruleVersion: 'candidate-eligibility-v1',
}

const renderLoaded = async (): Promise<void> => {
  getCandidates.mockResolvedValue(candidates)
  render(<RoutePlanner initialServiceDate="2026-10-04" initialDeliveryZoneId={ZONE_ID} />)
  await screen.findByRole('heading', { name: 'Pedidos pendientes' })
  await waitFor(() => expect(getCandidates).toHaveBeenCalledWith({ serviceDate: '2026-10-04', deliveryZoneId: ZONE_ID }))
}

const submitFallbackForm = async (date = '2026-10-04'): Promise<void> => {
  const dateInput = screen.getByLabelText('Fecha de reparto')
  await userEvent.clear(dateInput)
  await userEvent.type(dateInput, date)
  await userEvent.selectOptions(screen.getByLabelText('Zona de entrega'), ZONE_ID)
  await userEvent.click(screen.getByRole('button', { name: 'Cargar candidatos' }))
}

const selectAssignmentsAndClients = async (): Promise<void> => {
  await userEvent.selectOptions(screen.getByLabelText('Repartidor'), 'driver-1')
  await userEvent.selectOptions(screen.getByLabelText('Vehículo'), 'vehicle-1')
  await userEvent.click(screen.getByRole('checkbox', { name: 'Almacén Sur' }))
  await userEvent.click(screen.getByRole('checkbox', { name: 'Kiosco Norte' }))
}

describe('RoutePlanner', () => {
  beforeEach(() => {
    getActiveDeliveryZones.mockReset().mockResolvedValue([{ _id: ZONE_ID, code: 'NORTE', name: 'Zona Norte', active: true }])
    getCandidates.mockReset()
    getAssignmentOptions.mockReset().mockResolvedValue({ drivers: [{ id: 'driver-1', nickname: 'Ana Pérez', isActive: true }], vehicles: [{ id: 'vehicle-1', code: 'AA123BB', fuelConsumptionLitersPer100Km: 10.5, attributes: {}, availability: true }] })
    preview.mockReset(); save.mockReset(); push.mockReset()
  })

  it('automatically loads candidates from valid initial date and zone', async () => {
    await renderLoaded()
    expect(screen.queryByRole('button', { name: 'Cargar candidatos' })).not.toBeInTheDocument()
    expect(screen.getAllByText('Zona Norte')).toHaveLength(2)
  })

  it('keeps the date and zone form as a fallback without initial scope', async () => {
    render(<RoutePlanner />)
    expect(screen.getByRole('button', { name: 'Cargar candidatos' })).toBeInTheDocument()
    expect(await screen.findByRole('option', { name: 'Zona Norte' })).toBeInTheDocument()
  })

  it('groups sales by client and selects every sale for that client', async () => {
    await renderLoaded()
    const client = screen.getByRole('checkbox', { name: 'Almacén Sur' })
    expect(screen.getAllByText('Almacén Sur')).toHaveLength(1)
    expect(screen.getByText('2 pedidos')).toBeInTheDocument()
    expect(screen.getAllByText('Apto')).toHaveLength(2)
    expect(within(screen.getByRole('row', { name: /Almacén Sur/ })).getByText('Zona Norte')).toBeInTheDocument()
    expect(screen.getByText('Bloqueado')).toBeInTheDocument()
    await userEvent.click(client)
    expect(client).toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar selección' }))
    expect(client).not.toBeChecked()
  })

  it('renders pending clients in a semantic table with the expected columns', async () => {
    await renderLoaded()

    const table = screen.getByRole('table', { name: 'Pedidos pendientes' })
    expect(within(table).getByRole('columnheader', { name: 'Cliente / Comercio' })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: 'Dirección / Zona' })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: 'Pedidos' })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: 'Estado' })).toBeInTheDocument()
    expect(within(table).getAllByRole('row')).toHaveLength(4)
  })

  it('paginates pending clients at eight rows and keeps selection across pages', async () => {
    getCandidates.mockResolvedValue(manyClientCandidates)
    render(<RoutePlanner initialServiceDate="2026-10-04" initialDeliveryZoneId={ZONE_ID} />)
    await screen.findByRole('heading', { name: 'Pedidos pendientes' })

    const table = screen.getByRole('table', { name: 'Pedidos pendientes' })
    const container = screen.getByTestId('pending-orders-table-container')
    expect(container.className).toContain('h-[38rem]')
    expect(container.className).toContain('overflow-hidden')
    expect(within(table).getAllByRole('row')).toHaveLength(9)
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument()

    const firstClient = screen.getByRole('checkbox', { name: 'Cliente 1' })
    await userEvent.click(firstClient)
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByTestId('pending-orders-table-container').className).toBe(container.className)
    expect(within(table).getAllByRole('row')).toHaveLength(2)
    expect(within(table).getAllByRole('row').length - 1).toBeLessThanOrEqual(8)
    expect(screen.getByText('Cliente 9')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Anterior' }))
    expect(screen.getByRole('checkbox', { name: 'Cliente 1' })).toBeChecked()
  })

  it('requires two clients, driver, and vehicle before generating', async () => {
    await renderLoaded()
    const generate = screen.getByRole('button', { name: 'Generar ruta' })
    expect(generate).toBeDisabled()
    await userEvent.selectOptions(screen.getByLabelText('Repartidor'), 'driver-1')
    await userEvent.selectOptions(screen.getByLabelText('Vehículo'), 'vehicle-1')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Almacén Sur' }))
    expect(generate).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Kiosco Norte' }))
    expect(generate).toBeEnabled()
  })

  it('previews with underlying sale ids and preserves errors', async () => {
    preview.mockResolvedValue(previewData)
    await renderLoaded()
    await userEvent.selectOptions(screen.getByLabelText('Repartidor'), 'driver-1')
    await userEvent.selectOptions(screen.getByLabelText('Vehículo'), 'vehicle-1')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Almacén Sur' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Kiosco Norte' }))
    await userEvent.click(screen.getByRole('button', { name: 'Generar ruta' }))
    expect(await screen.findByRole('heading', { name: 'Recorrido propuesto' })).toBeInTheDocument()
    expect(preview).toHaveBeenCalledWith({ serviceDate: '2026-10-04', deliveryZoneId: ZONE_ID, saleIds: [SALE_A1, SALE_A2, SALE_B1], driverId: 'driver-1', vehicleId: 'vehicle-1' })
  })

  it('keeps save behavior after a successful preview', async () => {
    preview.mockResolvedValue(previewData)
    save.mockResolvedValue({ _id: '7'.repeat(24) })
    await renderLoaded()
    await userEvent.selectOptions(screen.getByLabelText('Repartidor'), 'driver-1')
    await userEvent.selectOptions(screen.getByLabelText('Vehículo'), 'vehicle-1')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Almacén Sur' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Kiosco Norte' }))
    await userEvent.click(screen.getByRole('button', { name: 'Generar ruta' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar y guardar' }))
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/route/${'7'.repeat(24)}`))
  })

  it('loads candidates after submitting a valid fallback scope', async () => {
    getCandidates.mockResolvedValue(candidates)
    render(<RoutePlanner />)
    await screen.findByRole('option', { name: 'Zona Norte' })
    await submitFallbackForm()
    await screen.findByRole('heading', { name: 'Pedidos pendientes' })
    expect(getCandidates).toHaveBeenCalledWith({ serviceDate: '2026-10-04', deliveryZoneId: ZONE_ID })
  })

  it('rejects an invalid fallback date before requesting candidates', async () => {
    render(<RoutePlanner />)
    await screen.findByRole('option', { name: 'Zona Norte' })
    await submitFallbackForm('2026-02-30')
    expect(await screen.findByRole('alert')).toHaveTextContent('Seleccioná una fecha de reparto válida.')
    expect(getCandidates).not.toHaveBeenCalled()
  })

  it('rejects a missing fallback zone before requesting candidates', async () => {
    render(<RoutePlanner />)
    await screen.findByRole('option', { name: 'Zona Norte' })
    const dateInput = screen.getByLabelText('Fecha de reparto')
    await userEvent.type(dateInput, '2026-10-04')
    await userEvent.click(screen.getByRole('button', { name: 'Cargar candidatos' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Seleccioná una zona de entrega.')
    expect(getCandidates).not.toHaveBeenCalled()
  })

  it('shows a retryable error when candidates cannot be loaded', async () => {
    getCandidates.mockRejectedValue(new Error('network'))
    render(<RoutePlanner initialServiceDate="2026-10-04" initialDeliveryZoneId={ZONE_ID} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar los candidatos. Intentá nuevamente.')
  })

  it('shows the candidate loading state and disables the scope form', async () => {
    let resolveCandidates!: (value: typeof candidates) => void
    getCandidates.mockReturnValue(new Promise<typeof candidates>((resolve) => { resolveCandidates = resolve }))
    render(<RoutePlanner />)
    await screen.findByRole('option', { name: 'Zona Norte' })
    await submitFallbackForm()
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('Cargando candidatos…')
    expect(screen.getByLabelText('Fecha de reparto')).toBeDisabled()
    resolveCandidates(candidates)
    await screen.findByRole('heading', { name: 'Pedidos pendientes' })
  })

  it('allows retrying delivery-zone loading after an initial error', async () => {
    getActiveDeliveryZones.mockReset().mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce([{ _id: ZONE_ID, code: 'NORTE', name: 'Zona Norte', active: true }])
    render(<RoutePlanner />)
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar las zonas de entrega.')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('option', { name: 'Zona Norte' })).toBeInTheDocument()
    expect(getActiveDeliveryZones).toHaveBeenCalledTimes(2)
  })

  it('renders the empty-candidate state', async () => {
    getCandidates.mockResolvedValue({ eligible: [], blocked: [], ruleVersion: 'candidate-eligibility-v1' })
    render(<RoutePlanner initialServiceDate="2026-10-04" initialDeliveryZoneId={ZONE_ID} />)
    expect(await screen.findByText('No hay candidatos para la fecha y zona seleccionadas.')).toBeInTheDocument()
  })

  it('selects and clears every eligible sale with the bulk controls', async () => {
    await renderLoaded()
    await userEvent.click(screen.getByRole('button', { name: 'Seleccionar todo' }))
    expect(screen.getByRole('checkbox', { name: 'Almacén Sur' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Kiosco Norte' })).toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar selección' }))
    expect(screen.getByRole('checkbox', { name: 'Almacén Sur' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Kiosco Norte' })).not.toBeChecked()
  })

  it('shows the translated reason for a blocked candidate', async () => {
    await renderLoaded()
    expect(screen.getByText('El cliente no pertenece a la zona seleccionada')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Cliente bloqueado' })).toBeDisabled()
  })

  it('keeps long blocked reasons accessible without changing the stable table height', async () => {
    getCandidates.mockResolvedValue({
      eligible: manyClientCandidates.eligible,
      blocked: [{
        saleId: '1'.repeat(24),
        clientId: 'a'.repeat(24),
        displayName: 'Cliente con un nombre bloqueado extremadamente largo',
        addressSummary: 'Una dirección muy extensa para comprobar que la fila no crece de forma indefinida',
        reasons: ['CLIENT_ZONE_MISMATCH', 'CLIENT_LOCATION_MISSING', 'CLIENT_LOCATION_UNCONFIRMED'],
      }],
      ruleVersion: 'candidate-eligibility-v1',
    })
    render(<RoutePlanner initialServiceDate="2026-10-04" initialDeliveryZoneId={ZONE_ID} />)
    await screen.findByRole('heading', { name: 'Pedidos pendientes' })

    const container = screen.getByTestId('pending-orders-table-container')
    const initialClassName = container.className
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))

    const reasonText = 'El cliente no pertenece a la zona seleccionada. El cliente no tiene una ubicación cargada. La ubicación del cliente no está confirmada'
    const reason = screen.getByTitle(reasonText)
    expect(reason).toHaveTextContent(reasonText)
    expect(screen.getByTitle('Una dirección muy extensa para comprobar que la fila no crece de forma indefinida')).toBeInTheDocument()
    expect(container.className).toBe(initialClassName)
  })

  it('does not preview when no clients are selected', async () => {
    await renderLoaded()
    expect(screen.getByRole('button', { name: 'Generar ruta' })).toBeDisabled()
    expect(preview).not.toHaveBeenCalled()
  })

  it('shows the preview loading state while the request is pending', async () => {
    let resolvePreview!: (value: RoutePreviewData) => void
    preview.mockReturnValue(new Promise<RoutePreviewData>((resolve) => { resolvePreview = resolve }))
    await renderLoaded()
    await selectAssignmentsAndClients()
    await userEvent.click(screen.getByRole('button', { name: 'Generar ruta' }))
    expect(screen.getByRole('status')).toHaveTextContent('Calculando ruta')
    expect(screen.queryByRole('heading', { name: 'Pedidos pendientes' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Configuración de la ruta' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirmar y guardar' })).not.toBeInTheDocument()
    resolvePreview(previewData)
    expect(await screen.findByRole('heading', { name: 'Recorrido propuesto' })).toBeInTheDocument()
  })

  it('renders a known preview error from the backend envelope', async () => {
    preview.mockRejectedValue({ response: { data: { code: 'ROUTING_PROVIDER_UNAVAILABLE', message: 'ignored' } } })
    await renderLoaded()
    await selectAssignmentsAndClients()
    await userEvent.click(screen.getByRole('button', { name: 'Generar ruta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Tuvimos inconvenientes a generar la ruta, por favor cerrar la ventana e intentar nuevamente')
  })

  it('preserves an unknown preview error message', async () => {
    preview.mockRejectedValue({ response: { data: { code: 'NEW_PREVIEW_ERROR', message: 'Servicio temporalmente pausado' } } })
    await renderLoaded()
    await selectAssignmentsAndClients()
    await userEvent.click(screen.getByRole('button', { name: 'Generar ruta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Tuvimos inconvenientes a generar la ruta, por favor cerrar la ventana e intentar nuevamente')
  })

  it('uses a generic message for an unstructured preview failure', async () => {
    preview.mockRejectedValue(new Error('network'))
    await renderLoaded()
    await selectAssignmentsAndClients()
    await userEvent.click(screen.getByRole('button', { name: 'Generar ruta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Tuvimos inconvenientes a generar la ruta, por favor cerrar la ventana e intentar nuevamente')
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirmar y guardar' })).not.toBeInTheDocument()
  })

  it('closes through the modal footer cancel action', async () => {
    const onClose = vi.fn()
    getCandidates.mockResolvedValue(candidates)
    render(<RoutePlanner initialServiceDate="2026-10-04" initialDeliveryZoneId={ZONE_ID} onClose={onClose} />)
    await screen.findByRole('heading', { name: 'Pedidos pendientes' })

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows the save loading state and prevents a second submit', async () => {
    let resolveSave!: (value: { _id: string }) => void
    preview.mockResolvedValue(previewData)
    save.mockReturnValue(new Promise<{ _id: string }>((resolve) => { resolveSave = resolve }))
    await renderLoaded()
    await selectAssignmentsAndClients()
    await userEvent.click(screen.getByRole('button', { name: 'Generar ruta' }))
    const saveButton = await screen.findByRole('button', { name: 'Confirmar y guardar' })
    await userEvent.click(saveButton)
    expect(saveButton).toBeDisabled()
    expect(screen.getByText('Guardando plan de ruta…')).toBeInTheDocument()
    await userEvent.click(saveButton)
    expect(save).toHaveBeenCalledTimes(1)
    resolveSave({ _id: '8'.repeat(24) })
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/route/${'8'.repeat(24)}`))
  })

  it('renders a known save error without navigating', async () => {
    preview.mockResolvedValue(previewData)
    save.mockRejectedValue({ response: { data: { code: 'ROUTE_PLAN_NOT_FOUND', message: 'ignored' } } })
    await renderLoaded()
    await selectAssignmentsAndClients()
    await userEvent.click(screen.getByRole('button', { name: 'Generar ruta' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar y guardar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No encontramos el plan de ruta guardado.')
    expect(push).not.toHaveBeenCalled()
  })

  it('preserves an unknown save error message', async () => {
    preview.mockResolvedValue(previewData)
    save.mockRejectedValue({ response: { data: { code: 'NEW_SAVE_ERROR', message: 'No se pudo persistir' } } })
    await renderLoaded()
    await selectAssignmentsAndClients()
    await userEvent.click(screen.getByRole('button', { name: 'Generar ruta' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar y guardar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo persistir')
  })

  it('reports a missing saved identifier instead of navigating', async () => {
    preview.mockResolvedValue(previewData)
    save.mockResolvedValue({ _id: undefined })
    await renderLoaded()
    await selectAssignmentsAndClients()
    await userEvent.click(screen.getByRole('button', { name: 'Generar ruta' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar y guardar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo obtener el identificador del plan guardado.')
    expect(push).not.toHaveBeenCalled()
  })

  it('reports an empty saved identifier instead of navigating', async () => {
    preview.mockResolvedValue(previewData)
    save.mockResolvedValue({ _id: { toString: () => '' } })
    await renderLoaded()
    await selectAssignmentsAndClients()
    await userEvent.click(screen.getByRole('button', { name: 'Generar ruta' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar y guardar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo obtener el identificador del plan guardado.')
  })

  it('navigates using an object identifier returned by the save endpoint', async () => {
    preview.mockResolvedValue(previewData)
    save.mockResolvedValue({ _id: { toString: () => '9'.repeat(24) } })
    await renderLoaded()
    await selectAssignmentsAndClients()
    await userEvent.click(screen.getByRole('button', { name: 'Generar ruta' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar y guardar' }))
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/route/${'9'.repeat(24)}`))
  })

  it('hides candidate inputs after a successful preview', async () => {
    getCandidates.mockResolvedValue(candidates)
    render(<RoutePlanner />)
    await screen.findByRole('option', { name: 'Zona Norte' })
    await submitFallbackForm()
    await screen.findByRole('heading', { name: 'Pedidos pendientes' })
    await selectAssignmentsAndClients()
    preview.mockResolvedValue(previewData)
    await userEvent.click(screen.getByRole('button', { name: 'Generar ruta' }))
    expect(await screen.findByRole('heading', { name: 'Recorrido propuesto' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Pedidos pendientes' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Configuración de la ruta' })).not.toBeInTheDocument()
  })
})
