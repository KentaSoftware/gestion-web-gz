import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SESSION_STATUS } from '@/interfaces/auth.interface'

const { access } = vi.hoisted(() => ({ access: vi.fn() }))
vi.mock('@/hooks/useSessionAccess', () => ({ useSessionAccess: access }))
import { usePermission } from './usePermission'

describe('usePermission', () => {
  it('allows a verified administrator with no explicit permissions', () => {
    access.mockReturnValue({ status: SESSION_STATUS.READY, permissions: [], isAdmin: true })
    const { result } = renderHook(() => usePermission())
    expect(result.current.hasPermission('read_expense')).toBe(true)
    expect(result.current.hasAnyPermission(['a', 'b'])).toBe(true)
    expect(result.current.hasAllPermissions(['a', 'b'])).toBe(true)
  })

  it('continues to enforce explicit permissions for nonadministrators', () => {
    access.mockReturnValue({ status: SESSION_STATUS.READY, permissions: ['a'], isAdmin: false })
    const { result } = renderHook(() => usePermission())
    expect(result.current.hasPermission('a')).toBe(true)
    expect(result.current.hasPermission('b')).toBe(false)
    expect(result.current.hasAllPermissions(['a', 'b'])).toBe(false)
  })
})
