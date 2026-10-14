'use client'

import { useCallback, useEffect, useId, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { routePlanService } from '@/services/routePlan.service'
import type {
  CandidateEntry,
  CandidateResult,
  DeliveryZone,
  RouteAssignmentOptions,
  RoutePlan,
  RoutePreview as RoutePreviewData,
  RoutePreviewErrorResponse,
} from '@/interfaces/routePlan.interface'
import { routePlanErrorMessage } from '@/interfaces/routePlan.interface'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BlockedDestinations } from './BlockedDestinations'
import { RoutePreview, type RoutePreviewStatus } from './RoutePreview'

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'
type ZoneStatus = 'loading' | 'ready' | 'error'
type SaveStatus = 'idle' | 'saving' | 'error'

const CIVIL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/

/** True only for a real `YYYY-MM-DD` civil date, mirroring the backend schema. */
const isValidCivilDate = (value: string): boolean => {
  if (!CIVIL_DATE_PATTERN.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

/**
 * Reads the stable error envelope from a rejected preview request without
 * coupling the component to axios. Unknown shapes return null so the caller can
 * fall back to a generic retry message.
 */
const extractPreviewError = (error: unknown): RoutePreviewErrorResponse | null => {
  if (typeof error !== 'object' || error === null) return null
  const response = (error as { response?: { data?: unknown } }).response
  if (typeof response !== 'object' || response === null) return null
  const data = (response as { data?: unknown }).data
  if (typeof data !== 'object' || data === null) return null
  const code = (data as { code?: unknown }).code
  if (typeof code !== 'string') return null
  const message = (data as { message?: unknown }).message
  return { code, message: typeof message === 'string' ? message : code }
}

/**
 * Derives the saved-plan identifier from the backend response without assuming
 * the serialized shape. Unknown or empty identifiers return an empty string so
 * the caller can surface a visible error instead of navigating to `/route/`.
 */
const routePlanId = (plan: RoutePlan): string => {
  const id: unknown = plan._id
  if (typeof id === 'string') return id
  if (id !== null && typeof id === 'object' && typeof (id as { toString?: unknown }).toString === 'function') {
    return String(id)
  }
  return ''
}

/**
 * Route planner panel (T-F.3 candidate review, T-F.4 preview controls).
 *
 * Read the candidates for a civil date and active zone, select the eligible
 * sales to include, then request a deterministic preview. Selection is sent as
 * plain `saleIds`; grouping sales of the same client into one stop remains
 * backend behavior. Preview never mutates sales or persists plans.
 */
interface RoutePlannerProps {
  initialServiceDate?: string
  initialDeliveryZoneId?: string
}

export function RoutePlanner({ initialServiceDate = '', initialDeliveryZoneId = '' }: RoutePlannerProps = {}) {
  const dateFieldId = useId()
  const zoneFieldId = useId()
  const selectionFieldId = useId()

  const router = useRouter()

  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [assignmentOptions, setAssignmentOptions] = useState<RouteAssignmentOptions>({ drivers: [], vehicles: [] })
  const [driverId, setDriverId] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [zoneStatus, setZoneStatus] = useState<ZoneStatus>('loading')
  const [serviceDate, setServiceDate] = useState(initialServiceDate)
  const [deliveryZoneId, setDeliveryZoneId] = useState(initialDeliveryZoneId)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<CandidateResult | null>(null)
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('idle')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedSaleIds, setSelectedSaleIds] = useState<string[]>([])
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const [previewStatus, setPreviewStatus] = useState<RoutePreviewStatus>('idle')
  const [previewData, setPreviewData] = useState<RoutePreviewData | null>(null)
  const [previewErrorCode, setPreviewErrorCode] = useState<string | null>(null)
  const [previewErrorMessage, setPreviewErrorMessage] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveErrorCode, setSaveErrorCode] = useState<string | null>(null)
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null)

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
    void routePlanService.getAssignmentOptions().then(setAssignmentOptions).catch(() => setAssignmentOptions({ drivers: [], vehicles: [] }))
  }, [])

  useEffect(() => {
    void loadZones()
  }, [loadZones])

  const resetPreview = useCallback(() => {
    setSelectedSaleIds([])
    setSelectionError(null)
    setPreviewStatus('idle')
    setPreviewData(null)
    setPreviewErrorCode(null)
    setPreviewErrorMessage(null)
    setSaveStatus('idle')
    setSaveErrorCode(null)
    setSaveErrorMessage(null)
  }, [])

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

    resetPreview()
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

  const toggleSale = (saleId: string, checked: boolean) => {
    setSelectionError(null)
    setSelectedSaleIds((previous) => {
      if (checked) return previous.includes(saleId) ? previous : [...previous, saleId]
      return previous.filter((id) => id !== saleId)
    })
  }

  const selectAll = () => {
    setSelectionError(null)
    setSelectedSaleIds(candidates?.eligible.map((candidate) => candidate.saleId) ?? [])
  }

  const clearSelection = () => {
    setSelectionError(null)
    setSelectedSaleIds([])
  }

  const handlePreview = async () => {
    setSelectionError(null)
    setSaveStatus('idle')
    setSaveErrorCode(null)
    setSaveErrorMessage(null)

    if (selectedSaleIds.length === 0) {
      setSelectionError('Seleccioná al menos una parada para calcular el recorrido.')
      return
    }

    setPreviewData(null)
    setPreviewErrorCode(null)
    setPreviewErrorMessage(null)
    setPreviewStatus('loading')
    try {
       const result = await routePlanService.preview({ serviceDate, deliveryZoneId, saleIds: selectedSaleIds, driverId, vehicleId })
      setPreviewData(result)
      setPreviewStatus('ready')
    } catch (error) {
      const parsed = extractPreviewError(error)
      setPreviewErrorCode(parsed?.code ?? null)
      setPreviewErrorMessage(parsed?.message ?? null)
      setPreviewStatus('error')
    }
  }

  const handleSave = async () => {
    // Guard against duplicate submits: the button is disabled while saving and
    // the handler stays a no-op if it is somehow re-entered.
    if (saveStatus === 'saving') return

    setSelectionError(null)
    setSaveErrorCode(null)
    setSaveErrorMessage(null)

    if (previewData === null || selectedSaleIds.length === 0) {
      setSelectionError('Calculá un recorrido válido antes de guardar el plan.')
      return
    }

    setSaveStatus('saving')
    try {
       const saved = await routePlanService.save({ serviceDate, deliveryZoneId, saleIds: selectedSaleIds, driverId, vehicleId })
      const savedId = routePlanId(saved)
      if (savedId === '') {
        setSaveErrorMessage('No se pudo obtener el identificador del plan guardado.')
        setSaveStatus('error')
        return
      }
      router.push(`/route/${savedId}`)
    } catch (error) {
      const parsed = extractPreviewError(error)
      setSaveErrorCode(parsed?.code ?? null)
      setSaveErrorMessage(parsed?.message ?? null)
      setSaveStatus('error')
    }
  }

  const isLoading = loadStatus === 'loading'
  const isEmpty =
    candidates !== null && candidates.eligible.length === 0 && candidates.blocked.length === 0
  const allEligibleSelected =
    candidates !== null &&
    candidates.eligible.length > 0 &&
    selectedSaleIds.length === candidates.eligible.length
  const noneSelected = selectedSaleIds.length === 0
  const hasValidPreview = previewStatus === 'ready' && previewData !== null && selectedSaleIds.length > 0
  const isSaving = saveStatus === 'saving'
  const hasAssignments = driverId !== '' && vehicleId !== ''

  const eligibleCheckbox = (candidate: CandidateEntry) => {
    const checked = selectedSaleIds.includes(candidate.saleId)
    const name = candidate.displayName ?? candidate.saleId
    const id = `${selectionFieldId}-${candidate.saleId}`
    return (
      <li
        key={candidate.saleId}
        className="flex items-start gap-3 rounded-md border border-border-subtle bg-background-subtle p-3"
      >
        <Checkbox
          id={id}
          className="mt-0.5"
          checked={checked}
          aria-label={name}
          onCheckedChange={(value) => toggleSale(candidate.saleId, value === true)}
        />
        <Label htmlFor={id} className="flex flex-1 cursor-pointer flex-col items-start gap-0.5">
          <span className="text-sm font-medium text-text-primary">{name}</span>
          {candidate.addressSummary && (
            <span className="text-xs font-normal text-text-secondary">{candidate.addressSummary}</span>
          )}
        </Label>
      </li>
    )
  }

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
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <section
              aria-labelledby="eligible-destinations-title"
              className="rounded-lg border border-border-subtle bg-surface-base p-4 shadow-md"
            >
              <h3 id="eligible-destinations-title" className="text-sm font-semibold text-brand-primary">
                Destinos elegibles ({candidates.eligible.length})
              </h3>
              <p className="mt-1 text-xs text-text-secondary">
                Seleccioná las ventas a incluir en el recorrido. Las ventas del mismo cliente se agrupan en
                una sola parada.
              </p>
              <ul className="mt-3 flex flex-col gap-2" aria-label="Destinos elegibles">
                {candidates.eligible.map(eligibleCheckbox)}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={selectAll}
                  disabled={allEligibleSelected || candidates.eligible.length === 0}
                >
                  Seleccionar todo
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={clearSelection}
                  disabled={noneSelected}
                >
                  Limpiar selección
                </Button>
              </div>
            </section>

            <BlockedDestinations candidates={candidates.blocked} />
          </div>

          <div className="rounded-lg border border-border-subtle bg-surface-base p-4 shadow-md">
            <div className="flex flex-col gap-3">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2"><Label htmlFor="route-driver">Repartidor</Label><select id="route-driver" value={driverId} onChange={(event) => setDriverId(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-text-primary"><option value="">Seleccioná un repartidor</option>{assignmentOptions.drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.nickname}</option>)}</select></div>
                <div className="flex flex-col gap-2"><Label htmlFor="route-vehicle">Vehículo</Label><select id="route-vehicle" value={vehicleId} onChange={(event) => setVehicleId(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-text-primary"><option value="">Seleccioná un vehículo</option>{assignmentOptions.vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.code} · {vehicle.fuelConsumptionLitersPer100Km} L/100 km</option>)}</select></div>
              </div>
              {!hasAssignments && <p role="status" className="text-sm text-text-secondary">Seleccioná un repartidor y un vehículo para habilitar la planificación.</p>}
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" onClick={() => void handlePreview()} disabled={previewStatus === 'loading' || isSaving || !hasAssignments}>
                  Calcular recorrido
                </Button>
                {hasValidPreview && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void handleSave()}
                    disabled={isSaving || !hasAssignments}
                    aria-busy={isSaving}
                  >
                    Guardar plan
                  </Button>
                )}
                <p className="text-xs text-text-secondary">
                  Se seleccionaron {selectedSaleIds.length} de {candidates.eligible.length} ventas elegibles.
                </p>
              </div>
              {isSaving && (
                <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-text-secondary">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Guardando plan de ruta…
                </p>
              )}
              {saveStatus === 'error' && (
                <p role="alert" className="text-sm font-medium text-state-error">
                  {routePlanErrorMessage(saveErrorCode, saveErrorMessage ?? undefined)}
                </p>
              )}
              {selectionError && (
                <p role="alert" className="text-sm font-medium text-state-error">
                  {selectionError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <RoutePreview
        status={previewStatus}
        preview={previewData}
        errorCode={previewErrorCode}
        errorMessage={previewErrorMessage}
      />
    </section>
  )
}
