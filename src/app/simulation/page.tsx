'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  FileText,
  Info,
  ListChecks,
  MapPin,
  Play,
  RefreshCw,
  Scale,
  SlidersHorizontal,
  Boxes,
} from 'lucide-react'

import { PageContainer, PageHeader } from '@/components/layout/PageLayout'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import {
  SIMULATION_PAGE_SIZE,
  simulationService,
  type SimulationCatalog,
  type SimulationLoadedProduct,
  type SimulationParameters,
  type SimulationRoute,
  type SimulationScenario,
  type SimulationScenarioDetail,
} from '@/services/simulation.service'

const FIELD_INPUT =
  'h-9 w-full rounded-md border border-border-subtle bg-surface-base px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-border-interactive focus:outline-none focus:ring-2 focus:ring-state-focus disabled:cursor-not-allowed disabled:opacity-60'
const PANEL = 'rounded-lg border border-border-subtle bg-surface-base shadow-sm'
const TABLE_HEAD =
  'h-8 px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary'
const TABLE_CELL = 'px-2 py-1.5 text-sm text-text-secondary'
const ICON_BUTTON =
  'inline-flex size-9 items-center justify-center rounded-md border border-border-subtle bg-surface-base text-text-secondary transition-colors hover:bg-background-subtle focus:outline-none focus:ring-2 focus:ring-state-focus disabled:cursor-not-allowed disabled:opacity-40'
const PAGINATION_BUTTON =
  'inline-flex size-9 items-center justify-center rounded-md border border-border-subtle bg-surface-base text-sm font-medium text-text-secondary transition-colors hover:bg-background-subtle focus:outline-none focus:ring-2 focus:ring-state-focus disabled:cursor-not-allowed disabled:opacity-40'

const NUMBER_FORMATTER = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })
const DECIMAL_FORMATTER = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const formatNumber = (value: number): string => NUMBER_FORMATTER.format(value)
const formatCurrency = (value: number): string => `$ ${NUMBER_FORMATTER.format(value)}`
const formatDecimal = (value: number): string => DECIMAL_FORMATTER.format(value)

type LoadState = 'loading' | 'ready' | 'error'

interface PaginationProps {
  noun: 'rutas' | 'escenarios'
  page: number
  pageCount: number
  onChange: (page: number) => void
  disabled?: boolean
}

function Pagination({ noun, page, pageCount, onChange, disabled = false }: PaginationProps) {
  const pages = Array.from({ length: Math.max(1, Math.min(pageCount, 5)) }, (_, index) => index + 1)

  return (
    <nav aria-label={`Paginación de ${noun}`} className="flex items-center gap-1">
      <button
        type="button"
        aria-label={`Página anterior de ${noun}`}
        className={PAGINATION_BUTTON}
        disabled={disabled || page <= 1}
        onClick={() => onChange(Math.max(1, page - 1))}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>
      {pages.map((pageNumber) => (
        <button
          key={pageNumber}
          type="button"
          aria-label={`Página ${pageNumber} de ${noun}`}
          aria-current={pageNumber === page ? 'page' : undefined}
          className={`${PAGINATION_BUTTON} ${
            pageNumber === page
              ? 'border-brand-primary bg-brand-primary text-text-inverse hover:bg-brand-primary-hover'
              : ''
          }`}
          disabled={disabled}
          onClick={() => onChange(pageNumber)}
        >
          {pageNumber}
        </button>
      ))}
      <button
        type="button"
        aria-label={`Página siguiente de ${noun}`}
        className={PAGINATION_BUTTON}
        disabled={disabled || page >= pageCount}
        onClick={() => onChange(Math.min(pageCount, page + 1))}
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  )
}

interface PanelHeadingProps {
  id?: string
  icon: ReactNode
  title: string
  description?: string
}

function PanelHeading({ id, icon, title, description }: PanelHeadingProps) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-background-subtle text-brand-primary">
        {icon}
      </span>
      <div>
        <h2 id={id} className="text-lg font-bold text-brand-primary">
          {title}
        </h2>
        {description ? <p className="text-sm text-text-secondary">{description}</p> : null}
      </div>
    </div>
  )
}

interface ParameterFieldProps {
  id: string
  label: string
  value: string
  min?: number
  step?: number
  hint: string
  onChange: (value: string) => void
}

