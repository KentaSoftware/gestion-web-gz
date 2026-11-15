import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SmartStockPage from './page'

const { get, patch, post } = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn(), post: vi.fn() }))

vi.mock('@/utils/client', () => ({ default: { get, patch, post } }))

const item = (productId: string, productName: string, categoryName: string, availableToSell = 4) => ({
  productId,
  productName,
  categoryName,
  physicalQuantity: 8,
  committedQuantity: 4,
  availableToSell,
  expiredQuantity: 0,
  dataQuality: 'COMPLETE',
  minimum: 2,
  expiryAlertDays: 30,
  alerts: [],
  latestSale: { status: 'INCOMPLETE' as const },
})

const overview = {
  page: 1,
  pageSize: 8,
  total: 51,
  items: [item('p-1', 'Yerba del Sur', 'Almacén'), item('p-2', 'Té del Norte', 'Infusiones', 0), item('p-3', 'Yerba Orgánica', 'Infusiones')],
  globalSummary: { belowMinimumProductCount: 7, expiringProductCount: 3, expiredProductCount: 2, lowRotationProductCount: 4, activeAlertCount: 8 },
  globalAlerts: [
    { productId: 'p-1', productName: 'Yerba del Sur', type: 'LOW_STOCK', severity: 'CRITICAL', explanation: 'Bajo mínimo', dataQuality: 'COMPLETE' },
    { productId: 'p-2', productName: 'Té del Norte', type: 'LOW_ROTATION', severity: 'WARNING', explanation: 'Rotación baja', dataQuality: 'COMPLETE' },
  ],
}

