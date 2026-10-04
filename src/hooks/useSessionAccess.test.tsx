import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SESSION_STATUS, type UserWithToken } from '@/interfaces/auth.interface'

const { useAppSelector } = vi.hoisted(() => ({ useAppSelector: vi.fn() }))

vi.mock('@/redux/hook', () => ({ useAppSelector }))

import { useSessionAccess } from './useSessionAccess'

const anonymousUser: UserWithToken = {
  nickname: '',
  token: '',
}

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
    useAppSelector.mockReturnValue({
      nickname: 'Repartidor',
      token: 'session-token',
      role: { _id: 'role-1', name: 'Repartidor', permissions: ['read_route_plan'] },
    } satisfies UserWithToken)

    const { result } = renderHook(() => useSessionAccess())

    expect(result.current.status).toBe(SESSION_STATUS.READY)
    expect(result.current.permissions).toEqual(['read_route_plan'])
  })
})
