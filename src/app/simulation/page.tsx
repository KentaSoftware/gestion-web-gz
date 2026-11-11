'use client'

import { useEffect, useState } from 'react'
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CalendarDays, Calculator, ChevronDown,
  ChevronLeft, ChevronRight, ChevronUp, ClipboardList, DollarSign, Eye, FileText,
  Info, MapPin, Package, Play, Route, Scale, Settings2, ShoppingCart, TrendingUp,
  Truck, UserRound,
} from 'lucide-react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { PageContainer, PageHeader, PageSection } from '@/components/layout/PageLayout'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { useSessionAccess } from '@/hooks/useSessionAccess'
import { SESSION_STATUS } from '@/interfaces/auth.interface'
import { simulationService, type SimulationCatalog, type SimulationPage, type SimulationRoute, type SimulationScenario, type SimulationScenarioDetail, type SimulationParameters } from '@/services/simulation.service'

const BUTTON = 'inline-flex items-center justify-center gap-1 rounded border border-border-subtle bg-surface-base px-2 py-1 text-sm text-text-secondary hover:bg-background-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-state-focus disabled:cursor-not-allowed disabled:opacity-50'
const PRIMARY_BUTTON = 'inline-flex items-center justify-center gap-2 rounded bg-brand-primary px-4 py-2 text-sm font-semibold text-text-inverse hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-state-focus disabled:cursor-not-allowed disabled:opacity-50'
const TRANSFER_BUTTON = 'flex size-11 items-center justify-center rounded border border-border-subtle bg-background-subtle text-brand-primary hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-state-focus disabled:cursor-not-allowed disabled:opacity-40'
const INPUT = 'w-full rounded border border-border-subtle bg-surface-base px-2 py-1 text-sm text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-state-focus'
const TABLE = 'w-full min-w-max text-left text-sm [&_th]:bg-background-subtle [&_th]:px-2 [&_th]:py-1 [&_th]:font-semibold [&_th]:text-brand-primary [&_td]:border-t [&_td]:border-border-subtle [&_td]:px-2 [&_td]:py-1'
const PANEL = 'rounded-lg border border-border-subtle bg-surface-base'
const INITIAL_PARAMETERS: SimulationParameters = { fuelPricePerLiter: 1250, includeSurplus: true, generalCosts: 25000, hourlyRate: 8000 }
const money = (value: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value)
const number = (value: number) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 }).format(value)
const failureMessage = (failure: unknown): string => {
  if (typeof failure === 'object' && failure !== null && 'response' in failure) {
    const response = failure.response
    if (typeof response === 'object' && response !== null && 'data' in response) {
      const data = response.data
      if (typeof data === 'object' && data !== null && 'message' in data && typeof data.message === 'string') return data.message
    }
  }
  return 'No se pudieron cargar los datos. Intente nuevamente.'
}

interface WorkspaceData {
  routes: SimulationPage<SimulationRoute>
  catalog: SimulationCatalog
  scenarios: SimulationPage<SimulationScenario>
}

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  label: string
  onChange: (page: number) => void
}

