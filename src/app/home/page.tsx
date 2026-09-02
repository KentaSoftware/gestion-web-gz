'use client'
import React, { useEffect, useState, useCallback } from 'react'
import apiClient from '@/utils/client';
import { useDispatch } from 'react-redux';
import { setLoading } from '@/redux/loadingSlice';
import CustomDataSet from '@/components/CustomDataSet'
import { toast } from "sonner";
import { TrendingDown, TrendingUp } from 'lucide-react';
import { addHours, endOfDay, startOfDay } from 'date-fns';
import dynamic from 'next/dynamic';
import { getDateRangeFromInterval } from '@/utils/dashboardHelpers';
import { cashflowService } from '@/services/cashflow.service';
import { expenseService } from '@/services/expense.service';
import type { CashflowMovement } from '@/interfaces/cashflow.interface';
import type { DatasetPeriod } from '@/interfaces/dashboard.interface';
import { cn } from '@/lib/cn';

const HomeChart = dynamic(() => import('@/components/dashboard/HomeChart'), {
  ssr: false,
  loading: () => (
    <div className="h-72 w-full animate-pulse rounded-xl bg-background-subtle md:h-80 lg:h-96" />
  ),
})

const ResultKPICard = dynamic(
  () => import('@/components/dashboard/ResultKPICard'),
  { ssr: false, loading: () => (
    <div className="min-h-[220px] animate-pulse rounded-xl border border-border-subtle bg-surface-raised p-6 shadow-sm md:p-7">
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-full bg-background-subtle" />
          <div className="space-y-2">
            <div className="h-4 w-24 rounded bg-background-subtle" />
            <div className="h-5 w-40 rounded bg-background-subtle" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-14 w-full rounded-xl bg-background-subtle" />
          <div className="grid gap-3 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-background-subtle" />
            ))}
          </div>
        </div>
      </div>
    </div>
  ) },
)

const ExpenseKPICard = dynamic(
  () => import('@/components/dashboard/ExpenseKPICard'),
  { ssr: false, loading: () => (
    <div className="min-h-[220px] animate-pulse rounded-xl border border-border-subtle bg-surface-raised p-6 shadow-sm md:p-7">
      <div className="flex flex-col gap-4">
        <div className="h-4 w-24 rounded bg-background-subtle" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-16 rounded-full bg-background-subtle" />
          ))}
        </div>
        <div className="h-16 w-full rounded-xl bg-background-subtle" />
      </div>
    </div>
  ) },
)

interface Response {
  id: number
  totalSales: number;
  salesCount: number;
  label: string,
  date: string,
  totalSalesDifference: number | string,
  salesCountDifference: number | string
}

const getTotalCardData = (dataSet: Response[], label: string) => {
  return dataSet.find((item: Response) => item.label === label)
};

const intervals = ['DIARIO', 'SEMANAL', 'MENSUAL', 'ANUAL', 'CUSTOM'];

const MOVEMENT_LABELS: Record<CashflowMovement['source'], string> = {
  sale: 'Venta',
  buy: 'Compra',
  expense: 'Egreso',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value)
}

type GraphDataPoint = { label: string; ventas?: number; compras?: number }

function formatDifference(value?: number | string) {
  const numericValue = Number(value) || 0
  return {
    value: Number.isFinite(numericValue) ? numericValue : 0,
    label: `${numericValue >= 0 ? '+' : ''}${numericValue.toFixed(1)}%`,
  }
}

function formatMovementDate(date: string) {
  return new Date(date).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
  })
}

function getResultColor(resultado: number): string {
  if (resultado > 0) return 'var(--color-state-success)'
  if (resultado < 0) return 'var(--color-state-error)'
  return 'var(--color-text-secondary)'
}

function translateIntervalToEnglish(interval: string): string {
  switch (interval.toUpperCase()) {
    case 'DIARIO':   return 'daily';
    case 'SEMANAL':  return 'weekly';
    case 'MENSUAL':  return 'monthly';
    case 'ANUAL':    return 'annually';
    default: throw new Error('Invalid interval');
  }
}

