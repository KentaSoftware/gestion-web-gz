'use client'

import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  Check,
  FileText,
  Info,
  ListChecks,
  Loader2,
  MapPin,
  Play,
  Scale,
  SlidersHorizontal,
} from 'lucide-react'

import ProtectedRoute from '@/components/ProtectedRoute'
import { PageContainer, PageHeader, PageSection } from '@/components/layout/PageLayout'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  SIMULATION_DATA_QUALITY,
  SIMULATION_ERROR_CODES,
  type SimulationBaseScenarioResult,
  type SimulationVariantCalculationResult,
} from '@/interfaces/simulation.interface'
import { routePlanService } from '@/services/routePlan.service'
import {
  simulationFailureFrom,
  simulationService,
  type SimulationFailure,
} from '@/services/simulation.service'

const STAGE_NUMBER = 'font-mono text-caption text-text-muted'
const META_CHIP =
  'rounded-full border border-border-subtle bg-background-subtle px-2.5 py-1 text-caption font-medium text-text-secondary'
const PANEL_HEADER =
  'flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-5 py-4'
const TABLE_HEAD =
  'h-9 px-3 py-2 text-caption font-semibold uppercase tracking-wide text-text-secondary'
const TABLE_CELL = 'px-3 py-2.5 text-label text-text-secondary'
const PRIMARY_BUTTON =
  'inline-flex items-center justify-center gap-2 rounded-md bg-brand-primary px-4 py-2.5 text-label font-semibold text-text-inverse transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-state-focus disabled:cursor-not-allowed disabled:opacity-50'
const SECONDARY_BUTTON =
  'inline-flex items-center justify-center gap-2 rounded-md border border-border-subtle bg-surface-base px-3 py-2 text-caption font-semibold text-text-secondary transition-colors hover:bg-background-subtle focus:outline-none focus:ring-2 focus:ring-state-focus disabled:cursor-not-allowed disabled:opacity-50'
const TEXT_INPUT =
  'mt-1 w-full rounded-md border border-border-subtle bg-surface-base px-3 py-2 text-label text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-state-focus'
const EMPTY_STATE = 'rounded-md border border-dashed border-border-strong bg-background-subtle p-4'
const ARS_FORMATTER = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function formatArsAmount(amount: number): string {
  return ARS_FORMATTER.format(amount)
}

interface RouteOption {
  id: string
  status: string
  zoneCode: string
}

type LoadState = 'loading' | 'ready' | 'error'
type RequestState = 'idle' | 'pending' | 'complete' | 'incomplete' | 'error'

interface StageHeaderProps {
  number: string
  title: string
  description: string
  icon: ReactNode
  affordance?: ReactNode
}

function StageHeader({ number, title, description, icon, affordance }: StageHeaderProps) {
  return (
    <header className={PANEL_HEADER}>
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-9 items-center justify-center rounded-md bg-background-subtle text-brand-primary"
        >
          {icon}
        </span>
        <div className="flex items-baseline gap-3">
          <span aria-hidden="true" className={STAGE_NUMBER}>
            {number}
          </span>
          <div>
            <h2 className="text-subheading font-bold text-text-primary">{title}</h2>
            <p className="text-label text-text-secondary">{description}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={META_CHIP}>Servidor</span>
        {affordance}
      </div>
    </header>
  )
}

function FailureDetails({ failure }: { failure: SimulationFailure }) {
  return (
    <div className="mt-2 space-y-1 text-caption text-text-secondary">
      {failure.code ? (
        <p>
          <span className="font-semibold text-text-primary">Código:</span> {failure.code}
        </p>
      ) : null}
      <p>{failure.message}</p>
      {failure.correlationId ? (
        <p>
          <span className="font-semibold text-text-primary">Correlación:</span>{' '}
          {failure.correlationId}
        </p>
      ) : null}
    </div>
  )
}

