'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'

interface HomeErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function HomeError({ reset }: HomeErrorProps) {
  return (
    <main className="flex min-h-full w-full flex-1 items-center justify-center bg-background-canvas py-4 md:py-6">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5 px-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[color:color-mix(in_oklab,var(--color-state-error)_12%,white)]">
          <AlertTriangle className="h-8 w-8 text-state-error" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-text-primary">Algo salió mal</h1>
          <p className="text-sm leading-6 text-text-muted">
            No se pudo cargar el panel de control. Esto puede deberse a un error
            temporal de conexión o del servidor.
          </p>
        </div>

        <button
          onClick={reset}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border-none bg-brand-primary px-5 py-2.5 text-sm font-semibold text-text-inverse transition-colors hover:bg-brand-primary-hover focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2"
        >
          <RefreshCw size={16} aria-hidden="true" />
          Reintentar
        </button>
      </div>
    </main>
  )
}
