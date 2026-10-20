import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Permission, SESSION_STATUS, type UserWithToken } from '@/interfaces/auth.interface'

const { useAppSelector } = vi.hoisted(() => ({
  useAppSelector: vi.fn(),
}))

vi.mock('@/redux/hook', () => ({ useAppSelector }))
vi.mock('@/config/moduleRegistry', () => ({
  DEFAULT_MODULE_GATES: { stock: false, finance: false, simulation: false },
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

  it('keeps route access permission available without a route flag gate', () => {
    useAppSelector.mockReturnValue(authenticatedUser([Permission.READ_ROUTE_PLAN]))

    const { result } = renderHook(() => useSessionAccess())

    expect(result.current.permissions).toContain(Permission.READ_ROUTE_PLAN)
  })

  it('keeps route permission unavailable while the session is anonymous', () => {
    useAppSelector.mockReturnValue(anonymousUser)

    const { result } = renderHook(() => useSessionAccess())

    expect(result.current.permissions).not.toContain(Permission.READ_ROUTE_PLAN)
  })

  it('preserves the remaining module gates as unmet', () => {
    useAppSelector.mockReturnValue(authenticatedUser([Permission.READ_ROUTE_PLAN]))

    const { result } = renderHook(() => useSessionAccess())

    expect(result.current.gates).toMatchObject({ stock: false, finance: false, simulation: false })
  })
})
