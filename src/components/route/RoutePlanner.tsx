'use client'

import { useCallback, useEffect, useId, useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { routePlanService } from '@/services/routePlan.service'
import type { CandidateResult, DeliveryZone } from '@/interfaces/routePlan.interface'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StopList } from './StopList'
import { BlockedDestinations } from './BlockedDestinations'

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'
type ZoneStatus = 'loading' | 'ready' | 'error'

const CIVIL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/

/** True only for a real `YYYY-MM-DD` civil date, mirroring the backend schema. */
const isValidCivilDate = (value: string): boolean => {
  if (!CIVIL_DATE_PATTERN.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

/**
 * Candidate review panel (T-F.3).
 *
 * Read-only: the form collects a civil service date and an active delivery zone,
 * loads candidates on an explicit action and renders eligible and blocked
 * destinations. It never previews, saves or mutates plans.
 */
export function RoutePlanner() {
  const dateFieldId = useId()
  const zoneFieldId = useId()

  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [zoneStatus, setZoneStatus] = useState<ZoneStatus>('loading')
  const [serviceDate, setServiceDate] = useState('')
  const [deliveryZoneId, setDeliveryZoneId] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<CandidateResult | null>(null)
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('idle')
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadZones = useCallback(async () => {
    setZoneStatus('loading')
    try {
      const activeZones = await routePlanService.getActiveDeliveryZones()
      setZones(activeZones)
      setZoneStatus('ready')
    } catch {
      setZones([])
      setZoneStatus('error')
    }
  }, [])

  useEffect(() => {
    void loadZones()
  }, [loadZones])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setValidationError(null)

    if (!isValidCivilDate(serviceDate)) {
      setValidationError('Seleccioná una fecha de reparto válida.')
      return
    }

    if (!OBJECT_ID_PATTERN.test(deliveryZoneId)) {
      setValidationError('Seleccioná una zona de entrega.')
      return
    }

    setCandidates(null)
    setLoadError(null)
    setLoadStatus('loading')
    try {
      const result = await routePlanService.getCandidates({ serviceDate, deliveryZoneId })
      setCandidates(result)
      setLoadStatus('ready')
    } catch {
      setLoadError('No se pudieron cargar los candidatos. Intentá nuevamente.')
      setLoadStatus('error')
    }
  }

  const isLoading = loadStatus === 'loading'
  const isEmpty =
    candidates !== null && candidates.eligible.length === 0 && candidates.blocked.length === 0

  return (
    <section aria-labelledby="route-planner-title" className="flex flex-col gap-6">
      <div>
        <h2 id="route-planner-title" className="text-base font-semibold text-text-primary">
          Planificación de rutas
        </h2>
        <p className="mt-1 text-label text-text-secondary">
          Seleccioná una fecha y una zona para revisar los candidatos.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="rounded-lg border border-border-subtle bg-surface-base p-4 shadow-md md:p-6"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={dateFieldId}>Fecha de reparto</Label>
            <Input
              id={dateFieldId}
              name="serviceDate"
              type="date"
              value={serviceDate}
              disabled={isLoading}
              onChange={(event) => {
                setServiceDate(event.target.value)
                setValidationError(null)
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={zoneFieldId}>Zona de entrega</Label>
            <select
              id={zoneFieldId}
              name="deliveryZoneId"
              value={deliveryZoneId}
              disabled={zoneStatus !== 'ready' || isLoading}
              onChange={(event) => {
                setDeliveryZoneId(event.target.value)
                setValidationError(null)
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Seleccioná una zona</option>
              {zones.map((zone) => (
                <option key={zone._id} value={zone._id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {zoneStatus === 'loading' && (
          <p role="status" className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Cargando zonas…
          </p>
        )}

        {zoneStatus === 'error' && (
          <div
            role="alert"
            className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-state-error bg-background-subtle p-3 text-sm text-state-error"
          >
            <span>No se pudieron cargar las zonas de entrega.</span>
            <Button type="button" variant="secondary" size="sm" onClick={() => void loadZones()}>
              Reintentar
            </Button>
          </div>
        )}

        <div className="mt-4">
          <Button type="submit" disabled={isLoading || zoneStatus !== 'ready'}>
            {isLoading ? 'Cargando…' : 'Cargar candidatos'}
          </Button>
        </div>

        {validationError && (
          <p role="alert" className="mt-3 text-sm font-medium text-state-error">
            {validationError}
          </p>
        )}
      </form>

      {isLoading && (
        <div role="status" aria-live="polite" className="flex items-center gap-3 text-text-secondary">
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          <span>Cargando candidatos…</span>
        </div>
      )}

      {loadStatus === 'error' && loadError && (
        <div
          role="alert"
          className="rounded-lg border border-state-error bg-surface-base p-4 text-sm text-state-error shadow-md"
        >
          {loadError}
        </div>
      )}

      {loadStatus === 'ready' && isEmpty && (
        <p
          role="status"
          className="rounded-lg border border-border-subtle bg-surface-base p-4 text-sm text-text-secondary shadow-md"
        >
          No hay candidatos para la fecha y zona seleccionadas.
        </p>
      )}

      {loadStatus === 'ready' && candidates !== null && !isEmpty && (
        <div className="grid gap-4 lg:grid-cols-2">
          <StopList candidates={candidates.eligible} />
          <BlockedDestinations candidates={candidates.blocked} />
        </div>
      )}
    </section>
  )
}
