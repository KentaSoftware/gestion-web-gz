import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_MODULE_GATES,
  MODULE_FLAGS,
  MODULE_REGISTRY,
  isModuleEnabled,
} from './moduleRegistry'
import { Permission, SESSION_STATUS, type SessionAccess } from '@/interfaces/auth.interface'
import { REPARTIDOR_ACCESS, WITHOUT_ROUTE_READ_ACCESS } from '@/test/fixtures/sessionAccess'

const repartidorAccess: SessionAccess = {
  status: SESSION_STATUS.READY,
  permissions: [Permission.READ_ROUTE_PLAN],
  gates: {
    route: true,
    stock: false,
    finance: false,
    simulation: false,
  },
}

describe('MODULE_REGISTRY', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('keeps Phase 0 module flags and gates disabled by default', () => {
    expect(MODULE_FLAGS).toEqual({
      route: false,
      stock: false,
      finance: false,
      simulation: false,
    })
    expect(DEFAULT_MODULE_GATES).toEqual({
      route: false,
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

  it('enables Rutas for the read-only Repartidor fixture when its module is enabled', async () => {
    vi.stubEnv('NEXT_PUBLIC_ROUTE_ENABLED', 'true')
    vi.resetModules()

    const { MODULE_REGISTRY: enabledRegistry, isModuleEnabled: enabled } = await import('./moduleRegistry')
    const route = enabledRegistry.find((entry) => entry.id === 'route')

    expect(route).toBeDefined()
    expect(enabled(route!, REPARTIDOR_ACCESS)).toBe(true)
    expect(REPARTIDOR_ACCESS.permissions).not.toContain(Permission.ADJUST_STOCK)
    expect(REPARTIDOR_ACCESS.permissions).not.toContain(Permission.REFUND_SALE)
  })

  it('does not enable Rutas for a fixture without read_route_plan even when its module is enabled', async () => {
    vi.stubEnv('NEXT_PUBLIC_ROUTE_ENABLED', 'true')
    vi.resetModules()

    const { MODULE_REGISTRY: enabledRegistry, isModuleEnabled: enabled } = await import('./moduleRegistry')
    const route = enabledRegistry.find((entry) => entry.id === 'route')

    expect(route).toBeDefined()
    expect(enabled(route!, WITHOUT_ROUTE_READ_ACCESS)).toBe(false)
  })

  it('does not expose modules while the session is hydrating', () => {
    const home = MODULE_REGISTRY.find((entry) => entry.id === 'home')

    expect(home).toBeDefined()
    expect(isModuleEnabled(home!, { ...repartidorAccess, status: SESSION_STATUS.HYDRATING })).toBe(false)
  })
})