function ParameterField({ id, label, value, min, step, hint, onChange }: ParameterFieldProps) {
  return (
    <label htmlFor={id} className="block text-sm font-medium text-text-primary">
      <span className="flex items-center gap-1.5">
        {label}
        <span title={hint} className="inline-flex text-text-muted">
          <Info className="size-4" aria-hidden="true" />
          <span className="sr-only">{hint}</span>
        </span>
      </span>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        aria-label={label}
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${FIELD_INPUT} mt-1`}
      />
    </label>
  )
}

export default function SimulationScreen() {
  const [parametersOpen, setParametersOpen] = useState(true)

  const [routePage, setRoutePage] = useState(1)
  const [routeState, setRouteState] = useState<LoadState>('loading')
  const [routes, setRoutes] = useState<SimulationRoute[]>([])
  const [routeTotal, setRouteTotal] = useState(0)
  const [routeRetry, setRouteRetry] = useState(0)
  const [selectedRoute, setSelectedRoute] = useState<SimulationRoute | null>(null)

  const [catalogState, setCatalogState] = useState<LoadState>('loading')
  const [catalog, setCatalog] = useState<SimulationCatalog>({ available: [], included: [] })
  const [catalogRetry, setCatalogRetry] = useState(0)
  const [selectedAvailableId, setSelectedAvailableId] = useState<string | null>(null)
  const [selectedIncludedId, setSelectedIncludedId] = useState<string | null>(null)
  const [availableQuantities, setAvailableQuantities] = useState<Record<string, string>>({})

  const [fuelPrice, setFuelPrice] = useState('1250')
  const [generalCosts, setGeneralCosts] = useState('25000')
  const [hourlyRate, setHourlyRate] = useState('8000')
  const [includeSurplus, setIncludeSurplus] = useState(true)

  const [simulating, setSimulating] = useState(false)
  const [simulateMessage, setSimulateMessage] = useState('')
  const [simulateError, setSimulateError] = useState('')

  const [scenarioPage, setScenarioPage] = useState(1)
  const [scenarioState, setScenarioState] = useState<LoadState>('loading')
  const [scenarios, setScenarios] = useState<SimulationScenario[]>([])
  const [scenarioTotal, setScenarioTotal] = useState(0)
  const [scenarioRetry, setScenarioRetry] = useState(0)
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<string[]>([])
  const [detailScenario, setDetailScenario] = useState<SimulationScenario | null>(null)
  const [scenarioDetail, setScenarioDetail] = useState<SimulationScenarioDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [compareOpen, setCompareOpen] = useState(false)
  const createdScenarios = useRef<SimulationScenario[]>([])

  useEffect(() => {
    let cancelled = false
    setRouteState('loading')

    void simulationService
      .getRoutes(routePage)
      .then((result) => {
        if (cancelled) return
        setRoutes(result.items)
        setRouteTotal(result.total)
        setSelectedRoute((current) => current ?? result.items[0] ?? null)
        setRouteState('ready')
      })
      .catch(() => {
        if (cancelled) return
        setRoutes([])
        setRouteTotal(0)
        setRouteState('error')
      })

    return () => {
      cancelled = true
    }
  }, [routePage, routeRetry])

  useEffect(() => {
    let cancelled = false
    setCatalogState('loading')

    void simulationService
      .getCatalog()
      .then((result) => {
        if (cancelled) return
        setCatalog(result)
        setCatalogState('ready')
      })
      .catch(() => {
        if (cancelled) return
        setCatalog({ available: [], included: [] })
        setCatalogState('error')
      })

    return () => {
      cancelled = true
    }
  }, [catalogRetry])

  useEffect(() => {
    let cancelled = false
    setScenarioState('loading')

    void simulationService
      .getScenarios(scenarioPage)
      .then((result) => {
        if (cancelled) return
        const created = createdScenarios.current
        const baseItems = result.items.filter(
          (entry) => !created.some((createdEntry) => createdEntry.id === entry.id),
        )
        setScenarios(
          scenarioPage === 1
            ? [...created, ...baseItems].slice(0, result.pageSize)
            : result.items,
        )
        if (scenarioPage === 1) {
          setSelectedScenarioIds((current) =>
            current.length > 0
              ? current
              : ['ESC-014', 'ESC-012'].filter((id) => result.items.some((entry) => entry.id === id)),
          )
        }
        setScenarioTotal(result.total + created.length)
        setScenarioState('ready')
      })
      .catch(() => {
        if (cancelled) return
        setScenarios([])
        setScenarioTotal(0)
        setScenarioState('error')
      })

    return () => {
      cancelled = true
    }
  }, [scenarioPage, scenarioRetry])

  const routePageCount = Math.max(1, Math.ceil(routeTotal / SIMULATION_PAGE_SIZE.routes))
  const scenarioPageCount = Math.max(1, Math.ceil(scenarioTotal / SIMULATION_PAGE_SIZE.scenarios))
  const routeStart = routeTotal === 0 ? 0 : (routePage - 1) * SIMULATION_PAGE_SIZE.routes + 1
  const routeEnd = Math.min(routePage * SIMULATION_PAGE_SIZE.routes, routeTotal)
  const scenarioStart =
    scenarioTotal === 0 ? 0 : (scenarioPage - 1) * SIMULATION_PAGE_SIZE.scenarios + 1
  const scenarioEnd = Math.min(scenarioPage * SIMULATION_PAGE_SIZE.scenarios, scenarioTotal)
  const selectedScenarios = scenarios.filter((entry) => selectedScenarioIds.includes(entry.id))
  const simulateDisabled =
    selectedRoute === null || catalog.included.length === 0 || simulating || catalogState !== 'ready'

  const handleRoutePageChange = (page: number) => {
    setRoutePage(page)
  }

  const handleScenarioPageChange = (page: number) => {
    setSelectedScenarioIds([])
    setScenarioPage(page)
  }

  const updateAvailableQuantity = (productId: string, value: string) => {
    setAvailableQuantities((current) => ({ ...current, [productId]: value }))
  }

  const changeAvailableQuantity = (productId: string, delta: number, stock: number) => {
    const current = Number(availableQuantities[productId] ?? '0')
    const safeCurrent = Number.isFinite(current) ? current : 0
    const next = Math.min(Math.max(0, safeCurrent + delta), stock)
    updateAvailableQuantity(productId, String(next))
  }

  const addSelectedProduct = () => {
    if (selectedAvailableId === null) return
    const product = catalog.available.find((entry) => entry.id === selectedAvailableId)
    if (!product) return

    const requested = Number(availableQuantities[selectedAvailableId] ?? '0')
    const quantity = Number.isFinite(requested) && requested > 0 ? Math.min(Math.floor(requested), product.stock) : 1

    setCatalog((current) => {
      const existing = current.included.find((entry) => entry.id === product.id)
      if (existing) {
        return {
          ...current,
          included: current.included.map((entry) =>
            entry.id === product.id ? { ...entry, quantity: entry.quantity + quantity } : entry,
          ),
        }
      }
      return {
        ...current,
        included: [...current.included, { ...product, quantity }],
      }
    })
    updateAvailableQuantity(product.id, '0')
    setSelectedAvailableId(null)
  }

  const removeSelectedProduct = () => {
    if (selectedIncludedId === null) return
    setCatalog((current) => ({
      ...current,
      included: current.included.filter((entry) => entry.id !== selectedIncludedId),
    }))
    setSelectedIncludedId(null)
  }

  const handleSimulate = async () => {
    if (simulateDisabled || selectedRoute === null) return

    const parameters: SimulationParameters = {
      fuelPricePerLiter: Number(fuelPrice) || 0,
      includeSurplus,
      generalCosts: Number(generalCosts) || 0,
      hourlyRate: Number(hourlyRate) || 0,
    }

    setSimulating(true)
    setSimulateError('')
    setSimulateMessage('')

    try {
      const result = await simulationService.simulate({
        route: selectedRoute,
        parameters,
        products: catalog.included,
      })
      createdScenarios.current = [result, ...createdScenarios.current]
      setScenarioTotal((current) => current + 1)
      setSelectedScenarioIds([])
      if (scenarioPage === 1) {
        setScenarios((current) => [result, ...current].slice(0, SIMULATION_PAGE_SIZE.scenarios))
      } else {
        setScenarioPage(1)
      }
      setSimulateMessage(`Escenario ${result.id} generado correctamente.`)
    } catch {
      setSimulateError('No se pudo ejecutar la simulación. Verificá los parámetros e intentá nuevamente.')
    } finally {
      setSimulating(false)
    }
  }

  const toggleScenarioSelection = (scenarioId: string) => {
    setSelectedScenarioIds((current) => {
      if (current.includes(scenarioId)) {
        return current.filter((entry) => entry !== scenarioId)
      }
      if (current.length >= 2) return current
      return [...current, scenarioId]
    })
  }

  const openScenarioDetail = (scenario: SimulationScenario) => {
    setDetailScenario(scenario)
    setScenarioDetail(null)
    setDetailError('')
    setDetailLoading(true)
    void simulationService.getScenarioDetail(scenario.id)
      .then(setScenarioDetail)
      .catch(() => setDetailError('No se pudo cargar el detalle del escenario.'))
      .finally(() => setDetailLoading(false))
  }

  const closeScenarioDetail = () => {
    setDetailScenario(null)
    setScenarioDetail(null)
    setDetailError('')
  }

  return (
    <PageContainer className="gap-4 overflow-y-auto">
      <PageHeader
        title="Simulación de Escenarios"
        description="Módulo de Simulación de Costos Operativos"
      />

      <section aria-labelledby="simulation-parameters-title" className={PANEL}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
          <PanelHeading
            id="simulation-parameters-title"
            icon={<SlidersHorizontal className="size-5" aria-hidden="true" />}
            title="Parámetros de Simulación"
          />
          <button
            type="button"
            aria-label={
              parametersOpen
                ? 'Contraer parámetros de simulación'
                : 'Expandir parámetros de simulación'
            }
            aria-expanded={parametersOpen}
            aria-controls="simulation-parameters-content"
            onClick={() => setParametersOpen((current) => !current)}
            className={ICON_BUTTON}
          >
            {parametersOpen ? (
              <ChevronUp className="size-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>

        {parametersOpen ? (
          <div
            id="simulation-parameters-content"
            className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_18rem]"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 id="simulation-routes-title" className="text-sm font-bold text-text-primary">
                  Rutas a simular
                </h3>
                <p className="text-xs text-text-secondary">Seleccioná una sola ruta</p>
              </div>

              <div className="mt-2 overflow-x-auto rounded-md border border-border-subtle">
                <table aria-label="Rutas a simular" className="w-full min-w-[54rem] text-left">
                  <thead className="bg-background-subtle">
                    <tr>
                      <th className={TABLE_HEAD}>
                        <span className="sr-only">Selección</span>
                      </th>
                      <th className={TABLE_HEAD}>ID</th>
                      <th className={TABLE_HEAD}>Zona</th>
                      <th className={TABLE_HEAD}>Pedidos</th>
                      <th className={TABLE_HEAD}>Repartidor</th>
                      <th className={TABLE_HEAD}>Vehículo</th>
                      <th className={TABLE_HEAD}>Combustible (L)</th>
                      <th className={TABLE_HEAD}>Distancia</th>
                      <th className={TABLE_HEAD}>Tiempo</th>
                      <th className={TABLE_HEAD}>Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {routeState === 'loading' ? (
                      <tr>
                        <td colSpan={10} className="px-3 py-8 text-center text-sm text-text-secondary" role="status">
                          Cargando rutas…
                        </td>
                      </tr>
                    ) : routeState === 'error' ? (
                      <tr>
                        <td colSpan={10} className="px-3 py-8 text-center">
                          <p className="text-sm text-state-error" role="alert">
                            No se pudieron cargar las rutas.
                          </p>
                          <button
                            type="button"
                            onClick={() => setRouteRetry((current) => current + 1)}
                            className="mt-3 inline-flex items-center gap-2 rounded-md border border-border-subtle px-3 py-2 text-sm text-text-primary hover:bg-background-subtle"
                          >
                            <RefreshCw className="size-4" aria-hidden="true" />
                            Reintentar rutas
                          </button>
                        </td>
                      </tr>
                    ) : routes.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-3 py-10 text-center" role="status">
                          <span className="relative mx-auto flex size-12 items-center justify-center rounded-full bg-background-subtle text-text-muted">
                            <MapPin className="size-6" aria-hidden="true" />
                            <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-state-error text-[10px] font-bold text-text-inverse">
                              1
                            </span>
                          </span>
                          <p className="mt-3 text-sm font-semibold text-text-primary">
                            No hay rutas disponibles
                          </p>
                        </td>
                      </tr>
                    ) : (
                      routes.map((route) => {
                        const checked = selectedRoute?.id === route.id
                        return (
                          <tr key={route.id} className={checked ? 'bg-brand-primary/5' : 'hover:bg-background-subtle'}>
                            <td className={TABLE_CELL}>
                              <input
                                type="radio"
                                name="simulation-route"
                                aria-label={`Seleccionar ruta ${route.id}`}
                                checked={checked}
                                onChange={() => {
                                  setSelectedRoute(route)
                                  setSimulateMessage('')
                                  setSimulateError('')
                                }}
                                className="size-4 accent-brand-primary"
                              />
                            </td>
                            <td className={`${TABLE_CELL} font-semibold text-text-primary`}>{route.id}</td>
                            <td className={TABLE_CELL}>{route.zone}</td>
                            <td className={TABLE_CELL}>{route.orderCount}</td>
                            <td className={TABLE_CELL}>{route.driver}</td>
                            <td className={TABLE_CELL}>{route.vehicle}</td>
                            <td className={TABLE_CELL}>{formatDecimal(route.fuelLiters)}</td>
                            <td className={TABLE_CELL}>{formatDecimal(route.distanceKm)} km</td>
                            <td className={TABLE_CELL}>{formatDecimal(route.durationHours)} h</td>
                            <td className={TABLE_CELL}>{route.date}</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-text-secondary">
                  {routeTotal === 0
                    ? 'Mostrando 0 de 0 rutas'
                    : `Mostrando ${routeStart} a ${routeEnd} de ${routeTotal} rutas`}
                </p>
                <Pagination
                  noun="rutas"
                  page={routePage}
                  pageCount={routePageCount}
                  onChange={handleRoutePageChange}
                  disabled={routeState === 'loading'}
                />
              </div>
            </div>

            <aside aria-label="Costos de la simulación" className="grid content-start gap-3">
              <ParameterField
                id="simulation-fuel-price"
                label="Precio combustible ($/L)"
                value={fuelPrice}
                min={0}
                step={1}
                hint="Costo del combustible usado por la simulación."
                onChange={setFuelPrice}
              />

              <div className="flex items-center justify-between gap-3">
                <label htmlFor="simulation-surplus" className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
                  Incluir excedentes
                  <span title="Considera las unidades que exceden la venta prevista." className="inline-flex text-text-muted">
                    <Info className="size-4" aria-hidden="true" />
                    <span className="sr-only">Considera las unidades que exceden la venta prevista.</span>
                  </span>
                </label>
                <Switch
                  id="simulation-surplus"
                  aria-label="Incluir excedentes"
                  checked={includeSurplus}
                  onCheckedChange={setIncludeSurplus}
                />
              </div>

              <ParameterField
                id="simulation-general-costs"
                label="Gastos varios ($)"
                value={generalCosts}
                min={0}
                step={100}
                hint="Gastos operativos fijos del escenario."
                onChange={setGeneralCosts}
              />

              <ParameterField
                id="simulation-hourly-rate"
                label="Costo por hora ($)"
                value={hourlyRate}
                min={0}
                step={100}
                hint="Costo de la duración estimada del recorrido."
                onChange={setHourlyRate}
              />
            </aside>
          </div>
        ) : null}
      </section>

      {parametersOpen ? (
        <>
          <section aria-labelledby="simulation-products-title" className={PANEL}>
            <div className="border-b border-border-subtle px-4 py-3">
              <PanelHeading
                id="simulation-products-title"
                icon={<Boxes className="size-5" aria-hidden="true" />}
                title="Productos para venta ambulante"
              />
            </div>

            <div className="grid gap-3 p-4 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <div className="min-w-0 rounded-lg border border-border-subtle">
                <div className="flex items-center gap-1.5 border-b border-border-subtle px-3 py-2.5">
                  <Info className="size-4 text-brand-primary" aria-hidden="true" />
                  <h3 className="text-sm font-semibold text-brand-primary">Productos disponibles</h3>
                </div>

                <div className="overflow-x-auto">
                  <table aria-label="Productos disponibles" className="w-full min-w-[31rem] text-left">
                    <thead className="bg-background-subtle">
                      <tr>
                        <th className={TABLE_HEAD}>
                          <span className="sr-only">Selección</span>
                        </th>
                        <th className={TABLE_HEAD}>Producto</th>
                        <th className={TABLE_HEAD}>Stock disponible</th>
                        <th className={TABLE_HEAD}>Precio unitario ($)</th>
                        <th className={TABLE_HEAD}>Cantidad</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {catalogState === 'loading' ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-8 text-center text-sm text-text-secondary" role="status">
                            Cargando productos…
                          </td>
                        </tr>
                      ) : catalogState === 'error' ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-8 text-center">
                            <p className="text-sm text-state-error" role="alert">
                              No se pudieron cargar los productos.
                            </p>
                            <button
                              type="button"
                              onClick={() => setCatalogRetry((current) => current + 1)}
                              className="mt-3 rounded-md border border-border-subtle px-3 py-2 text-sm text-text-primary hover:bg-background-subtle"
                            >
                              Reintentar productos
                            </button>
                          </td>
                        </tr>
                      ) : catalog.available.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-8 text-center text-sm text-text-secondary" role="status">
                            No hay productos disponibles.
                          </td>
                        </tr>
                      ) : (
                        catalog.available.map((product) => {
                          const checked = selectedAvailableId === product.id
                          const quantity = availableQuantities[product.id] ?? '0'
                          return (
                            <tr key={product.id} className={checked ? 'bg-brand-primary/5' : 'hover:bg-background-subtle'}>
                              <td className={TABLE_CELL}>
                                <input
                                  type="radio"
                                  name="simulation-available-product"
                                  aria-label={`Seleccionar ${product.name} disponible`}
                                  checked={checked}
                                  onChange={() => setSelectedAvailableId(product.id)}
                                  className="size-4 accent-brand-primary"
                                />
                              </td>
                              <td className={`${TABLE_CELL} font-medium text-text-primary`}>{product.name}</td>
                              <td className={TABLE_CELL}>{formatNumber(product.stock)}</td>
                              <td className={TABLE_CELL}>{formatNumber(product.unitPrice)}</td>
                              <td className={TABLE_CELL}>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={0}
                                    max={product.stock}
                                    step={1}
                                    aria-label={`Cantidad de ${product.name}`}
                                    value={quantity}
                                    onChange={(event) => updateAvailableQuantity(product.id, event.target.value)}
                                    className="h-8 w-16 rounded-md border border-border-subtle bg-surface-base px-2 text-center text-sm text-text-primary focus:border-border-interactive focus:outline-none focus:ring-2 focus:ring-state-focus"
                                  />
                                  <span className="flex flex-col">
                                    <button
                                      type="button"
                                      aria-label={`Aumentar cantidad de ${product.name}`}
                                      onClick={() => changeAvailableQuantity(product.id, 1, product.stock)}
                                      className="rounded px-0.5 text-text-secondary hover:bg-background-subtle"
                                    >
                                      <ChevronUp className="size-3" aria-hidden="true" />
                                    </button>
                                    <button
                                      type="button"
                                      aria-label={`Disminuir cantidad de ${product.name}`}
                                      onClick={() => changeAvailableQuantity(product.id, -1, product.stock)}
                                      className="rounded px-0.5 text-text-secondary hover:bg-background-subtle"
                                    >
                                      <ChevronDown className="size-3" aria-hidden="true" />
                                    </button>
                                  </span>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 xl:flex-col">
                <button
                  type="button"
                  aria-label="Agregar producto al vehículo"
                  onClick={addSelectedProduct}
                  disabled={selectedAvailableId === null || catalogState !== 'ready'}
                  className={ICON_BUTTON}
                >
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Quitar producto del vehículo"
                  onClick={removeSelectedProduct}
                  disabled={selectedIncludedId === null || catalogState !== 'ready'}
                  className={ICON_BUTTON}
                >
                  <ArrowLeft className="size-4" aria-hidden="true" />
                </button>
              </div>

              <div className="min-w-0 rounded-lg border border-border-subtle">
                <div className="flex items-center gap-1.5 border-b border-border-subtle px-3 py-2.5">
                  <Boxes className="size-4 text-brand-primary" aria-hidden="true" />
                  <h3 className="text-sm font-semibold text-brand-primary">
                    Productos incluidos en el vehículo
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table aria-label="Productos incluidos en el vehículo" className="w-full min-w-[25rem] text-left">
                    <thead className="bg-background-subtle">
                      <tr>
                        <th className={TABLE_HEAD}>Producto</th>
                        <th className={TABLE_HEAD}>Cantidad (unid.)</th>
                        <th className={TABLE_HEAD}>Precio unitario ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {catalogState === 'loading' ? (
                        <tr>
                          <td colSpan={3} className="px-3 py-8 text-center text-sm text-text-secondary" role="status">
                            Cargando productos…
                          </td>
                        </tr>
                      ) : catalog.included.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-3 py-8 text-center text-sm text-text-secondary" role="status">
                            No hay productos incluidos en el vehículo.
                          </td>
                        </tr>
                      ) : (
                        catalog.included.map((product) => (
                          <tr
                            key={product.id}
                            className={
                              selectedIncludedId === product.id
                                ? 'bg-brand-primary/5'
                                : 'hover:bg-background-subtle'
                            }
                          >
                            <td className={TABLE_CELL}>
                              <button
                                type="button"
                                aria-label={`Seleccionar ${product.name} incluido`}
                                aria-pressed={selectedIncludedId === product.id}
                                onClick={() => setSelectedIncludedId(product.id)}
                                className="text-left font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-state-focus"
                              >
                                {product.name}
                              </button>
                            </td>
                            <td className={TABLE_CELL}>{formatNumber(product.quantity)}</td>
                            <td className={TABLE_CELL}>{formatNumber(product.unitPrice)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          <div>
            <button
              type="button"
              onClick={() => void handleSimulate()}
              disabled={simulateDisabled}
              className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-brand-accent text-base font-semibold text-text-inverse transition-colors hover:bg-brand-accent-hover focus:outline-none focus:ring-2 focus:ring-state-focus disabled:cursor-not-allowed disabled:bg-border-strong disabled:text-text-muted"
            >
              <Play className="size-5" aria-hidden="true" />
              {simulating ? 'Simulando…' : 'Simular'}
            </button>
            {simulateMessage ? (
              <p role="status" className="mt-2 text-sm font-medium text-state-success">
                {simulateMessage}
              </p>
            ) : null}
            {simulateError ? (
              <p role="alert" className="mt-2 text-sm text-state-error">
                {simulateError}
              </p>
            ) : null}
          </div>
        </>
      ) : null}

      <section aria-labelledby="simulation-history-title" className={PANEL}>
        <div className="border-b border-border-subtle px-4 py-3">
          <PanelHeading
            id="simulation-history-title"
            icon={<ListChecks className="size-5" aria-hidden="true" />}
            title="Registros de Escenarios"
            description="Historial de simulaciones realizadas y guardadas"
          />
        </div>

        <div className="overflow-x-auto">
          <table aria-label="Registros de escenarios" className="w-full min-w-[64rem] text-left">
            <thead className="bg-background-subtle">
              <tr>
                <th className={TABLE_HEAD}>
                  <span className="sr-only">Comparar</span>
                </th>
                <th className={TABLE_HEAD}>ID Escenario</th>
                <th className={TABLE_HEAD}>Fecha</th>
                <th className={TABLE_HEAD}>Ruta</th>
                <th className={TABLE_HEAD}>Zona</th>
                <th className={TABLE_HEAD}>Repartidor</th>
                <th className={TABLE_HEAD}>Vehículo</th>
                <th className={TABLE_HEAD}>Ingreso Estimado</th>
                <th className={TABLE_HEAD}>Costo Operativo</th>
                <th className={TABLE_HEAD}>Margen Bruto</th>
                <th className={TABLE_HEAD}>Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {scenarioState === 'loading' ? (
                <tr>
                  <td colSpan={11} className="px-3 py-10 text-center text-sm text-text-secondary" role="status">
                    Cargando registros…
                  </td>
                </tr>
              ) : scenarioState === 'error' ? (
                <tr>
                  <td colSpan={11} className="px-3 py-10 text-center">
                    <p className="text-sm text-state-error" role="alert">
                      No se pudieron cargar los registros.
                    </p>
                    <button
                      type="button"
                      onClick={() => setScenarioRetry((current) => current + 1)}
                      className="mt-3 inline-flex items-center gap-2 rounded-md border border-border-subtle px-3 py-2 text-sm text-text-primary hover:bg-background-subtle"
                    >
                      <RefreshCw className="size-4" aria-hidden="true" />
                      Reintentar registros
                    </button>
                  </td>
                </tr>
              ) : scenarios.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-10 text-center" role="status">
                    <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-background-subtle text-text-muted">
                      <FileText className="size-8" aria-hidden="true" />
                    </span>
                    <p className="mt-4 text-base font-semibold text-text-primary">
                      No hay escenarios registrados
                    </p>
                  </td>
                </tr>
              ) : (
                scenarios.map((scenario) => {
                  const selected = selectedScenarioIds.includes(scenario.id)
                  const selectionLocked =
                    selectedScenarioIds.length >= 2 && !selected
                  return (
                    <tr key={scenario.id} className={selected ? 'bg-brand-primary/5' : 'hover:bg-background-subtle'}>
                      <td className={TABLE_CELL}>
                        <input
                          type="checkbox"
                          aria-label={`Seleccionar ${scenario.id} para comparar`}
                          checked={selected}
                          disabled={selectionLocked}
                          onChange={() => toggleScenarioSelection(scenario.id)}
                          className="size-4 accent-brand-primary"
                        />
                      </td>
                      <td className={`${TABLE_CELL} font-semibold text-text-primary`}>{scenario.id}</td>
                      <td className={TABLE_CELL}>{scenario.date}</td>
                      <td className={TABLE_CELL}>{scenario.routeId}</td>
                      <td className={TABLE_CELL}>{scenario.zone}</td>
                      <td className={TABLE_CELL}>{scenario.driver}</td>
                      <td className={TABLE_CELL}>{scenario.vehicle}</td>
                      <td className={TABLE_CELL}>{formatCurrency(scenario.estimatedRevenue)}</td>
                      <td className={TABLE_CELL}>{formatCurrency(scenario.operatingCost)}</td>
                      <td className={`${TABLE_CELL} font-semibold text-text-primary`}>
                        {formatCurrency(scenario.grossMargin)}
                      </td>
                      <td className={TABLE_CELL}>
                        <button
                          type="button"
                          aria-label={`Ver detalle de ${scenario.id}`}
                          onClick={() => openScenarioDetail(scenario)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-brand-primary/40 px-2.5 py-1.5 text-xs font-medium text-brand-primary transition-colors hover:bg-brand-primary/10 focus:outline-none focus:ring-2 focus:ring-state-focus"
                        >
                          <Eye className="size-3.5" aria-hidden="true" />
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle px-4 py-3">
          <p className="text-sm text-text-secondary">
            {scenarioTotal === 0
              ? 'Mostrando 0 de 0 registros'
              : `Mostrando ${scenarioStart} a ${scenarioEnd} de ${scenarioTotal} registros`}
          </p>
          <Pagination
            noun="escenarios"
            page={scenarioPage}
            pageCount={scenarioPageCount}
            onChange={handleScenarioPageChange}
            disabled={scenarioState === 'loading'}
          />
        </div>

        <div className="flex justify-end px-4 pb-4">
          <button
            type="button"
            onClick={() => setCompareOpen(true)}
            disabled={selectedScenarios.length !== 2}
            className="inline-flex items-center gap-2 rounded-md bg-brand-primary px-4 py-2.5 text-sm font-semibold text-text-inverse transition-colors hover:bg-brand-primary-hover focus:outline-none focus:ring-2 focus:ring-state-focus disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Scale className="size-4" aria-hidden="true" />
            Comparar Escenarios
          </button>
        </div>
      </section>

      <Dialog open={detailScenario !== null} onOpenChange={(open) => !open && closeScenarioDetail()}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-3xl overflow-y-auto bg-surface-base">
          <DialogHeader>
            <DialogTitle>Detalle del escenario</DialogTitle>
            <DialogDescription>Información completa de la simulación guardada.</DialogDescription>
          </DialogHeader>

          {detailScenario ? (
            <div className="space-y-5">
              <section className="rounded-lg border border-border-subtle bg-background-subtle p-4" aria-label="Identificación del escenario">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <p className="text-lg font-bold text-text-primary">{detailScenario.id}</p>
                  <span className="text-sm text-text-secondary">{detailScenario.routeId}</span>
                  <span className="text-sm text-text-secondary">{detailScenario.zone}</span>
                  <span className="rounded-full bg-state-success/10 px-3 py-1 text-xs font-semibold text-state-success">Guardado</span>
                </div>
              </section>

              {detailLoading ? <p role="status" className="text-sm text-text-secondary">Cargando detalle…</p> : null}
              {detailError ? <p role="alert" className="text-sm text-state-error">{detailError}</p> : null}

              {scenarioDetail ? (
                <>
                  <section aria-label="Resultados del escenario" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      ['Ingreso estimado', formatCurrency(scenarioDetail.estimatedRevenue)],
                      ['Costo operativo', formatCurrency(scenarioDetail.operatingCost)],
                      ['Margen bruto', formatCurrency(scenarioDetail.grossMargin)],
                      ['Fecha', scenarioDetail.date],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-md border border-border-subtle p-3">
                        <p className="text-xs text-text-secondary">{label}</p>
                        <p className="mt-1 font-semibold text-text-primary">{value}</p>
                      </div>
                    ))}
                  </section>

                  <section className="space-y-2" aria-labelledby="detail-route-title">
                    <h3 id="detail-route-title" className="font-semibold text-text-primary">Datos de la ruta</h3>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-md border border-border-subtle p-3 text-sm sm:grid-cols-3">
                      {[
                        ['Repartidor', scenarioDetail.driver], ['Vehículo', scenarioDetail.vehicle],
                        ['Pedidos', formatNumber(scenarioDetail.orderCount)], ['Distancia', `${formatDecimal(scenarioDetail.distanceKm)} km`],
                        ['Duración', `${formatDecimal(scenarioDetail.durationHours)} h`], ['Combustible', `${formatDecimal(scenarioDetail.fuelLiters)} L`],
                      ].map(([label, value]) => <div key={label}><dt className="text-text-secondary">{label}</dt><dd className="font-medium text-text-primary">{value}</dd></div>)}
                    </dl>
                  </section>

                  <section className="space-y-2" aria-labelledby="detail-parameters-title">
                    <h3 id="detail-parameters-title" className="font-semibold text-text-primary">Parámetros de simulación</h3>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-md border border-border-subtle p-3 text-sm sm:grid-cols-4">
                      <div><dt className="text-text-secondary">Precio combustible</dt><dd className="font-medium text-text-primary">{formatCurrency(scenarioDetail.parameters.fuelPricePerLiter)} / L</dd></div>
                      <div><dt className="text-text-secondary">Incluir excedentes</dt><dd className="font-medium text-text-primary">{scenarioDetail.parameters.includeSurplus ? 'Sí' : 'No'}</dd></div>
                      <div><dt className="text-text-secondary">Gastos generales</dt><dd className="font-medium text-text-primary">{formatCurrency(scenarioDetail.parameters.generalCosts)}</dd></div>
                      <div><dt className="text-text-secondary">Costo por hora</dt><dd className="font-medium text-text-primary">{formatCurrency(scenarioDetail.parameters.hourlyRate)}</dd></div>
                    </dl>
                  </section>

                  <section className="space-y-2" aria-labelledby="detail-products-title">
                    <h3 id="detail-products-title" className="font-semibold text-text-primary">Productos incluidos</h3>
                    <div className="overflow-x-auto rounded-md border border-border-subtle">
                      <table aria-label="Productos incluidos" className="w-full text-left text-sm">
                        <thead className="bg-background-subtle"><tr><th className={TABLE_HEAD}>Producto</th><th className={TABLE_HEAD}>Cantidad</th></tr></thead>
                        <tbody className="divide-y divide-border-subtle">
                          {scenarioDetail.products.map((product) => <tr key={product.id}><td className={TABLE_CELL}>{product.name}</td><td className={TABLE_CELL}>{formatNumber(product.quantity)}</td></tr>)}
                        </tbody>
                      </table>
                    </div>
                  </section>
                  <p className="rounded-md bg-background-subtle p-3 text-sm text-text-secondary">Los resultados son estimaciones y no generan acciones reales.</p>
                </>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <button type="button" onClick={closeScenarioDetail} className="rounded-md border border-border-subtle px-3 py-2 text-sm text-text-primary hover:bg-background-subtle">Cerrar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-5xl overflow-y-auto bg-surface-base">
          <DialogHeader>
            <DialogTitle>Comparación de escenarios</DialogTitle>
            <DialogDescription>Revisá los datos principales y las diferencias entre los escenarios seleccionados.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2" aria-label="Escenarios comparados">
            {selectedScenarios.map((scenario) => (
              <section key={scenario.id} className="rounded-lg border border-border-subtle p-4">
                <header className="mb-3 border-b border-border-subtle pb-3">
                  <h3 className="font-bold text-text-primary">{scenario.id}</h3>
                  <p className="text-sm text-text-secondary">{scenario.date}</p>
                </header>
                <dl className="space-y-2 text-sm">
                  {[
                    ['Fecha', scenario.date], ['Ruta', scenario.routeId], ['Zona', scenario.zone],
                    ['Repartidor', scenario.driver], ['Vehículo', scenario.vehicle],
                    ['Ingreso estimado', formatCurrency(scenario.estimatedRevenue)], ['Costo operativo', formatCurrency(scenario.operatingCost)],
                    ['Margen bruto', formatCurrency(scenario.grossMargin)],
                  ].map(([label, value]) => <div key={`${scenario.id}-${label}`} className="flex items-center justify-between gap-3 border-b border-border-subtle pb-2 last:border-0 last:pb-0"><dt className="text-text-secondary">{label}</dt><dd className="text-right font-semibold text-text-primary">{value}</dd></div>)}
                </dl>
              </section>
            ))}
          </div>

          {selectedScenarios.length === 2 ? (() => {
            const [first, second] = selectedScenarios
            const highlights = [
              { label: 'Mejor ingreso', scenario: first.estimatedRevenue >= second.estimatedRevenue ? first : second, value: Math.max(first.estimatedRevenue, second.estimatedRevenue) },
              { label: 'Menor costo operativo', scenario: first.operatingCost <= second.operatingCost ? first : second, value: Math.min(first.operatingCost, second.operatingCost) },
              { label: 'Mejor margen bruto', scenario: first.grossMargin >= second.grossMargin ? first : second, value: Math.max(first.grossMargin, second.grossMargin) },
            ]
            return <section aria-label="Resumen comparativo" className="space-y-3"><h3 className="font-semibold text-text-primary">Resumen comparativo</h3><div className="grid gap-3 sm:grid-cols-3">{highlights.map((highlight) => <div key={highlight.label} className="rounded-lg border border-border-subtle bg-background-subtle p-3"><p className="text-sm text-text-secondary">{highlight.label}</p><p className="mt-1 font-semibold text-text-primary">{highlight.scenario.id}</p><p className="text-sm text-text-primary">{formatCurrency(highlight.value)}</p></div>)}</div></section>
          })() : null}

          <DialogFooter>
            <button type="button" onClick={() => setCompareOpen(false)} className="rounded-md border border-border-subtle px-3 py-2 text-sm text-text-primary hover:bg-background-subtle">Cerrar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
