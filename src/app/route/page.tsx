'use client'

import { Suspense } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { PageContainer } from '@/components/layout/PageLayout'
import { Spinner } from '@/components/ui/spinner'
import { RoutePlanner } from '@/components/route/RoutePlanner'
import { RouteDashboard } from '@/components/route/RouteDashboard'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useState } from 'react'

/**
 * Route planning page shell (T-F.1 / T-F.C1) with candidate review (T-F.3).
 *
 * Establishes the authenticated entry point for Optimización de Rutas. Preview,
 * map and saved plans belong to later work units; this page provides navigation,
 * the accessible page frame and the read-only candidate review panel.
 */
function RoutePlanningContent() {
  const [plannerOpen, setPlannerOpen] = useState(false)
  const [plannerDefaults, setPlannerDefaults] = useState({ serviceDate: '', deliveryZoneId: '' })

  return (
    <PageContainer>
      <RouteDashboard
        onGenerateRoutes={(serviceDate, deliveryZoneId) => {
          setPlannerDefaults({ serviceDate, deliveryZoneId })
          setPlannerOpen(true)
        }}
      />
      <Dialog open={plannerOpen} onOpenChange={setPlannerOpen}>
        <DialogContent className="max-h-[calc(100vh-2rem)] max-w-5xl overflow-y-auto">
          <DialogHeader>
           <DialogTitle>Generador de ruta optimizada</DialogTitle>
           <DialogDescription>
             Seleccioná clientes aptos, asigná los recursos y revisá el recorrido antes de guardar el plan.
            </DialogDescription>
          </DialogHeader>
          {plannerOpen && <RoutePlanner initialServiceDate={plannerDefaults.serviceDate} initialDeliveryZoneId={plannerDefaults.deliveryZoneId} />}
        </DialogContent>
      </Dialog>
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
