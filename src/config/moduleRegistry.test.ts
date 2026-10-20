import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MODULE_GATES,
  MODULE_FLAGS,
  MODULE_REGISTRY,
  isModuleEnabled,
} from './moduleRegistry'
import { Permission, SESSION_STATUS, type SessionAccess } from '@/interfaces/auth.interface'

const repartidorAccess: SessionAccess = {
  status: SESSION_STATUS.READY,
  permissions: [],
  gates: {
    stock: false,
    finance: false,
    simulation: false,
  },
}

describe('MODULE_REGISTRY', () => {
  it('keeps Phase 0 module flags and gates disabled by default', () => {
    expect(MODULE_FLAGS).toEqual({
      stock: false,
      finance: false,
      simulation: false,
    })
    expect(DEFAULT_MODULE_GATES).toEqual({
      stock: false,
      finance: false,
      simulation: false,
    })
  })

  it('keeps a Repartidor read-only while allowing legacy read navigation', () => {
    const home = MODULE_REGISTRY.find((entry) => entry.id === 'home')
    const stock = MODULE_REGISTRY.find((entry) => entry.id === 'stock')

    expect(home).toBeDefined()
    expect(stock).toBeDefined()
    expect(isModuleEnabled(home!, repartidorAccess)).toBe(true)
    expect(isModuleEnabled(stock!, repartidorAccess)).toBe(false)
    expect(repartidorAccess.permissions).not.toContain(Permission.ADJUST_STOCK)
    expect(repartidorAccess.permissions).not.toContain(Permission.REFUND_SALE)
  })

  it('enables Rutas for any authenticated session without route permissions', () => {
    const route = MODULE_REGISTRY.find((entry) => entry.id === 'route')

    expect(route).toBeDefined()
    expect(route).toMatchObject({ flag: null, gate: null, requiredPermissions: [] })
    expect(isModuleEnabled(route!, repartidorAccess)).toBe(true)
  })

  it('does not reintroduce route-specific permission requirements', () => {
    const route = MODULE_REGISTRY.find((entry) => entry.id === 'route')

    expect(route).toBeDefined()
    expect(isModuleEnabled(route!, { ...repartidorAccess, permissions: ['unrelated_permission'] })).toBe(true)
  })

  it('does not expose modules while the session is hydrating', () => {
    const home = MODULE_REGISTRY.find((entry) => entry.id === 'home')

    expect(home).toBeDefined()
    expect(isModuleEnabled(home!, { ...repartidorAccess, status: SESSION_STATUS.HYDRATING })).toBe(false)
  })
})
