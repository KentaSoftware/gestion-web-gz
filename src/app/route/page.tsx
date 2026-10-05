'use client'

import { Suspense } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Permission } from '@/interfaces/auth.interface'
import { PageContainer, PageHeader } from '@/components/layout/PageLayout'
import { Spinner } from '@/components/ui/spinner'
import { RoutePlanner } from '@/components/route/RoutePlanner'

/**
 * Route planning page shell (T-F.1 / T-F.C1) with candidate review (T-F.3).
 *
 * Establishes the gated entry point for Optimización de Rutas. Preview, map and
 * saved plans belong to later work units; this page provides navigation, module
 * gating, the accessible page frame and the read-only candidate review panel.
 */
function RoutePlanningContent() {
  return (
    <PageContainer>
      <PageHeader
        title="Rutas"
        description="Planificación de rutas de reparto. Seleccioná una fecha y una zona para revisar los candidatos."
      />

      <RoutePlanner />
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
