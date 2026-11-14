import { Types } from 'mongoose';

/**
 * Enums del backend
 */
export enum ExpenseType {
  OPERATIVO = 'operativo',
  PERSONAL = 'personal',
  OTRO_NEGOCIO = 'otro_negocio',
}

export enum PaymentMethod {
  EFECTIVO = 'efectivo',
  TRANSFERENCIA = 'transferencia',
  TARJETA = 'tarjeta',
  CHEQUE = 'cheque',
  OTRO = 'otro',
}

/**
 * Usuario simplificado (populated)
 */
export interface ExpenseUser {
  _id: string;
  name: string;
  email: string;
}

/**
 * DTO para crear un egreso (payload del POST)
 */
export interface CreateExpenseDTO {
  date: string;              // Formato: YYYY-MM-DD
  amount: number;            // En pesos (se convertirá a centavos en backend)
  category: string;          // String libre (MVP)
  /** Optional — CUR-5 finance modal omits these; legacy /expense form still sends them. */
  type?: ExpenseType;
  paymentMethod?: PaymentMethod;
  comprobante?: string;
  description?: string;      // Opcional
}

/**
 * Modelo completo de egreso (response del backend)
 */
export interface Expense {
  _id: Types.ObjectId | string;
  date: string;
  amount: number;            // En pesos (convertido desde amountCents)
  amountCents: number;       // Valor interno en centavos (backend)
  category: string;
  type: ExpenseType;
  paymentMethod: PaymentMethod;
  description?: string;
  createdBy: ExpenseUser | Types.ObjectId | string; // Populated o ID
  createdAt: string;         // ISO timestamp
  updatedAt: string;
  updatedBy?: ExpenseUser | Types.ObjectId | string; // Populated o ID (opcional)
  isDeleted: boolean;        // Soft delete flag
  deletedAt?: string;
  deletedBy?: ExpenseUser | Types.ObjectId | string;
}

/**
 * Metadata de paginación
 */
export interface PaginationMetadata {
  total: number;      // Total de ítems que cumplen filtros
  page: number;       // Página actual
  limit: number;      // Ítems por página
  pages: number;      // Total de páginas
}

/**
 * Permisos del usuario en el listado
 */
export interface ExpensePermissions {
  canEdit: boolean;
  canDelete: boolean;
}

/**
 * Parámetros para listar egresos
 */
export interface ListExpensesParams {
  page?: number;
  limit?: number;
  from?: string;           // YYYY-MM-DD
  to?: string;             // YYYY-MM-DD
  type?: ExpenseType | '';
  category?: string;
  paymentMethod?: PaymentMethod | '';
  search?: string;
  sort?: string;
}

/**
 * Response del listado paginado (actualizado)
 */
export interface ExpenseListResponse {
  expenses: Expense[];
  pagination: PaginationMetadata;
  permissions: ExpensePermissions;
}

/**
 * Response del listado paginado (legacy - mantener compatibilidad)
 */
export interface ExpenseLegacyListResponse {
  expenses: Expense[];
  total: number;
  skip: number;
  limit: number;
}

/**
 * KPI Dashboard (EG09)
 */
export interface ExpenseKPIParams {
  from: string;      // YYYY-MM-DD
  to: string;        // YYYY-MM-DD
  type?: ExpenseType | ''; // Opcional (vacío = todos)
}

export interface ExpenseKPIResponse {
  total: number;           // Monto total en pesos
  totalCents?: number;     // Monto en centavos (si backend usa)
  count?: number;          // Cantidad de egresos
  currency?: string;       // 'ARS'
  period?: {
    from: string;
    to: string;
  };
}

/**
 * Estado del formulario (local)
 */
export interface ExpenseFormData {
  date: string;
  amount: string;            // String en formulario para manejo de decimales
  category: string;
  type: ExpenseType | '';
  paymentMethod: PaymentMethod | '';
  description: string;
}

/**
 * Errores de validación
 */
export interface ExpenseFormErrors {
  date?: string;
  amount?: string;
  category?: string;
  type?: string;
  paymentMethod?: string;
  description?: string;
}
