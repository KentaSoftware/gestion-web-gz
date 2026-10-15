import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route } from 'lucide-react'
import { SESSION_STATUS, type SessionAccess } from '@/interfaces/auth.interface'
import type { RoutePlan } from '@/interfaces/routePlan.interface'

const { getById, preview, useParams, push, refresh, back, useSessionAccess, usePermission, isModuleEnabled, moduleFlags } =
  vi.hoisted(() => ({
    getById: vi.fn(),
    preview: vi.fn(),
    useParams: vi.fn(),
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    useSessionAccess: vi.fn(),
    usePermission: vi.fn(),
    isModuleEnabled: vi.fn(),
    moduleFlags: { route: true, finance: false, simulation: false } as Record<string, boolean>,
  }))

delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

const PLAN_ID = 'f'.repeat(24)

vi.mock('next/navigation', () => ({
  usePathname: () => `/route/${PLAN_ID}`,
  useParams: () => useParams(),
  useRouter: () => ({ push, refresh, back }),
}))
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))
vi.mock('@/hooks/useSessionAccess', () => ({ useSessionAccess }))
vi.mock('@/hooks/usePermission', () => ({ usePermission }))
vi.mock('@/config/moduleRegistry', () => ({
  MODULE_FLAGS: moduleFlags,
  isModuleEnabled,
  MODULE_REGISTRY: [
    {
      id: 'route',
      href: '/route',
      label: 'Rutas',
      icon: Route,
      flag: 'route',
       requiredPermissions: [],
      gate: 'route',
    },
  ],
}))
vi.mock('@/services/routePlan.service', () => ({
  routePlanService: { getById, preview },
}))

import RoutePlanDetailScreen from './page'

const access = (overrides: Partial<SessionAccess> = {}): SessionAccess => ({
  status: SESSION_STATUS.READY,
  permissions: [],
  gates: { route: true, finance: false, simulation: false },
  ...overrides,
})

const SNAPSHOT: RoutePlan = {
  _id: PLAN_ID,
  snapshotVersion: 1,
  planningDate: '2026-10-04T03:00:00.000Z',
  zoneSnapshot: { code: 'NORTE', normalizedName: 'zona norte', name: 'Zona Norte' },
  selectedSaleIds: ['sale-1'],
  depot: { name: 'Depósito Central', address: 'Av. Central 123', latitude: -34.6, longitude: -58.4 },
  stops: [{ clientId: 'client-1', saleIds: ['sale-1'], sequence: 1, latitude: -34.61, longitude: -58.41 }],
  segments: [
    { fromStopSequence: 0, toStopSequence: 1, distanceMeters: 3500, durationSeconds: 900 },
    { fromStopSequence: 1, toStopSequence: 0, distanceMeters: 3500, durationSeconds: 900 },
  ],
  metrics: { distanceMeters: 3500, durationSeconds: 900, stopCount: 1, fuelLiters: 0.3 },
  algorithm: { name: 'nearest-neighbor-2opt-v1', version: 'nearest-neighbor-2opt-v1', provider: 'google-routes' },
  routingConfigRevision: 3,
  ruleVersion: 'candidate-eligibility-v1',
  encodedPolyline: 'encoded-polyline',
  warnings: ['TIME_WINDOWS_NOT_CONSIDERED'],
  audit: { createdBy: 'user-1', createdAt: '2026-10-04T03:05:00.000Z' },
  createdAt: '2026-10-04T03:05:00.000Z',
}

describe('RoutePlanDetailScreen', () => {
  beforeEach(() => {
    getById.mockReset()
    preview.mockReset()
    useParams.mockReset()
    push.mockReset()
    isModuleEnabled.mockReturnValue(true)
    useSessionAccess.mockReturnValue(access())
    usePermission.mockReturnValue({ hasPermission: () => true, hasAnyPermission: () => true })
    useParams.mockReturnValue({ id: PLAN_ID })
  })

  it('announces loading while the saved plan is fetched', () => {
    getById.mockReturnValue(new Promise(() => undefined))

    render(<RoutePlanDetailScreen />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando plan de ruta')
  })

  it('opens saved plan detail without route-specific permissions', async () => {
    getById.mockResolvedValue(SNAPSHOT)
    useSessionAccess.mockReturnValue(access({ permissions: [] }))
    usePermission.mockReturnValue({ hasPermission: () => false, hasAnyPermission: () => false })

    render(<RoutePlanDetailScreen />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Plan de ruta guardado' })).toBeInTheDocument()
  })

  it('renders the saved snapshot and never calls the preview or provider', async () => {
    getById.mockResolvedValue(SNAPSHOT)

    render(<RoutePlanDetailScreen />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Plan de ruta guardado' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Detalle del recorrido' })).toBeInTheDocument()
    expect(getById).toHaveBeenCalledWith(PLAN_ID)
    expect(preview).not.toHaveBeenCalled()
  })

  it('renders a not-found state for a missing plan', async () => {
    getById.mockRejectedValue({ response: { status: 404, data: { code: 'ROUTE_PLAN_NOT_FOUND' } } })

    render(<RoutePlanDetailScreen />)

    expect(await screen.findByRole('alert')).toHaveTextContent('No encontramos el plan de ruta guardado')
    expect(screen.getByRole('link', { name: /Volver a la planificación/ })).toHaveAttribute('href', '/route')
  })

  it('renders an error state for an unexpected failure', async () => {
    getById.mockRejectedValue({ response: { status: 500, data: { code: 'INTERNAL_ERROR' } } })

    render(<RoutePlanDetailScreen />)

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el plan de ruta')
  })

  it('rejects an invalid identifier without calling the service', async () => {
    useParams.mockReturnValue({ id: 'not-an-object-id' })

    render(<RoutePlanDetailScreen />)

    expect(await screen.findByRole('alert')).toHaveTextContent('identificador del plan de ruta no es válido')
    expect(getById).not.toHaveBeenCalled()
  })

  it('provides a clear back link to the route planner', async () => {
    getById.mockResolvedValue(SNAPSHOT)

    render(<RoutePlanDetailScreen />)

    await waitFor(() => expect(getById).toHaveBeenCalled())
    expect(screen.getByRole('link', { name: /Volver a la planificación/ })).toHaveAttribute('href', '/route')
  })
})
