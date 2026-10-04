import {
  Home,
  Package,
  DollarSign,
  ClipboardList,
  Upload,
  CircleDollarSign,
  LineChart,
  Route,
  Boxes,
  Wallet,
  FlaskConical,
  type LucideIcon,
} from 'lucide-react'
import { Permission, SESSION_STATUS, type SessionAccess } from '@/interfaces/auth.interface'

/**
 * Declarative navigation registry.
 *
 * The registry is the single source of truth for which navigation entries a
 * session may see. It evaluates, in order: session hydration, module flag,
 * gate evidence and required permissions. Every Phase 0 module flag defaults
 * to `false` and only the literal env value `"true"` enables it, so no module
 * is reachable before its owner gate is approved.
 */

/** Feature flag keys for the Phase 0 modules. */
export const MODULE_FLAG = {
  ROUTE: 'route',
  STOCK: 'stock',
  FINANCE: 'finance',
  SIMULATION: 'simulation',
} as const

export type ModuleFlagKey = (typeof MODULE_FLAG)[keyof typeof MODULE_FLAG]

/** Gate evidence keys. Approval is external; nothing is approved in Phase 0. */
export const MODULE_GATE = {
  ROUTE: 'route',
  STOCK: 'stock',
  FINANCE: 'finance',
  SIMULATION: 'simulation',
} as const

export type ModuleGate = (typeof MODULE_GATE)[keyof typeof MODULE_GATE]

/** Strict parser: only the literal "true" enables a flag; anything else stays false. */
const parseEnabledFlag = (value: string | undefined): boolean => value === 'true'

/** Resolved module flags, read from public env vars at module load. Default false. */
export const MODULE_FLAGS: Readonly<Record<ModuleFlagKey, boolean>> = {
  [MODULE_FLAG.ROUTE]: parseEnabledFlag(process.env.NEXT_PUBLIC_ROUTE_ENABLED),
  [MODULE_FLAG.STOCK]: parseEnabledFlag(process.env.NEXT_PUBLIC_STOCK_ENABLED),
  [MODULE_FLAG.FINANCE]: parseEnabledFlag(process.env.NEXT_PUBLIC_FINANCE_ENABLED),
  [MODULE_FLAG.SIMULATION]: parseEnabledFlag(process.env.NEXT_PUBLIC_SIMULATION_ENABLED),
}

/** Gate evidence is approved outside the app; every gate starts unmet. */
export const DEFAULT_MODULE_GATES: Readonly<Record<string, boolean>> = {
  [MODULE_GATE.ROUTE]: false,
  [MODULE_GATE.STOCK]: false,
  [MODULE_GATE.FINANCE]: false,
  [MODULE_GATE.SIMULATION]: false,
}

/** Lazy loader attached by a module owner once its route exists. */
export type ModuleLoader = () => Promise<unknown>

export interface ModuleRegistryEntry {
  id: string
  href: string
  label: string
  icon: LucideIcon
  /** Module flag key, or null for legacy navigation that is not flag-gated. */
  flag: ModuleFlagKey | null
  requiredPermissions: string[]
  gate: ModuleGate | null
  /** Consumed by prefetch; omitted until the owning module ships its route. */
  load?: ModuleLoader
}

/**
 * Legacy navigation is always available (no flag/gate); the Phase 0 modules are
 * registered with a flag and a gate so they stay hidden while unapproved.
 * Permission requirements mirror the backend role grants.
 */
export const MODULE_REGISTRY: readonly ModuleRegistryEntry[] = [
  { id: 'home', href: '/home', label: 'Inicio', icon: Home, flag: null, requiredPermissions: [], gate: null },
  { id: 'product', href: '/product', label: 'Productos', icon: Package, flag: null, requiredPermissions: [], gate: null },
  { id: 'sale', href: '/sale', label: 'Ventas', icon: DollarSign, flag: null, requiredPermissions: [], gate: null },
  { id: 'buy', href: '/buy', label: 'Compras', icon: ClipboardList, flag: null, requiredPermissions: [], gate: null },
  { id: 'buy-smart-upload', href: '/buy/smart-upload', label: 'Carga inteligente', icon: Upload, flag: null, requiredPermissions: [], gate: null },
  { id: 'expense', href: '/expense', label: 'Egresos', icon: CircleDollarSign, flag: null, requiredPermissions: [], gate: null },
  { id: 'cashflow', href: '/cashflow', label: 'Flujo de caja', icon: LineChart, flag: null, requiredPermissions: [], gate: null },
  { id: 'route', href: '/route', label: 'Rutas', icon: Route, flag: MODULE_FLAG.ROUTE, requiredPermissions: [Permission.READ_ROUTE_PLAN], gate: MODULE_GATE.ROUTE },
  { id: 'stock', href: '/stock', label: 'Stock', icon: Boxes, flag: MODULE_FLAG.STOCK, requiredPermissions: [Permission.ADJUST_STOCK], gate: MODULE_GATE.STOCK },
  { id: 'finance', href: '/finance', label: 'Finanzas', icon: Wallet, flag: MODULE_FLAG.FINANCE, requiredPermissions: [Permission.REFUND_SALE], gate: MODULE_GATE.FINANCE },
  { id: 'simulation', href: '/simulation', label: 'Simulación', icon: FlaskConical, flag: MODULE_FLAG.SIMULATION, requiredPermissions: [], gate: MODULE_GATE.SIMULATION },
]

/**
 * Single source of truth for module availability.
 *
 * Returns `false` unless the session is hydrated, the entry flag is enabled
 * (or the entry is legacy), the gate is met and every required permission is
 * present. A `false` result is never a forbidden signal on its own: hydration
 * is distinguishable through {@link SessionAccess.status}, so callers must
 * render loading, not denial, while the session is hydrating.
 */
export const isModuleEnabled = (entry: ModuleRegistryEntry, access: SessionAccess): boolean => {
  if (access.status !== SESSION_STATUS.READY) {
    return false
  }

  if (entry.flag !== null && !MODULE_FLAGS[entry.flag]) {
    return false
  }

  if (entry.gate !== null && access.gates[entry.gate] !== true) {
    return false
  }

  if (entry.requiredPermissions.length > 0) {
    return entry.requiredPermissions.every((permission) => access.permissions.includes(permission))
  }

  return true
}
