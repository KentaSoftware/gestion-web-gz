import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SmartStockPage from './page'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('@/utils/client', () => ({ default: { get } }))

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
  alerts: [],
  latestSale: { status: 'INCOMPLETE' as const },
})

const overview = {
  page: 1,
  pageSize: 50,
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
    get.mockImplementation((url: string, config?: { params?: { category?: string } }) => {
      if (url === '/stock/overview') return Promise.resolve({ data: config?.params?.category
        ? { ...overview, total: 0, items: [] }
        : overview })
      return Promise.resolve({ data: { availability: { physicalQuantity: 8, committedQuantity: 4, availableToSell: 4, expiredQuantity: 0 }, movements: [{ movementId: 'm-1', type: 'PURCHASE_IN', quantity: 8, occurredAt: '2026-01-02T12:00:00.000Z' }] } })
    })
  })

  it('S-01 renders invariant global indicators and catalog-wide alerts', async () => {
    render(<SmartStockPage />)
    expect(await screen.findByText('Yerba del Sur')).toBeInTheDocument()
    expect(screen.getByLabelText('7 productos bajo el mínimo')).toBeInTheDocument()
    expect(screen.getByText('Té del Norte')).toBeInTheDocument()
    expect(screen.getByText('8 alertas en todo el catálogo')).toBeInTheDocument()
  })

  it('S-02 severity narrows only global alerts', async () => {
    render(<SmartStockPage />)
    await screen.findByText('Yerba del Sur')
    fireEvent.change(screen.getByLabelText('Filtrar alertas por severidad'), { target: { value: 'WARNING' } })
    expect(screen.getByText('Rotación baja')).toBeInTheDocument()
    expect(screen.queryByText('Bajo mínimo')).not.toBeInTheDocument()
    expect(screen.getByText('Yerba Orgánica')).toBeInTheDocument()
    expect(screen.getByLabelText('8 alertas en todo el catálogo')).toBeInTheDocument()
  })

  it('S-09 sends intersecting filters to the API, resets pagination, and clears filters independently', async () => {
    render(<SmartStockPage />)
    await screen.findByText('Yerba del Sur')
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(get).toHaveBeenCalledWith('/stock/overview', expect.objectContaining({ params: expect.objectContaining({ page: 2 }) })))
    fireEvent.change(screen.getByLabelText('Filtrar productos por categoría'), { target: { value: 'Infusiones' } })
    await waitFor(() => expect(get).toHaveBeenCalledWith('/stock/overview', expect.objectContaining({ params: expect.objectContaining({ category: 'Infusiones', page: 1 }) })))
    fireEvent.change(screen.getByLabelText('Buscar producto por nombre'), { target: { value: 'Yerba' } })
    await waitFor(() => expect(get).toHaveBeenCalledWith('/stock/overview', expect.objectContaining({ params: expect.objectContaining({ search: 'Yerba', category: 'Infusiones', page: 1 }) })))
    fireEvent.click(screen.getByLabelText('Limpiar búsqueda'))
    await waitFor(() => expect(get).toHaveBeenCalledWith('/stock/overview', expect.objectContaining({ params: expect.objectContaining({ category: 'Infusiones', page: 1 }) })))
    expect(get.mock.calls.at(-1)?.[1].params).not.toHaveProperty('search')
  })

  it('does not send client-only severity to the API and omits empty filters', async () => {
    render(<SmartStockPage />)
    await screen.findByText('Yerba del Sur')
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
    const zeroStock = await screen.findByRole('button', { name: /Té del Norte/ })
    expect(zeroStock).toHaveTextContent('Sin disponibilidad')
    fireEvent.click(zeroStock)
    expect(await screen.findByText('No disponible: historial incompleto')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Ingreso por compra')).toBeInTheDocument())
    expect(get).toHaveBeenCalledWith('/stock/products/p-2', expect.objectContaining({ params: expect.objectContaining({ movementLimit: 10 }) }))
  })

  it('S-21 separates request failure from a valid empty page and offers retry', async () => {
    get.mockRejectedValueOnce(new Error('unavailable'))
    render(<SmartStockPage />)
    expect(await screen.findByText(/No se pudo cargar el stock/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
