'use client'

import { Suspense } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { PageContainer, PageHeader } from '@/components/layout/PageLayout'
import { Spinner } from '@/components/ui/spinner'
import { RoutePlanner } from '@/components/route/RoutePlanner'
import { RouteDashboard } from '@/components/route/RouteDashboard'

/**
 * Route planning page shell (T-F.1 / T-F.C1) with candidate review (T-F.3).
 *
 * Establishes the authenticated entry point for Optimización de Rutas. Preview,
 * map and saved plans belong to later work units; this page provides navigation,
 * the accessible page frame and the read-only candidate review panel.
 */
function RoutePlanningContent() {
  return (
    <PageContainer>
      <PageHeader title="Rutas" description="Panel operativo de optimización y planificación de rutas de reparto." />

      <RouteDashboard />
      <RoutePlanner />
    </PageContainer>
  )
}

export default function RouteScreen() {
  return (
    <ProtectedRoute>
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