function SimulationWorkspace() {
  const [routeState, setRouteState] = useState<LoadState>('loading')
  const [routeReloadToken, setRouteReloadToken] = useState(0)
  const [routes, setRoutes] = useState<RouteOption[]>([])
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)

  const [baseState, setBaseState] = useState<RequestState>('idle')
  const [baseScenario, setBaseScenario] = useState<SimulationBaseScenarioResult | null>(null)
  const [baseFailure, setBaseFailure] = useState<SimulationFailure | null>(null)

  const [variantName, setVariantName] = useState('')
  const [calculationState, setCalculationState] = useState<RequestState>('idle')
  const [calculation, setCalculation] = useState<SimulationVariantCalculationResult | null>(null)
  const [calculationFailure, setCalculationFailure] = useState<SimulationFailure | null>(null)

  useEffect(() => {
    let cancelled = false
    setRouteState('loading')

    void routePlanService
      .getDashboard({})
      .then((dashboard) => {
        if (cancelled) return
        setRoutes(
          dashboard.routes.map((route) => ({
            id: route.id,
            status: route.status,
            zoneCode: route.zoneCode,
          })),
        )
        setSelectedRouteId(null)
        setRouteState('ready')
      })
      .catch(() => {
        if (cancelled) return
        setRoutes([])
        setRouteState('error')
      })

    return () => {
      cancelled = true
    }
  }, [routeReloadToken])

  const completeBase =
    baseScenario?.dataQuality === SIMULATION_DATA_QUALITY.COMPLETE ? baseScenario : null
  const routeSelectionLocked = baseState === 'pending' || calculationState === 'pending'

  const clearSimulationState = () => {
    setBaseState('idle')
    setBaseScenario(null)
    setBaseFailure(null)
    setVariantName('')
    setCalculationState('idle')
    setCalculation(null)
    setCalculationFailure(null)
  }

  const handleSelectRoute = (routeId: string) => {
    if (routeSelectionLocked || routeId === selectedRouteId) return
    setSelectedRouteId(routeId)
    clearSimulationState()
  }

  const handleCreateBaseScenario = async () => {
    if (selectedRouteId === null || baseState === 'pending') return

    setBaseState('pending')
    setBaseScenario(null)
    setBaseFailure(null)
    setVariantName('')
    setCalculationState('idle')
    setCalculation(null)
    setCalculationFailure(null)

    try {
      const result = await simulationService.createBaseScenario({ routeId: selectedRouteId })
      setBaseScenario(result)
      setBaseState(
        result.dataQuality === SIMULATION_DATA_QUALITY.COMPLETE ? 'complete' : 'incomplete',
      )
    } catch (error) {
      setBaseFailure(simulationFailureFrom(error))
      setBaseState('error')
    }
  }

  const handleCalculateVariant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (completeBase === null || variantName.trim() === '' || calculationState === 'pending') {
      return
    }

    setCalculationState('pending')
    setCalculation(null)
    setCalculationFailure(null)

    try {
      const result = await simulationService.calculateVariant(completeBase.token, {
        name: variantName.trim(),
        overrides: [],
        directLoad: [],
      })
      setCalculation(result)
      setCalculationState(
        result.dataQuality === SIMULATION_DATA_QUALITY.COMPLETE ? 'complete' : 'incomplete',
      )
    } catch (error) {
      const failure = simulationFailureFrom(error)
      setCalculationFailure(failure)
      setCalculationState('error')

      if (
        failure.code === SIMULATION_ERROR_CODES.TOKEN_INVALID ||
        failure.code === SIMULATION_ERROR_CODES.TOKEN_EXPIRED
      ) {
        setBaseScenario(null)
        setBaseState('idle')
      }
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Simulación de escenarios"
        description="Integración operativa acotada con el servicio de Simulación. El servidor resuelve los snapshots, el escenario base, el cálculo y la recomendación."
      />

      <div
        role="note"
        className="mb-6 rounded-md border border-border-subtle bg-background-subtle px-4 py-3"
      >
        <p className="text-label font-semibold text-text-primary">Integración operativa acotada</p>
        <p className="mt-1 max-w-prose text-label text-text-secondary">
          El escenario base y el cálculo los resuelve el servidor. Esta vista no calcula importes,
          márgenes, capacidad ni recomendaciones. Las rutas listadas provienen de planificación y
          solo aportan su identificador; no se usan sus métricas como snapshots. Si el módulo o los
          productores no están habilitados, la API responde cerrada y no se muestran datos de
          escenario.
        </p>
      </div>

      <PageSection>
        <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface-base shadow-sm">
          <StageHeader
            number="01"
            title="Parámetros de simulación"
            description="Ruta de planificación y estado del escenario base."
            icon={<SlidersHorizontal className="size-5" />}
          />

          <div className="px-5 py-5">
            <div className="grid grid-cols-[minmax(0,1fr)_17rem] gap-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h3 className="text-label font-bold text-text-primary">Rutas a simular</h3>
                    <p className="text-caption text-text-secondary">
                      El identificador de ruta se envía al servidor; la validación y los snapshots
                      quedan del lado del servidor.
                    </p>
                  </div>
                  {routeState === 'ready' ? (
                    <span className="text-caption text-text-muted">
                      {routes.length} {routes.length === 1 ? 'ruta' : 'rutas'}
                    </span>
                  ) : null}
                </div>

                <div className="mt-3">
                  {routeState === 'loading' ? (
                    <p
                      role="status"
                      aria-live="polite"
                      className="flex items-center gap-2 rounded-md border border-border-subtle bg-background-subtle px-3 py-4 text-label text-text-secondary"
                    >
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      Cargando rutas de planificación.
                    </p>
                  ) : null}

                  {routeState === 'error' ? (
                    <div
                      role="alert"
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border-strong bg-background-subtle px-3 py-4 text-label text-text-primary"
                    >
                      <span>No se pudieron cargar las rutas de planificación.</span>
                      <button
                        type="button"
                        className={SECONDARY_BUTTON}
                        onClick={() => setRouteReloadToken((token) => token + 1)}
                      >
                        Reintentar
                      </button>
                    </div>
                  ) : null}

                  {routeState === 'ready' && routes.length === 0 ? (
                    <div className={EMPTY_STATE}>
                      <MapPin className="size-5 text-text-muted" aria-hidden="true" />
                      <p className="mt-2 text-label font-medium text-text-primary">
                        No hay rutas de planificación disponibles.
                      </p>
                      <p className="mt-1 text-caption text-text-secondary">
                        No se inventan rutas. Volvé a intentar cuando el módulo de Rutas tenga
                        datos disponibles.
                      </p>
                    </div>
                  ) : null}

                  {routeState === 'ready' && routes.length > 0 ? (
                    <Table aria-label="Rutas de planificación">
                      <TableHeader>
                        <TableRow className="bg-background-subtle hover:bg-background-subtle">
                          <TableHead className={`${TABLE_HEAD} w-8`}>
                            <span className="sr-only">Selección</span>
                          </TableHead>
                          <TableHead className={TABLE_HEAD}>Ruta</TableHead>
                          <TableHead className={TABLE_HEAD}>Estado</TableHead>
                          <TableHead className={TABLE_HEAD}>Zona</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {routes.map((route) => (
                          <TableRow
                            key={route.id}
                            data-state={route.id === selectedRouteId ? 'selected' : 'unselected'}
                            className={
                              route.id === selectedRouteId
                                ? 'bg-brand-primary/5 hover:bg-brand-primary/5'
                                : 'hover:bg-transparent'
                            }
                          >
                            <TableCell className="px-3 py-2.5">
                              <label
                                htmlFor={`simulation-route-${route.id}`}
                                className="inline-flex cursor-pointer items-center justify-center"
                              >
                                <input
                                  id={`simulation-route-${route.id}`}
                                  type="radio"
                                  name="simulation-route"
                                  value={route.id}
                                  checked={route.id === selectedRouteId}
                                  onChange={() => handleSelectRoute(route.id)}
                                  disabled={routeSelectionLocked}
                                  className="size-4 cursor-pointer accent-brand-primary disabled:cursor-not-allowed"
                                />
                                <span className="sr-only">Seleccionar ruta {route.id}</span>
                              </label>
                            </TableCell>
                            <TableCell className="px-3 py-2.5 font-mono text-caption text-text-primary">
                              {route.id}
                            </TableCell>
                            <TableCell className={TABLE_CELL}>{route.status}</TableCell>
                            <TableCell className={TABLE_CELL}>{route.zoneCode}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : null}
                </div>
              </div>

              <aside className="min-w-0 rounded-md border border-border-subtle bg-background-subtle p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-label font-bold text-text-primary">Parámetros del escenario</h3>
                  <Info className="size-3.5 text-text-muted" aria-hidden="true" />
                </div>
                <p className="mt-1 text-caption text-text-secondary">
                  El servidor aplica la configuración operativa homologada y los snapshots de ruta
                  y Stock. Esta pantalla no define valores por defecto.
                </p>

                <dl className="mt-4 space-y-3">
                  <div>
                    <dt className="text-caption font-medium text-text-secondary">
                      Ruta seleccionada
                    </dt>
                    <dd className="mt-1 break-all rounded-md border border-border-subtle bg-surface-base px-3 py-2 font-mono text-caption text-text-primary">
                      {selectedRouteId ?? 'Sin seleccionar'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption font-medium text-text-secondary">
                      Origen de los datos
                    </dt>
                    <dd className="mt-1 rounded-md border border-border-subtle bg-surface-base px-3 py-2 text-caption text-text-primary">
                      Servicio de Simulación
                    </dd>
                  </div>
                </dl>

                <p className="mt-4 border-t border-border-subtle pt-3 text-caption text-text-muted">
                  Los montos, riesgos y recomendaciones solo se muestran cuando los devuelve el
                  servidor.
                </p>
              </aside>
            </div>

            <div className="mt-6 border-t border-border-subtle pt-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h3 className="text-label font-bold text-text-primary">
                    Productos para venta ambulante
                  </h3>
                  <p className="text-caption text-text-secondary">
                    El snapshot de Stock y la carga directa quedan fuera de esta integración.
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className={EMPTY_STATE}>
                  <h4 className="text-label font-semibold text-text-primary">
                    Productos disponibles
                  </h4>
                  <p className="mt-1 text-caption text-text-secondary">
                    No disponible en esta integración. El snapshot de Stock lo entrega el
                    productor al servidor; no se sustituyen cantidades ni precios.
                  </p>
                </div>
                <div className={EMPTY_STATE}>
                  <h4 className="text-label font-semibold text-text-primary">
                    Productos incluidos en el vehículo
                  </h4>
                  <p className="mt-1 text-caption text-text-secondary">
                    No disponible en esta integración. La vista no envía overrides ni carga
                    directa al cálculo.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageSection>

      <PageSection>
        <div className="overflow-hidden rounded-lg border border-border-strong bg-surface-base">
          <StageHeader
            number="02"
            title="Ejecutar simulación"
            description="Creación del escenario base y cálculo de una variante en el servidor."
            icon={<Play className="size-5" />}
          />

          <div className="px-5 py-5">
            <button
              type="button"
              className={`${PRIMARY_BUTTON} w-full`}
              disabled={selectedRouteId === null || baseState === 'pending'}
              onClick={() => {
                void handleCreateBaseScenario()
              }}
            >
              <Play className="size-5" aria-hidden="true" />
              Crear escenario base
            </button>
            <p className="mt-2 text-caption text-text-secondary">
              Envía únicamente la ruta seleccionada. La API valida autenticación, permiso,
              configuración y productores; cualquier gate cerrado devuelve un error sin datos.
            </p>

            {baseState === 'pending' ? (
              <p
                role="status"
                aria-live="polite"
                className="mt-4 flex items-center gap-2 rounded-md border border-border-subtle bg-background-subtle px-3 py-3 text-label text-text-secondary"
              >
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Creando escenario base.
              </p>
            ) : null}

            {baseState === 'incomplete' &&
            baseScenario?.dataQuality === SIMULATION_DATA_QUALITY.INCOMPLETE ? (
              <div
                role="alert"
                className="mt-4 rounded-md border border-border-strong bg-background-subtle px-4 py-3"
              >
                <p className="text-label font-semibold text-text-primary">
                  Escenario base incompleto
                </p>
                <p className="mt-1 text-caption text-text-secondary">
                  El servidor informó datos obligatorios faltantes. No se calcula ni se completa
                  con valores locales.
                </p>
                <FailureDetails failure={baseScenario.error} />
                {baseScenario.missingField ? (
                  <p className="mt-2 text-caption text-text-secondary">
                    <span className="font-semibold text-text-primary">Campo faltante:</span>{' '}
                    {baseScenario.missingField}
                  </p>
                ) : null}
              </div>
            ) : null}

            {baseState === 'error' && baseFailure !== null ? (
              <div
                role="alert"
                className="mt-4 rounded-md border border-border-strong bg-background-subtle px-4 py-3"
              >
                <p className="text-label font-semibold text-text-primary">
                  No se pudo crear el escenario base
                </p>
                <FailureDetails failure={baseFailure} />
              </div>
            ) : null}

            {completeBase !== null ? (
              <div className="mt-5 border-t border-border-subtle pt-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h3 className="text-label font-bold text-text-primary">
                      Escenario base completo
                    </h3>
                    <p className="text-caption text-text-secondary">
                      Handle temporal emitido por el servidor para calcular variantes.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-background-subtle px-2 py-0.5 text-caption font-medium text-text-secondary">
                    <Check className="size-3" aria-hidden="true" />
                    Temporal
                  </span>
                </div>

                <dl className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <dt className="text-caption font-medium text-text-secondary">
                      Hash del escenario base
                    </dt>
                    <dd className="mt-1 break-all font-mono text-caption text-text-primary">
                      {completeBase.baseScenarioHash}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption font-medium text-text-secondary">
                      Contrato de Rutas
                    </dt>
                    <dd className="mt-1 font-mono text-caption text-text-primary">
                      {completeBase.versions.routeContractVersion}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption font-medium text-text-secondary">
                      Contrato de Stock
                    </dt>
                    <dd className="mt-1 font-mono text-caption text-text-primary">
                      {completeBase.versions.stockContractVersion}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption font-medium text-text-secondary">
                      Versión de reglas
                    </dt>
                    <dd className="mt-1 font-mono text-caption text-text-primary">
                      {completeBase.versions.rulesVersion}
                    </dd>
                  </div>
                </dl>

                <form onSubmit={handleCalculateVariant} className="mt-5 border-t border-border-subtle pt-4">
                  <h3 className="text-label font-bold text-text-primary">Calcular variante</h3>
                  <p className="mt-1 text-caption text-text-secondary">
                    La variante se envía sin overrides ni carga directa. El servidor decide si es
                    completa, viable y recomendable.
                  </p>
                  <label
                    htmlFor="simulation-variant-name"
                    className="mt-3 block text-caption font-medium text-text-secondary"
                  >
                    Nombre de la variante
                  </label>
                  <input
                    id="simulation-variant-name"
                    value={variantName}
                    onChange={(event) => setVariantName(event.target.value)}
                    className={TEXT_INPUT}
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    className={`${PRIMARY_BUTTON} mt-3 w-full`}
                    disabled={variantName.trim() === '' || calculationState === 'pending'}
                  >
                    Calcular variante
                  </button>
                </form>

                {calculationState === 'pending' ? (
                  <p
                    role="status"
                    aria-live="polite"
                    className="mt-4 flex items-center gap-2 rounded-md border border-border-subtle bg-background-subtle px-3 py-3 text-label text-text-secondary"
                  >
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Calculando variante.
                  </p>
                ) : null}

                {calculationState === 'incomplete' &&
                calculation?.dataQuality === SIMULATION_DATA_QUALITY.INCOMPLETE ? (
                  <div
                    data-state="incomplete"
                    className="mt-4 rounded-md border border-border-strong bg-background-subtle px-4 py-3"
                  >
                    <h3 className="text-label font-bold text-text-primary">Cálculo incompleto</h3>
                    <p className="mt-1 text-caption text-text-secondary">
                      El servidor no devolvió componentes ni totales. No se sustituyen por cero.
                    </p>
                    <p className="mt-2 text-caption text-text-secondary">
                      <span className="font-semibold text-text-primary">Variante:</span>{' '}
                      {calculation.variantId}
                    </p>
                    <p className="mt-1 text-caption text-text-secondary">
                      <span className="font-semibold text-text-primary">Viabilidad:</span>{' '}
                      {calculation.viability}
                    </p>
                    <p className="mt-2 text-caption font-medium text-text-primary">
                      Datos faltantes
                    </p>
                    <ul className="mt-1 list-inside list-disc text-caption text-text-secondary">
                      {calculation.missingFields.map((field) => (
                        <li key={field}>{field}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-caption font-medium text-text-primary">Riesgos</p>
                    <ul className="mt-1 list-inside list-disc text-caption text-text-secondary">
                      {calculation.risks.map((risk) => (
                        <li key={risk}>{risk}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {calculationState === 'complete' &&
                calculation?.dataQuality === SIMULATION_DATA_QUALITY.COMPLETE ? (
                  <div
                    data-state="complete"
                    className="mt-4 rounded-md border border-border-subtle bg-background-subtle px-4 py-4"
                  >
                    <h3 className="text-label font-bold text-text-primary">Resultado del servidor</h3>
                    <div className="mt-2 grid gap-2 text-caption text-text-secondary md:grid-cols-2">
                      <p>
                        <span className="font-semibold text-text-primary">Variante:</span>{' '}
                        {calculation.variantId}
                      </p>
                      <p>
                        <span className="font-semibold text-text-primary">Viabilidad:</span>{' '}
                        {calculation.viability}
                      </p>
                      <p>
                        <span className="font-semibold text-text-primary">Recomendación:</span>{' '}
                        {calculation.recommended
                          ? 'Recomendada por el servidor'
                          : 'No recomendada por el servidor'}
                      </p>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-md border border-border-subtle bg-surface-base">
                      <Table aria-label="Componentes calculados">
                        <TableHeader>
                          <TableRow className="bg-background-subtle hover:bg-background-subtle">
                            <TableHead className={TABLE_HEAD}>Componente</TableHead>
                            <TableHead className={TABLE_HEAD}>Importe (ARS)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {calculation.components.map((component) => (
                            <TableRow key={component.code} className="hover:bg-transparent">
                              <TableCell className="px-3 py-2.5 font-mono text-caption text-text-primary">
                                {component.code}
                              </TableCell>
                              <TableCell className={TABLE_CELL}>
                                {formatArsAmount(component.amountArs)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <dl className="mt-4 grid gap-3 md:grid-cols-2">
                      <div>
                        <dt className="text-caption font-medium text-text-secondary">
                          Ingreso estimado (ARS)
                        </dt>
                        <dd className="mt-1 text-label font-semibold text-text-primary">
                          {formatArsAmount(calculation.totals.revenueArs)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-caption font-medium text-text-secondary">
                          Costo de mercadería (ARS)
                        </dt>
                        <dd className="mt-1 text-label font-semibold text-text-primary">
                          {formatArsAmount(calculation.totals.merchandiseCostArs)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-caption font-medium text-text-secondary">
                          Costo operativo (ARS)
                        </dt>
                        <dd className="mt-1 text-label font-semibold text-text-primary">
                          {formatArsAmount(calculation.totals.operatingCostArs)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-caption font-medium text-text-secondary">
                          Margen bruto (ARS)
                        </dt>
                        <dd className="mt-1 text-label font-semibold text-text-primary">
                          {formatArsAmount(calculation.totals.marginArs)}
                        </dd>
                      </div>
                    </dl>

                    <p className="mt-3 rounded-md bg-surface-base px-3 py-2 text-caption text-text-secondary">
                      Estimación de análisis sin garantía de resultado real.
                    </p>
                  </div>
                ) : null}

                {calculationState === 'idle' ? (
                  <p className="mt-3 text-caption text-text-muted">
                    El cálculo es temporal y no se guarda en esta integración.
                  </p>
                ) : null}
              </div>
            ) : null}

            {calculationState === 'error' && calculationFailure !== null ? (
              <div
                role="alert"
                className="mt-4 rounded-md border border-border-strong bg-background-subtle px-4 py-3"
              >
                <p className="text-label font-semibold text-text-primary">
                  No se pudo calcular la variante
                </p>
                <FailureDetails failure={calculationFailure} />
              </div>
            ) : null}

            {calculationFailure !== null &&
            (calculationFailure.code === SIMULATION_ERROR_CODES.TOKEN_INVALID ||
              calculationFailure.code === SIMULATION_ERROR_CODES.TOKEN_EXPIRED) &&
            completeBase === null ? (
              <p className="mt-4 rounded-md border border-border-subtle bg-background-subtle px-3 py-2 text-caption text-text-secondary">
                El handle fue invalidado. Creá un nuevo escenario base para continuar.
              </p>
            ) : null}
          </div>
        </div>
      </PageSection>

      <PageSection>
        <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface-base shadow-sm">
          <StageHeader
            number="03"
            title="Registros de escenarios"
            description="Historial, comparación y guardado fuera de esta integración."
            icon={<ListChecks className="size-5" />}
          />

          <div className="px-5 py-5">
            <div className={EMPTY_STATE}>
              <FileText className="size-5 text-text-muted" aria-hidden="true" />
              <h3 className="mt-2 text-label font-semibold text-text-primary">
                Historial no disponible
              </h3>
              <p className="mt-1 text-caption text-text-secondary">
                El historial de corridas guardadas no está habilitado en esta integración.
              </p>
              <p className="mt-1 text-caption text-text-secondary">
                La comparación no está habilitada en esta integración.
              </p>
              <p className="mt-1 text-caption text-text-secondary">
                Guardar, recalcular, archivar y restaurar corridas no forman parte de este corte.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4">
              <p className="text-caption text-text-muted">
                No hay registros porque la persistencia de corridas no está integrada.
              </p>
              <span
                aria-disabled="true"
                data-variant="muted"
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-md border border-border-subtle bg-background-subtle px-3 py-2 text-caption font-semibold text-text-muted"
              >
                <Scale className="size-3.5" aria-hidden="true" />
                Comparación no disponible
              </span>
            </div>
          </div>
        </div>
      </PageSection>
    </PageContainer>
  )
}

/**
 * Bounded operational workspace for Simulation. The protected route keeps the
 * existing module flag/gate fail-closed; this screen only sends the selected
 * route identifier and the server-issued handle, and renders server results.
 */
export default function SimulationPage() {
  return (
    <ProtectedRoute>
      <SimulationWorkspace />
    </ProtectedRoute>
  )
}
