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
   */
  create: async (data: CreateExpenseDTO): Promise<Expense> => {
    const response = await apiClient.post<Expense>(EXPENSE_BASE_URL, data);
    return response.data;
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
   */
  getById: async (id: string): Promise<Expense> => {
    const response = await apiClient.get<Expense>(`${EXPENSE_BASE_URL}/${id}`);
    return response.data;
  },

  /**
   * Actualizar egreso (futuro)
   */
  update: async (id: string, data: Partial<CreateExpenseDTO>): Promise<Expense> => {
    const response = await apiClient.patch<Expense>(`${EXPENSE_BASE_URL}/${id}`, data);
    return response.data;
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
      count: typeof data.count === 'number' ? data.count : undefined,
      totalCents: data.totalCents,
      currency: data.currency || 'ARS',
      period: data.period,
    };
  },
};
