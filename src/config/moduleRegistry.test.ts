import { afterEach, describe, expect, it, vi } from 'vitest'
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
  it('keeps Phase 0 stock/simulation gated off; finance gate open for this iteration', () => {
    expect(MODULE_FLAGS.stock).toBe(false)
    expect(MODULE_FLAGS.simulation).toBe(false)
    expect(DEFAULT_MODULE_GATES).toEqual({
      stock: false,
      finance: true,
      simulation: false,
    })
  })

  it('registers Finanzas with read_cashflow (RBAC fino diferido)', () => {
    const finance = MODULE_REGISTRY.find((entry) => entry.id === 'finance')
    expect(finance).toMatchObject({
      href: '/finance',
      flag: null,
      requiredPermissions: [Permission.READ_CASHFLOW],
      gate: 'finance',
    })
  })

  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })

  it.each([undefined, 'false'])('enforces finance access independently of env value %s', async (value) => {
    vi.stubEnv('NEXT_PUBLIC_FINANCE_ENABLED', value)
    vi.resetModules()
    const { MODULE_REGISTRY, isModuleEnabled } = await import('./moduleRegistry')
    const finance = MODULE_REGISTRY.find((entry) => entry.id === 'finance')!
    const authorized = { ...repartidorAccess, permissions: [Permission.READ_CASHFLOW], gates: { ...repartidorAccess.gates, finance: true } }
    expect(isModuleEnabled(finance, authorized)).toBe(true)
    expect(isModuleEnabled(finance, { ...authorized, permissions: [] })).toBe(false)
    expect(isModuleEnabled(finance, { ...authorized, permissions: [], isAdmin: true })).toBe(true)
    expect(isModuleEnabled(finance, { ...authorized, status: SESSION_STATUS.HYDRATING })).toBe(false)
    expect(isModuleEnabled(finance, { ...authorized, gates: { ...authorized.gates, finance: false } })).toBe(false)
    expect(isModuleEnabled(finance, { ...authorized, isAdmin: true, gates: { ...authorized.gates, finance: false } })).toBe(false)
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

  it('enables Rutas only with its read permission', () => {
    const route = MODULE_REGISTRY.find((entry) => entry.id === 'route')

    expect(route).toBeDefined()
    expect(route).toMatchObject({ flag: null, gate: null, requiredPermissions: [Permission.READ_ROUTE_PLAN] })
    expect(isModuleEnabled(route!, repartidorAccess)).toBe(false)
    expect(isModuleEnabled(route!, { ...repartidorAccess, permissions: [Permission.READ_ROUTE_PLAN] })).toBe(true)
  })

  it('allows a verified administrator with empty grants without bypassing feature flags', () => {
    const route = MODULE_REGISTRY.find((entry) => entry.id === 'route')!
    const stock = MODULE_REGISTRY.find((entry) => entry.id === 'stock')!
    const admin = { ...repartidorAccess, isAdmin: true }

    expect(isModuleEnabled(route, admin)).toBe(true)
    expect(isModuleEnabled(stock, admin)).toBe(false)
    expect(isModuleEnabled(route, { ...admin, status: SESSION_STATUS.HYDRATING })).toBe(false)
  })

  it('enables Stock inteligente for any authenticated session without stock permissions', () => {
    const stock = MODULE_REGISTRY.find((entry) => entry.id === 'stock-smart')

    expect(stock).toBeDefined()
    expect(stock).toMatchObject({ href: '/stock-smart', flag: null, gate: null, requiredPermissions: [] })
    expect(isModuleEnabled(stock!, repartidorAccess)).toBe(true)
  })

  it('does not grant route navigation for an unrelated permission', () => {
    const route = MODULE_REGISTRY.find((entry) => entry.id === 'route')

    expect(route).toBeDefined()
    expect(isModuleEnabled(route!, { ...repartidorAccess, permissions: ['unrelated_permission'] })).toBe(false)
  })

  it('does not expose modules while the session is hydrating', () => {
    const home = MODULE_REGISTRY.find((entry) => entry.id === 'home')

    expect(home).toBeDefined()
    expect(isModuleEnabled(home!, { ...repartidorAccess, status: SESSION_STATUS.HYDRATING })).toBe(false)
  })
})
