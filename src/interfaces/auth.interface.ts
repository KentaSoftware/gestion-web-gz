export interface Auth {
  nickname: string
  password: string
}

export interface Role {
  _id: string
  name: string
  permissions: string[]
}

export interface UserWithToken {
  token: string
  nickname: string
  id?: string
  email?: string
  role?: Role
}

// Permisos disponibles en el sistema (según backend)
export enum Permission {
  // Egresos
  CREATE_EXPENSE = 'create_expense',
  READ_EXPENSE = 'read_expense',
  UPDATE_EXPENSE = 'update_expense',
  DELETE_EXPENSE = 'delete_expense',
  
  // Usuarios (para futuras expansiones)
  CREATE_USER = 'create_user',
  READ_USER = 'read_user',
  UPDATE_USER = 'update_user',
  DELETE_USER = 'delete_user',

  // Cash Flow
  READ_CASHFLOW = 'read_cashflow',
  CONFIGURE_CASHFLOW = 'configure_cashflow',

  // Transversal commercial contracts (aligned with backend role grants)
  CONFIRM_SALE_PAYMENT = 'confirm_sale_payment',
  REFUND_SALE = 'refund_sale',
  CONFIRM_PURCHASE_PAYMENT = 'confirm_purchase_payment',
  RECEIVE_PURCHASE = 'receive_purchase',
  ADJUST_STOCK = 'adjust_stock',
  READ_ROUTE_PLAN = 'read_route_plan',
}

/** Session access states. Hydration must never be treated as denied. */
export const SESSION_STATUS = {
  HYDRATING: 'hydrating',
  READY: 'ready',
  ANONYMOUS: 'anonymous',
} as const

export type SessionStatus = (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS]

export interface SessionAccess {
  /** Whether permissions are still hydrating, resolved, or absent. */
  status: SessionStatus
  /** Permissions granted to the current session. Empty until hydrated. */
  permissions: string[]
  /** Gate evidence per module key. All gates start unmet. */
  gates: Readonly<Record<string, boolean>>
}
