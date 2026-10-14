'use client'

import { useCallback, useEffect, useId, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { routePlanService } from '@/services/routePlan.service'
import type {
  CandidateEntry,
  CandidateResult,
  BlockedCandidateEntry,
  CandidateBlockReason,
  DeliveryZone,
  RouteAssignmentOptions,
  RoutePlan,
  RoutePreview as RoutePreviewData,
  RoutePreviewErrorResponse,
} from '@/interfaces/routePlan.interface'
import { CANDIDATE_BLOCK_REASON_LABEL, routePlanErrorMessage } from '@/interfaces/routePlan.interface'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RoutePreview, type RoutePreviewStatus } from './RoutePreview'

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'
type ZoneStatus = 'loading' | 'ready' | 'error'
type SaveStatus = 'idle' | 'saving' | 'error'

const CIVIL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/
const PENDING_CLIENT_PAGE_SIZE = 8

interface CandidateGroup {
  key: string
  clientId?: string
  displayName: string
  addressSummary?: string
  eligible: CandidateEntry[]
  blocked: CandidateEntry[]
  reasons: CandidateBlockReason[]
  zoneMismatch: boolean
}

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
  onClose?: () => void
}

export function RoutePlanner({ initialServiceDate = '', initialDeliveryZoneId = '', onClose }: RoutePlannerProps = {}) {
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
  const [pendingClientPage, setPendingClientPage] = useState(1)
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const [previewStatus, setPreviewStatus] = useState<RoutePreviewStatus>('idle')
  const [previewData, setPreviewData] = useState<RoutePreviewData | null>(null)
  const [previewErrorCode, setPreviewErrorCode] = useState<string | null>(null)
  const [previewErrorMessage, setPreviewErrorMessage] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveErrorCode, setSaveErrorCode] = useState<string | null>(null)
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null)

  const initialScopeIsValid = isValidCivilDate(initialServiceDate) && OBJECT_ID_PATTERN.test(initialDeliveryZoneId)

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
    await loadCandidates()
  }

  const loadCandidates = useCallback(async () => {
    setValidationError(null)

    if (!isValidCivilDate(serviceDate)) {
      setValidationError('Seleccioná una fecha de reparto válida.')
      return false
    }

    if (!OBJECT_ID_PATTERN.test(deliveryZoneId)) {
      setValidationError('Seleccioná una zona de entrega.')
      return false
    }

    resetPreview()
    setCandidates(null)
    setLoadError(null)
    setLoadStatus('loading')
    try {
      const result = await routePlanService.getCandidates({ serviceDate, deliveryZoneId })
      if (result === undefined) throw new Error('Candidates response was empty')
      setCandidates(result)
      setLoadStatus('ready')
      return true
    } catch {
      setLoadError('No se pudieron cargar los candidatos. Intentá nuevamente.')
      setLoadStatus('error')
      return false
    }
  }, [deliveryZoneId, resetPreview, serviceDate])

  useEffect(() => {
    setPendingClientPage(1)
  }, [candidates])

  useEffect(() => {
    if (!initialScopeIsValid) return
    void loadCandidates()
  }, [initialScopeIsValid, loadCandidates])

  const candidateGroups = (result: CandidateResult | null): CandidateGroup[] => {
    if (result === null) return []
    const groups = new Map<string, CandidateGroup>()
    const add = (candidate: CandidateEntry | BlockedCandidateEntry, blocked: boolean) => {
      const fallback = `missing:${candidate.displayName ?? 'cliente'}:${candidate.addressSummary ?? candidate.saleId}`
      const key = candidate.clientId !== undefined && candidate.clientId !== '' ? candidate.clientId : fallback
      const current = groups.get(key) ?? {
        key,
        clientId: candidate.clientId,
        displayName: candidate.displayName ?? 'Cliente sin identificar',
        addressSummary: candidate.addressSummary,
        eligible: [],
        blocked: [],
        reasons: [],
        zoneMismatch: false,
      }
      if (blocked) {
        current.blocked.push(candidate)
        const reasons = 'reasons' in candidate ? candidate.reasons : []
        current.reasons = Array.from(new Set<CandidateBlockReason>([...current.reasons, ...reasons]))
        current.zoneMismatch = current.zoneMismatch || reasons.includes('CLIENT_ZONE_MISMATCH')
      } else current.eligible.push(candidate)
      groups.set(key, current)
    }
    result.eligible.forEach((candidate) => add(candidate, false))
    result.blocked.forEach((candidate) => add(candidate, true))
    return Array.from(groups.values())
  }

  const toggleClient = (group: CandidateGroup, checked: boolean) => {
    setSelectionError(null)
    setSelectedSaleIds((previous) => {
      const saleIds = group.eligible.map((candidate) => candidate.saleId)
      if (checked) return Array.from(new Set<string>([...previous, ...saleIds]))
      return previous.filter((id) => !saleIds.includes(id))
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

    const selectedClientCount = candidateGroups(candidates).filter((group) =>
      group.eligible.some((candidate) => selectedSaleIds.includes(candidate.saleId))
    ).length
    if (selectedClientCount < 2) {
      setSelectionError('Seleccioná al menos dos clientes elegibles para calcular el recorrido.')
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
  const groups = candidateGroups(candidates)
  const eligibleGroups = groups.filter((group) => group.eligible.length > 0)
  const pendingClientPageCount = Math.max(1, Math.ceil(groups.length / PENDING_CLIENT_PAGE_SIZE))
  const visibleGroups = groups.slice(
    (pendingClientPage - 1) * PENDING_CLIENT_PAGE_SIZE,
    pendingClientPage * PENDING_CLIENT_PAGE_SIZE,
  )
  const selectedClientCount = eligibleGroups.filter((group) => group.eligible.some((candidate) => selectedSaleIds.includes(candidate.saleId))).length
  const allEligibleSelected =
    candidates !== null &&
    candidates.eligible.length > 0 &&
    selectedSaleIds.length === candidates.eligible.length
  const noneSelected = selectedSaleIds.length === 0
  const hasValidPreview = previewStatus === 'ready' && previewData !== null && selectedSaleIds.length > 0
  const isSaving = saveStatus === 'saving'
  const hasAssignments = driverId !== '' && vehicleId !== ''
  const canPreview = hasAssignments && selectedClientCount >= 2
  const selectedZoneName = zones.find((zone) => zone._id === deliveryZoneId)?.name ?? 'Otra zona'

  useEffect(() => {
    setPendingClientPage((page) => Math.min(page, pendingClientPageCount))
  }, [pendingClientPageCount])

  const renderCandidateGroup = (group: CandidateGroup) => {
    const checked = group.eligible.length > 0 && group.eligible.every((candidate) => selectedSaleIds.includes(candidate.saleId))
    const id = `${selectionFieldId}-${group.key.replace(/[^a-zA-Z0-9_-]/g, '-')}`
    const isBlocked = group.eligible.length === 0
    const orderCount = group.eligible.length + group.blocked.length
    return (
      <tr
        key={group.key}
        className="h-16 border-b border-border-subtle last:border-b-0"
      >
        <td className="px-3 py-1 align-middle">
          <Checkbox id={id} checked={checked} disabled={isBlocked} aria-label={group.displayName} onCheckedChange={(value) => toggleClient(group, value === true)} />
        </td>
        <td className="px-3 py-1 align-middle text-sm font-medium text-text-primary">
          <Label htmlFor={id} title={group.displayName} className="line-clamp-2 cursor-pointer">{group.displayName}</Label>
        </td>
        <td className="px-3 py-1 align-middle text-xs text-text-secondary">
          <div title={group.addressSummary ?? 'Dirección no disponible'} className="line-clamp-1">{group.addressSummary ?? 'Dirección no disponible'}</div>
          <div>{group.zoneMismatch ? 'Otra zona' : selectedZoneName}</div>
          {group.reasons.length > 0 && (() => {
            const reasonText = group.reasons.map((reason) => CANDIDATE_BLOCK_REASON_LABEL[reason] ?? reason).join('. ')
            return <div title={reasonText} className="line-clamp-1 text-state-error">{reasonText}</div>
          })()}
        </td>
        <td className="whitespace-nowrap px-3 py-1 align-middle text-sm text-text-secondary">{orderCount} {orderCount === 1 ? 'pedido' : 'pedidos'}</td>
        <td className={isBlocked ? 'px-3 py-1 align-middle text-xs font-medium text-state-error' : 'px-3 py-1 align-middle text-xs font-medium text-state-success'}>{isBlocked ? 'Bloqueado' : 'Apto'}</td>
      </tr>
    )
  }

  return (
    <section aria-labelledby={initialScopeIsValid ? undefined : 'route-planner-title'} aria-label={initialScopeIsValid ? 'Generador de ruta optimizada' : undefined} className="flex flex-col gap-6">
      {!initialScopeIsValid && <div>
        <h2 id="route-planner-title" className="text-base font-semibold text-text-primary">
          Planificación de rutas
        </h2>
        <p className="mt-1 text-label text-text-secondary">
           Seleccioná pedidos aptos y asigná los recursos de la ruta.
        </p>
      </div>}

      {previewStatus === 'idle' && (!initialScopeIsValid || loadStatus === 'error') && <form
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
      </form>}

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

      {previewStatus === 'idle' && loadStatus === 'ready' && candidates !== null && !isEmpty && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 lg:grid-cols-[1.08fr_1fr]">
            <section aria-labelledby="pending-orders-title" className="rounded-lg border border-border-subtle bg-surface-base p-4 shadow-md">
              <h3 id="pending-orders-title" className="text-sm font-semibold text-brand-primary">Pedidos pendientes</h3>
              <p className="mt-1 text-xs text-text-secondary">
                Seleccioná clientes. Todos sus pedidos aptos se incluirán en una sola parada.
              </p>
              <div data-testid="pending-orders-table-container" className="mt-3 h-[38rem] overflow-hidden">
                <table className="w-full table-fixed border-collapse text-left" aria-label="Pedidos pendientes">
                  <colgroup>
                    <col className="w-10" />
                    <col className="w-[30%]" />
                    <col className="w-[42%]" />
                    <col className="w-[15%]" />
                    <col className="w-[13%]" />
                  </colgroup>
                  <thead className="border-b border-border-subtle text-xs text-text-secondary">
                    <tr className="h-10">
                      <th scope="col" className="w-10 px-3 py-2"><span className="sr-only">Selección</span></th>
                      <th scope="col" className="px-3 py-2 font-medium">Cliente / Comercio</th>
                      <th scope="col" className="px-3 py-2 font-medium">Dirección / Zona</th>
                      <th scope="col" className="px-3 py-2 font-medium">Pedidos</th>
                      <th scope="col" className="px-3 py-2 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>{visibleGroups.map(renderCandidateGroup)}</tbody>
                </table>
                {pendingClientPageCount > 1 && <nav aria-label="Paginación de pedidos pendientes" className="mt-3 flex items-center justify-between gap-3">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setPendingClientPage((page) => Math.max(1, page - 1))} disabled={pendingClientPage === 1}>Anterior</Button>
                  <span role="status" aria-live="polite" className="text-xs text-text-secondary">Página {pendingClientPage} de {pendingClientPageCount}</span>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setPendingClientPage((page) => Math.min(pendingClientPageCount, page + 1))} disabled={pendingClientPage === pendingClientPageCount}>Siguiente</Button>
                </nav>}
              </div>
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
          <section aria-labelledby="route-configuration-title" className="rounded-lg border border-border-subtle bg-surface-base p-4 shadow-md">
            <h3 id="route-configuration-title" className="text-sm font-semibold text-brand-primary">Configuración de la ruta</h3>
            <div className="flex flex-col gap-3">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2"><Label htmlFor="route-driver">Repartidor</Label><select id="route-driver" value={driverId} onChange={(event) => setDriverId(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-text-primary"><option value="">Seleccioná un repartidor</option>{assignmentOptions.drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.nickname}</option>)}</select></div>
                <div className="flex flex-col gap-2"><Label htmlFor="route-vehicle">Vehículo</Label><select id="route-vehicle" value={vehicleId} onChange={(event) => setVehicleId(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-text-primary"><option value="">Seleccioná un vehículo</option>{assignmentOptions.vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.code} · {vehicle.fuelConsumptionLitersPer100Km} L/100 km</option>)}</select></div>
              </div>
              {(!hasAssignments || selectedClientCount < 2) && <p role="status" className="text-sm text-text-secondary">Seleccioná un repartidor, un vehículo y al menos dos clientes aptos.</p>}
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" onClick={() => void handlePreview()} disabled={isSaving || !canPreview}>
                  Generar ruta
                </Button>
                <p className="text-xs text-text-secondary">
                   Se seleccionaron {selectedClientCount} clientes y {selectedSaleIds.length} pedidos aptos.
                </p>
              </div>
              {selectionError && (
                <p role="alert" className="text-sm font-medium text-state-error">
                  {selectionError}
                </p>
              )}
            </div>
          </section>
          </div>
        </div>
      )}

      <RoutePreview
        status={previewStatus}
        preview={previewData}
        errorCode={previewErrorCode}
        errorMessage={previewErrorMessage}
        candidateEntries={candidates?.eligible}
      />

      <footer className="flex flex-col-reverse items-stretch gap-3 border-t border-border-subtle pt-4 sm:flex-row sm:items-center sm:justify-end">
        {saveStatus === 'error' && (
          <p role="alert" className="mr-auto text-sm font-medium text-state-error">
            {routePlanErrorMessage(saveErrorCode, saveErrorMessage ?? undefined)}
          </p>
        )}
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        {hasValidPreview && (
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || !hasAssignments}
            aria-busy={isSaving}
          >
            {isSaving ? 'Guardando plan…' : 'Confirmar y guardar'}
          </Button>
        )}
        {isSaving && (
          <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-text-secondary">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Guardando plan de ruta…
          </p>
        )}
      </footer>
    </section>
  )
}
