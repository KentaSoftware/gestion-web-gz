'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Permission } from '@/interfaces/auth.interface'
import { PageContainer, PageHeader } from '@/components/layout/PageLayout'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { routePlanService } from '@/services/routePlan.service'
import { routePlanErrorMessage, type RoutePlan } from '@/interfaces/routePlan.interface'
import { RouteSnapshot } from '@/components/route/RouteSnapshot'

type DetailStatus = 'loading' | 'invalid' | 'not-found' | 'error' | 'ready'

const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/

interface SnapshotError {
  code: string | null
  message: string | null
  notFound: boolean
}

/**
 * Reads the stable error envelope from a rejected snapshot request without
 * coupling the component to axios. Unknown shapes yield no code so the caller
 * falls back to a generic message.
 */
const extractSnapshotError = (error: unknown): SnapshotError => {
  const empty: SnapshotError = { code: null, message: null, notFound: false }
  if (typeof error !== 'object' || error === null) return empty
  const response = (error as { response?: { status?: unknown; data?: unknown } }).response
  if (typeof response !== 'object' || response === null) return empty
  const status = (response as { status?: unknown }).status
  const data = (response as { data?: unknown }).data
  const code = typeof data === 'object' && data !== null ? (data as { code?: unknown }).code : undefined
  const message = typeof data === 'object' && data !== null ? (data as { message?: unknown }).message : undefined
  const normalizedCode = typeof code === 'string' ? code : null
  return {
    code: normalizedCode,
    message: typeof message === 'string' ? message : null,
    notFound: status === 404 || normalizedCode === 'ROUTE_PLAN_NOT_FOUND',
  }
}

const BackToPlanner = () => (
  <Button asChild variant="secondary">
    <Link href="/route">Volver a la planificación</Link>
  </Button>
)

/**
 * Saved route-plan detail (T-F.6).
 *
 * Reads one immutable snapshot by identifier and renders it exactly as stored.
 * Access is gated by the existing `ProtectedRoute` path-prefix behavior for
 * `/route`, which requires `read_route_plan`. The page only calls `getById`: it
 * never recalculates a preview nor calls the routing provider, so a saved plan
 * stays viewable when providers are unavailable.
 */
function RoutePlanDetailContent() {
  const params = useParams()
  const rawId = params?.id
  const routePlanId = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] ?? '' : ''

  const [status, setStatus] = useState<DetailStatus>('loading')
  const [snapshot, setSnapshot] = useState<RoutePlan | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadPlan = useCallback(async () => {
    if (!OBJECT_ID_PATTERN.test(routePlanId)) {
      setSnapshot(null)
      setStatus('invalid')
      return
    }

    setStatus('loading')
    setSnapshot(null)
    setErrorCode(null)
    setErrorMessage(null)

    try {
      const plan = await routePlanService.getById(routePlanId)
      setSnapshot(plan)
      setStatus('ready')
    } catch (error) {
      const parsed = extractSnapshotError(error)
      if (parsed.notFound) {
        setStatus('not-found')
        return
      }
      setErrorCode(parsed.code)
      setErrorMessage(parsed.message)
      setStatus('error')
    }
  }, [routePlanId])

  useEffect(() => {
    void loadPlan()
  }, [loadPlan])

  return (
    <PageContainer>
      <PageHeader
        title="Plan de ruta guardado"
        description="Plan inmutable con su recorrido, métricas y advertencias. No se recalcula."
        actions={<BackToPlanner />}
      />

      {status === 'loading' && (
        <p role="status" aria-live="polite" className="flex items-center gap-3 text-text-secondary">
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          <span>Cargando plan de ruta…</span>
        </p>
      )}

      {status === 'invalid' && (
        <div
          role="alert"
          className="rounded-lg border border-state-error bg-surface-base p-4 text-sm text-state-error shadow-md"
        >
          El identificador del plan de ruta no es válido.
        </div>
      )}

      {status === 'not-found' && (
        <div
          role="alert"
          className="rounded-lg border border-state-error bg-surface-base p-4 text-sm text-state-error shadow-md"
        >
          No encontramos el plan de ruta guardado.
        </div>
      )}

      {status === 'error' && (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-lg border border-state-error bg-surface-base p-4 text-sm text-state-error shadow-md"
        >
          <span>
            {routePlanErrorMessage(errorCode, errorMessage ?? 'No se pudo cargar el plan de ruta. Intentá nuevamente.')}
          </span>
          <Button type="button" variant="secondary" size="sm" onClick={() => void loadPlan()}>
            Reintentar
          </Button>
        </div>
      )}

      {status === 'ready' && snapshot !== null && <RouteSnapshot snapshot={snapshot} />}
    </PageContainer>
  )
}

export default function RoutePlanDetailScreen() {
  return (
    <ProtectedRoute
      requiredPermission={Permission.READ_ROUTE_PLAN}
      deniedMessage="No tienes permisos para ver los planes de ruta. Contacta a tu administrador si necesitas acceso."
    >
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-background-canvas">
            <Spinner className="size-12 text-brand-primary" />
          </div>
        }
      >
        <RoutePlanDetailContent />
      </Suspense>
    </ProtectedRoute>
  )
}