function Pagination({ page, pageSize, total, label, onChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)
  return <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle px-3 py-2 text-xs text-text-secondary">
    <span>Mostrando {total === 0 ? '0 de 0' : `${first} a ${last} de ${total}`} {label}</span>
    <div className="flex gap-1">
      <button type="button" className={BUTTON} aria-label={`Página anterior de ${label}`} disabled={page <= 1 || total === 0} onClick={() => onChange(page - 1)}><ChevronLeft className="size-4" /></button>
      {Array.from({ length: pages }, (_, index) => index + 1).map((item) => (
        <button
          type="button"
          className={item === page && total > 0 ? PRIMARY_BUTTON : BUTTON}
          key={item}
          aria-label={`Página ${item} de ${label}`}
          aria-current={item === page ? 'page' : undefined}
          disabled={total === 0}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
      <button type="button" className={BUTTON} aria-label={`Página siguiente de ${label}`} disabled={page >= pages || total === 0} onClick={() => onChange(page + 1)}><ChevronRight className="size-4" /></button>
    </div>
  </div>
}

function Facts({ items, columns = 3 }: { items: Array<[string, string | number]>; columns?: number }) {
  return (
    <dl className={`grid grid-cols-2 gap-3 text-sm ${columns === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-text-secondary">{label}</dt>
          <dd className="font-semibold text-text-primary">{value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

function DetailContent({ detail }: { detail: SimulationScenarioDetail }) {
  const metrics = [
    { label: 'Ingreso Estimado', value: money(detail.estimatedRevenue), icon: DollarSign },
    { label: 'Costo Operativo', value: money(detail.operatingCost), icon: Calculator },
    { label: 'Margen Bruto', value: money(detail.grossMargin), icon: TrendingUp },
    { label: 'Fecha', value: detail.date, icon: CalendarDays },
  ]
  return (
    <div className="space-y-4 text-sm">
      <div className="rounded border border-border-subtle bg-background-subtle p-3">
        <Facts items={[["ID Escenario", detail.id], ['Ruta', detail.routeId], ['Zona', detail.zone]]} />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div className="rounded border border-border-subtle p-3" key={label}>
            <div className="flex items-center gap-1 text-text-secondary"><Icon className="size-4 text-brand-primary" aria-hidden="true" />{label}</div>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <section className="overflow-hidden rounded border border-border-subtle">
        <h3 className="flex items-center gap-2 bg-background-subtle px-3 py-2 font-semibold text-brand-primary"><Route className="size-4" aria-hidden="true" />Datos de la Ruta</h3>
        <div className="p-3"><Facts items={[["Repartidor", detail.driver || '—'], ['Vehículo', detail.vehicle || '—'], ['Pedidos', detail.orderCount], ['Distancia', `${number(detail.distanceKm)} km`], ['Tiempo', `${number(detail.durationHours)} h`], ['Combustible', `${number(detail.fuelLiters)} L`]]} /></div>
      </section>
      <section className="overflow-hidden rounded border border-border-subtle">
        <h3 className="flex items-center gap-2 bg-background-subtle px-3 py-2 font-semibold text-brand-primary"><Settings2 className="size-4" aria-hidden="true" />Parámetros de Simulación</h3>
        <div className="p-3"><Facts columns={4} items={[["Precio combustible ($/L)", money(detail.parameters.fuelPricePerLiter)], ['Incluir excedentes', detail.parameters.includeSurplus ? 'Sí' : 'No'], ['Gastos varios', money(detail.parameters.generalCosts)], ['Costo por hora', money(detail.parameters.hourlyRate)]]} /></div>
      </section>
      <section className="overflow-hidden rounded border border-border-subtle">
        <h3 className="flex items-center gap-2 bg-background-subtle px-3 py-2 font-semibold text-brand-primary"><Package className="size-4" aria-hidden="true" />Productos incluidos en venta ambulatoria</h3>
        <table className={TABLE}>
          <thead><tr><th>Producto</th><th>Cantidad</th></tr></thead>
          <tbody>{detail.products.map((product) => <tr key={product.id}><td>{product.name}</td><td>{product.quantity}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="overflow-hidden rounded border border-border-subtle">
        <h3 className="flex items-center gap-2 bg-background-subtle px-3 py-2 font-semibold text-brand-primary"><Info className="size-4" aria-hidden="true" />Observaciones</h3>
        <div className="p-3"><p>Los resultados mostrados son estimaciones y no ejecutan acciones reales automáticamente.</p><p className="text-text-secondary">Datos de muestra.</p></div>
      </section>
    </div>
  )
}

function ComparisonContent({ details }: { details: SimulationScenarioDetail[] }) {
  const [first, second] = details
  const metrics = [
    { label: 'Mayor ingreso', key: 'estimatedRevenue' as const, choose: Math.max, icon: ArrowUp, color: 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200' },
    { label: 'Menor costo operativo', key: 'operatingCost' as const, choose: Math.min, icon: ArrowDown, color: 'bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-200' },
    { label: 'Mayor margen bruto', key: 'grossMargin' as const, choose: Math.max, icon: TrendingUp, color: 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200' },
  ]
  return (
    <div className="space-y-4 text-sm">
      <p className="text-text-secondary">Comparación ilustrativa de datos de muestra.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {details.map((item) => {
          const rows = [
            { label: 'Fecha', value: item.date, icon: CalendarDays },
            { label: 'Ruta', value: item.routeId, icon: Route },
            { label: 'Zona', value: item.zone, icon: MapPin },
            { label: 'Repartidor', value: item.driver || '—', icon: UserRound },
            { label: 'Vehículo', value: item.vehicle || '—', icon: Truck },
          ]
          return (
            <section className="overflow-hidden rounded border border-border-subtle" key={item.id}>
              <div className="bg-background-subtle p-3 text-brand-primary"><strong>{item.id}</strong><p>{item.date}</p></div>
              <dl className="space-y-2 p-3">
                {rows.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-2 text-text-secondary"><Icon className="size-4 text-brand-primary" aria-hidden="true" />{label}</dt>
                    <dd className="text-right font-semibold">{value}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-3 border-t border-border-subtle pt-2 text-state-success"><dt>Ingreso Estimado</dt><dd className="font-semibold">{money(item.estimatedRevenue)}</dd></div>
                <div className="flex justify-between gap-3 text-brand-accent"><dt>Costo Operativo</dt><dd className="font-semibold">{money(item.operatingCost)}</dd></div>
                <div className="flex justify-between gap-3 text-brand-primary"><dt>Margen Bruto</dt><dd className="font-semibold">{money(item.grossMargin)}</dd></div>
              </dl>
            </section>
          )
        })}
      </div>
      <section>
        <h3 className="flex items-center gap-2 font-semibold text-brand-primary"><Scale className="size-4" aria-hidden="true" />Resumen comparativo</h3>
        <p className="mb-2 text-text-secondary">Principales diferencias entre los escenarios seleccionados</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {metrics.map(({ label, key, choose, icon: Icon, color }) => (
            <div className={`rounded border border-border-subtle p-3 ${color}`} key={key}>
              <h4 className="flex items-center gap-1 font-semibold"><Icon className="size-4" aria-hidden="true" />{label}</h4>
              <p className="font-bold">{first[key] === second[key] ? 'Empate' : (choose(first[key], second[key]) === first[key] ? first.id : second.id)}</p>
              <p className="text-xs">{first.id}: {money(first[key])} vs {second.id}: {money(second[key])}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function SimulationWorkspace() {
  const { status, permissions, isAdmin } = useSessionAccess()
  const canRead = status === SESSION_STATUS.READY && (isAdmin || permissions.includes('simulation:read'))
  const canWrite = status === SESSION_STATUS.READY && (isAdmin || permissions.includes('simulation:write'))
  const [data, setData] = useState<WorkspaceData | null>(null)
  const [routePage, setRoutePage] = useState(1)
  const [scenarioPage, setScenarioPage] = useState(1)
  const [reload, setReload] = useState(0)
  const [selectedRoute, setSelectedRoute] = useState('')
  const [knownRoutes, setKnownRoutes] = useState<Record<string, SimulationRoute>>({})
  const [availableId, setAvailableId] = useState('')
  const [includedId, setIncludedId] = useState('')
  const [draft, setDraft] = useState<Record<string, number>>({})
  const [included, setIncluded] = useState<Record<string, number> | null>(null)
  const [parameters, setParameters] = useState(INITIAL_PARAMETERS)
  const [expanded, setExpanded] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createMessage, setCreateMessage] = useState('')
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([])
  const [detailId, setDetailId] = useState<string | null>(null)
  const [compareOpen, setCompareOpen] = useState(false)
  const [dialogData, setDialogData] = useState<SimulationScenarioDetail[]>([])
  const [dialogLoading, setDialogLoading] = useState(false)
  const [dialogError, setDialogError] = useState('')
  const [dialogRetry, setDialogRetry] = useState(0)

  useEffect(() => {
    if (!canRead) return
    let cancelled = false
    setLoading(true)
    setError('')
    void Promise.all([simulationService.getRoutes(routePage), simulationService.getCatalog(), simulationService.getScenarios(scenarioPage)]).then(([routes, catalog, scenarios]) => {
      if (cancelled) return
      setData({ routes, catalog, scenarios })
      setKnownRoutes((current) => ({ ...current, ...Object.fromEntries(routes.items.map((route) => [route.id, route])) }))
      setSelectedRoute((current) => current || routes.items[0]?.id || '')
      setAvailableId((current) => current || catalog.available[0]?.id || '')
      setIncluded((current) => current ?? Object.fromEntries(catalog.included.map((product) => [product.id, product.quantity])))
      setLoading(false)
    }).catch((failure: unknown) => {
      if (!cancelled) { setError(failureMessage(failure)); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [canRead, routePage, scenarioPage, reload])

  useEffect(() => {
    const ids = compareOpen ? selectedScenarios : detailId === null ? [] : [detailId]
    if (ids.length === 0) return
    let cancelled = false
    setDialogData([])
    setDialogError('')
    setDialogLoading(true)
    void Promise.all(ids.map((id) => simulationService.getScenarioDetail(id))).then((result) => {
      if (!cancelled) { setDialogData(result); setDialogLoading(false) }
    }).catch((failure: unknown) => {
      if (!cancelled) { setDialogError(failureMessage(failure)); setDialogLoading(false) }
    })
    return () => { cancelled = true }
  }, [detailId, compareOpen, selectedScenarios, dialogRetry])

  const validParameters = [parameters.fuelPricePerLiter, parameters.generalCosts, parameters.hourlyRate].every((value) => Number.isFinite(value) && value >= 0)
  const validDraft = data?.catalog.available.every((product) => Number.isInteger(draft[product.id] ?? 0) && (draft[product.id] ?? 0) >= 0 && (draft[product.id] ?? 0) + (included?.[product.id] ?? 0) <= product.stock) ?? false
  const selectedProduct = data?.catalog.available.find((product) => product.id === availableId)
  const amount = draft[availableId] ?? 0
  const canTransfer = selectedProduct !== undefined && Number.isInteger(amount) && amount > 0 && amount + (included?.[availableId] ?? 0) <= selectedProduct.stock

  const createScenario = async () => {
    const route = knownRoutes[selectedRoute]
    if (!canWrite || !data || !route || !validParameters || !validDraft || submitting || data.routes.total === 0) return
    setSubmitting(true)
    setCreateMessage('')
    try {
      const result = await simulationService.simulate({ route, parameters, products: data.catalog.available.map((product) => ({ ...product, quantity: included?.[product.id] ?? 0 })) })
      setCreateMessage(`Escenario creado: ${result.id}`)
      if (scenarioPage === 1) {
        setReload((value) => value + 1)
      } else setScenarioPage(1)
    } catch (failure) { setCreateMessage(failureMessage(failure)) } finally { setSubmitting(false) }
  }

  if (status === SESSION_STATUS.HYDRATING) return <PageContainer><p role="status">Verificando el acceso a Simulación…</p></PageContainer>
  if (!canRead) return <PageContainer><p role="alert">No tenés permiso simulation:read para acceder a Simulación.</p></PageContainer>

  return <PageContainer>
    <PageHeader title="Simulación de Escenarios" description="Módulo de Simulación de Costos Operativos" />
    {loading && <p role="status">Cargando datos…</p>}
    {error && <div role="alert">{error} <button className={BUTTON} onClick={() => setReload((value) => value + 1)}>Reintentar</button></div>}
    {data && !loading && <>
      <PageSection><div className={PANEL}>
        <div className="flex items-center justify-between gap-2 border-b border-border-subtle px-4 py-3">
          <h2 className="flex items-center gap-2 font-semibold text-brand-primary"><Calculator className="size-5" />Parámetros de Simulación</h2>
          <button type="button" className={BUTTON} aria-label={expanded ? 'Contraer parámetros' : 'Expandir parámetros'} aria-expanded={expanded} aria-controls="simulation-parameters" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        </div>
        <div id="simulation-parameters" hidden={!expanded}>
          <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,3fr)_minmax(15rem,1fr)]">
            <div className="min-w-0">
              <h3 className="mb-2 text-sm font-semibold text-text-primary">Rutas a simular (selecciona una sola ruta)</h3>
              <div className="overflow-x-auto">
                <table aria-label="Rutas" className={TABLE}>
                  <thead>
                    <tr>
                      <th><span className="sr-only">Selección</span></th>
                      {['ID', 'Zona', 'Pedidos', 'Repartidor', 'Vehículo', 'Combustible (L)', 'Distancia', 'Tiempo', 'Fecha'].map((label) => <th key={label}>{label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {data.routes.items.map((route) => (
                      <tr key={route.id} className={route.id === selectedRoute ? 'bg-background-subtle' : ''}>
                        <td><input type="radio" name="route" aria-label={`Seleccionar ruta ${route.id}`} checked={selectedRoute === route.id} onChange={() => setSelectedRoute(route.id)} /></td>
                        <td>{route.id}</td><td>{route.zone}</td><td>{route.orderCount}</td>
                        <td>{route.driver}</td><td>{route.vehicle}</td><td>{number(route.fuelLiters)} L</td>
                        <td>{number(route.distanceKm)} km</td><td>{number(route.durationHours)} h</td><td>{route.date}</td>
                      </tr>
                    ))}
                    {data.routes.items.length === 0 && (
                      <tr><td colSpan={10} className="text-center text-text-secondary"><MapPin className="mx-auto my-2 size-6" />No hay rutas disponibles</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination {...data.routes} label="rutas" onChange={setRoutePage} />
            </div>
            <div className="space-y-3 text-sm">
              <label className="block">
                Precio combustible ($/L)
                <input className={INPUT} type="number" min="0" value={Number.isNaN(parameters.fuelPricePerLiter) ? '' : parameters.fuelPricePerLiter} onChange={(event) => setParameters({ ...parameters, fuelPricePerLiter: event.target.value === '' ? NaN : Number(event.target.value) })} />
              </label>
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <label htmlFor="include-surplus">Incluir excedentes</label>
                  <span tabIndex={0} title="El cálculo de muestra no aplica excedentes." aria-label="El cálculo de muestra no aplica excedentes.">
                    <Info className="size-4 text-text-secondary" aria-hidden="true" />
                  </span>
                </div>
                <Switch
                  id="include-surplus"
                  checked={parameters.includeSurplus}
                  onCheckedChange={(checked) => setParameters({ ...parameters, includeSurplus: checked })}
                  className="data-[state=checked]:bg-brand-primary"
                />
              </div>
              <label className="block">
                Gastos varios ($)
                <input className={INPUT} type="number" min="0" value={Number.isNaN(parameters.generalCosts) ? '' : parameters.generalCosts} onChange={(event) => setParameters({ ...parameters, generalCosts: event.target.value === '' ? NaN : Number(event.target.value) })} />
              </label>
              <label className="block">
                Costo por hora ($)
                <input className={INPUT} type="number" min="0" value={Number.isNaN(parameters.hourlyRate) ? '' : parameters.hourlyRate} onChange={(event) => setParameters({ ...parameters, hourlyRate: event.target.value === '' ? NaN : Number(event.target.value) })} />
              </label>
              {!validParameters && <p role="alert" className="text-state-error">Ingresá costos válidos y no negativos.</p>}
            </div>
          </div>
          <div className="border-t border-border-subtle p-4">
            <h3 className="mb-3 font-semibold text-brand-primary">Productos para venta ambulatoria</h3>
            <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <div className="min-w-0">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-primary"><Package className="size-4" aria-hidden="true" />Productos disponibles</h4>
              <div className="overflow-x-auto rounded border border-border-subtle">
                <table className={TABLE} aria-label="Productos disponibles">
                  <thead>
                    <tr><th><span className="sr-only">Selección</span></th><th>Producto</th><th>Stock disponible</th><th>Precio unitario ($)</th><th>Cantidad</th></tr>
                  </thead>
                  <tbody>
                    {data.catalog.available.map((product) => (
                      <tr key={product.id} className={availableId === product.id ? 'bg-background-subtle' : ''}>
                        <td>
                          <input type="radio" name="available-product" aria-label={`Seleccionar producto ${product.name}`} checked={availableId === product.id} onChange={() => setAvailableId(product.id)} />
                        </td>
                        <td>{product.name}</td>
                        <td>{product.stock}</td>
                        <td>{money(product.unitPrice)}</td>
                        <td>
                          <input
                            className="w-16 rounded border border-border-subtle bg-surface-base px-1"
                            aria-label={`Cantidad de ${product.name}`}
                            type="number" min="0" step="1" max={product.stock}
                            value={Number.isNaN(draft[product.id]) ? '' : draft[product.id] ?? 0}
                            onChange={(event) => setDraft({ ...draft, [product.id]: event.target.value === '' ? NaN : Number(event.target.value) })}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!validDraft && <p role="alert" className="text-sm text-state-error">Ingrese cantidades enteras dentro del stock disponible.</p>}
            </div>
            <div className="flex justify-center gap-2 lg:flex-col lg:pt-8">
              <button
                type="button"
                className={TRANSFER_BUTTON}
                aria-label="Agregar producto al vehículo"
                disabled={!canTransfer}
                onClick={() => {
                  setIncluded({ ...included, [availableId]: (included?.[availableId] ?? 0) + amount })
                  setDraft({ ...draft, [availableId]: 0 })
                }}
              >
                <ArrowRight className="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={TRANSFER_BUTTON}
                aria-label="Quitar producto del vehículo"
                disabled={!includedId || !((included?.[includedId] ?? 0) > 0)}
                onClick={() => {
                  setIncluded({ ...included, [includedId]: 0 })
                  setIncludedId('')
                }}
              >
                <ArrowLeft className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="min-w-0">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-primary"><ShoppingCart className="size-4" aria-hidden="true" />Productos incluidos en el vehículo</h4>
              <div className="overflow-x-auto rounded border border-border-subtle">
                <table className={TABLE} aria-label="Productos incluidos en el vehículo">
                  <thead><tr><th>Producto</th><th>Cantidad (unid.)</th><th>Precio unitario ($)</th></tr></thead>
                  <tbody>
                    {data.catalog.available.filter((product) => (included?.[product.id] ?? 0) > 0).map((product) => (
                      <tr key={product.id} className={includedId === product.id ? 'bg-background-subtle' : ''}>
                        <td>
                          <button type="button" aria-pressed={includedId === product.id} aria-label={`Seleccionar incluido ${product.name}`} className="text-left underline-offset-2 hover:underline" onClick={() => setIncludedId(product.id)}>
                            {product.name}
                          </button>
                        </td>
                        <td>{included?.[product.id]}</td>
                        <td>{money(product.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-1 text-xs text-text-secondary">Seleccione un producto incluido para retirarlo por completo.</p>
            </div>
          </div>
          <button
            type="button"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded bg-brand-accent px-4 py-2 font-semibold text-text-primary disabled:opacity-50"
            disabled={!canWrite || !selectedRoute || data.routes.total === 0 || !validParameters || !validDraft || submitting}
            onClick={() => void createScenario()}
          >
            <Play className="size-4" aria-hidden="true" />Simular
          </button>
          {!canWrite && <p className="text-xs text-text-secondary">La creación requiere el permiso simulation:write.</p>}
          {createMessage && <p role="status" className="mt-2 text-sm">{createMessage}</p>}
          </div>
        </div>
      </div></PageSection>
      <PageSection>
        <div className={PANEL}>
          <div className="flex items-center gap-2 px-4 pt-3 text-brand-primary">
            <ClipboardList className="size-5" aria-hidden="true" />
            <h2 className="font-semibold">Registros de Escenarios</h2>
          </div>
          <p className="px-4 pb-3 text-sm text-text-secondary">Historial de simulaciones realizadas y guardadas</p>
          <div className="overflow-x-auto">
            <table className={TABLE} aria-label="Registros de Escenarios">
              <thead>
                <tr>
                  <th><span className="sr-only">Selección</span></th>
                  {['ID Escenario', 'Fecha', 'Ruta', 'Zona', 'Repartidor', 'Vehículo', 'Ingreso Estimado', 'Costo Operativo', 'Margen Bruto', 'Acción'].map((label) => <th key={label}>{label}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.scenarios.items.map((scenario) => (
                  <tr key={scenario.id}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Seleccionar escenario ${scenario.id}`}
                        checked={selectedScenarios.includes(scenario.id)}
                        disabled={!selectedScenarios.includes(scenario.id) && selectedScenarios.length >= 2}
                        onChange={(event) => setSelectedScenarios((current) => event.target.checked ? [...current, scenario.id] : current.filter((id) => id !== scenario.id))}
                      />
                    </td>
                    <td>{scenario.id}</td><td>{scenario.date}</td><td>{scenario.routeId}</td>
                    <td>{scenario.zone}</td><td>{scenario.driver || '—'}</td><td>{scenario.vehicle || '—'}</td>
                    <td>{money(scenario.estimatedRevenue)}</td><td>{money(scenario.operatingCost)}</td><td>{money(scenario.grossMargin)}</td>
                    <td>
                      <button type="button" className={BUTTON} aria-label={`Ver detalle ${scenario.id}`} onClick={() => setDetailId(scenario.id)}>
                        <Eye className="size-4" aria-hidden="true" />Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
                {data.scenarios.items.length === 0 && (
                  <tr><td colSpan={11} className="text-center text-text-secondary"><FileText className="mx-auto my-2 size-6" />No hay escenarios registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination {...data.scenarios} label="registros" onChange={setScenarioPage} />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle p-3">
            <span className="text-xs text-text-secondary">Seleccione dos escenarios para comparar ({selectedScenarios.length}/2).</span>
            <button type="button" className={PRIMARY_BUTTON} disabled={selectedScenarios.length !== 2} onClick={() => setCompareOpen(true)}>
              <Scale className="size-4" aria-hidden="true" />Comparar Escenarios
            </button>
          </div>
        </div>
      </PageSection>
    </>}
    <Dialog
      open={detailId !== null || compareOpen}
      onOpenChange={(open) => {
        if (!open) {
          setDetailId(null)
          setCompareOpen(false)
          setDialogData([])
          setDialogError('')
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-brand-primary">
            {compareOpen ? <Scale className="size-5" /> : <FileText className="size-5" />}
            {compareOpen ? 'Comparar Escenarios' : 'Detalle del Escenario'}
          </DialogTitle>
          <DialogDescription>{compareOpen ? 'Comparación detallada de los escenarios seleccionados' : 'Consulta completa de la simulación seleccionada'}</DialogDescription>
        </DialogHeader>
        {dialogLoading && <p role="status">Cargando escenario…</p>}
        {dialogError && <div role="alert">{dialogError} <button className={BUTTON} type="button" onClick={() => setDialogRetry((value) => value + 1)}>Reintentar</button></div>}
        {!dialogLoading && !dialogError && (compareOpen
          ? dialogData.length === 2 && <ComparisonContent details={dialogData} />
          : dialogData[0] && <DetailContent detail={dialogData[0]} />)}
        <DialogFooter>
          <button type="button" className={PRIMARY_BUTTON} onClick={() => { setDetailId(null); setCompareOpen(false); setDialogData([]) }}>Cerrar</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </PageContainer>
}

export default function SimulationPage() {
  return <ProtectedRoute><SimulationWorkspace /></ProtectedRoute>
}
