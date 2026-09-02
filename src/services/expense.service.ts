import apiClient from '@/utils/client';
import { 
  CreateExpenseDTO, 
  Expense, 
  ExpenseListResponse,
  ExpenseLegacyListResponse,
  ListExpensesParams,
  ExpenseKPIResponse,
  ExpenseType
} from '@/interfaces/expense.interface';

const EXPENSE_BASE_URL = '/expense';

export const expenseService = {
  /**
   * Crear un nuevo egreso
   * Backend may return { expense: {...} } wrapper or the object directly.
   */
  create: async (data: CreateExpenseDTO): Promise<Expense> => {
    const response = await apiClient.post<any>(EXPENSE_BASE_URL, data);
    return response.data.expense ?? response.data;
  },

  /**
   * Obtener listado de egresos con paginación y filtros (NUEVO - EG04)
   */
  list: async (params: ListExpensesParams): Promise<ExpenseListResponse> => {
    const response = await apiClient.get<ExpenseListResponse>(EXPENSE_BASE_URL, { params });
    return response.data;
  },

  /**
   * Obtener listado de egresos con paginación y filtros (LEGACY - mantener compatibilidad)
   */
  getAll: async (params?: { skip?: number; limit?: number; filters?: any }): Promise<ExpenseLegacyListResponse> => {
    const response = await apiClient.get<ExpenseLegacyListResponse>(EXPENSE_BASE_URL, { params });
    return response.data;
  },

  /**
   * Obtener egreso por ID
   * Backend may return { expense: {...}, permissions?: {...} } wrapper or the object directly.
   */
  getById: async (id: string): Promise<Expense> => {
    const response = await apiClient.get<any>(`${EXPENSE_BASE_URL}/${id}`);
    return response.data.expense ?? response.data;
  },

  /**
   * Actualizar egreso
   * Backend may return { expense: {...} } wrapper or the object directly.
   */
  update: async (id: string, data: Partial<CreateExpenseDTO>): Promise<Expense> => {
    const response = await apiClient.patch<any>(`${EXPENSE_BASE_URL}/${id}`, data);
    return response.data.expense ?? response.data;
  },

  /**
   * Eliminar egreso (soft delete)
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${EXPENSE_BASE_URL}/${id}`);
  },

  /**
   * Obtener KPI de egresos para Dashboard (EG09)
   * Endpoint: GET /expense/kpi/total
   */
  getKPITotal: async (params: ListExpensesParams): Promise<ExpenseKPIResponse> => {
    const response = await apiClient.get<any>(`${EXPENSE_BASE_URL}/kpi/total`, { params });
    // Manejar respuesta con wrapper o directa
    const data = response.data.expense || response.data;
    return {
      total: data.total || (data.totalCents ? data.totalCents / 100 : 0),
      count: data.count || 0,
      totalCents: data.totalCents,
      currency: data.currency || 'ARS',
      period: data.period,
    };
  },
};
