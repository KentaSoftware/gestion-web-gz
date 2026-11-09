import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RouteDashboard } from './RouteDashboard'

const { getActiveDeliveryZones, getAssignmentOptions, getDashboard, useSessionAccess } = vi.hoisted(() => ({
  getActiveDeliveryZones: vi.fn(),
  getAssignmentOptions: vi.fn(),
  getDashboard: vi.fn(),
  useSessionAccess: vi.fn(),
}))

vi.mock('@/services/routePlan.service', () => ({ routePlanService: { getActiveDeliveryZones, getAssignmentOptions, getDashboard } }))
vi.mock('@/hooks/useSessionAccess', () => ({ useSessionAccess }))
vi.mock('./RouteMap', () => ({ RouteMap: () => <div>Mapa simulado</div> }))

const scrollIntoView = vi.fn()

beforeEach(() => {
  getDashboard.mockReset()
  getActiveDeliveryZones.mockReset().mockResolvedValue([])
  getAssignmentOptions.mockReset()
  useSessionAccess.mockReturnValue({ status: 'ready', permissions: ['read_route_plan', 'create_route_plan', 'manage_route_config'], gates: {} })
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView })
  scrollIntoView.mockClear()
})

const dashboard = {
  filters: {},
  kpis: { activeRoutes: 2, pendingOrders: 2, totalDistanceMeters: 3000, estimatedFuelLiters: 1.2 },
  routes: [
    {
      id: 'route-1', status: 'PENDING', zoneCode: 'NORTE', selectedSaleIds: ['sale-1'], clientCount: 1,
      metrics: { distanceMeters: 1000, durationSeconds: 600, fuelLiters: 0.4 },
      assignments: { driverId: 'driver-1', vehicleId: 'vehicle-1' }, warnings: [], stale: false,
      depot: { name: 'Depósito Central', latitude: -34.6, longitude: -58.4 }, encodedPolyline: '',
      stops: [{ clientId: 'client-1', saleIds: ['sale-1'], sequence: 1, latitude: -34.61, longitude: -58.41 }],
      segments: [{ fromStopSequence: 0, toStopSequence: 1, distanceMeters: 1000, durationSeconds: 600 }],
      stopEstimates: [{ sequence: 1, arrival: '2026-10-12T03:10:00.000Z', cumulativeDurationSeconds: 600, availability: 'ESTIMATED' }],
      saleReferences: [{ saleId: 'sale-1', versionAtSave: 1, currentVersion: 1, currentStatus: 'PENDING' }],
      scheduleAssumptions: { calculatedAt: '2026-10-12T03:00:00.000Z', timezone: 'America/Argentina/Buenos_Aires', source: 'route-schedule' },
    },
    {
      id: 'route-2', status: 'COMPLETED', zoneCode: 'NORTE', selectedSaleIds: ['sale-2'], clientCount: 1,
      metrics: { distanceMeters: 2000, durationSeconds: 1200, fuelLiters: 0.8 },
      assignments: { driverId: 'driver-2', vehicleId: 'vehicle-2' }, warnings: [], stale: false,
    },
  ],
  candidates: { eligible: [], blocked: [], ruleVersion: 'candidate-eligibility-v1' },
  warnings: [],
}

