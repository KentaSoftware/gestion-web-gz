'use client'

import { AlertTriangle, LockKeyhole, RefreshCw } from 'lucide-react'

const MODULE_ACCESS_STATE = {
  LOADING: 'loading',
  FORBIDDEN: 'forbidden',
  UNAVAILABLE: 'unavailable',
} as const

export type ModuleAccessState = (typeof MODULE_ACCESS_STATE)[keyof typeof MODULE_ACCESS_STATE]

interface ModuleGateStateProps {
  state: ModuleAccessState
  moduleLabel: string
  onRetry?: () => void
}

export const ModuleGateState = ({ state, moduleLabel, onRetry }: ModuleGateStateProps) => {
  if (state === MODULE_ACCESS_STATE.LOADING) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8" aria-busy="true" aria-live="polite">
        <div className="flex items-center gap-3 text-text-secondary" role="status">
          <RefreshCw className="size-5 animate-spin" aria-hidden="true" />
          <span>Verificando el acceso a {moduleLabel}…</span>
        </div>
      </main>
    )
  }

  const forbidden = state === MODULE_ACCESS_STATE.FORBIDDEN
  const Icon = forbidden ? LockKeyhole : AlertTriangle
  const title = forbidden ? 'Acceso restringido' : 'Módulo no disponible'
  const message = forbidden
    ? `No tenés permisos para acceder a ${moduleLabel}.`
    : `${moduleLabel} no está disponible para esta cuenta.`

  return (
    <main className="flex min-h-screen items-center justify-center p-8" role="alert" aria-live="assertive">
      <section className="w-full max-w-md rounded-lg bg-surface-base p-8 text-center shadow-md">
        <Icon className="mx-auto size-12 text-state-error" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold text-text-primary">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-text-secondary">{message}</p>
        {onRetry && (
          <button
            type="button"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-text-inverse transition-colors hover:bg-brand-primary-hover"
            onClick={onRetry}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Reintentar
          </button>
        )}
      </section>
    </main>
  )
}

export { MODULE_ACCESS_STATE }