export default function Home() {
  const [interval, setInterval] = useState<string>('DIARIO');
  const [dataSet, setDataSet] = useState<{period?: DatasetPeriod; simple: Response[], graph: { data: GraphDataPoint[] } | undefined}>({simple: [], graph: undefined})
  const [expenseTotal, setExpenseTotal] = useState(0)
  const [expenseOperativo, setExpenseOperativo] = useState(0)
  const [expensePersonal, setExpensePersonal] = useState(0)
  const dispatch = useDispatch()
  const salesData = getTotalCardData(dataSet.simple, 'sale')
  const buyData = getTotalCardData(dataSet.simple, 'buy')
  const [openCustomDataSet, setOpenCustomDataSet] = useState(false)
  const [isSalesMode, setIsSalesMode] = useState(true)
  const [expensePeriod, setExpensePeriod] = useState(() => getDateRangeFromInterval('MENSUAL'))
  const [customDateRange, setCustomDateRange] = useState<{from: string; to: string} | null>(null)
  const [recentMovements, setRecentMovements] = useState<CashflowMovement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  // Derived metrics from page-level data
  const ventasTotal = salesData?.totalSales ?? 0
  const ventasCount = salesData?.salesCount ?? 0
  const comprasTotal = buyData?.totalSales ?? 0
  const comprasCount = buyData?.salesCount ?? 0
  const ticketPromedio = isSalesMode
    ? (ventasCount > 0 ? ventasTotal / ventasCount : 0)
    : (comprasCount > 0 ? comprasTotal / comprasCount : 0)
  const resultadoNeto = ventasTotal - comprasTotal - expenseTotal

  const fetchRecentMovements = useCallback(async () => {
    try {
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const data = await cashflowService.getMovements({
        startDate: firstDayOfMonth.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
      })
      setRecentMovements(data.slice(-9).reverse())
    } catch {
      setRecentMovements([])
    }
  }, [])

  const handleSubmit = (startDate: Date, endDate: Date) => {
    startDate = addHours(startOfDay(startDate), 3)
    endDate   = addHours(endOfDay(endDate), 3)
    if (startDate >= endDate) {
      toast.warning('La fecha DESDE no puede ser posterior a Hasta')
      return
    }
    setIsLoading(true)
    setHasError(false)
    dispatch(setLoading(true))

    const customRange = {
      from: startDate.toISOString().split('T')[0],
      to:   endDate.toISOString().split('T')[0]
    }
    setCustomDateRange(customRange)
    setExpensePeriod(customRange)

    Promise.all([
      apiClient.get(`/dataset/custom/${customRange.from}/${customRange.to}`),
      expenseService.getKPITotal({ from: customRange.from, to: customRange.to }),
      expenseService.getKPITotal({ from: customRange.from, to: customRange.to, type: 'operativo' as any }),
      expenseService.getKPITotal({ from: customRange.from, to: customRange.to, type: 'personal' as any }),
    ])
      .then(([datasetRes, expenseRes, expenseOpRes, expensePersonalRes]) => {
        setDataSet(datasetRes.data)
        setExpenseTotal(expenseRes.total)
        setExpenseOperativo(expenseOpRes.total)
        setExpensePersonal(expensePersonalRes.total)
        setIsLoading(false)
        setHasLoadedOnce(true)
        dispatch(setLoading(false))
        setOpenCustomDataSet(false)
      })
      .catch(e => {
        console.log(e)
        setHasError(true)
        setHasLoadedOnce(true)
        setIsLoading(false)
        dispatch(setLoading(false))
      })
  }

  useEffect(() => {
    const getData = () => {
      setIsLoading(true)
      setHasError(false)
      setHasLoadedOnce(false) // reset parent-data contract before new fetch
      dispatch(setLoading(true))
      const set = translateIntervalToEnglish(interval)
      const newPeriod = getDateRangeFromInterval(interval as any)
      setExpensePeriod(newPeriod)
      setCustomDateRange(null)

      Promise.all([
        apiClient.get(`/dataset/${set}`),
        expenseService.getKPITotal({ from: newPeriod.from, to: newPeriod.to }),
        expenseService.getKPITotal({ from: newPeriod.from, to: newPeriod.to, type: 'operativo' as any }),
        expenseService.getKPITotal({ from: newPeriod.from, to: newPeriod.to, type: 'personal' as any }),
      ])
        .then(([datasetRes, expenseRes, expenseOpRes, expensePersonalRes]) => {
          setDataSet(datasetRes.data)
          setExpenseTotal(expenseRes.total)
          setExpenseOperativo(expenseOpRes.total)
          setExpensePersonal(expensePersonalRes.total)
          setIsLoading(false)
          setHasLoadedOnce(true)
          dispatch(setLoading(false))
        })
        .catch(e => {
          console.log(e)
          setHasError(true)
          // Do NOT set hasLoadedOnce(true) on error — ResultKPICard uses isParentDataLoaded
          // to decide whether to render parent props or show a loading/early-return state.
          // Setting it true on error would make ResultKPICard render empty/default parent data.
          setIsLoading(false)
          dispatch(setLoading(false))
        })
    }

    if (interval !== 'CUSTOM') {
      getData()
    }
  }, [interval, dispatch])

  useEffect(() => {
    fetchRecentMovements()
  }, [fetchRecentMovements])

  const totalDiff = formatDifference(
    isSalesMode ? salesData?.totalSalesDifference : buyData?.totalSalesDifference
  )
  const countDiff = formatDifference(
    isSalesMode ? salesData?.salesCountDifference : buyData?.salesCountDifference
  )
  const graphData = dataSet.graph?.data ?? []

  return (
    <main className="flex min-h-full w-full flex-1 bg-background-canvas py-4 md:py-6">
      <div className="mx-auto flex w-full min-w-0 max-w-[1440px] flex-col gap-4 px-5 md:px-6 lg:gap-5 lg:px-8 max-md:px-4">
        <h1 className="sr-only">Panel de control</h1>

        {/* ── Screen-reader status region for data loading ─────────────── */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {isLoading ? 'Cargando datos del panel…' : hasError ? 'Error al cargar los datos' : 'Datos actualizados'}
        </div>

        {/* ── Unified operational controls ────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-raised p-3 shadow-sm" role="group" aria-label="Filtros del panel">
          {/* Mode toggle — compact segmented control */}
          <div className="flex rounded-lg bg-surface-base p-0.5" role="group" aria-label="Modo de visualización">
            <button
              type="button"
              onClick={() => setIsSalesMode(true)}
              aria-pressed={isSalesMode}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-all max-md:min-h-[36px]',
                isSalesMode
                  ? 'bg-brand-primary text-text-inverse shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              Ventas
            </button>
            <button
              type="button"
              onClick={() => setIsSalesMode(false)}
              aria-pressed={!isSalesMode}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-all max-md:min-h-[36px]',
                !isSalesMode
                  ? 'bg-brand-primary text-text-inverse shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              Compras
            </button>
          </div>

          <span className="hidden h-5 w-px bg-border-subtle sm:block" aria-hidden="true" />

          {/* Interval pills */}
          <div className="flex flex-wrap gap-1" role="group" aria-label="Selector de intervalo">
            {intervals.map((label: string) => (
              <button
                type="button"
                key={label}
                aria-label={label === interval ? `Intervalo actual: ${label}` : `Seleccionar intervalo ${label}`}
                aria-current={label === interval ? 'true' : undefined}
                className={cn(
                  'rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.08em] transition-all max-md:min-h-[32px]',
                  label === interval
                    ? 'bg-brand-primary text-text-inverse shadow-sm'
                    : 'text-text-secondary hover:bg-surface-base hover:text-text-primary'
                )}
                onClick={() => {
                  setInterval(label)
                  if (label === 'CUSTOM') setOpenCustomDataSet(true)
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <span className="hidden h-5 w-px bg-border-subtle sm:block" aria-hidden="true" />

          {/* Period display — uses canonical label from API when available (P5) */}
          <span className="text-xs font-medium text-text-muted">
            Período: {dataSet.period?.label ?? `${customDateRange?.from ?? expensePeriod.from} a ${customDateRange?.to ?? expensePeriod.to}`}
          </span>
        </div>

        {/* ── KPI band: 4 primary metrics ─────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4" role="group" aria-label="Indicadores principales">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="min-w-0 rounded-xl bg-surface-base p-4 md:p-5" aria-hidden="true">
                  <div className="h-3 w-20 animate-pulse rounded bg-background-subtle" />
                  <div className="mt-4 h-7 w-28 animate-pulse rounded bg-background-subtle" />
                  <div className="mt-3 h-5 w-16 animate-pulse rounded-full bg-background-subtle" />
                </div>
              ))}
            </>
          ) : hasError ? (
            <div className="col-span-2 rounded-xl border border-dashed border-state-error/30 bg-surface-base p-5 text-center md:col-span-4">
              <p className="text-sm font-medium text-state-error">No se pudieron cargar los datos</p>
              <p className="mt-1 text-xs text-text-muted">Verificá tu conexión e intentá de nuevo seleccionando otro período.</p>
            </div>
          ) : dataSet.simple.length === 0 ? (
            <div className="col-span-2 rounded-xl border border-dashed border-border-subtle bg-surface-base p-5 text-center md:col-span-4">
              <p className="text-sm font-medium text-text-muted">No hay datos disponibles para este período</p>
            </div>
          ) : (
            <>
          {/* 1. Ventas del día */}
          <div className="min-w-0 rounded-xl bg-surface-base p-4 md:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">{isSalesMode ? 'Ventas' : 'Compras'}</p>
            <p className="mt-2 text-[clamp(1.5rem,2.5vw,2.2rem)] font-semibold tracking-[-0.04em] text-text-primary">
              {formatCurrency(isSalesMode ? ventasTotal : comprasTotal)}
            </p>
            <span
              aria-label={`Variación: ${totalDiff.label}${totalDiff.value >= 0 ? ', positiva' : ', negativa'}`}
              className={cn(
              'mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
              totalDiff.value >= 0
                ? 'bg-[color:color-mix(in_oklab,var(--color-state-success)_14%,white)] text-state-success'
                : 'bg-[color:color-mix(in_oklab,var(--color-state-error)_12%,white)] text-state-error'
            )}>
              {totalDiff.value >= 0 ? <TrendingUp size={12} aria-hidden="true" /> : <TrendingDown size={12} aria-hidden="true" />}
              {totalDiff.label}
            </span>
          </div>

          {/* 2. Resultado neto */}
          <div className="min-w-0 rounded-xl bg-surface-base p-4 md:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">Resultado neto</p>
            <p
              className="mt-2 text-[clamp(1.5rem,2.5vw,2.2rem)] font-semibold tracking-[-0.04em]"
              style={{ color: getResultColor(resultadoNeto) }}
            >
              <span className="sr-only">{resultadoNeto > 0 ? 'Positivo: ' : resultadoNeto < 0 ? 'Negativo: ' : 'Neutral: '}</span>
              {formatCurrency(resultadoNeto)}
            </p>
          </div>

          {/* 3. Ticket promedio */}
          <div className="min-w-0 rounded-xl bg-surface-base p-4 md:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">{isSalesMode ? 'Ticket promedio' : 'Ticket promedio compras'}</p>
            <p className="mt-2 text-[clamp(1.5rem,2.5vw,2.2rem)] font-semibold tracking-[-0.04em] text-text-primary">
              {formatCurrency(ticketPromedio)}
            </p>
          </div>

          {/* 4. Cantidad de operaciones */}
          <div className="min-w-0 rounded-xl bg-surface-base p-4 md:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">{isSalesMode ? 'Operaciones' : 'Operaciones de compra'}</p>
            <p className="mt-2 text-[clamp(1.5rem,2.5vw,2.2rem)] font-semibold tracking-[-0.04em] text-text-primary">
              {(isSalesMode ? ventasCount : comprasCount).toLocaleString()}
            </p>
            <span
              aria-label={`Variación: ${countDiff.label}${countDiff.value >= 0 ? ', positiva' : ', negativa'}`}
              className={cn(
              'mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
              countDiff.value >= 0
                ? 'bg-[color:color-mix(in_oklab,var(--color-state-success)_14%,white)] text-state-success'
                : 'bg-[color:color-mix(in_oklab,var(--color-state-error)_12%,white)] text-state-error'
            )}>
              {countDiff.value >= 0 ? <TrendingUp size={12} aria-hidden="true" /> : <TrendingDown size={12} aria-hidden="true" />}
              {countDiff.label}
            </span>
          </div>
            </>
          )}
        </div>

        {/* ── Actividad reciente — visible in first viewport ─────────── */}
        <div className="rounded-xl border border-border-subtle bg-surface-raised p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">Movimientos del mes</p>
              <h2 className="mt-1 text-lg font-semibold text-text-primary">Actividad reciente</h2>
            </div>
            <span className="rounded-full bg-background-subtle px-3 py-1 text-xs font-semibold text-text-secondary">
              {recentMovements.length} registros
            </span>
          </div>

          <ul className="mt-3 space-y-2">
            {recentMovements.length === 0 ? (
              <li className="rounded-lg border border-dashed border-border-subtle bg-surface-raised px-4 py-5 text-sm text-text-muted">
                Sin movimientos en el período actual.
              </li>
            ) : (
              recentMovements.slice(0, 5).map((mov, index) => (
                <li
                  key={`${mov.sourceId}-${index}`}
                  className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border-subtle bg-surface-base px-3 py-2.5 shadow-sm"
                >
                  <span className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold',
                    mov.type === 'inflow'
                      ? 'bg-[color:color-mix(in_oklab,var(--color-state-success)_14%,white)] text-state-success'
                      : 'bg-[color:color-mix(in_oklab,var(--color-state-error)_12%,white)] text-state-error'
                  )}>
                    {mov.type === 'inflow' ? '+' : '-'}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text-primary">{MOVEMENT_LABELS[mov.source]}</p>
                    <p className="truncate text-xs text-text-muted">{mov.description || 'Movimiento registrado'}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      'text-sm font-semibold',
                      mov.type === 'inflow' ? 'text-state-success' : 'text-state-error'
                    )}>
                      {mov.type === 'inflow' ? '+' : '-'}{formatCurrency(mov.amount)}
                    </p>
                    <p className="text-xs text-text-muted">{formatMovementDate(mov.date)}</p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* ══════════════════  Below the fold  ══════════════════ */}

        {/* Chart section */}
        <section className="rounded-xl border border-border-subtle bg-surface-raised p-4 md:p-5">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-text-primary md:text-2xl">
                Comparativa: {isSalesMode ? 'ventas y compras' : 'compras y ventas'}
              </h2>
            </div>
            <div className="rounded-xl bg-surface-base p-3 md:p-4">
              <HomeChart graphData={graphData} />
            </div>
          </div>
        </section>

        {/* KPI detail cards */}
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <ResultKPICard
            period={customDateRange || expensePeriod}
            interval={interval}
            dataset={dataSet}
            expenseTotal={expenseTotal}
            expenseOperativo={expenseOperativo}
            expensePersonal={expensePersonal}
            isParentDataLoaded={hasLoadedOnce}
          />
          <ExpenseKPICard period={customDateRange || expensePeriod} />
        </section>

        {openCustomDataSet && (
          <CustomDataSet open={openCustomDataSet} handleClose={() => setOpenCustomDataSet(false)} handleSubmit={handleSubmit} />
        )}
      </div>
    </main>
  )
}
