import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Permission, SESSION_STATUS, type UserWithToken } from '@/interfaces/auth.interface'

const { useAppSelector, moduleFlags } = vi.hoisted(() => ({
  useAppSelector: vi.fn(),
  moduleFlags: { route: false, stock: false, finance: false, simulation: false } as Record<string, boolean>,
}))

vi.mock('@/redux/hook', () => ({ useAppSelector }))
vi.mock('@/config/moduleRegistry', () => ({
  MODULE_FLAGS: moduleFlags,
  DEFAULT_MODULE_GATES: { route: false, stock: false, finance: false, simulation: false },
  MODULE_FLAG: { ROUTE: 'route', STOCK: 'stock', FINANCE: 'finance', SIMULATION: 'simulation' },
  MODULE_GATE: { ROUTE: 'route', STOCK: 'stock', FINANCE: 'finance', SIMULATION: 'simulation' },
}))

import { useSessionAccess } from './useSessionAccess'

const anonymousUser: UserWithToken = {
  nickname: '',
  token: '',
}

const authenticatedUser = (permissions: string[]): UserWithToken => ({
  nickname: 'Repartidor',
  token: 'session-token',
  role: { _id: 'role-1', name: 'Repartidor', permissions },
})

describe('useSessionAccess', () => {
  beforeEach(() => {
    moduleFlags.route = false
    useAppSelector.mockReturnValue(anonymousUser)
  })

  it('becomes anonymous only after hydration completes without a token', () => {
    const { result } = renderHook(() => useSessionAccess())

    expect(result.current.status).toBe(SESSION_STATUS.ANONYMOUS)
    expect(result.current.permissions).toEqual([])
  })

  it('resolves an authenticated session and its permissions', () => {
    useAppSelector.mockReturnValue(authenticatedUser([Permission.READ_ROUTE_PLAN]))

    const { result } = renderHook(() => useSessionAccess())

    expect(result.current.status).toBe(SESSION_STATUS.READY)
    expect(result.current.permissions).toEqual([Permission.READ_ROUTE_PLAN])
  })

  it('meets the route gate when the flag is true and the session can read route plans', () => {
    moduleFlags.route = true
    useAppSelector.mockReturnValue(authenticatedUser([Permission.READ_ROUTE_PLAN]))

    const { result } = renderHook(() => useSessionAccess())

    expect(result.current.gates.route).toBe(true)
  })

  it('keeps the route gate unmet when the flag is true but the session cannot read route plans', () => {
    moduleFlags.route = true
    useAppSelector.mockReturnValue(authenticatedUser([]))

    const { result } = renderHook(() => useSessionAccess())

    expect(result.current.gates.route).toBe(false)
  })

  it('keeps the route gate unmet when the flag is not exactly true', () => {
    moduleFlags.route = false
    useAppSelector.mockReturnValue(authenticatedUser([Permission.READ_ROUTE_PLAN]))

    const { result } = renderHook(() => useSessionAccess())

    expect(result.current.gates.route).toBe(false)
  })

  it('keeps the route gate unmet while the session is anonymous', () => {
    moduleFlags.route = true
    useAppSelector.mockReturnValue(anonymousUser)

    const { result } = renderHook(() => useSessionAccess())

    expect(result.current.gates.route).toBe(false)
  })

  it('preserves the remaining module gates as unmet', () => {
    moduleFlags.route = true
    useAppSelector.mockReturnValue(authenticatedUser([Permission.READ_ROUTE_PLAN]))

    const { result } = renderHook(() => useSessionAccess())

    expect(result.current.gates).toMatchObject({ stock: false, finance: false, simulation: false })
  })
})
