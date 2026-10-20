/**
 * Utilidades para manejo de fechas en el Dashboard
 * Convierte intervalos del dashboard a rangos de fechas
 *
 * NOTE (P5): Dataset period labels are provided by the backend as `period.label`
 * in all `/dataset/*` responses. Do NOT add local label generation here for
 * dataset intervals. `getDateRangeFromInterval` serves only the expense KPI
 * endpoints that require explicit from/to date parameters.
 */

import { addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears, format } from 'date-fns'

export type IntervalType = 'DIARIO' | 'SEMANAL' | 'MENSUAL' | 'ANUAL' | 'CUSTOM'

/**
 * Convierte el intervalo del dashboard a rango de fechas
 * para los KPIs de egresos (EG09)
 */
export const getDateRangeFromInterval = (interval: IntervalType): { from: string; to: string } => {
  const today = new Date()
  let from: Date
  let to: Date = today

  switch (interval) {
    case 'DIARIO':
      // Hoy
      from = today
      to = today
      break

    case 'SEMANAL':
      // Esta semana (lunes a domingo)
      from = startOfWeek(today, { weekStartsOn: 1 }) // 1 = lunes
      to = endOfWeek(today, { weekStartsOn: 1 })
      break

    case 'MENSUAL':
      // Este mes
      from = startOfMonth(today)
      to = endOfMonth(today)
      break

    case 'ANUAL':
      // Este año
      from = startOfYear(today)
      to = endOfYear(today)
      break

    case 'CUSTOM':
      // Para custom, retornar mes actual por defecto
      // El componente padre debe manejar el rango personalizado
      from = startOfMonth(today)
      to = today
      break

    default:
      // Por defecto: mes actual
      from = startOfMonth(today)
      to = today
  }

  return {
    from: format(from, 'yyyy-MM-dd'),
    to: format(to, 'yyyy-MM-dd')
  }
}

/**
 * Formatea un rango de fechas personalizado
 */
export const formatCustomRange = (startDate: Date, endDate: Date): { from: string; to: string } => {
  return {
    from: format(startDate, 'yyyy-MM-dd'),
    to: format(endDate, 'yyyy-MM-dd')
  }
}

/**
 * Convierte intervalo a inglés (para compatibilidad con backend actual)
 */
export const translateIntervalToEnglish = (interval: string): string => {
  const map: { [key: string]: string } = {
    'DIARIO': 'daily',
    'SEMANAL': 'weekly',
    'MENSUAL': 'monthly',
    'ANUAL': 'yearly',
    'CUSTOM': 'custom'
  }
  return map[interval] || 'monthly'
}
