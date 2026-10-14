import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route } from 'lucide-react'
import { SESSION_STATUS, type SessionAccess } from '@/interfaces/auth.interface'
import type { ModuleRegistryEntry } from '@/config/moduleRegistry'
import { REPARTIDOR_ACCESS, WITHOUT_ROUTE_READ_ACCESS } from '@/test/fixtures/sessionAccess'

const { refresh, useSessionAccess, isModuleEnabled } = vi.hoisted(() => ({
  refresh: vi.fn(),
  useSessionAccess: vi.fn(),
  isModuleEnabled: vi.fn(),
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))
vi.mock('@/hooks/useSessionAccess', () => ({ useSessionAccess }))
vi.mock('@/config/moduleRegistry', () => ({
  isModuleEnabled,
}))

import { ModuleGate } from './ModuleGate'

const entry: ModuleRegistryEntry = {
  id: 'route',
  href: '/route',
  label: 'Rutas',
  icon: Route,
  flag: null,
  gate: null,
  requiredPermissions: ['read_route_plan'],
}

const access = (status: SessionAccess['status'], gates: Readonly<Record<string, boolean>>): SessionAccess => ({
  status,
  permissions: ['read_route_plan'],
  gates,
})

describe('ModuleGate', () => {
  beforeEach(() => {
    isModuleEnabled.mockReturnValue(false)
    useSessionAccess.mockReturnValue(access(SESSION_STATUS.READY, {}))
  })

  it('announces loading while session access is hydrating', () => {
    useSessionAccess.mockReturnValue(access(SESSION_STATUS.HYDRATING, {}))

    render(<ModuleGate entry={entry}>Visible content</ModuleGate>)

    expect(screen.getByRole('status')).toHaveTextContent('Verificando el acceso a Rutas')
    expect(screen.queryByText('Visible content')).not.toBeInTheDocument()
  })

  it('renders a forbidden state when the module is enabled but permissions are absent', () => {
    render(<ModuleGate entry={entry}>Visible content</ModuleGate>)

    expect(screen.getByRole('alert')).toHaveTextContent('Acceso restringido')
  })

  it('allows the enabled Rutas module for the Repartidor fixture', () => {
    useSessionAccess.mockReturnValue(REPARTIDOR_ACCESS)
    isModuleEnabled.mockReturnValue(true)

    render(<ModuleGate entry={entry}>Visible content</ModuleGate>)

    expect(screen.getByText('Visible content')).toBeInTheDocument()
  })

  it('denies direct Rutas access without read_route_plan', () => {
    useSessionAccess.mockReturnValue(WITHOUT_ROUTE_READ_ACCESS)
    isModuleEnabled.mockReturnValue(false)

    render(<ModuleGate entry={entry}>Visible content</ModuleGate>)

    expect(screen.getByRole('alert')).toHaveTextContent('Acceso restringido')
    expect(screen.queryByText('Visible content')).not.toBeInTheDocument()
  })
})
