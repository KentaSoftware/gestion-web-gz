'use client'
import { useState, useEffect, useRef, type FC, type ChangeEvent } from 'react'
// MUI Switch + FormControlLabel removed — replaced with native checkbox toggle
import { DollarSign, Info, ChevronRight, RefreshCw } from 'lucide-react'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'
import apiClient from '@/utils/client'
import { expenseService } from '@/services/expense.service'
import { ResultKPIProps, ResultKPIData } from '@/interfaces/dashboard.interface'
import { trackDashboardResultKPIViewed, trackDashboardResultFilterChanged } from '@/utils/analytics'
import { cn } from '@/lib/cn'

const CARD_CLASSNAME = 'rounded-xl border border-border-subtle bg-surface-raised p-6 shadow-md md:p-7'

const ResultKPICard: FC<ResultKPIProps> = ({ period, interval, dataset, expenseTotal, expenseOperativo, expensePersonal, isParentDataLoaded }) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ResultKPIData | null>(null)
  const [operativosOnly, setOperativosOnly] = useState(false)
  
  const user = useSelector((state: RootState) => state.user)
  const lastAnalyticsRef = useRef<string>('')

  const hasParentData = (isParentDataLoaded === true)
    && dataset !== undefined && dataset.simple !== undefined
    && expenseTotal !== undefined && expenseOperativo !== undefined && expensePersonal !== undefined

  const fetchResultKPI = async () => {
    try {
      setLoading(true)
      setError(null)

      // Determinar el intervalo para el endpoint /dataset
      let datasetEndpoint = '/dataset/daily' // Default
      
      if (interval && interval !== 'CUSTOM') {
        const intervalMap: { [key: string]: string } = {
          'DIARIO': 'daily',
          'SEMANAL': 'weekly',
          'MENSUAL': 'monthly',
          'ANUAL': 'annually',
        }
        datasetEndpoint = `/dataset/${intervalMap[interval] || 'daily'}`
      } else {
        // Usar endpoint custom con fechas
        datasetEndpoint = `/dataset/custom/${period.from}/${period.to}`
      }

      // 4 llamadas en paralelo para obtener todas las métricas
      const [datasetRes, egresosRes, egresosOpRes, egresosPersonalRes] = await Promise.all([
        apiClient.get(datasetEndpoint),
        expenseService.getKPITotal({ from: period.from, to: period.to }),
        expenseService.getKPITotal({ from: period.from, to: period.to, type: 'operativo' as any }),
        expenseService.getKPITotal({ from: period.from, to: period.to, type: 'personal' as any }),
      ])

      // Extraer ventas y compras del dataset
      const salesData = datasetRes.data.simple?.find((item: any) => item.label === 'sale')
      const buyData = datasetRes.data.simple?.find((item: any) => item.label === 'buy')

      const ventas = salesData?.totalSales || 0
      const compras = buyData?.totalSales || 0
      const egresosTotal = egresosRes.total || 0
      const egresosOperativos = egresosOpRes.total || 0
      const gastosPersonales = egresosPersonalRes.total || 0

      // Calcular resultado según toggle
      const egresosUsados = operativosOnly ? egresosOperativos : egresosTotal
      const resultado = ventas - compras - egresosUsados

      setData({
        ventas,
        compras,
        resultado,
        gastosPersonales,
      })

      // Analytics con guard anti-duplicados
      const analyticsKey = `${period.from}-${period.to}-${operativosOnly}`
      if (lastAnalyticsRef.current !== analyticsKey) {
        trackDashboardResultKPIViewed({
          usuario: user.nickname || 'desconocido',
          periodo: { from: period.from, to: period.to, interval },
          operativosOnly,
          ventas,
          compras,
          egresosUsados,
          resultado,
          gastosPersonales,
        })
        lastAnalyticsRef.current = analyticsKey
      }

      setLoading(false)
    } catch (err: any) {
      console.error('Error fetching result KPI:', err)
      
      const status = err.response?.status
      let errorMessage = 'Error de conexión. Verifica tu internet'

      switch (status) {
        case 400:
          errorMessage = 'Parámetros de fecha inválidos'
          break
        case 401:
          errorMessage = 'Sesión expirada. Recarga la página'
          break
        case 403:
          errorMessage = 'Sin permisos para ver métricas del Dashboard'
          break
        case 500:
          errorMessage = 'Error del servidor. Intenta más tarde'
          break
      }

      setError(errorMessage)
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hasParentData && dataset) {
      setError(null)

      const salesData = dataset.simple?.find((item: any) => item.label === 'sale')
      const buyData = dataset.simple?.find((item: any) => item.label === 'buy')

      const ventas = salesData?.totalSales || 0
      const compras = buyData?.totalSales || 0
      const egresosUsados = operativosOnly ? (expenseOperativo || 0) : (expenseTotal || 0)
      const resultado = ventas - compras - egresosUsados

      setData({
        ventas,
        compras,
        resultado,
        gastosPersonales: expensePersonal || 0,
      })
      setLoading(false)

      // Analytics con guard anti-duplicados
      const analyticsKey = `${period.from}-${period.to}-${operativosOnly}`
      if (lastAnalyticsRef.current !== analyticsKey) {
        trackDashboardResultKPIViewed({
          usuario: user.nickname || 'desconocido',
          periodo: { from: period.from, to: period.to, interval },
          operativosOnly,
          ventas,
          compras,
          egresosUsados,
          resultado,
          gastosPersonales: expensePersonal || 0,
        })
        lastAnalyticsRef.current = analyticsKey
      }
    } else if (isParentDataLoaded === false) {
      // Parent is still loading initial data — don't fetch, stay in current state
      return
    } else {
      fetchResultKPI()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period.from, period.to, operativosOnly, dataset, expenseTotal, expenseOperativo, expensePersonal])

  const handleToggleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked
    
    // Analytics de cambio de filtro
    trackDashboardResultFilterChanged({
      usuario: user.nickname || 'desconocido',
      valorAnterior: operativosOnly,
      valorNuevo: newValue,
      periodo: { from: period.from, to: period.to },
    })
    
    setOperativosOnly(newValue)
  }

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const getResultColor = (resultado: number): string => {
    if (resultado > 0) return 'var(--color-state-success)'
    if (resultado < 0) return 'var(--color-state-error)'
    return 'var(--color-text-secondary)'
  }

  const summaryData = data
    ? [
        { label: 'Ventas', value: data.ventas },
        { label: 'Compras', value: data.compras },
        { label: operativosOnly ? 'Egresos operativos' : 'Egresos totales', value: data.ventas - data.compras - data.resultado },
      ]
    : []

  // Loading state
  if (loading) {
    return (
      <div className={CARD_CLASSNAME}>
        <div className="flex min-h-[220px] flex-col justify-between gap-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-raised text-brand-primary shadow-sm">
                <DollarSign className="text-[22px]" aria-hidden="true" />
              </div>
              <div>
                <span className="inline-flex rounded-full bg-[color:color-mix(in_oklab,var(--color-brand-primary)_12%,white)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-primary">
                  Resultado simple
                </span>
                <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-text-primary">Resultado del período</h3>
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-14 w-full animate-pulse rounded-xl bg-background-subtle" />
              <div className="grid gap-3 md:grid-cols-3">
                <div className="h-24 animate-pulse rounded-xl bg-background-subtle" />
                <div className="h-24 animate-pulse rounded-xl bg-background-subtle" />
                <div className="h-24 animate-pulse rounded-xl bg-background-subtle" />
              </div>
            </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={CARD_CLASSNAME}>
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle bg-surface-raised p-6 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[color:color-mix(in_oklab,var(--color-state-error)_12%,white)] text-state-error">
              <Info className="text-2xl" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">No pudimos calcular el resultado</h3>
            <p className="mt-2 max-w-[32ch] text-sm leading-6 text-state-error">{error}</p>
            <button
              onClick={fetchResultKPI}
              className="group mt-5 flex cursor-pointer items-center gap-2 rounded-full border-none bg-brand-primary px-5 py-2.5 text-sm font-semibold text-text-inverse transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-brand-primary-hover focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2"
            >
              <RefreshCw aria-hidden="true" /> Reintentar
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/14 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1">
                <ChevronRight size={16} aria-hidden="true" />
              </span>
            </button>
        </div>
      </div>
    )
  }

  // Success state
  return (
    <div className={cn(CARD_CLASSNAME, 'overflow-hidden')}>
      <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex rounded-full bg-[color:color-mix(in_oklab,var(--color-brand-primary)_12%,white)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-primary">
                Resultado simple
              </span>
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-raised text-brand-primary shadow-sm">
                  <DollarSign className="text-[22px]" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="m-0 text-xl font-semibold tracking-[-0.03em] text-text-primary">Resultado del período</h3>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">Ventas menos compras y egresos, con un filtro inmediato para operación.</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-surface-base px-4 py-3">
              <label
                className="flex cursor-pointer items-center gap-3 text-text-secondary text-label font-semibold select-none"
              >
                <input
                  type="checkbox"
                  role="switch"
                  checked={operativosOnly}
                  onChange={handleToggleChange}
                  style={{
                    accentColor: 'var(--color-brand-primary)',
                    outlineColor: 'var(--color-border-interactive)',
                  }}
                  className="h-5 w-5 cursor-pointer rounded focus-visible:ring-2 focus-visible:ring-offset-1"
                />
                Solo egresos operativos
              </label>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div className="rounded-xl bg-surface-base p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">Resultado neto</p>
              <div
                className="mt-4 text-[clamp(2.4rem,4vw,3.6rem)] font-semibold tracking-[-0.06em]"
                style={{ color: getResultColor(data?.resultado || 0) }}
              >
                {formatAmount(data?.resultado || 0)}
              </div>
              <p className="mt-3 text-sm leading-6 text-text-secondary">Ventas - Compras - Egresos</p>
              <div className="mt-5 inline-flex items-center rounded-full bg-[color:color-mix(in_oklab,var(--color-brand-accent)_10%,white)] px-4 py-2 text-[13px] font-medium text-[color:color-mix(in_oklab,var(--color-brand-accent)_76%,black)]">
                <Info className="mr-2 text-base" aria-hidden="true" />
                Gastos personales: {formatAmount(data?.gastosPersonales || 0)}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
              {summaryData.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl bg-surface-base p-4"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">{item.label}</p>
                  <p className="mt-3 text-xl font-semibold tracking-[-0.03em] text-text-primary">{formatAmount(item.value)}</p>
                </div>
              ))}
            </div>
          </div>
      </div>
    </div>
  )
}

export default ResultKPICard
