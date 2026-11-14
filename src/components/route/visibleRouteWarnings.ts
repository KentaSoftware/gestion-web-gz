import { ROUTE_PREVIEW_WARNING } from '@/interfaces/routePlan.interface'

export const isVisibleRouteWarning = (warning: string): boolean =>
  warning !== ROUTE_PREVIEW_WARNING.TIME_WINDOWS_NOT_CONSIDERED
