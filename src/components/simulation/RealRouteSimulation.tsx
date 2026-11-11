'use client'

import { useEffect, useRef, useState } from 'react'
import { collectRealCatalog, realSimulationService, type CursorPage, type RealProduct, type RealRoute, type RealScenario, type SimulationParameters } from '@/services/simulation.service'

const initialParameters: SimulationParameters = { fuelPricePerLiter: NaN, includeSurplus: true, generalCosts: NaN, hourlyRate: NaN }
const inputClass = 'rounded border border-border-subtle bg-surface-base px-2 py-1'
const buttonClass = 'rounded bg-brand-primary px-3 py-2 text-text-inverse disabled:opacity-50'

function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = error.response
    if (typeof response === 'object' && response !== null && 'data' in response) {
      const data = response.data
      if (typeof data === 'object' && data !== null && 'message' in data && typeof data.message === 'string') return data.message
    }
  }
  if (error instanceof Error) return error.message
  return 'No se pudieron obtener los datos operativos.'
}

function usable(route: RealRoute): boolean {
  return [route.metrics?.fuelLiters, route.metrics?.durationSeconds].every((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0)
}

export function RealRouteSimulation({ canWrite }: { canWrite: boolean }) {
  const [routes, setRoutes] = useState<CursorPage<RealRoute> | null>(null)
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined])
  const [page, setPage] = useState(0)
  const [catalog, setCatalog] = useState<RealProduct[]>([])
  const [excluded, setExcluded] = useState(0)
  const [routeId, setRouteId] = useState('')
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [parameters, setParameters] = useState(initialParameters)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<RealScenario | null>(null)
  const [retry, setRetry] = useState(0)
  const [scenarioId, setScenarioId] = useState('')
  const [opening, setOpening] = useState(false)
  const inputRevision = useRef(0)

  function invalidateResult() {
    inputRevision.current += 1
    setResult(null)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    void Promise.all([realSimulationService.routes(cursors[page]), collectRealCatalog()]).then(([routePage, products]) => {
      if (cancelled) return
      setRoutes(routePage)
      setCatalog(products.items)
      setExcluded(products.excludedCount)
      setRouteId(routePage.items.find(usable)?._id ?? '')
      setLoading(false)
    }).catch((failure: unknown) => {
      if (!cancelled) { setRoutes(null); setError(errorMessage(failure)); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [page, retry, cursors])

  const validQuantities = catalog.every((product) => Number.isSafeInteger(quantities[product.id] ?? 0) && (quantities[product.id] ?? 0) >= 0 && (quantities[product.id] ?? 0) <= product.stock)
  const tooManyProducts = catalog.filter((product) => (quantities[product.id] ?? 0) > 0).length > 10000
  const validCosts = [parameters.fuelPricePerLiter, parameters.hourlyRate, parameters.generalCosts].every((value) => Number.isFinite(value) && value >= 0)
  const valid = validQuantities && !tooManyProducts && validCosts

  async function submit() {
    if (!canWrite || !routeId || !valid || submitting) return
    invalidateResult()
    setSubmitting(true)
    setError('')
    const revision = inputRevision.current
    try {
      const scenario = await realSimulationService.simulate({ routeId, parameters, products: catalog.filter((product) => (quantities[product.id] ?? 0) > 0).map((product) => ({ id: product.id, quantity: quantities[product.id] })) })
      if (revision === inputRevision.current) setResult(scenario)
    } catch (failure) { if (revision === inputRevision.current) setError(errorMessage(failure)) } finally { setSubmitting(false) }
  }

  async function openScenario() {
    if (!scenarioId.trim() || opening) return
    invalidateResult()
    const revision = inputRevision.current
    setError('')
    setOpening(true)
    try {
      const scenario = await realSimulationService.getScenario(scenarioId.trim())
      if (revision === inputRevision.current) setResult(scenario)
    } catch (failure) {
      if (revision === inputRevision.current) setError(errorMessage(failure))
    } finally { setOpening(false) }
  }

  return <section className="space-y-4 rounded-lg border border-border-subtle bg-surface-base p-4">
    <h2 className="text-lg font-semibold">Simulación de rutas reales</h2>
    <p>Utiliza rutas guardadas y productos reales. Los resultados son estimaciones.</p>
    <div className="flex flex-wrap items-end gap-2"><label>ID de escenario real<input className={`${inputClass} block`} value={scenarioId} onChange={(event) => { invalidateResult(); setScenarioId(event.target.value) }} /></label><button className={buttonClass} type="button" disabled={!scenarioId.trim() || opening} onClick={() => void openScenario()}>Abrir escenario real</button></div>
    {loading && <p role="status">Cargando rutas y catálogo…</p>}
    {error && <div role="alert">{error} <button type="button" onClick={() => { invalidateResult(); setRetry((value) => value + 1) }}>Reintentar</button></div>}
    {!loading && routes && <>
      <fieldset className="space-y-2"><legend className="font-semibold">Rutas guardadas</legend>
        {routes.items.length === 0 && <p>No hay rutas disponibles.</p>}
        {routes.items.map((route) => <label key={route._id} className="block">
          <input type="radio" name="real-route" checked={routeId === route._id} disabled={!usable(route)} onChange={() => { invalidateResult(); setRouteId(route._id) }} />{' '}
          {route._id} — {route.zoneSnapshot?.name ?? 'Sin zona'} — {route.planningDate} — {usable(route) ? `${route.metrics?.fuelLiters} L, ${(route.metrics?.durationSeconds ?? 0) / 3600} h` : 'Métricas de combustible o duración no disponibles'}
        </label>)}
        <div className="flex gap-2"><button type="button" disabled={page === 0} onClick={() => { invalidateResult(); setPage(page - 1) }}>Anterior</button>
          <button type="button" disabled={!routes.hasMore || !routes.nextCursor || cursors.slice(0, page + 1).includes(routes.nextCursor)} onClick={() => { if (routes.nextCursor) { invalidateResult(); setCursors([...cursors.slice(0, page + 1), routes.nextCursor]); setPage(page + 1) } }}>Siguiente</button></div>
      </fieldset>
      <fieldset className="grid gap-2 sm:grid-cols-3"><legend className="font-semibold">Parámetros de simulación</legend>
        {([['fuelPricePerLiter', 'Precio combustible ($/L)'], ['generalCosts', 'Gastos varios ($)'], ['hourlyRate', 'Costo por hora ($)']] as const).map(([key, label]) => <label key={key}>{label}<input className={`${inputClass} block`} type="number" min="0" value={Number.isNaN(parameters[key]) ? '' : parameters[key]} onChange={(event) => { invalidateResult(); setParameters({ ...parameters, [key]: event.target.value === '' ? NaN : Number(event.target.value) }) }} /></label>)}
        <label><input type="checkbox" checked={parameters.includeSurplus} onChange={(event) => { invalidateResult(); setParameters({ ...parameters, includeSurplus: event.target.checked }) }} /> Incluir excedentes</label>
        <p className="text-sm">El cálculo actual no aplica excedentes.</p>
      </fieldset>
      <fieldset className="space-y-2"><legend className="font-semibold">Productos reales</legend>
        {excluded > 0 && <p>{excluded} productos excluidos por datos incompletos.</p>}
        {catalog.map((product) => <label key={product.id} className="block">{product.name} — stock {product.stock} — ${product.precioUnitario} <input className={inputClass} aria-label={`Cantidad de ${product.name}`} type="number" min="0" step="1" max={product.stock} value={Number.isNaN(quantities[product.id]) ? '' : quantities[product.id] ?? 0} onChange={(event) => { invalidateResult(); setQuantities({ ...quantities, [product.id]: event.target.value === '' ? NaN : Number(event.target.value) }) }} /></label>)}
      </fieldset>
      {(!validCosts || !validQuantities) && <p role="alert">Ingresá costos válidos y cantidades con un entero seguro, no negativo y dentro del stock disponible.</p>}
      {tooManyProducts && <p role="alert">Podés incluir hasta 10.000 productos en la simulación.</p>}
      {!canWrite && <p>La creación requiere el permiso simulation:write.</p>}
      <button className={buttonClass} type="button" disabled={!canWrite || !routeId || !valid || submitting} onClick={() => void submit()}>{submitting ? 'Simulando…' : 'Simular ruta real'}</button>
    </>}
    {result && <div role="status"><p>Escenario: {result.id} — Ruta: {result.routeId}</p><p>Ingreso estimado: {result.estimatedRevenue} — Costo operativo: {result.operatingCost} — Margen bruto: {result.grossMargin}</p>{result.routeMetrics && <p>Combustible: {result.routeMetrics.fuelLiters} L — Duración: {result.routeMetrics.durationHours} h</p>}{result.parameters && <p>Precio combustible: {result.parameters.fuelPricePerLiter} — Gastos varios: {result.parameters.generalCosts} — Costo por hora: {result.parameters.hourlyRate} — Incluir excedentes: {result.parameters.includeSurplus ? 'Sí' : 'No'}</p>}{result.products?.map((product) => <p key={product.id}>{product.name} — ID: {product.id} — Cantidad: {product.quantity} — Precio: {product.unitPrice} — Stock: {product.stock}</p>)}</div>}
  </section>
}
