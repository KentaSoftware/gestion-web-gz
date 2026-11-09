'use client'

import { Suspense, useEffect } from 'react'
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
import { useSessionAccess } from '@/hooks/useSessionAccess'
import { Permission, SESSION_STATUS } from '@/interfaces/auth.interface'

// Survives a page unmount while the submitted request is still settling.
let routeSavePending = false

/**
 * Route planning page shell (T-F.1 / T-F.C1) with candidate review (T-F.3).
 *
 * Establishes the authenticated entry point for Optimización de Rutas. Preview,
 * map and saved plans belong to later work units; this page provides navigation,
 * the accessible page frame and the read-only candidate review panel.
 */
function RoutePlanningContent() {
  const access = useSessionAccess()
  const canCreate = access.status === SESSION_STATUS.READY &&
    access.permissions.includes(Permission.READ_ROUTE_PLAN) &&
    access.permissions.includes(Permission.CREATE_ROUTE_PLAN)
  const [plannerOpen, setPlannerOpen] = useState(false)
  const [dashboardRefreshToken, setDashboardRefreshToken] = useState(0)
  const [plannerDefaults, setPlannerDefaults] = useState({ serviceDate: '', deliveryZoneId: '' })

  useEffect(() => {
    if (!canCreate) setPlannerOpen(false)
  }, [canCreate])

  return (
    <PageContainer className="flex-1 min-h-0 w-full min-w-0">
      <RouteDashboard
        refreshToken={dashboardRefreshToken}
        onGenerateRoutes={(serviceDate, deliveryZoneId) => {
          if (!canCreate || routeSavePending) return
          setPlannerDefaults({ serviceDate, deliveryZoneId })
          setPlannerOpen(true)
        }}
      />
      <Dialog open={plannerOpen && canCreate} onOpenChange={(open) => { if (!routeSavePending) setPlannerOpen(open) }}>
         <DialogContent className="max-h-[calc(100vh-2rem)] max-w-[84rem] overflow-hidden">
          <DialogHeader>
           <DialogTitle>Generador de ruta optimizada</DialogTitle>
           <DialogDescription>
             Seleccioná clientes aptos, asigná los recursos y revisá el recorrido antes de guardar el plan.
            </DialogDescription>
          </DialogHeader>
          {plannerOpen && canCreate && (
            <RoutePlanner
              initialServiceDate={plannerDefaults.serviceDate}
              initialDeliveryZoneId={plannerDefaults.deliveryZoneId}
              onSavingChange={(pending) => { routeSavePending = pending }}
              onClose={() => setPlannerOpen(false)}
              onSaved={() => {
                setPlannerOpen(false)
                setDashboardRefreshToken((token) => token + 1)
              }}
            />
          )}
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
