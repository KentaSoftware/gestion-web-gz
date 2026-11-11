import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import EditSale from './page'
import apiClient from '@/utils/client'
import { setSale } from '@/redux/saleSlice'

const { dispatch } = vi.hoisted(() => ({ dispatch: vi.fn() }))
vi.mock('@/utils/client', () => ({ default: { get: vi.fn() } }))
vi.mock('@/redux/hook', () => ({ useAppDispatch: () => dispatch }))
vi.mock('react-redux', () => ({ useSelector: () => ({}) }))
vi.mock('@/hooks/useLocalStorage', () => ({ default: () => [{ token: 'token' }] }))
vi.mock('next/navigation', () => ({ useRouter: () => ({}) }))
vi.mock('@/hooks/useResize', () => ({ useResize: () => ({ ancho: 1200, alto: 800 }) }))
vi.mock('@/components/sale/ContainerSaleWeb', () => ({ default: () => null }))
vi.mock('@/components/sale/ContainerSaleMobile', () => ({ default: () => null }))

describe('edit sale hydration', () => {
  it('retains the linked client ID returned by the server', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { r: { cliente: 'Ana', idCliente: 'client-1', estado: 'Cancelado', total: 10, createdAt: '2026-01-01' }, itemsSale: [] } })
    render(<EditSale params={{ id: 'sale-1' }} />)
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith(setSale({ sale: { _id: 'sale-1', cliente: 'Ana', idCliente: 'client-1', estado: 'Cancelado', total: 10, createdAt: '2026-01-01', porcentaje: undefined, itemsSale: [] } })))
  })
})
