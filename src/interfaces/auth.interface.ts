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
}
