'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, Boxes, ChevronLeft, ChevronRight, CircleHelp, PackageSearch, RefreshCw, Search, X, Settings2, FileText, Trash2 } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout/PageLayout'
import apiClient from '@/utils/client'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const TIME_ZONE = 'America/Argentina/Buenos_Aires'
const PAGE_SIZE = 8
const INITIAL_ALERT_LIMIT = 5
const SEVERITIES = { ALL: 'ALL', CRITICAL: 'CRITICAL', WARNING: 'WARNING', INFO: 'INFO' } as const
type SeverityFilter = (typeof SEVERITIES)[keyof typeof SEVERITIES]
type AlertSeverity = Exclude<SeverityFilter, 'ALL'>

interface StockAlert {
  productId: string
  productName: string
  type: string
  severity: AlertSeverity
  explanation: string
  dataQuality: string
}

interface StockItem {
  productId: string
  productName: string
  categoryName?: string
  imagePath?: string
  physicalQuantity: number
  committedQuantity: number
  availableToSell: number
  expiredQuantity: number
  dataQuality: string
  minimum: number | null
  expiryAlertDays: number
  alerts: StockAlert[]
  latestSale: { status: 'RECORDED' | 'INCOMPLETE'; occurredAt?: string }
}

interface GlobalSummary {
  belowMinimumProductCount: number
  expiringProductCount: number
  expiredProductCount: number
  lowRotationProductCount: number
  activeAlertCount: number
}

interface StockOverview {
  page: number
  pageSize: number
  total: number
  items: StockItem[]
  globalSummary: GlobalSummary
  globalAlerts: StockAlert[]
}

interface StockMovement {
  movementId?: string
  type: string
  quantity: number
  occurredAt: string
}

interface StockDetail {
  availability: { physicalQuantity: number; committedQuantity: number; availableToSell: number; expiredQuantity: number }
  movements: StockMovement[]
}

interface ExpiredRemovalResult {
  productId: string
  status?: 'REMOVED' | 'PARTIAL' | 'NO_ELIGIBLE' | 'FAILED'
  outcome?: 'REMOVED' | 'PARTIAL' | 'NO_ELIGIBLE'
  removedQuantity: number
  errorCode?: string
}

interface ExpiredBulkResult {
  results: ExpiredRemovalResult[]
}

const EMPTY_SUMMARY: GlobalSummary = {
  belowMinimumProductCount: 0,
  expiringProductCount: 0,
  expiredProductCount: 0,
  lowRotationProductCount: 0,
  activeAlertCount: 0,
}

const dateInBuenosAires = (): string => new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date())

const formatDate = (value: string): string => new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: TIME_ZONE,
}).format(new Date(value))

const formatAlertType = (type: string): string => ({
  LOW_STOCK: 'Stock bajo', CRITICAL_STOCK: 'Stock crítico', EXPIRING_SOON: 'Próximo a vencer',
  EXPIRED: 'Existencias vencidas', LOW_ROTATION: 'Baja rotación',
}[type] ?? 'Alerta de stock')

const formatMovementType = (type: string): string => ({
  OPENING: 'Stock inicial', PURCHASE_IN: 'Ingreso por compra', SALE_COMMIT: 'Reserva por venta',
  SALE_ADJUSTMENT: 'Ajuste de venta', SALE_CANCEL: 'Cancelación de venta', SALE_DELIVERED_OUT: 'Salida por venta',
  RETURN_IN: 'Devolución', EXPIRED_REMOVAL: 'Retiro de vencidos', PROJECTION_REPAIR: 'Ajuste de inventario',
}[type] ?? 'Movimiento de stock')

const imageUrl = (path: string): string => {
  const host = process.env.NEXT_PUBLIC_DB_HOST?.replace(/\/$/, '') ?? ''
  const safePath = /^https?:\/\//i.test(path) ? new URL(path).pathname : path
  return `${host}/${safePath.replace(/^\//, '')}`
}