describe('Stock Inteligente read dashboard', () => {
  beforeEach(() => {
    get.mockReset()
    patch.mockReset()
    post.mockReset()
    get.mockImplementation((url: string, config?: { params?: { category?: string } }) => {
      if (url === '/stock/overview') return Promise.resolve({ data: config?.params?.category
        ? { ...overview, total: 0, items: [] }
        : overview })
      return Promise.resolve({ data: { availability: { physicalQuantity: 8, committedQuantity: 4, availableToSell: 4, expiredQuantity: 0 }, movements: [{ movementId: 'm-1', type: 'PURCHASE_IN', quantity: 8, occurredAt: '2026-01-02T12:00:00.000Z' }] } })
    })
  })

  it('S-01 renders invariant global indicators and catalog-wide alerts', async () => {
    render(<SmartStockPage />)
    expect(await within(await screen.findByRole('table')).findByText('Yerba del Sur')).toBeInTheDocument()
    expect(screen.getByLabelText('Indicadores globales de stock').querySelectorAll('article')).toHaveLength(4)
    expect(screen.queryByText('Vencido')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retirar vencidos de esta página' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('7 productos bajo el mínimo')).toBeInTheDocument()
    expect(within(screen.getByRole('table')).getByText('Té del Norte')).toBeInTheDocument()
    expect(screen.getByLabelText('8 alertas en todo el catálogo')).toBeInTheDocument()
    const toolbar = screen.getByRole('group', { name: 'Filtros del catálogo' })
    const alerts = screen.getByRole('region', { name: 'Alertas del catálogo' })
    const products = screen.getByRole('region', { name: 'Productos' })
    expect(within(alerts).queryByLabelText('Buscar producto por nombre')).not.toBeInTheDocument()
    expect(within(alerts).queryByLabelText('Filtrar productos por categoría')).not.toBeInTheDocument()
    expect(within(products).getByLabelText('Buscar producto por nombre')).toBeInTheDocument()
    expect(within(products).getByLabelText('Filtrar productos por categoría')).toBeInTheDocument()
    expect(toolbar).toContainElement(screen.getByLabelText('Filtrar alertas por severidad'))
    expect(screen.getByRole('region', { name: 'Alertas críticas' }).parentElement).toHaveClass('md:grid-cols-3')
    expect(screen.getByRole('region', { name: 'Alertas críticas' }).querySelector('ul')).toHaveClass('grid', 'gap-2')
    expect(screen.getByRole('region', { name: 'Alertas informativas' })).toHaveTextContent('Sin alertas para esta severidad.')
    expect(screen.getByRole('region', { name: 'Alertas críticas' })).toHaveTextContent('Bajo mínimo')
    expect(screen.getByRole('region', { name: 'Alertas informativas' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Alertas advertencias' })).toBeInTheDocument()
  })

  it('S-02 severity narrows only global alerts', async () => {
    render(<SmartStockPage />)
    await within(await screen.findByRole('table')).findByText('Yerba del Sur')
    fireEvent.change(screen.getByLabelText('Filtrar alertas por severidad'), { target: { value: 'WARNING' } })
    expect(screen.getByText('Rotación baja')).toBeInTheDocument()
    expect(screen.queryByText('Bajo mínimo')).not.toBeInTheDocument()
    expect(screen.getByText('Yerba Orgánica')).toBeInTheDocument()
    expect(screen.getByLabelText('8 alertas en todo el catálogo')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Alertas advertencias' })).toHaveTextContent('(1)')
    expect(screen.getByRole('region', { name: 'Alertas críticas' })).toHaveTextContent('(0)')
    expect(get).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Retirar vencidos de esta página' })).not.toBeInTheDocument()
  })

  it('shows two alerts per severity initially and reveals the truthful remaining count on request', async () => {
    const alerts = Array.from({ length: 7 }, (_, index) => ({
      productId: `warning-${index}`,
      productName: `Producto ${index + 1}`,
      type: 'LOW_ROTATION',
      severity: 'WARNING',
      explanation: `Alerta adicional ${index + 1}`,
      dataQuality: 'COMPLETE',
    }))
    get.mockResolvedValue({ data: { ...overview, globalAlerts: alerts } })

    render(<SmartStockPage />)
    await screen.findByText('Alerta adicional 1')

    const warningGroup = screen.getByRole('region', { name: 'Alertas advertencias' })
    expect(warningGroup).toHaveTextContent('(7)')
    expect(warningGroup.querySelectorAll('li')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Mostrar 5 alertas más' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar 5 alertas más' }))
    expect(warningGroup.querySelectorAll('li')).toHaveLength(7)
    expect(within(warningGroup).getByRole('region', { name: 'Lista desplazable de alertas advertencias' })).toBeInTheDocument()
    expect(warningGroup).toHaveTextContent('Alerta adicional 7')
    expect(screen.getByRole('button', { name: 'Mostrar menos alertas' })).toBeInTheDocument()
  })

  it('expands and collapses severity groups independently with three, four and five alerts', async () => {
    const alerts = (severity: string, count: number) => Array.from({ length: count }, (_, index) => ({
      productId: `${severity}-${index}`, productName: `${severity} ${index}`, type: 'LOW_STOCK', severity,
      explanation: `Texto extenso ${severity} ${index}`, dataQuality: 'COMPLETE',
    }))
    get.mockResolvedValue({ data: { ...overview, globalAlerts: [...alerts('CRITICAL', 3), ...alerts('WARNING', 4), ...alerts('INFO', 5)] } })
    render(<SmartStockPage />)
    const critical = await screen.findByRole('region', { name: 'Alertas críticas' })
    const warning = screen.getByRole('region', { name: 'Alertas advertencias' })
    const info = screen.getByRole('region', { name: 'Alertas informativas' })
    for (const group of [critical, warning, info]) expect(group.querySelectorAll('li')).toHaveLength(2)
    fireEvent.click(within(critical).getByRole('button', { name: 'Mostrar 1 alertas más' }))
    fireEvent.click(within(warning).getByRole('button', { name: 'Mostrar 2 alertas más' }))
    fireEvent.click(within(info).getByRole('button', { name: 'Mostrar 3 alertas más' }))
    expect(critical.querySelectorAll('li')).toHaveLength(3)
    expect(warning.querySelectorAll('li')).toHaveLength(4)
    expect(within(critical).queryByRole('region')).not.toBeInTheDocument()
    expect(within(warning).queryByRole('region')).not.toBeInTheDocument()
    expect(within(info).getByRole('region')).toHaveTextContent('Texto extenso INFO 4')
    fireEvent.click(within(info).getByRole('button', { name: 'Mostrar menos alertas' }))
    expect(info.querySelectorAll('li')).toHaveLength(2)
    expect(within(info).queryByRole('region')).not.toBeInTheDocument()
    expect(critical.querySelectorAll('li')).toHaveLength(3)
    expect(warning.querySelectorAll('li')).toHaveLength(4)
  })

  it('requests eight products per page and keeps pagination based on API total', async () => {
    render(<SmartStockPage />)
    await within(await screen.findByRole('table')).findByText('Yerba del Sur')
    expect(get).toHaveBeenCalledWith('/stock/overview', expect.objectContaining({ params: expect.objectContaining({ pageSize: 8 }) }))
    expect(screen.getByText('Página 1 de 7, 51 productos')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(get).toHaveBeenCalledWith('/stock/overview', expect.objectContaining({ params: expect.objectContaining({ page: 2, pageSize: 8 }) })))
  })

  it('S-09 sends intersecting filters to the API, resets pagination, and clears filters independently', async () => {
    render(<SmartStockPage />)
    await within(await screen.findByRole('table')).findByText('Yerba del Sur')
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(get).toHaveBeenCalledWith('/stock/overview', expect.objectContaining({ params: expect.objectContaining({ page: 2 }) })))
    fireEvent.change(screen.getByLabelText('Filtrar productos por categoría'), { target: { value: 'Infusiones' } })
    await waitFor(() => expect(get).toHaveBeenCalledWith('/stock/overview', expect.objectContaining({ params: expect.objectContaining({ category: 'Infusiones', page: 1 }) })))
    fireEvent.change(screen.getByLabelText('Buscar producto por nombre'), { target: { value: 'Yerba' } })
    await waitFor(() => expect(get).toHaveBeenCalledWith('/stock/overview', expect.objectContaining({ params: expect.objectContaining({ search: 'Yerba', category: 'Infusiones', page: 1 }) })))
    fireEvent.click(screen.getByLabelText('Limpiar búsqueda'))
    await waitFor(() => expect(get).toHaveBeenCalledWith('/stock/overview', expect.objectContaining({ params: expect.objectContaining({ category: 'Infusiones', page: 1 }) })))
    expect(get.mock.calls.at(-1)?.[1].params).not.toHaveProperty('search')
    fireEvent.click(screen.getByLabelText('Limpiar categoría'))
    await waitFor(() => expect(get.mock.calls.at(-1)?.[1].params).not.toHaveProperty('category'))
    const count = get.mock.calls.length
    fireEvent.change(screen.getByLabelText('Filtrar alertas por severidad'), { target: { value: 'WARNING' } })
    expect(get).toHaveBeenCalledTimes(count)
    expect(get.mock.calls.at(-1)?.[1].params).not.toHaveProperty('search')
    expect(get.mock.calls.at(-1)?.[1].params).not.toHaveProperty('category')
  })

  it('does not send client-only severity to the API and omits empty filters', async () => {
    render(<SmartStockPage />)
    await within(await screen.findByRole('table')).findByText('Yerba del Sur')
    fireEvent.change(screen.getByLabelText('Filtrar alertas por severidad'), { target: { value: 'WARNING' } })
    expect(get.mock.calls[0][1].params).not.toHaveProperty('severity')
    expect(get.mock.calls[0][1].params).not.toHaveProperty('search')
    expect(get.mock.calls[0][1].params).not.toHaveProperty('category')
  })

  it('distinguishes a genuinely empty catalog from filters with no matches', async () => {
    get.mockImplementation((url: string, config?: { params?: { category?: string } }) => {
      if (url === '/stock/overview') return Promise.resolve({ data: config?.params?.category
        ? { ...overview, total: 0, items: [] }
        : { ...overview, total: 0, items: [] } })
      return Promise.resolve({ data: { availability: { physicalQuantity: 8, committedQuantity: 4, availableToSell: 4, expiredQuantity: 0 }, movements: [] } })
    })
    render(<SmartStockPage />)
    expect(await screen.findByText('Todavía no hay productos para mostrar.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Filtrar productos por categoría'), { target: { value: 'Inexistente' } })
    expect(await screen.findByText('No hay productos que coincidan con estos filtros.')).toBeInTheDocument()
  })
  it('S-10 and S-14 distinguish zero availability and incomplete sale history; S-03 shows movements', async () => {
    render(<SmartStockPage />)
    const table = await screen.findByRole('table')
    const zeroStock = await within(table).findByRole('button', { name: 'Té del Norte' })
    expect(within(table).getByRole('row', { name: /Té del Norte/ })).toHaveTextContent('Sin disponibilidad')
    fireEvent.click(zeroStock)
    const detail = within(screen.getByRole('complementary', { name: 'Consulta rápida de existencias' }))
    expect(await detail.findByText('No disponible: historial incompleto')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Ingreso por compra')).toBeInTheDocument())
    expect(get).toHaveBeenCalledWith('/stock/products/p-2', expect.objectContaining({ params: expect.objectContaining({ movementLimit: 5 }) }))
  })

  it('translates documented incomplete stock explanations and preserves other explanations', async () => {
    get.mockResolvedValue({ data: { ...overview, globalAlerts: [
      { productId: 'p-1', productName: 'Yerba del Sur', type: 'LOW_STOCK', severity: 'CRITICAL', explanation: 'INCOMPLETE_STOCK_THRESHOLDS', dataQuality: 'INCOMPLETE' },
      { productId: 'p-2', productName: 'Té del Norte', type: 'LOW_ROTATION', severity: 'WARNING', explanation: 'LOW_ROTATION_INSUFFICIENT_SALES_HISTORY', dataQuality: 'INCOMPLETE' },
      { productId: 'p-3', productName: 'Yerba Orgánica', type: 'LOW_STOCK', severity: 'INFO', explanation: 'Explicación específica del servicio', dataQuality: 'COMPLETE' },
    ] } })
    render(<SmartStockPage />)
    expect(await screen.findByText('Datos incompletos para evaluar los umbrales de stock.')).toBeInTheDocument()
    expect(screen.getByText('Historial de ventas insuficiente para evaluar la rotación.')).toBeInTheDocument()
    expect(screen.getByText('Explicación específica del servicio')).toBeInTheDocument()
  })

  it('translates low-rotation history explanations using the alert type', async () => {
    const explanation = 'Product p-90 has insufficient history for the last 90 complete calendar days'
    get.mockResolvedValue({ data: { ...overview, globalAlerts: [
      { productId: 'p-90', productName: 'Producto con historial incompleto', type: 'LOW_ROTATION', severity: 'WARNING', explanation, dataQuality: 'INCOMPLETE' },
    ] } })
    render(<SmartStockPage />)

    expect(await screen.findByText('Historial de ventas insuficiente para evaluar la rotación.')).toBeInTheDocument()
    expect(screen.queryByText(explanation)).not.toBeInTheDocument()
    expect(screen.queryByText(/Product p-90/)).not.toBeInTheDocument()
  })

  it('renders dense stock columns, status boundaries, and accessible row actions', async () => {
    get.mockResolvedValue({ data: { ...overview, items: [
      item('p-1', 'Yerba del Sur', 'Almacén', 2),
      { ...item('p-2', 'Té del Norte', 'Infusiones', 0), minimum: 0 },
      { ...item('p-3', 'Yerba Orgánica', 'Infusiones', 5), minimum: null },
      { ...item('p-4', 'Té Verde', 'Infusiones', 8), dataQuality: 'PARTIAL' },
    ] } })
    render(<SmartStockPage />)
    await within(await screen.findByRole('table')).findByText('Yerba del Sur')
    for (const header of ['Producto', 'Categoría', 'Stock actual', 'Stock mínimo', 'Estado', 'Última venta']) expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument()
    const table = within(screen.getByRole('table'))
    expect(table.getByText('Stock bajo')).toBeInTheDocument()
    expect(table.getByText('Sin disponibilidad')).toBeInTheDocument()
    expect(table.getAllByText('Datos incompletos')).toHaveLength(2)
    expect(table.getAllByText('8 físico')).toHaveLength(4)
    expect(screen.getByLabelText('Acciones de Yerba del Sur')).toBeInTheDocument()
  })

  it('quick lookup searches only current-page results and loads selected identity, threshold, status and movements', async () => {
    render(<SmartStockPage />)
    await within(await screen.findByRole('table')).findByText('Yerba del Sur')
    const quickLookup = screen.getByRole('complementary', { name: 'Consulta rápida de existencias' })
    expect(quickLookup).toHaveTextContent('Consultá un producto')
    expect(quickLookup.querySelector('ul')).not.toBeInTheDocument()
    const quickSearch = screen.getByLabelText('Búsqueda rápida en esta página')
    fireEvent.change(quickSearch, { target: { value: 'Norte' } })
    expect(quickLookup.querySelectorAll('li')).toHaveLength(1)
    expect(quickLookup.querySelector('ul')).toHaveTextContent('Té del Norte')
    fireEvent.change(quickSearch, { target: { value: 'Producto inexistente' } })
    expect(quickLookup).toHaveTextContent('No hay productos en esta página que coincidan.')
    expect(quickLookup.querySelector('ul')).not.toBeInTheDocument()
    fireEvent.change(quickSearch, { target: { value: 'Norte' } })
    expect(screen.getByText('Buscá entre los productos de la página actual.')).toBeInTheDocument()
    expect(get.mock.calls.filter(([url]) => url === '/stock/overview')).toHaveLength(1)
    fireEvent.click(within(quickLookup).getByRole('button', { name: /Té del Norte/ }))
    expect(await screen.findByText('Mínimo')).toBeInTheDocument()
    expect(await screen.findByText('Ingreso por compra')).toBeInTheDocument()
    expect(screen.getByText('+8')).toBeInTheDocument()
    expect(quickLookup).toHaveTextContent('Sin disponibilidad')
  })

  it('dismisses suggestions on selection and restores them when searching again', async () => {
    const user = userEvent.setup()
    render(<SmartStockPage />)
    await screen.findByRole('table')
    const lookup = within(screen.getByRole('complementary', { name: 'Consulta rápida de existencias' }))
    const input = lookup.getByLabelText('Búsqueda rápida en esta página')
    await user.type(input, 'Yerba')
    expect(lookup.getAllByRole('button', { name: /Yerba/ })).toHaveLength(2)
    await user.click(lookup.getByRole('button', { name: /Yerba del Sur/ }))
    expect(lookup.queryByRole('button', { name: /Yerba Org/ })).not.toBeInTheDocument()
    expect(lookup.getByRole('heading', { name: 'Yerba del Sur' })).toBeInTheDocument()
    expect(input).toHaveValue('')
    await user.click(input)
    expect(lookup.queryByRole('button', { name: /Yerba Org/ })).not.toBeInTheDocument()
    await user.type(input, 'Norte')
    expect(lookup.getByRole('button', { name: /Té del Norte/ })).toBeInTheDocument()
    await user.clear(input)
    await user.type(input, 'inexistente')
    expect(lookup.getByText('No hay productos en esta página que coincidan.')).toBeInTheDocument()
    expect(lookup.getByRole('heading', { name: 'Yerba del Sur' })).toBeInTheDocument()
  })

  it('keeps suggestions dismissed when keyboard focus returns after selecting a result', async () => {
    const user = userEvent.setup()
    render(<SmartStockPage />)
    await screen.findByRole('table')
    const lookup = within(screen.getByRole('complementary', { name: 'Consulta rápida de existencias' }))
    const input = lookup.getByLabelText('Búsqueda rápida en esta página')
    await user.type(input, 'Yerba')
    await user.tab()
    expect(lookup.getByRole('button', { name: /Yerba del Sur/ })).toHaveFocus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(lookup.getByRole('heading', { name: 'Yerba del Sur' })).toHaveFocus())
    expect(lookup.queryByRole('button', { name: /Yerba Org/ })).not.toBeInTheDocument()
    await user.tab({ shift: true })
    expect(input).toHaveFocus()
    expect(lookup.queryByRole('button', { name: /Yerba Org/ })).not.toBeInTheDocument()
    await user.keyboard('Yerba')
    expect(lookup.getByRole('button', { name: /Yerba Org/ })).toBeInTheDocument()
  })

  it('dismisses suggestions when selecting a product from the table', async () => {
    const user = userEvent.setup()
    render(<SmartStockPage />)
    const table = await screen.findByRole('table')
    const lookup = within(screen.getByRole('complementary', { name: 'Consulta rápida de existencias' }))
    await user.type(lookup.getByLabelText('Búsqueda rápida en esta página'), 'Yerba')
    await user.click(within(table).getByRole('button', { name: 'Té del Norte' }))
    expect(lookup.queryByRole('button', { name: /Yerba Org/ })).not.toBeInTheDocument()
    expect(lookup.getByRole('heading', { name: 'Té del Norte' })).toBeInTheDocument()
  })

  it('focuses the detail only after quick selection loads and keeps actions in the table', async () => {
    const user = userEvent.setup()
    let resolveDetail!: (value: unknown) => void
    get.mockImplementation((url: string) => url === '/stock/overview'
      ? Promise.resolve({ data: overview })
      : new Promise((resolve) => { resolveDetail = resolve }))
    render(<SmartStockPage />)
    const table = await screen.findByRole('table')
    const lookup = within(screen.getByRole('complementary', { name: 'Consulta rápida de existencias' }))
    const input = lookup.getByLabelText('Búsqueda rápida en esta página')
    await user.type(input, 'Yerba')
    await user.tab()
    await user.keyboard('{Enter}')
    expect(input).toHaveValue('')
    expect(lookup.queryByRole('button', { name: /Yerba Org/ })).not.toBeInTheDocument()
    expect(lookup.getByRole('status')).toHaveTextContent('Cargando disponibilidad')
    expect(lookup.getByRole('heading', { name: 'Yerba del Sur' })).not.toHaveFocus()
    resolveDetail({ data: { availability: { physicalQuantity: 8, committedQuantity: 4, availableToSell: 4, expiredQuantity: 0 }, movements: [] } })
    await waitFor(() => expect(lookup.getByRole('heading', { name: 'Yerba del Sur' })).toHaveFocus())
    expect(lookup.getByRole('heading', { name: 'Yerba del Sur' })).toHaveAttribute('tabindex', '-1')
    for (const name of ['Configurar', 'Registrar baja', 'Retirar vencidos']) expect(lookup.queryByRole('button', { name })).not.toBeInTheDocument()
    const row = within(table).getByRole('row', { name: /Yerba del Sur/ })
    await user.click(within(row).getByLabelText('Acciones de Yerba del Sur'))
    for (const name of ['Configurar stock', 'Registrar baja', 'Retirar vencidos']) expect(within(row).getByRole('button', { name })).toBeInTheDocument()
  })

  it('does not steal focus after an error, a new search, or a table selection', async () => {
    const user = userEvent.setup()
    let resolveDetail!: (value: unknown) => void
    let rejectDetail!: (reason: Error) => void
    get.mockImplementation((url: string) => url === '/stock/overview'
      ? Promise.resolve({ data: overview })
      : new Promise((resolve, reject) => { resolveDetail = resolve; rejectDetail = reject }))
    render(<SmartStockPage />)
    const table = await screen.findByRole('table')
    const lookup = within(screen.getByRole('complementary', { name: 'Consulta rápida de existencias' }))
    const input = lookup.getByLabelText('Búsqueda rápida en esta página')
    await user.type(input, 'Yerba')
    await user.click(lookup.getByRole('button', { name: /Yerba del Sur/ }))
    await user.click(input)
    await user.type(input, 'Norte')
    resolveDetail({ data: { availability: { physicalQuantity: 8, committedQuantity: 4, availableToSell: 4, expiredQuantity: 0 }, movements: [] } })
    await lookup.findByText('No hay movimientos registrados.')
    expect(input).toHaveFocus()
    await user.click(lookup.getByRole('button', { name: /Té del Norte/ }))
    rejectDetail(new Error('network'))
    expect(await lookup.findByRole('alert')).toHaveTextContent('No se pudo consultar')
    expect(lookup.getByRole('heading', { name: 'Té del Norte' })).not.toHaveFocus()
    const tableButton = within(table).getByRole('button', { name: 'Yerba del Sur' })
    await user.click(tableButton)
    resolveDetail({ data: { availability: { physicalQuantity: 8, committedQuantity: 4, availableToSell: 4, expiredQuantity: 0 }, movements: [] } })
    await lookup.findByText('No hay movimientos registrados.')
    expect(tableButton).toHaveFocus()
  })

  it('ignores late aborted details and does not move focus on refresh', async () => {
    const user = userEvent.setup()
    const requests: Array<(value: unknown) => void> = []
    const data = { availability: { physicalQuantity: 8, committedQuantity: 4, availableToSell: 4, expiredQuantity: 0 }, movements: [] }
    get.mockImplementation((url: string) => url === '/stock/overview'
      ? Promise.resolve({ data: overview })
      : new Promise((resolve) => { requests.push(resolve) }))
    render(<SmartStockPage />)
    const table = await screen.findByRole('table')
    const lookup = within(screen.getByRole('complementary', { name: 'Consulta rápida de existencias' }))
    const input = lookup.getByLabelText('Búsqueda rápida en esta página')
    await user.type(input, 'Yerba')
    await user.click(lookup.getByRole('button', { name: /Yerba del Sur/ }))
    const tableButton = within(table).getByRole('button', { name: 'Té del Norte' })
    await user.click(tableButton)
    requests[1]({ data })
    await lookup.findByText('No hay movimientos registrados.')
    requests[0]({ data: { ...data, movements: [{ type: 'PURCHASE_IN', quantity: 99, occurredAt: '2026-01-02T12:00:00.000Z' }] } })
    await waitFor(() => expect(lookup.queryByText('+99')).not.toBeInTheDocument())
    expect(tableButton).toHaveFocus()
    const refresh = screen.getByRole('button', { name: 'Actualizar stock' })
    await user.click(refresh)
    requests[2]({ data })
    await lookup.findByText('No hay movimientos registrados.')
    expect(refresh).toHaveFocus()
  })

  it('focuses a newly selected product after the previous product failed', async () => {
    const user = userEvent.setup()
    let rejectFirst!: (reason: Error) => void
    let resolveSecond!: (value: unknown) => void
    get.mockImplementation((url: string) => {
      if (url === '/stock/overview') return Promise.resolve({ data: overview })
      if (url.endsWith('p-1')) return new Promise((_, reject) => { rejectFirst = reject })
      return new Promise((resolve) => { resolveSecond = resolve })
    })
    render(<SmartStockPage />)
    await screen.findByRole('table')
    const lookup = within(screen.getByRole('complementary', { name: 'Consulta rápida de existencias' }))
    const input = lookup.getByLabelText('Búsqueda rápida en esta página')
    await user.type(input, 'Yerba')
    await user.click(lookup.getByRole('button', { name: /Yerba del Sur/ }))
    rejectFirst(new Error('network'))
    await lookup.findByRole('alert')
    await user.type(input, 'Norte')
    await user.click(lookup.getByRole('button', { name: /Té del Norte/ }))
    resolveSecond({ data: { availability: { physicalQuantity: 8, committedQuantity: 4, availableToSell: 4, expiredQuantity: 0 }, movements: [] } })
    await waitFor(() => expect(lookup.getByRole('heading', { name: 'Té del Norte' })).toHaveFocus())
  })

  it('cancels pending focus when clicking nonfocusable content even if search is refocused', async () => {
    const user = userEvent.setup()
    let resolveDetail!: (value: unknown) => void
    get.mockImplementation((url: string) => url === '/stock/overview'
      ? Promise.resolve({ data: overview })
      : new Promise((resolve) => { resolveDetail = resolve }))
    render(<SmartStockPage />)
    await screen.findByRole('table')
    const lookup = within(screen.getByRole('complementary', { name: 'Consulta rápida de existencias' }))
    const input = lookup.getByLabelText('Búsqueda rápida en esta página')
    await user.type(input, 'Yerba')
    await user.click(lookup.getByRole('button', { name: /Yerba del Sur/ }))
    await user.click(screen.getByRole('heading', { name: 'Stock inteligente' }))
    await user.click(input)
    resolveDetail({ data: { availability: { physicalQuantity: 8, committedQuantity: 4, availableToSell: 4, expiredQuantity: 0 }, movements: [] } })
    await lookup.findByText('No hay movimientos registrados.')
    expect(input).toHaveFocus()
  })

  it('hides the initial instruction for matching searches and restores it when cleared or whitespace-only', async () => {
    render(<SmartStockPage />)
    await screen.findByRole('table')
    const lookup = within(screen.getByRole('complementary', { name: 'Consulta rápida de existencias' }))
    const input = lookup.getByLabelText('Búsqueda rápida en esta página')
    const instruction = 'Seleccioná un resultado para ver existencias y movimientos.'

    expect(lookup.getByText('Consultá un producto')).toBeInTheDocument()
    expect(lookup.getByText(instruction)).toBeInTheDocument()
    fireEvent.change(input, { target: { value: 'Norte' } })
    expect(lookup.getByRole('button', { name: /Té del Norte/ })).toBeInTheDocument()
    expect(lookup.queryByText('Consultá un producto')).not.toBeInTheDocument()
    expect(lookup.queryByText(instruction)).not.toBeInTheDocument()
    fireEvent.change(input, { target: { value: '' } })
    expect(lookup.getByText('Consultá un producto')).toBeInTheDocument()
    expect(lookup.getByText(instruction)).toBeInTheDocument()
    fireEvent.change(input, { target: { value: '   ' } })
    expect(lookup.getByText('Consultá un producto')).toBeInTheDocument()
    expect(lookup.getByText(instruction)).toBeInTheDocument()
  })

  it('shows no-results without the initial instruction and preserves selected product detail', async () => {
    render(<SmartStockPage />)
    await screen.findByRole('table')
    const lookup = within(screen.getByRole('complementary', { name: 'Consulta rápida de existencias' }))
    const input = lookup.getByLabelText('Búsqueda rápida en esta página')
    fireEvent.change(input, { target: { value: 'Inexistente' } })
    expect(lookup.getByText('No hay productos en esta página que coincidan.')).toBeInTheDocument()
    expect(lookup.queryByText('Consultá un producto')).not.toBeInTheDocument()
    expect(lookup.queryByText('Seleccioná un resultado para ver existencias y movimientos.')).not.toBeInTheDocument()
    fireEvent.change(input, { target: { value: 'Norte' } })
    fireEvent.click(lookup.getByRole('button', { name: /Té del Norte/ }))
    expect(await lookup.findByText('Ingreso por compra')).toBeInTheDocument()
    fireEvent.change(input, { target: { value: '' } })
    expect(lookup.getByRole('heading', { name: 'Té del Norte' })).toBeInTheDocument()
    expect(lookup.queryByText('Consultá un producto')).not.toBeInTheDocument()
  })

  it('S-21 separates request failure from a valid empty page and offers retry', async () => {
    get.mockRejectedValueOnce(new Error('unavailable'))
    render(<SmartStockPage />)
    expect(await screen.findByText(/No se pudo cargar el stock/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('S-07 confirms report is unavailable without making a request', async () => {
    render(<SmartStockPage />)
    await within(await screen.findByRole('table')).findByText('Yerba del Sur')
    fireEvent.click(screen.getByRole('button', { name: 'Generar reporte' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('La generación de reportes todavía no está disponible.')
    expect(post).not.toHaveBeenCalled()
  })

  it('S-20 retains configuration values when the authenticated API rejects the update', async () => {
    render(<SmartStockPage />)
    await within(await screen.findByRole('table')).findByText('Yerba del Sur')
    const row = screen.getByRole('row', { name: /Yerba del Sur/ })
    fireEvent.click(within(row).getByLabelText('Acciones de Yerba del Sur'))
    fireEvent.click(within(row).getByRole('button', { name: 'Configurar stock' }))
    fireEvent.change(screen.getByLabelText('Stock mínimo'), { target: { value: '9' } })
    patch.mockRejectedValueOnce(new Error('invalid'))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar configuración' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar la configuración')
    expect(screen.getByLabelText('Stock mínimo')).toHaveValue(9)
  })

  it('opens configuration from the header before a product is selected and scopes expired products to this page', async () => {
    get.mockResolvedValue({ data: { ...overview, items: [
      { ...item('p-1', 'Yerba del Sur', 'Almacén'), expiredQuantity: 3 },
      { ...item('p-2', 'Té del Norte', 'Infusiones'), expiredQuantity: 0 },
    ] } })
    render(<SmartStockPage />)
    await within(await screen.findByRole('table')).findByText('Yerba del Sur')

    fireEvent.click(screen.getByRole('button', { name: 'Configuraciones' }))

    expect(screen.getByRole('dialog')).toHaveTextContent('Productos vencidos de esta página')
    expect(screen.getByRole('dialog')).toHaveClass('max-h-[calc(100dvh-2rem)]')
    const expiredProducts = screen.getByRole('region', { name: 'Productos vencidos de esta página' })
    expect(expiredProducts).toHaveTextContent('Yerba del Sur')
    expect(expiredProducts).toHaveTextContent('Existencias vencidas: 3')
    expect(within(expiredProducts).getByRole('button', { name: 'Retirar vencidos de Yerba del Sur' })).toBeInTheDocument()
    expect(expiredProducts).not.toHaveTextContent('Té del Norte')
    expect(within(screen.getByLabelText('Producto para configurar')).getByRole('option', { name: 'Té del Norte' })).toHaveValue('p-2')
    expect(screen.getByLabelText('Producto para configurar')).toHaveValue('')
  })

  it('selects a current-page product and populates its thresholds in configuration', async () => {
    get.mockResolvedValue({ data: { ...overview, items: [
      { ...item('p-1', 'Yerba del Sur', 'Almacén'), expiryAlertDays: 21 },
    ] } })
    render(<SmartStockPage />)
    await within(await screen.findByRole('table')).findByText('Yerba del Sur')
    fireEvent.click(screen.getByRole('button', { name: 'Configuraciones' }))
    fireEvent.change(screen.getByLabelText('Producto para configurar'), { target: { value: 'p-1' } })

    expect(screen.getByLabelText('Stock mínimo')).toHaveValue(2)
    expect(screen.getByLabelText('Umbral preventivo (días)')).toHaveValue(21)
  })

  it('shows an honest empty state when no current-page products are expired', async () => {
    render(<SmartStockPage />)
    await within(await screen.findByRole('table')).findByText('Yerba del Sur')
    fireEvent.click(screen.getByRole('button', { name: 'Configuraciones' }))

    expect(screen.getByRole('status')).toHaveTextContent('No hay productos vencidos en esta página.')
  })

  it('names each expired-product removal button and waits for confirmation before requesting removal', async () => {
    get.mockResolvedValueOnce({ data: { ...overview, items: [
      { ...item('p-1', 'Yerba del Sur', 'Almacén'), expiredQuantity: 3 },
      { ...item('p-2', 'Té del Norte', 'Infusiones'), expiredQuantity: 1 },
    ] } })
    render(<SmartStockPage />)
    await within(await screen.findByRole('table')).findByText('Yerba del Sur')
    fireEvent.click(screen.getByRole('button', { name: 'Configuraciones' }))

    fireEvent.click(screen.getByRole('button', { name: 'Retirar vencidos de Yerba del Sur' }))

    expect(screen.getByRole('dialog')).toHaveTextContent('Producto: Yerba del Sur')
    expect(post).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar retiro' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/stock/products/p-1/expired-removal', expect.any(Object)))
  })

  it('states the eligible current-page product count before bulk removal', async () => {
    get.mockResolvedValue({ data: { ...overview, items: [
      { ...item('p-1', 'Yerba del Sur', 'Almacén'), expiredQuantity: 3 },
      { ...item('p-2', 'Té del Norte', 'Infusiones'), expiredQuantity: 1 },
      { ...item('p-3', 'Yerba Orgánica', 'Infusiones'), expiredQuantity: 0 },
    ] } })
    render(<SmartStockPage />)
    await within(await screen.findByRole('table')).findByText('Yerba del Sur')
    fireEvent.click(screen.getByRole('button', { name: 'Configuraciones' }))
    fireEvent.click(screen.getByRole('button', { name: 'Retirar todos de esta página' }))

    expect(screen.getByRole('dialog')).toHaveTextContent('Se procesarán 2 productos con existencias vencidas de esta página')
    expect(post).not.toHaveBeenCalled()
  })

  it('reuses a write-off operation ID for the same failed payload and creates a new ID when the note changes', async () => {
    let nextId = 0
    vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => `operation-${++nextId}`)
    render(<SmartStockPage />)
    await within(await screen.findByRole('table')).findByText('Yerba del Sur')
    fireEvent.click(screen.getByRole('button', { name: 'Yerba del Sur' }))
    const row = screen.getByRole('row', { name: /Yerba del Sur/ })
    fireEvent.click(within(row).getByLabelText('Acciones de Yerba del Sur'))
    fireEvent.click(within(row).getByRole('button', { name: 'Registrar baja' }))
    fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText(/Observación/), { target: { value: 'Daño' } })
    post.mockRejectedValueOnce(new Error('network'))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar baja' }))
    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar baja' }))
    await waitFor(() => expect(post).toHaveBeenCalledTimes(2))
    const firstPayload = post.mock.calls[0][1]
    const retryPayload = post.mock.calls[1][1]
    expect(retryPayload.operationId).toBe(firstPayload.operationId)

    post.mockRejectedValueOnce(new Error('network'))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar baja' }))
    await screen.findByRole('alert')
    fireEvent.change(screen.getByLabelText(/Observación/), { target: { value: 'Rotura' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar baja' }))
    await waitFor(() => expect(post).toHaveBeenCalledTimes(4))
    expect(post.mock.calls[3][1].operationId).not.toBe(firstPayload.operationId)
    vi.restoreAllMocks()
  })

  it('creates a fresh bulk operation ID after complete success for the same payload', async () => {
    let nextId = 0
    vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => `operation-${++nextId}`)
    get.mockResolvedValue({ data: { ...overview, items: [ { ...item('p-1', 'Yerba del Sur', 'Almacén'), expiredQuantity: 2 } ] } })
    post.mockResolvedValue({ data: { results: [{ productId: 'p-1', status: 'REMOVED', removedQuantity: 2 }] } })
    render(<SmartStockPage />)
    await within(await screen.findByRole('table')).findByText('Yerba del Sur')
    fireEvent.click(screen.getByRole('button', { name: 'Configuraciones' }))
    fireEvent.click(screen.getByRole('button', { name: 'Retirar todos de esta página' }))
    const submit = screen.getByRole('button', { name: 'Iniciar retiro' })
    fireEvent.click(submit)
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    fireEvent.click(submit)
    await waitFor(() => expect(post).toHaveBeenCalledTimes(2))
    expect(post.mock.calls[1][1].operationId).not.toBe(post.mock.calls[0][1].operationId)
    vi.restoreAllMocks()
  })

  it('retains the bulk operation ID after partial failure for retrying the same payload', async () => {
    let nextId = 0
    vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => `operation-${++nextId}`)
    get.mockResolvedValue({ data: { ...overview, items: [ { ...item('p-1', 'Yerba del Sur', 'Almacén'), expiredQuantity: 2 } ] } })
    post.mockResolvedValue({ data: { results: [{ productId: 'p-1', status: 'FAILED', removedQuantity: 0 }] } })
    render(<SmartStockPage />)
    await within(await screen.findByRole('table')).findByText('Yerba del Sur')
    fireEvent.click(screen.getByRole('button', { name: 'Configuraciones' }))
    fireEvent.click(screen.getByRole('button', { name: 'Retirar todos de esta página' }))
    const submit = screen.getByRole('button', { name: 'Iniciar retiro' })
    fireEvent.click(submit)
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    fireEvent.click(submit)
    await waitFor(() => expect(post).toHaveBeenCalledTimes(2))
    expect(post.mock.calls[1][1].operationId).toBe(post.mock.calls[0][1].operationId)
    vi.restoreAllMocks()
  })

  it('reports all-ineligible bulk results neutrally and mixed results accurately', async () => {
    get.mockResolvedValue({ data: { ...overview, items: [
      { ...item('p-1', 'Yerba del Sur', 'Almacén'), expiredQuantity: 2 },
      { ...item('p-2', 'Té del Norte', 'Infusiones'), expiredQuantity: 1 },
    ] } })
    post.mockResolvedValueOnce({ data: { results: [
      { productId: 'p-1', status: 'NO_ELIGIBLE', removedQuantity: 0 },
      { productId: 'p-2', status: 'NO_ELIGIBLE', removedQuantity: 0 },
    ] } }).mockResolvedValueOnce({ data: { results: [
      { productId: 'p-1', status: 'REMOVED', removedQuantity: 2 },
      { productId: 'p-2', status: 'NO_ELIGIBLE', removedQuantity: 0 },
    ] } })
    render(<SmartStockPage />)
    await within(await screen.findByRole('table')).findByText('Yerba del Sur')
    fireEvent.click(screen.getByRole('button', { name: 'Configuraciones' }))
    fireEvent.click(screen.getByRole('button', { name: 'Retirar todos de esta página' }))
    const submit = screen.getByRole('button', { name: 'Iniciar retiro' })

    fireEvent.click(submit)
    expect(await screen.findByRole('status')).toHaveTextContent('No había existencias vencidas elegibles')
    expect(screen.getByRole('list', { name: 'Resultados por producto' })).toHaveTextContent('Yerba del Sur: Sin cantidad elegible')
    expect(screen.getByRole('status')).not.toHaveTextContent('retirados correctamente')

    fireEvent.click(submit)
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('1 producto(s) con retiro; 1 sin cantidad elegible'))
    expect(screen.getByRole('list', { name: 'Resultados por producto' })).toHaveTextContent('Té del Norte: Sin cantidad elegible')
  })
})
