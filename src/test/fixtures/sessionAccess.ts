import { Permission, SESSION_STATUS, type SessionAccess } from '@/interfaces/auth.interface'

/** Repartidor can read the enabled route module but has no mutating permissions. */
export const REPARTIDOR_ACCESS: SessionAccess = {
  status: SESSION_STATUS.READY,
  permissions: [Permission.READ_ROUTE_PLAN],
  gates: {
    route: true,
    stock: false,
    finance: false,
    simulation: false,
  },
}

/** A ready session that has no access to the enabled route module. */
export const WITHOUT_ROUTE_READ_ACCESS: SessionAccess = {
  ...REPARTIDOR_ACCESS,
  permissions: [],
}