export default function SmartStockPage() {
  const [overview, setOverview] = useState<StockOverview | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [retry, setRetry] = useState(0)
  const [detailRetry, setDetailRetry] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [severity, setSeverity] = useState<SeverityFilter>(SEVERITIES.ALL)
  const [expandedAlertGroups, setExpandedAlertGroups] = useState<Partial<Record<AlertSeverity, boolean>>>({})
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState<StockDetail | null>(null)
  const [detailStatus, setDetailStatus] = useState<'idle' | 'loading' | 'error' | 'ready'>('idle')
  const [dialog, setDialog] = useState<'config' | 'writeoff' | 'remove' | 'bulk' | 'report' | null>(null)
  const [configProductId, setConfigProductId] = useState('')
  const [minimum, setMinimum] = useState('')
  const [expiryAlertDays, setExpiryAlertDays] = useState('')
  const [writeOffQuantity, setWriteOffQuantity] = useState('')
  const [writeOffNote, setWriteOffNote] = useState('')
  const [operationBusy, setOperationBusy] = useState(false)
  const [operationError, setOperationError] = useState('')
  const [operationMessage, setOperationMessage] = useState('')
  const [operationResults, setOperationResults] = useState<ExpiredRemovalResult[]>([])
  const pendingOperationIds = useRef(new Map<string, string>())
  const operationIdFor = (key: string) => {
    const existing = pendingOperationIds.current.get(key)
    if (existing) return existing
    const operationId = crypto.randomUUID()
    pendingOperationIds.current.set(key, operationId)
    return operationId
  }

  useEffect(() => {
    const controller = new AbortController()
    setStatus('loading')
    apiClient.get<StockOverview>('/stock/overview', {
      params: { businessDate: dateInBuenosAires(), ...(search.trim() ? { search: search.trim() } : {}), ...(category.trim() ? { category: category.trim() } : {}), page, pageSize: PAGE_SIZE, timeZone: TIME_ZONE },
      signal: controller.signal,
    }).then(({ data }) => {
      setOverview(data)
      setStatus('ready')
    }).catch(() => {
      if (!controller.signal.aborted) setStatus('error')
    })
    return () => controller.abort()
  }, [page, retry, search, category])

  useEffect(() => {
    if (!selectedId) return
    const controller = new AbortController()
    setDetailStatus('loading')
    setDetail(null)
    apiClient.get<StockDetail>(`/stock/products/${encodeURIComponent(selectedId)}`, {
      params: { businessDate: dateInBuenosAires(), timeZone: TIME_ZONE, movementLimit: 5 },
      signal: controller.signal,
    }).then(({ data }) => {
      setDetail(data)
      setDetailStatus('ready')
    }).catch(() => {
      if (!controller.signal.aborted) setDetailStatus('error')
    })
    return () => controller.abort()
  }, [selectedId, detailRetry])

  const items = overview?.items ?? []
  const filteredAlerts = (overview?.globalAlerts ?? []).filter((alert) => severity === SEVERITIES.ALL || alert.severity === severity)
  const alertGroups = [
    { key: 'CRITICAL' as const, label: 'Críticas' },
    { key: 'WARNING' as const, label: 'Advertencias' },
    { key: 'INFO' as const, label: 'Informativas' },
  ].map((group) => ({ ...group, alerts: filteredAlerts.filter((alert) => alert.severity === group.key) }))
  const summary = overview?.globalSummary ?? EMPTY_SUMMARY
  const pageCount = Math.max(1, Math.ceil((overview?.total ?? 0) / PAGE_SIZE))
  const selectedItem = items.find((item) => item.productId === selectedId)
  const configItem = items.find((item) => item.productId === configProductId)
  const expiredItems = items.filter((item) => item.expiredQuantity > 0)
  const openOperation = (kind: typeof dialog, productId = selectedId) => {
    pendingOperationIds.current.clear()
    setOperationError('')
    setOperationMessage('')
    setOperationResults([])
    if (kind === 'config') {
      setConfigProductId(productId)
      const product = items.find((item) => item.productId === productId)
      setMinimum(product ? String(product.minimum ?? 0) : '')
      setExpiryAlertDays(product ? String(product.expiryAlertDays) : '')
    }
    setDialog(kind)
  }
  const refreshData = () => { setRetry((value) => value + 1); if (selectedId) setDetailRetry((value) => value + 1) }
  const saveConfig = async () => {
    if (!configItem) return
    const minimumValue = Number(minimum)
    const daysValue = expiryAlertDays === '' ? undefined : Number(expiryAlertDays)
    if (!Number.isSafeInteger(minimumValue) || minimumValue < 0 || (daysValue !== undefined && (!Number.isSafeInteger(daysValue) || daysValue < 0 || daysValue > 3650))) {
      setOperationError('Ingresá valores enteros válidos. El mínimo no puede ser negativo y el umbral debe estar entre 0 y 3650 días.')
      return
    }
    setOperationBusy(true)
    try {
      await apiClient.patch(`/stock/products/${encodeURIComponent(configItem.productId)}/minimum`, { minimum: minimumValue, ...(daysValue === undefined ? {} : { expiryAlertDays: daysValue }) })
      setOperationMessage('Configuración guardada correctamente.')
      refreshData()
    } catch {
      setOperationError('No se pudo guardar la configuración. Verificá los valores o intentá nuevamente.')
    } finally { setOperationBusy(false) }
  }
  const submitWriteOff = async () => {
    if (!selectedItem) return
    const quantity = Number(writeOffQuantity)
    if (!Number.isSafeInteger(quantity) || quantity <= 0 || writeOffNote.length > 250) {
      setOperationError('Ingresá una cantidad entera positiva y una observación de hasta 250 caracteres.')
      return
    }
    const payload = { businessDate: dateInBuenosAires(), quantity, reason: 'vencimiento', ...(writeOffNote.trim() ? { note: writeOffNote.trim() } : {}) }
    const operationKey = JSON.stringify(['write-off', selectedItem.productId, payload])
    setOperationBusy(true)
    try {
      await apiClient.post(`/stock/products/${encodeURIComponent(selectedItem.productId)}/write-offs`, { operationId: operationIdFor(operationKey), ...payload })
      pendingOperationIds.current.delete(operationKey)
      setOperationMessage('Baja de stock registrada correctamente.')
      refreshData()
    } catch { setOperationError('No se pudo registrar la baja. Corregí los datos o intentá nuevamente.') }
    finally { setOperationBusy(false) }
  }
  const removeExpired = async (productId: string) => {
    const payload = { businessDate: dateInBuenosAires() }
    const operationKey = JSON.stringify(['expired-removal', productId, payload])
    setOperationBusy(true)
    try {
      const { data } = await apiClient.post<ExpiredRemovalResult>(`/stock/products/${encodeURIComponent(productId)}/expired-removal`, { operationId: operationIdFor(operationKey), ...payload })
      pendingOperationIds.current.delete(operationKey)
      const result = { ...data, status: data.outcome }
      setOperationResults([result])
      setOperationMessage(data.outcome === 'REMOVED' ? `Se retiraron ${data.removedQuantity} unidades vencidas.` : data.outcome === 'PARTIAL' ? `Retiro parcial: se retiraron ${data.removedQuantity} unidades elegibles no comprometidas. Las unidades comprometidas permanecen.` : 'No había existencias vencidas elegibles para retirar.')
      refreshData()
    } catch { setOperationError('No se pudo retirar el stock vencido. Podés corregir los datos o reintentar.') }
    finally { setOperationBusy(false) }
  }
  const removeExpiredBulk = async () => {
    const eligibleItems = items.filter((item) => item.expiredQuantity > 0)
    if (!eligibleItems.length) { setOperationMessage('No hay productos con existencias vencidas en esta página.'); return }
    const payload = { businessDate: dateInBuenosAires(), productIds: eligibleItems.slice(0, 100).map((item) => item.productId) }
    const operationKey = JSON.stringify(['expired-removals', payload])
    setOperationBusy(true)
    try {
      const { data } = await apiClient.post<ExpiredBulkResult>('/stock/expired-removals', { operationId: operationIdFor(operationKey), ...payload })
        setOperationResults(data.results)
        const failures = data.results.filter((result) => result.status === 'FAILED').length
        const noEligible = data.results.filter((result) => result.status === 'NO_ELIGIBLE').length
        const completed = data.results.filter((result) => result.status === 'REMOVED' || result.status === 'PARTIAL').length
        if (failures === 0) pendingOperationIds.current.delete(operationKey)
        setOperationMessage(failures
          ? `Proceso finalizado con ${failures} producto(s) con errores; los resultados se informan por producto.`
          : completed === 0 && data.results.length > 0
            ? 'No había existencias vencidas elegibles para retirar.'
            : completed === 0
              ? 'No se recibieron resultados de productos para retirar.'
              : `Proceso finalizado: ${completed} producto(s) con retiro${noEligible ? `; ${noEligible} sin cantidad elegible` : ''}.`)
      refreshData()
    } catch { setOperationError('No se pudo completar el retiro masivo. Intentá nuevamente.') }
    finally { setOperationBusy(false) }
  }
  const hasProductFilters = Boolean(search.trim() || category.trim())
  const emptyProductsMessage = overview?.total === 0 && !hasProductFilters
    ? 'Todavía no hay productos para mostrar.'
    : 'No hay productos que coincidan con estos filtros.'

  return (
    <PageContainer className="gap-5 overflow-y-auto">
      <PageHeader title="Stock inteligente" description="Una lectura clara de las existencias y los productos que requieren atención." actions={
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => openOperation('config', '')} className="rounded-md border border-border-subtle px-3 py-2 text-sm text-text-primary"><Settings2 className="mr-2 inline size-4" aria-hidden="true" />Configuraciones</button>
          <button type="button" onClick={refreshData} aria-label="Actualizar stock" className="rounded-md border border-border-subtle px-3 py-2 text-sm text-text-primary"><RefreshCw className="mr-2 inline size-4" aria-hidden="true" />Actualizar</button>
          <button type="button" onClick={() => openOperation('bulk')} className="rounded-md border border-border-subtle px-3 py-2 text-sm text-text-primary">Retirar vencidos de esta página</button>
          <button type="button" onClick={() => openOperation('report')} aria-label="Generar reporte" className="rounded-md border border-border-subtle px-3 py-2 text-sm text-text-primary"><FileText className="mr-2 inline size-4" aria-hidden="true" />Generar reporte</button>
        </div>
      } />

      <section aria-label="Indicadores globales de stock" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Stock bajo', value: summary.belowMinimumProductCount, note: 'productos bajo el mínimo' },
          { label: 'Por vencer', value: summary.expiringProductCount, note: 'productos en ventana preventiva' },
          { label: 'Vencido', value: summary.expiredProductCount, note: 'productos con existencias vencidas' },
          { label: 'Baja rotación', value: summary.lowRotationProductCount, note: 'productos con baja rotación' },
          { label: 'Alertas activas', value: summary.activeAlertCount, note: 'alertas en todo el catálogo' },
        ].map((metric) => (
          <article key={metric.label} className="rounded-xl border border-border-subtle bg-surface-base p-4">
            <p className="text-sm font-medium text-text-secondary">{metric.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-text-primary" aria-label={`${metric.value} ${metric.note}`}>{metric.value}</p>
            <p className="mt-1 text-xs text-text-muted">{metric.note}</p>
          </article>
        ))}
      </section>

      <section aria-labelledby="stock-alerts-title" className="rounded-xl border border-border-subtle bg-surface-base p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="stock-alerts-title" className="text-lg font-semibold text-text-primary">Alertas del catálogo</h2>
            <p className="text-sm text-text-secondary">Priorizá por severidad. El filtro no modifica el listado ni los indicadores.</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <span>Severidad</span>
            <select aria-label="Filtrar alertas por severidad" className="rounded-md border border-border-subtle bg-background-canvas px-3 py-2 text-text-primary" value={severity} onChange={(event) => setSeverity(event.target.value as SeverityFilter)}>
              <option value="ALL">Todas</option><option value="CRITICAL">Crítica</option><option value="WARNING">Advertencia</option><option value="INFO">Informativa</option>
            </select>
          </label>
        </div>
        {status === 'loading' ? <p className="py-6 text-sm text-text-secondary" role="status">Cargando alertas…</p>
          : status === 'error' ? <p className="py-6 text-sm text-state-error" role="alert">No se pudieron cargar las alertas.</p>
            : filteredAlerts.length === 0 ? <p className="py-6 text-sm text-text-secondary" role="status">{(overview?.globalAlerts.length ?? 0) === 0 ? 'No hay alertas activas.' : 'No hay alertas para esta severidad.'}</p>
              : <div className="mt-4 space-y-5">
                {alertGroups.filter((group) => group.alerts.length > 0).map((group) => {
                  const expanded = expandedAlertGroups[group.key] ?? false
                  const visibleAlerts = expanded ? group.alerts : group.alerts.slice(0, INITIAL_ALERT_LIMIT)
                  const remainingCount = group.alerts.length - visibleAlerts.length
                  return <section key={group.key} aria-label={`Alertas ${group.label.toLocaleLowerCase('es')}`}>
                  <h3 className="mb-2 text-sm font-semibold text-text-primary">{group.label} <span className="font-normal text-text-secondary">({group.alerts.length})</span></h3>
                  <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {visibleAlerts.map((alert, index) => <li key={`${alert.productId}-${alert.type}-${index}`} className="rounded-lg bg-background-subtle p-3">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={`mt-0.5 size-4 shrink-0 ${alert.severity === 'CRITICAL' ? 'text-state-error' : alert.severity === 'WARNING' ? 'text-brand-accent' : 'text-text-secondary'}`} aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="font-semibold text-text-primary">{alert.productName}</p>
                          <p className="text-xs text-text-secondary">{formatAlertType(alert.type)}</p>
                          <p className="mt-1 text-sm text-text-secondary">{alert.explanation}</p>
                        </div>
                      </div>
                    </li>)}
                  </ul>
                  {group.alerts.length > INITIAL_ALERT_LIMIT && <button type="button" aria-expanded={expanded} onClick={() => setExpandedAlertGroups((current) => ({ ...current, [group.key]: !expanded }))} className="mt-2 rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-background-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary">
                    {expanded ? 'Mostrar menos alertas' : `Mostrar ${remainingCount} alertas más`}
                  </button>}
                </section>})}
              </div>}
      </section>

      <section aria-labelledby="stock-products-title" className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.8fr)]">
        <div className="min-w-0 rounded-xl border border-border-subtle bg-surface-base p-4 md:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><h2 id="stock-products-title" className="text-lg font-semibold text-text-primary">Productos</h2><p className="text-sm text-text-secondary">Página {overview?.page ?? page} de {pageCount}, {overview?.total ?? 0} productos</p></div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <label className="relative min-w-52 flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
                <input aria-label="Buscar producto por nombre" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Buscar producto" className="h-10 w-full rounded-md border border-border-subtle bg-background-canvas pl-9 pr-9 text-sm text-text-primary placeholder:text-text-muted" />
                {search && <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-text-secondary hover:bg-background-subtle" aria-label="Limpiar búsqueda"><X className="size-4" /></button>}
              </label>
              <label className="flex items-center gap-2">
                <span className="sr-only">Filtrar productos por categoría</span>
                <input aria-label="Filtrar productos por categoría" className="h-10 min-w-36 rounded-md border border-border-subtle bg-background-canvas px-3 text-sm text-text-primary placeholder:text-text-muted" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1) }} placeholder="Categoría" />
                {category && <button type="button" onClick={() => setCategory('')} className="rounded p-2 text-text-secondary hover:bg-background-subtle" aria-label="Limpiar categoría"><X className="size-4" /></button>}
              </label>
            </div>
          </div>

          {status === 'loading' ? <div className="flex min-h-48 items-center justify-center gap-3 text-text-secondary" role="status" aria-live="polite"><RefreshCw className="size-5 animate-spin" aria-hidden="true" />Cargando productos…</div>
            : status === 'error' ? <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center" role="alert"><AlertTriangle className="size-8 text-state-error" /><p className="text-sm text-text-secondary">No se pudo cargar el stock. Verificá la conexión e intentá nuevamente.</p><button type="button" className="rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-text-inverse" onClick={() => setRetry((value) => value + 1)}>Reintentar</button></div>
              : items.length === 0 ? <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center" role="status"><PackageSearch className="size-8 text-text-muted" aria-hidden="true" /><p className="font-medium text-text-primary">{emptyProductsMessage}</p><p className="text-sm text-text-secondary">La búsqueda y la categoría se aplican juntas.</p></div>
                : <ul className="mt-4 divide-y divide-border-subtle">
                  {items.map((item) => <li key={item.productId}>
                    <button type="button" onClick={() => setSelectedId(item.productId)} aria-pressed={selectedId === item.productId} className={`flex w-full items-center gap-3 rounded-md px-2 py-3 text-left transition-colors hover:bg-background-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary ${selectedId === item.productId ? 'bg-background-subtle' : ''}`}>
                      {item.imagePath ? <img src={imageUrl(item.imagePath)} alt="" className="size-12 shrink-0 rounded-md object-cover" /> : <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-background-subtle text-text-muted"><Boxes className="size-5" aria-hidden="true" /></span>}
                      <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-text-primary">{item.productName}</span><span className="block truncate text-xs text-text-secondary">{item.categoryName || 'Sin categoría'} · Mínimo {item.minimum ?? 'No definido'}</span><span className="mt-1 block text-xs text-text-secondary">Físico {item.physicalQuantity} · Comprometido {item.committedQuantity} · Disponible {item.availableToSell}</span></span>
                      <span className={`hidden shrink-0 rounded-full px-2 py-1 text-xs font-medium sm:inline-flex ${item.availableToSell <= 0 ? 'bg-state-error/10 text-state-error' : 'bg-background-subtle text-text-secondary'}`}>{item.availableToSell <= 0 ? 'Sin disponibilidad' : 'Disponible'}</span>
                    </button>
                  </li>)}
                </ul>}

          <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3">
            <button type="button" disabled={page <= 1 || status === 'loading'} onClick={() => { setSelectedId(''); setPage((value) => Math.max(1, value - 1)) }} className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-background-subtle disabled:cursor-not-allowed disabled:opacity-50"><ChevronLeft className="size-4" aria-hidden="true" />Anterior</button>
            <span className="text-sm text-text-secondary">{page} / {pageCount}</span>
            <button type="button" disabled={page >= pageCount || status === 'loading'} onClick={() => { setSelectedId(''); setPage((value) => Math.min(pageCount, value + 1)) }} className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-background-subtle disabled:cursor-not-allowed disabled:opacity-50">Siguiente<ChevronRight className="size-4" aria-hidden="true" /></button>
          </div>
        </div>

        <aside aria-label="Detalle y movimientos del producto" className="min-w-0 rounded-xl border border-border-subtle bg-surface-base p-4 md:p-5">
          {!selectedId ? <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center text-text-secondary"><CircleHelp className="size-8" aria-hidden="true" /><p className="font-medium">Consultá un producto</p><p className="text-sm">Seleccioná un producto para ver su disponibilidad y movimientos recientes.</p></div>
            : <>
              <div className="border-b border-border-subtle pb-3"><p className="text-xs font-medium uppercase tracking-wide text-text-muted">Detalle de stock</p><h3 className="mt-1 text-lg font-semibold text-text-primary">{selectedItem?.productName ?? 'Producto seleccionado'}</h3>
                {selectedItem && <div className="mt-3 flex flex-wrap gap-2"><button type="button" aria-label={`Configurar stock de ${selectedItem.productName}`} onClick={() => openOperation('config', selectedItem.productId)} className="rounded-md border border-border-subtle px-3 py-2 text-sm"><Settings2 className="mr-1 inline size-4" aria-hidden="true" />Configurar</button><button type="button" onClick={() => openOperation('writeoff')} className="rounded-md border border-border-subtle px-3 py-2 text-sm">Registrar baja</button><button type="button" onClick={() => openOperation('remove')} disabled={selectedItem.expiredQuantity <= 0} className="rounded-md border border-border-subtle px-3 py-2 text-sm disabled:opacity-50"><Trash2 className="mr-1 inline size-4" aria-hidden="true" />Retirar vencidos</button></div>}
              </div>
              {detailStatus === 'loading' ? <p className="py-6 text-sm text-text-secondary" role="status">Cargando disponibilidad y movimientos…</p>
                : detailStatus === 'error' ? <div className="py-6 text-center" role="alert"><p className="text-sm text-state-error">No se pudo consultar el detalle del producto.</p><button type="button" onClick={() => setDetailRetry((value) => value + 1)} className="mt-3 rounded-md border border-border-subtle px-3 py-2 text-sm text-text-primary">Reintentar</button></div>
                  : detail && <>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 py-4 text-sm">
                      <div><dt className="text-text-secondary">Físico</dt><dd className="font-semibold text-text-primary">{detail.availability.physicalQuantity}</dd></div>
                      <div><dt className="text-text-secondary">Comprometido</dt><dd className="font-semibold text-text-primary">{detail.availability.committedQuantity}</dd></div>
                      <div><dt className="text-text-secondary">Disponible</dt><dd className="font-semibold text-text-primary">{detail.availability.availableToSell}</dd></div>
                      <div><dt className="text-text-secondary">Vencido</dt><dd className="font-semibold text-text-primary">{detail.availability.expiredQuantity}</dd></div>
                    </dl>
                    <p className="text-sm text-text-secondary">Última venta: <span className="font-medium text-text-primary">{selectedItem?.latestSale.status === 'RECORDED' && selectedItem.latestSale.occurredAt ? formatDate(selectedItem.latestSale.occurredAt) : 'No disponible: historial incompleto'}</span></p>
                    <div className="mt-5"><h4 className="font-semibold text-text-primary">Movimientos recientes</h4>
                      {detail.movements.length === 0 ? <p className="py-4 text-sm text-text-secondary" role="status">No hay movimientos registrados.</p>
                        : <ol className="mt-2 divide-y divide-border-subtle">{detail.movements.map((movement, index) => <li key={movement.movementId ?? `${movement.type}-${movement.occurredAt}-${index}`} className="flex items-start justify-between gap-3 py-3"><span><span className="block text-sm font-medium text-text-primary">{formatMovementType(movement.type)}</span><time className="block text-xs text-text-secondary" dateTime={movement.occurredAt}>{formatDate(movement.occurredAt)}</time></span><span className="inline-flex items-center gap-1 text-sm font-semibold text-text-primary">{movement.quantity > 0 ? <ArrowUp className="size-3 text-state-success" aria-hidden="true" /> : <ArrowDown className="size-3 text-state-error" aria-hidden="true" />}{Math.abs(movement.quantity)}</span></li>)}</ol>}
                    </div>
                  </>}
            </>}
        </aside>
      </section>
      <Dialog open={dialog !== null} onOpenChange={(open) => { if (!open && !operationBusy) { pendingOperationIds.current.clear(); setDialog(null) } }}>
        <DialogContent aria-describedby="stock-action-description" className={`${dialog === 'config' ? 'max-w-3xl' : 'max-w-lg'} max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6`}>
          <DialogHeader><DialogTitle>{dialog === 'config' ? 'Configuración de stock' : dialog === 'writeoff' ? 'Registrar baja de stock' : dialog === 'remove' ? 'Retirar existencias vencidas' : dialog === 'bulk' ? 'Retiro masivo de vencidos' : 'Generar reporte'}</DialogTitle><DialogDescription id="stock-action-description">{dialog === 'report' ? 'La generación de reportes todavía no está disponible.' : dialog === 'bulk' ? `Se procesarán ${expiredItems.length} productos con existencias vencidas de esta página de forma independiente.` : `Producto: ${selectedItem?.productName ?? 'seleccionado'}`}</DialogDescription></DialogHeader>
          {dialog === 'config' && <div className="grid gap-6">
            <section aria-labelledby="expired-products-title">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 id="expired-products-title" className="font-semibold text-text-primary">Productos vencidos de esta página</h3><p className="mt-1 text-sm text-text-secondary">Mostramos únicamente los productos de la página actual.</p></div><button type="button" disabled={expiredItems.length === 0 || operationBusy} onClick={() => setDialog('bulk')} className="rounded-md border border-border-subtle px-3 py-2 text-sm disabled:opacity-50">Retirar todos de esta página</button></div>
              {expiredItems.length === 0 ? <p role="status" className="mt-4 rounded-lg bg-background-subtle p-4 text-sm text-text-secondary">No hay productos vencidos en esta página.</p> : <ul className="mt-4 divide-y divide-border-subtle rounded-lg border border-border-subtle">{expiredItems.map((item) => <li key={item.productId} className="flex flex-wrap items-center justify-between gap-3 p-3"><div className="min-w-0"><p className="truncate font-medium text-text-primary">{item.productName}</p><p className="text-sm text-text-secondary">Existencias vencidas: {item.expiredQuantity}</p></div><button type="button" aria-label={`Retirar vencidos de ${item.productName}`} disabled={operationBusy} onClick={() => { setSelectedId(item.productId); setDialog('remove') }} className="rounded-md border border-border-subtle px-3 py-2 text-sm">Retirar vencidos</button></li>)}</ul>}
            </section>
            <section aria-labelledby="stock-config-title" className="border-t border-border-subtle pt-5 "><h3 id="stock-config-title" className="font-semibold text-text-primary">Umbrales por producto</h3><p className="mt-1 text-sm text-text-secondary">Elegí un producto de esta página para ajustar su configuración.</p><div className="mt-4 space-y-3"><label className="block text-sm">Producto<select aria-label="Producto para configurar" value={configProductId} onChange={(event) => { const product = items.find((entry) => entry.productId === event.target.value); setConfigProductId(event.target.value); setMinimum(product ? String(product.minimum ?? 0) : ''); setExpiryAlertDays(product ? String(product.expiryAlertDays) : ''); setOperationError(''); setOperationMessage('') }} className="mt-1 block w-full rounded-md border border-border-subtle bg-background-canvas px-3 py-2"><option value="">Seleccionar producto</option>{items.map((item) => <option key={item.productId} value={item.productId}>{item.productName}</option>)}</select></label><label className="block text-sm">Stock mínimo<input aria-label="Stock mínimo" type="number" min="0" step="1" value={minimum} disabled={!configItem} onChange={(event) => setMinimum(event.target.value)} className="mt-1 block w-full rounded-md border border-border-subtle bg-background-canvas px-3 py-2" /></label><label className="block text-sm">Umbral preventivo (días)<input aria-label="Umbral preventivo (días)" type="number" min="0" max="3650" step="1" value={expiryAlertDays} placeholder="Sin cambios" disabled={!configItem} onChange={(event) => setExpiryAlertDays(event.target.value)} className="mt-1 block w-full rounded-md border border-border-subtle bg-background-canvas px-3 py-2" /></label><p className="text-xs text-text-secondary">El umbral preventivo define cuándo avisar que un producto está próximo a vencer.</p></div>
            </section>
          </div>}
          {dialog === 'writeoff' && <div className="space-y-3"><label className="block text-sm">Cantidad<input aria-label="Cantidad" type="number" min="1" step="1" value={writeOffQuantity} onChange={(event) => setWriteOffQuantity(event.target.value)} className="mt-1 block w-full rounded-md border border-border-subtle bg-background-canvas px-3 py-2" /></label><p className="text-sm text-text-secondary">Motivo: Vencimiento</p><label className="block text-sm">Observación (máximo 250 caracteres)<textarea aria-label="Observación" maxLength={250} value={writeOffNote} onChange={(event) => setWriteOffNote(event.target.value)} className="mt-1 block w-full rounded-md border border-border-subtle bg-background-canvas px-3 py-2" /></label></div>}
          {operationError && <p role="alert" className="text-sm text-state-error">{operationError}</p>}{operationMessage && <p role="status" className="text-sm text-text-primary">{operationMessage}</p>}
          {operationResults.length > 0 && <ul aria-label="Resultados por producto" className="max-h-48 space-y-1 overflow-auto text-sm">{operationResults.map((result) => { const status = result.status ?? result.outcome; return <li key={result.productId}>{items.find((item) => item.productId === result.productId)?.productName ?? result.productId}: {status === 'REMOVED' ? `Retirado: ${result.removedQuantity}` : status === 'PARTIAL' ? `Parcial: ${result.removedQuantity} retiradas; permanecen unidades comprometidas` : status === 'NO_ELIGIBLE' ? 'Sin cantidad elegible' : 'Error; corregir datos o reintentar'}</li> })}</ul>}
          <DialogFooter className="sticky bottom-[-1rem] -mx-4 mt-2 flex-col-reverse gap-2 border-t border-border-subtle bg-surface-base px-4 py-3 sm:bottom-[-1.5rem] sm:-mx-6 sm:flex-row sm:px-6"> <button type="button" disabled={operationBusy} onClick={() => { pendingOperationIds.current.clear(); setDialog(null) }} className="rounded-md border border-border-subtle px-3 py-2 text-sm">Cerrar</button>{dialog === 'config' && <button type="button" disabled={operationBusy || !configItem} onClick={() => void saveConfig()} className="rounded-md bg-brand-primary px-3 py-2 text-sm font-semibold text-text-inverse">Guardar configuración</button>}{dialog === 'writeoff' && <button type="button" disabled={operationBusy} onClick={() => void submitWriteOff()} className="rounded-md bg-brand-primary px-3 py-2 text-sm font-semibold text-text-inverse">Confirmar baja</button>}{dialog === 'remove' && <button type="button" disabled={operationBusy} onClick={() => selectedItem && void removeExpired(selectedItem.productId)} className="rounded-md bg-brand-primary px-3 py-2 text-sm font-semibold text-text-inverse">Confirmar retiro</button>}{dialog === 'bulk' && <button type="button" disabled={operationBusy} onClick={() => void removeExpiredBulk()} className="rounded-md bg-brand-primary px-3 py-2 text-sm font-semibold text-text-inverse">Iniciar retiro</button>}</DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
