'use client'

import { Suspense } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Permission } from '@/interfaces/auth.interface'
import { PageContainer, PageHeader } from '@/components/layout/PageLayout'
import { Spinner } from '@/components/ui/spinner'

/**
 * Route planning page shell (T-F.1 / T-F.C1).
 *
 * Establishes the gated entry point for Optimización de Rutas. Candidate
 * fetching, preview and saved plans belong to later work units; this shell
 * only provides navigation, module gating and the accessible page frame.
 */
function RoutePlanningContent() {
  return (
    <PageContainer>
      <PageHeader
        title="Rutas"
        description="Planificación de rutas de reparto. Seleccioná una fecha y una zona para revisar los candidatos."
      />

      <section
        aria-labelledby="route-planning-status"
        className="rounded-lg border border-border-subtle bg-surface-base p-6 shadow-md"
      >
        <h2 id="route-planning-status" className="mb-2 text-base font-semibold text-text-primary">
          Planificación de rutas
        </h2>
        <p className="text-label text-text-secondary">
          La revisión de candidatos va a estar disponible en una próxima actualización.
        </p>
      </section>
    </PageContainer>
  )
}

export default function RouteScreen() {
  return (
    <ProtectedRoute
      requiredPermission={Permission.READ_ROUTE_PLAN}
      deniedMessage="No tienes permisos para ver la planificación de rutas. Contacta a tu administrador si necesitas acceso."
    >
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-background-canvas">
            <Spinner className="size-12 text-brand-primary" />
          </div>
        }
      >
        <RoutePlanningContent />
      </Suspense>
    </ProtectedRoute>
  )
}