describe('RouteDashboard selected-route detail', () => {
  it('closes the saved preview when the dashboard scope changes', async () => {
    getActiveDeliveryZones.mockResolvedValue([{ _id: 'zone-1', code: 'NORTE', name: 'Zona Norte', active: true }])
    getDashboard.mockResolvedValue(dashboard)
    render(<RouteDashboard />)
    await screen.findByRole('option', { name: 'Zona Norte' })
    fireEvent.click((await screen.findAllByRole('button', { name: 'Previsualizar' }))[0])
    expect(screen.getByRole('dialog', { name: 'Previsualización de ruta' })).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('Fecha de servicio'), { target: { value: '2026-10-15' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Previsualizar' })[0])
    fireEvent.change(screen.getByLabelText('Zona de entrega'), { target: { value: 'zone-1' } })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
  it('keeps incomplete selections global, scopes paired filters, and resets to global for a reader', async () => {
    useSessionAccess.mockReturnValue({ status: 'ready', permissions: ['read_route_plan'], gates: {} })
    getActiveDeliveryZones.mockResolvedValue([{ _id: 'zone-1', code: 'NORTE', name: 'Zona Norte', active: true }])
    getDashboard.mockResolvedValue(dashboard)
    render(<RouteDashboard />)
    await screen.findByRole('option', { name: 'Zona Norte' })
    const date = screen.getByLabelText('Fecha de servicio')
    const zone = screen.getByLabelText('Zona de entrega')
    fireEvent.change(zone, { target: { value: 'zone-1' } })
    expect(getDashboard).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/Vista global/)).toBeInTheDocument()
    fireEvent.change(date, { target: { value: '2026-10-15' } })
    await waitFor(() => expect(getDashboard).toHaveBeenLastCalledWith({ serviceDate: '2026-10-15', zoneCode: 'NORTE' }))
    await screen.findByText(/Vista filtrada/)
    fireEvent.change(zone, { target: { value: '' } })
    await waitFor(() => expect(getDashboard).toHaveBeenLastCalledWith({}))
    await screen.findByText(/Vista global/)
    expect(date).toHaveValue('2026-10-15')
    expect(getDashboard).toHaveBeenCalledTimes(3)
    expect(getAssignmentOptions).not.toHaveBeenCalled()
  })

  it('ignores stale filtered responses after a faster filter change', async () => {
    getActiveDeliveryZones.mockResolvedValue([{ _id: 'zone-1', code: 'NORTE', name: 'Zona Norte', active: true }])
    let resolveOld: (value: typeof dashboard) => void = () => {}
    getDashboard.mockResolvedValueOnce(dashboard)
      .mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve }))
      .mockResolvedValueOnce({ ...dashboard, routes: [] })
    render(<RouteDashboard />)
    await screen.findByRole('option', { name: 'Zona Norte' })
    fireEvent.change(screen.getByLabelText('Fecha de servicio'), { target: { value: '2026-10-15' } })
    fireEvent.change(screen.getByLabelText('Zona de entrega'), { target: { value: 'zone-1' } })
    fireEvent.change(screen.getByLabelText('Fecha de servicio'), { target: { value: '2026-10-16' } })
    await screen.findByRole('heading', { name: 'Rutas planificadas (0)' })
    resolveOld(dashboard)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Rutas planificadas (0)' })).toBeInTheDocument())
  })
  it('uses only saved client information in both historical views', async () => {
    useSessionAccess.mockReturnValue({ status: 'ready', permissions: ['read_route_plan'], gates: {} })
    getDashboard.mockResolvedValue({ ...dashboard, routes: [{ ...dashboard.routes[0], saleReferences: [{ saleId: 'sale-1', clientName: 'Nombre guardado', address: 'Calle guardada', zoneName: 'Zona guardada' }] }], candidates: { ...dashboard.candidates, eligible: [{ saleId: 'new-sale', clientId: 'client-1', displayName: 'Nombre actual', addressSummary: 'Calle actual' }] } })
    render(<RouteDashboard />)
    await screen.findByRole('heading', { name: 'Rutas planificadas (1)' })
    const inline = document.getElementById('route-detail-region') as HTMLElement
    expect(inline).toHaveTextContent('Nombre guardado')
    expect(inline).toHaveTextContent('Calle guardada')
    expect(inline).not.toHaveTextContent('Nombre actual')
    fireEvent.click(screen.getByRole('button', { name: 'Previsualizar' }))
    const dialog = screen.getByRole('dialog', { name: 'Previsualización de ruta' })
    fireEvent.click(within(dialog).getByRole('tab', { name: 'Secuencia de paradas' }))
    expect(within(dialog).getByRole('tabpanel', { name: 'Secuencia de paradas' })).toHaveTextContent('Nombre guardado')
    expect(within(dialog).getByRole('tabpanel', { name: 'Secuencia de paradas' })).toHaveTextContent('Calle guardada')
    fireEvent.click(within(dialog).getByRole('tab', { name: 'Pedidos vinculados' }))
    expect(within(dialog).getByRole('table')).toHaveTextContent('Zona guardada')
  })

  it('does not expose a sale identifier as an unnamed client in the location dialog', async () => {
    useSessionAccess.mockReturnValue({ status: 'ready', permissions: ['read_route_plan', 'confirm_client_location'], gates: {} })
    getDashboard.mockResolvedValue({ ...dashboard, candidates: { ...dashboard.candidates, blocked: [{ saleId: '507f1f77bcf86cd799439011', clientId: 'client-1', reasons: ['CLIENT_LOCATION_MISSING'] }] } })
    render(<RouteDashboard />)
    fireEvent.click(await screen.findByRole('button', { name: 'Buscar ubicación' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Cliente sin nombre')
    expect(dialog).not.toHaveTextContent('507f1f77bcf86cd799439011')
  })

  it('does not fill missing historical fields from current candidates', async () => {
    useSessionAccess.mockReturnValue({ status: 'ready', permissions: ['read_route_plan'], gates: {} })
    getDashboard.mockResolvedValue({ ...dashboard, candidates: { ...dashboard.candidates, eligible: [{ saleId: 'sale-1', clientId: 'client-1', displayName: 'Nombre actual', addressSummary: 'Calle actual', zoneName: 'Zona actual' }] } })
    render(<RouteDashboard />)
    await screen.findByRole('heading', { name: 'Rutas planificadas (2)' })
    const inline = document.getElementById('route-detail-region') as HTMLElement
    expect(inline).not.toHaveTextContent('Nombre actual')
    expect(inline).not.toHaveTextContent('Calle actual')
    expect(inline).toHaveTextContent('Dirección no disponible')
    fireEvent.click(screen.getAllByRole('button', { name: 'Previsualizar' })[0])
    const dialog = screen.getByRole('dialog', { name: 'Previsualización de ruta' })
    fireEvent.click(within(dialog).getByRole('tab', { name: 'Secuencia de paradas' }))
    expect(within(dialog).getByRole('tabpanel', { name: 'Secuencia de paradas' })).not.toHaveTextContent('Nombre actual')
    fireEvent.click(within(dialog).getByRole('tab', { name: 'Pedidos vinculados' }))
    const table = within(dialog).getByRole('table')
    expect(table).toHaveTextContent('No disponible')
    expect(table).not.toHaveTextContent('Nombre actual')
    expect(table).not.toHaveTextContent('Calle actual')
    expect(table).not.toHaveTextContent('Zona actual')
  })
  it('opens the saved route in a read-only three-tab dialog and restores focus', async () => {
    useSessionAccess.mockReturnValue({ status: 'ready', permissions: ['read_route_plan'], gates: {} })
    getDashboard.mockResolvedValue(dashboard)
    render(<RouteDashboard />)
    await screen.findByRole('heading', { name: 'Rutas planificadas (2)' })
    const preview = screen.getAllByRole('button', { name: 'Previsualizar' })[0]
    preview.focus()
    fireEvent.click(preview)
    const dialog = await screen.findByRole('dialog', { name: /previsualización de ruta/i })
    expect(within(dialog).getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Mapa de la ruta', 'Secuencia de paradas', 'Pedidos vinculados',
    ])
    expect(within(dialog).queryByRole('button', { name: /guardar/i })).not.toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('tab', { name: 'Secuencia de paradas' }))
    expect(within(dialog).getByRole('list', { name: 'Paradas del recorrido' })).toHaveTextContent('Parada 1')
    fireEvent.click(within(dialog).getByRole('tab', { name: 'Pedidos vinculados' }))
    expect(within(dialog).getByRole('table', { name: 'Pedidos vinculados' })).not.toHaveTextContent('sale-1')
    fireEvent.keyDown(dialog, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(preview).toHaveFocus())
    expect(getActiveDeliveryZones).toHaveBeenCalled()
    expect(getAssignmentOptions).not.toHaveBeenCalled()
  })

  it('uses assignment labels and neutral fallbacks without displaying identifiers', async () => {
    getActiveDeliveryZones.mockResolvedValue([])
    getDashboard.mockResolvedValue({ ...dashboard, routes: [
      { ...dashboard.routes[0], assignments: { driverId: 'private-driver', vehicleId: 'private-vehicle', driverName: 'Ana López', vehicleName: 'Camión 1' } },
      { ...dashboard.routes[1], assignments: { driverId: 'other-driver', vehicleId: 'other-vehicle' } },
    ] })
    render(<RouteDashboard />)
    await screen.findByRole('heading', { name: 'Rutas planificadas (2)' })
    expect(screen.getAllByText('Ana López').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Camión 1').length).toBeGreaterThan(0)
    expect(screen.getByText('Repartidor no disponible')).toBeInTheDocument()
    expect(screen.getByText('Vehículo no disponible')).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('private-driver')
    expect(document.body).not.toHaveTextContent('PENDING')
  })
  it('does not request dashboard data while hydrating or without read permission', () => {
    useSessionAccess.mockReturnValue({ status: 'hydrating', permissions: [], gates: {} })
    const { rerender } = render(<RouteDashboard />)
    expect(screen.getByRole('status')).toHaveTextContent('Verificando el acceso')
    expect(getDashboard).not.toHaveBeenCalled()
    useSessionAccess.mockReturnValue({ status: 'ready', permissions: [], gates: {} })
    rerender(<RouteDashboard />)
    expect(screen.getByRole('alert')).toHaveTextContent('No tenés permiso')
    expect(getDashboard).not.toHaveBeenCalled()
    expect(getActiveDeliveryZones).not.toHaveBeenCalled()
  })

  it('lets a read-only driver view routes without creation or configuration actions', async () => {
    useSessionAccess.mockReturnValue({ status: 'ready', permissions: ['read_route_plan'], gates: {} })
    getDashboard.mockResolvedValue(dashboard)
    render(<RouteDashboard />)
    expect(await screen.findByRole('heading', { name: 'Rutas planificadas (2)' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Generar rutas' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Configurar ubicaciones' })).not.toBeInTheDocument()
    expect(getActiveDeliveryZones).toHaveBeenCalled()
  })

  it('gates creation and configuration independently', async () => {
    useSessionAccess.mockReturnValue({ status: 'ready', permissions: ['read_route_plan', 'create_route_plan'], gates: {} })
    getDashboard.mockResolvedValue(dashboard)
    getActiveDeliveryZones.mockResolvedValue([])
    const { rerender } = render(<RouteDashboard />)
    expect(await screen.findByRole('button', { name: 'Generar rutas' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Configurar ubicaciones' })).not.toBeInTheDocument()
    useSessionAccess.mockReturnValue({ status: 'ready', permissions: ['read_route_plan', 'manage_route_config'], gates: {} })
    rerender(<RouteDashboard />)
    expect(screen.getByRole('button', { name: 'Configurar ubicaciones' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Generar rutas' })).not.toBeInTheDocument()
  })

  it('requires the location permission independently from depot configuration', async () => {
    getDashboard.mockResolvedValue({ ...dashboard, candidates: { ...dashboard.candidates, blocked: [{ saleId: 's1', clientId: 'c1', displayName: 'Cliente', reasons: ['CLIENT_LOCATION_MISSING'] }] } })
    useSessionAccess.mockReturnValue({ status: 'ready', permissions: ['read_route_plan', 'manage_route_config'], gates: {} })
    const { rerender } = render(<RouteDashboard />)
    await screen.findByText('Cliente')
    expect(screen.queryByRole('button', { name: 'Buscar ubicación' })).not.toBeInTheDocument()
    useSessionAccess.mockReturnValue({ status: 'ready', permissions: ['read_route_plan', 'confirm_client_location'], gates: {} })
    rerender(<RouteDashboard />)
    expect(screen.getByRole('button', { name: 'Buscar ubicación' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Configurar ubicaciones' })).toBeInTheDocument()
  })

  it('ignores an outstanding dashboard response after read access is revoked', async () => {
    let resolveDashboard: (value: typeof dashboard) => void = () => {}
    getDashboard.mockReturnValue(new Promise((resolve) => { resolveDashboard = resolve }))
    getActiveDeliveryZones.mockResolvedValue([])
    const { rerender } = render(<RouteDashboard />)
    expect(getDashboard).toHaveBeenCalledTimes(1)
    useSessionAccess.mockReturnValue({ status: 'ready', permissions: [], gates: {} })
    rerender(<RouteDashboard />)
    resolveDashboard(dashboard)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('No tenés permiso'))
    expect(screen.queryByRole('heading', { name: 'Rutas planificadas (2)' })).not.toBeInTheDocument()
  })

  it('retains a selected route on refresh and clears it if it disappears', async () => {
    getActiveDeliveryZones.mockResolvedValue([])
    getDashboard.mockResolvedValueOnce(dashboard).mockResolvedValueOnce(dashboard).mockResolvedValueOnce({ ...dashboard, routes: [dashboard.routes[0]] })
    const { rerender } = render(<RouteDashboard refreshToken={0} />)
    await screen.findByRole('heading', { name: 'Rutas planificadas (2)' })
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar ruta route-2' }))
    rerender(<RouteDashboard refreshToken={1} />)
    await waitFor(() => expect(getDashboard).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Seleccionar ruta route-2' })).toHaveAttribute('aria-pressed', 'true'))
    rerender(<RouteDashboard refreshToken={2} />)
    await screen.findByRole('heading', { name: 'Rutas planificadas (1)' })
    expect(screen.getByRole('button', { name: 'Seleccionar ruta route-1' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('heading', { name: 'Vista de ruta' })).not.toBeInTheDocument()
  })
  it('refetches on the parent refresh token and keeps both sections above lower regions', async () => {
    getActiveDeliveryZones.mockResolvedValue([{ _id: 'zone-1', code: 'NORTE', name: 'Zona Norte', active: true }])
    const updatedDashboard = { ...dashboard, routes: [{ ...dashboard.routes[0], id: 'route-new' }] }
    getDashboard.mockResolvedValueOnce(dashboard).mockResolvedValueOnce(updatedDashboard)
    const { rerender } = render(<RouteDashboard refreshToken={0} />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Rutas planificadas (2)' })).toBeInTheDocument())
    rerender(<RouteDashboard refreshToken={1} />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Rutas planificadas (1)' })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Ver mapa' }))
    const plannedRoutes = screen.getByRole('heading', { name: 'Rutas planificadas (1)' })
    const clients = screen.getByRole('heading', { name: 'Clientes con pedidos (0)' })
    const map = screen.getByRole('heading', { name: 'Mapa interactivo' })
    const detail = screen.getByRole('heading', { name: 'Vista de ruta' })
    const dashboardRoot = screen.getByRole('region', { name: 'Optimización de Rutas' })
    const lowerPanels = screen.getByTestId('route-lower-panels')
    const mapPanel = document.getElementById('route-map-region')
    const detailPanel = document.getElementById('route-detail-region')
    expect(plannedRoutes.compareDocumentPosition(clients)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(clients.compareDocumentPosition(map)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(map.compareDocumentPosition(detail)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(dashboardRoot).toHaveClass('w-full', 'min-w-0', 'flex-1', 'min-h-0')
    expect(dashboardRoot).not.toHaveClass('mb-8')
    expect(dashboardRoot).not.toHaveClass('h-full')
    expect(lowerPanels).toHaveClass('w-full', 'min-w-0', 'flex-1', 'min-h-0')
    expect(mapPanel).toHaveClass('w-full', 'min-w-0')
    expect(detailPanel).toHaveClass('w-full', 'min-w-0')
    expect(lowerPanels).not.toHaveClass('lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]')
    expect(getDashboard).toHaveBeenCalledTimes(2)
  })

  it('renders the global dashboard with planning controls separate from its filters', async () => {
    getActiveDeliveryZones.mockResolvedValue([{ _id: 'zone-1', code: 'NORTE', name: 'Zona Norte', active: true }])
    getDashboard.mockResolvedValue(dashboard)
    render(<RouteDashboard />)

    await waitFor(() => expect(getDashboard).toHaveBeenCalledWith({}))
    expect(screen.getByRole('heading', { name: 'Optimización de Rutas' })).toBeInTheDocument()
    expect(screen.getByText('Planificá y asigná rutas de entrega de forma eficiente')).toBeInTheDocument()

    expect(screen.getByLabelText('Fecha de servicio')).toBeInTheDocument()
    expect(screen.getByLabelText('Zona de entrega')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generar rutas' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Actualizar' })).not.toBeInTheDocument()

    const kpis = screen.getByText('Rutas activas').closest('section')
    const planningBar = screen.getByRole('group', { name: 'Planificación de rutas' })
    const plannedRoutes = screen.getByRole('heading', { name: 'Rutas planificadas (2)' })
    expect(kpis).toBeInTheDocument()
    expect(planningBar.compareDocumentPosition(plannedRoutes)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('toggles the planning bar without reloading dashboard data', async () => {
    getActiveDeliveryZones.mockResolvedValue([{ _id: 'zone-1', code: 'NORTE', name: 'Zona Norte', active: true }])
    getDashboard.mockResolvedValue(dashboard)
    render(<RouteDashboard />)

    await waitFor(() => expect(screen.getByRole('button', { name: 'Ocultar filtros' })).toBeInTheDocument())

    const toggle = screen.getByRole('button', { name: 'Ocultar filtros' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveAttribute('aria-controls', 'route-planning-bar')
    expect(screen.getByRole('group', { name: 'Planificación de rutas' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Fecha de servicio'), { target: { value: '2026-10-15' } })
    fireEvent.change(screen.getByLabelText('Zona de entrega'), { target: { value: 'zone-1' } })

    fireEvent.click(toggle)

    expect(screen.getByRole('button', { name: 'Mostrar filtros' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('group', { name: 'Planificación de rutas' })).not.toBeInTheDocument()
    expect(getDashboard).toHaveBeenCalledTimes(2)

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar filtros' }))

    expect(screen.getByRole('group', { name: 'Planificación de rutas' })).toBeInTheDocument()
    expect(screen.getByLabelText('Fecha de servicio')).toHaveValue('2026-10-15')
    expect(screen.getByLabelText('Zona de entrega')).toHaveValue('zone-1')
    expect(getDashboard).toHaveBeenCalledTimes(2)
  })

  it('shows the first route by default and focuses the requested panel', async () => {
    getActiveDeliveryZones.mockResolvedValue([{ _id: 'zone-1', code: 'NORTE', name: 'Zona Norte', active: true }])
    getDashboard.mockResolvedValue(dashboard)
    render(<RouteDashboard />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Rutas planificadas (2)' })).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Mapa interactivo' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Vista de ruta' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /seleccionar ruta route-1/i })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: /seleccionar ruta route-2/i }))

    expect(screen.getByRole('heading', { name: 'Mapa interactivo' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Vista de ruta' })).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Ver mapa' })[1])
    expect(screen.getByRole('heading', { name: 'Mapa interactivo' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Vista de ruta' })).toBeInTheDocument()
    expect(document.activeElement).toBe(document.getElementById('route-map-region'))
    expect(scrollIntoView).toHaveBeenLastCalledWith({ behavior: 'smooth', block: 'start' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
  })

  it('opens the preview dialog while retaining the map in the document', async () => {
    getActiveDeliveryZones.mockResolvedValue([{ _id: 'zone-1', code: 'NORTE', name: 'Zona Norte', active: true }])
    getDashboard.mockResolvedValue(dashboard)
    render(<RouteDashboard />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Rutas planificadas (2)' })).toBeInTheDocument())

    fireEvent.click(screen.getAllByRole('button', { name: 'Previsualizar' })[0])
    expect(screen.getByRole('dialog', { name: 'Previsualización de ruta' })).toBeInTheDocument()
    expect(document.getElementById('route-map-region')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.getByRole('heading', { name: 'Mapa interactivo' })).toBeInTheDocument()
  })

  it('keeps the planned-routes panel visible when no routes exist', async () => {
    getActiveDeliveryZones.mockResolvedValue([{ _id: 'zone-1', code: 'NORTE', name: 'Zona Norte', active: true }])
    getDashboard.mockResolvedValue({ ...dashboard, routes: [], candidates: { ...dashboard.candidates } })
    render(<RouteDashboard />)

    await waitFor(() => expect(screen.getByRole('heading', { name: /Clientes con pedidos/ })).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Rutas planificadas (0)' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Estados de ruta' })).toBeInTheDocument()
    expect(screen.getByText('No existen rutas planificadas para el usuario')).toBeInTheDocument()
    expect(screen.queryByText('No hay rutas ni clientes pendientes para la fecha y zona seleccionadas.')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Mapa interactivo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Vista de ruta' })).not.toBeInTheDocument()
  })

  it('passes planning values to route generation without reloading the dashboard', async () => {
    getActiveDeliveryZones.mockResolvedValue([{ _id: 'zone-1', code: 'NORTE', name: 'Zona Norte', active: true }])
    getDashboard.mockResolvedValue(dashboard)
    const onGenerateRoutes = vi.fn()
    render(<RouteDashboard onGenerateRoutes={onGenerateRoutes} />)

    await waitFor(() => expect(screen.getByRole('button', { name: 'Generar rutas' })).toBeDisabled())
    fireEvent.change(screen.getByLabelText('Fecha de servicio'), { target: { value: '2026-10-15' } })
    fireEvent.change(screen.getByLabelText('Zona de entrega'), { target: { value: 'zone-1' } })
    expect(screen.getByRole('button', { name: 'Generar rutas' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Generar rutas' }))

    expect(onGenerateRoutes).toHaveBeenCalledWith('2026-10-15', 'zone-1')
    expect(getDashboard).toHaveBeenCalledTimes(2)
  })

  it('renders planned-route parity controls and selects from route actions', async () => {
    getActiveDeliveryZones.mockResolvedValue([{ _id: 'zone-1', code: 'NORTE', name: 'Zona Norte', active: true }])
    getDashboard.mockResolvedValue(dashboard)
    render(<RouteDashboard />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Rutas planificadas (2)' })).toBeInTheDocument())
    expect(screen.getByRole('group', { name: 'Estados de ruta' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Ver mapa' })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Previsualizar' })).toHaveLength(2)

    const selection = screen.getByRole('button', { name: 'Seleccionar ruta route-2' })
    expect(selection).toHaveAttribute('aria-pressed', 'false')
    selection.focus()
    expect(document.activeElement).toBe(selection)
    fireEvent.click(selection)
    expect(selection).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getAllByRole('button', { name: 'Ver mapa' })[1])
    expect(screen.getByRole('heading', { name: 'Ruta 2 · Zona NORTE' })).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Previsualizar' })[1])
    expect(screen.getByRole('dialog', { name: 'Previsualización de ruta' })).toHaveTextContent('La secuencia de paradas no está disponible')
  })

  it('paginates combined eligible and blocked clients', async () => {
    getActiveDeliveryZones.mockResolvedValue([{ _id: 'zone-1', code: 'NORTE', name: 'Zona Norte', active: true }])
    getDashboard.mockResolvedValue({
      ...dashboard,
      candidates: {
        eligible: [
          { saleId: 'eligible-1', displayName: 'Cliente elegible 1', addressSummary: 'Dirección 1' },
          { saleId: 'eligible-2', displayName: 'Cliente elegible 2', addressSummary: 'Dirección 2' },
          { saleId: 'eligible-3', displayName: 'Cliente elegible 3', addressSummary: 'Dirección 3' },
        ],
        blocked: [
          { saleId: 'blocked-1', displayName: 'Cliente bloqueado 1', reasons: ['CLIENT_LOCATION_MISSING'] },
          { saleId: 'blocked-2', displayName: 'Cliente bloqueado 2', reasons: ['CLIENT_LOCATION_UNCONFIRMED'] },
          { saleId: 'blocked-3', displayName: 'Cliente bloqueado 3', reasons: ['CLIENT_LOCATION_MISSING'] },
          { saleId: 'blocked-4', displayName: 'Cliente bloqueado 4', reasons: ['CLIENT_LOCATION_MISSING'] },
        ],
        ruleVersion: 'candidate-eligibility-v1',
      },
    })
    render(<RouteDashboard />)

    await waitFor(() => expect(screen.getByText('Cliente elegible 1')).toBeInTheDocument())
    const list = screen.getByRole('list', { name: 'Clientes y pedidos' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Página siguiente' })).not.toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))

    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Página anterior' }))

    expect(within(list).getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument()
  })

  it('filters clients by name, address, or sale id and resets pagination', async () => {
    getActiveDeliveryZones.mockResolvedValue([{ _id: 'zone-1', code: 'NORTE', name: 'Zona Norte', active: true }])
    getDashboard.mockResolvedValue({
      ...dashboard,
      candidates: {
        eligible: Array.from({ length: 6 }, (_, index) => ({
          saleId: `sale-${index + 1}`,
          displayName: `Cliente ${index + 1}`,
          addressSummary: index === 5 ? 'Calle buscada 123' : `Dirección ${index + 1}`,
        })),
        blocked: [],
        ruleVersion: 'candidate-eligibility-v1',
      },
    })
    render(<RouteDashboard />)

    await waitFor(() => expect(screen.getByText('Página 1 de 2')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument()

    const search = screen.getByRole('searchbox', { name: 'Buscar cliente o dirección…' })
    fireEvent.change(search, { target: { value: 'calle buscada' } })

    expect(screen.getByText('Cliente 6')).toBeInTheDocument()
    expect(screen.getByText('Página 1 de 1')).toBeInTheDocument()
    expect(screen.queryByText('Cliente 1')).not.toBeInTheDocument()

    fireEvent.change(search, { target: { value: 'sale-2' } })
    expect(screen.getByText('Cliente 2')).toBeInTheDocument()

    fireEvent.change(search, { target: { value: 'sin coincidencias' } })
    expect(screen.getByRole('status', { name: 'Clientes sin coincidencias' })).toHaveTextContent('No se encontraron clientes')
  })

  it('renders location status and distance for eligible and blocked clients', async () => {
    getActiveDeliveryZones.mockResolvedValue([{ _id: 'zone-1', code: 'NORTE', name: 'Zona Norte', active: true }])
    getDashboard.mockResolvedValue({
      ...dashboard,
      candidates: {
        eligible: [
          { saleId: 'eligible-geo', displayName: 'Cliente geográfico', addressSummary: 'Dirección confirmada', latitude: -34.6, longitude: -58.4, distanceMeters: 1250 },
          { saleId: 'invalid-geo', displayName: 'Coordenadas inválidas', latitude: 100, longitude: -58.4 },
        ],
        blocked: [
          { saleId: 'blocked-missing', displayName: 'Cliente sin ubicación', reasons: ['CLIENT_LOCATION_MISSING'] },
          { saleId: 'blocked-unconfirmed', displayName: 'Cliente sin confirmar', reasons: ['CLIENT_LOCATION_UNCONFIRMED'] },
        ],
        ruleVersion: 'candidate-eligibility-v1',
      },
    })
    render(<RouteDashboard />)

    await waitFor(() => expect(screen.getByText('Cliente geográfico')).toBeInTheDocument())
    expect(screen.getByText(/1,3 km/)).toBeInTheDocument()
    expect(screen.getByText(/Ubicación confirmada/)).toBeInTheDocument()
    expect(screen.getAllByText(/No posee coordenadas/)).toHaveLength(2)
    expect(screen.getByText(/Ubicación no confirmada/)).toBeInTheDocument()
    expect(screen.getAllByText(/Distancia no disponible/)).toHaveLength(3)
    expect(screen.getByText('Coordenadas inválidas').closest('li')).toHaveTextContent('No posee coordenadas')
  })
})
