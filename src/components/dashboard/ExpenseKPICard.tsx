/**
 * Componente KPI de Egresos para Dashboard
 * Muestra el total de egresos del período seleccionado
 * con filtro por tipo de egreso (operativo, personal, otro negocio)
 */
'use client'
import { useState, useEffect, useRef, type CSSProperties, type MouseEvent } from 'react'
import { expenseService } from '@/services/expense.service'
import { trackDashboardExpenseKPIViewed } from '@/utils/analytics'
import { useSelector } from 'react-redux'
import { getUser } from '@/redux/userSlice'
import { AlertTriangle, DollarSign, ChevronRight, RefreshCw } from 'lucide-react'
import { ExpenseType } from '@/interfaces/expense.interface'
import { cn } from '@/lib/cn'

interface Props {
  period: {
    from: string;  // YYYY-MM-DD
    to: string;    // YYYY-MM-DD
  };
}

type ExpenseTypeFilter = ExpenseType | ''

const TYPE_TAB_ACTIVE_COLOR = 'var(--color-brand-primary)'
const TYPE_TAB_INACTIVE_BORDER = 'var(--color-border-subtle)'
const TYPE_TAB_INACTIVE_TEXT = 'var(--color-text-secondary)'
const RETRY_HOVER_COLOR = 'var(--color-brand-primary-hover)'

const typeTabBaseClassName =
  'group cursor-pointer whitespace-nowrap rounded-full border px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] max-[768px]:min-w-[calc(50%_-_3px)] max-[768px]:flex-1 max-md:min-h-[44px] max-md:px-4 max-md:text-xs focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:rounded-full'

const cardClassName = 'rounded-xl border border-border-subtle bg-surface-raised p-6 shadow-md md:p-7'

const typeTabActiveStyle: CSSProperties = {
  borderColor: TYPE_TAB_ACTIVE_COLOR,
  background: 'var(--color-brand-primary)',
  color: 'var(--color-text-inverse)',
  fontWeight: 600,
  boxShadow: 'var(--shadow-md)',
}

const typeTabInactiveStyle: CSSProperties = {
  borderColor: TYPE_TAB_INACTIVE_BORDER,
  background: 'var(--color-surface-base)',
  color: TYPE_TAB_INACTIVE_TEXT,
  fontWeight: 400,
}

const skeletonClassName = 'h-16 w-full animate-pulse rounded-xl bg-background-subtle'

export default function ExpenseKPICard({ period }: Props) {
  const user = useSelector(getUser)
  const [selectedType, setSelectedType] = useState<ExpenseTypeFilter>('')
  const [data, setData] = useState<{ total: number; count?: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const analyticsTrackedRef = useRef<string | null>(null)

  useEffect(() => {
    fetchKPI()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period.from, period.to, selectedType])

  const fetchKPI = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await expenseService.getKPITotal({
        from: period.from,
        to: period.to,
        type: selectedType || undefined
      })

      // El backend puede retornar la data directamente o envuelta
      const kpiData = (response as any).data || response

      // Conversión si viene en centavos
      const total = kpiData.total || (kpiData.totalCents ? kpiData.totalCents / 100 : 0)
      const count = kpiData.count || 0

      setData({ total, count })

      // Analytics
      const analyticsKey = `${period.from}_${period.to}_${selectedType || 'all'}`
      if (analyticsTrackedRef.current !== analyticsKey) {
        const tipoEgreso = selectedType 
          ? (selectedType === ExpenseType.OPERATIVO ? 'operativo' 
              : selectedType === ExpenseType.PERSONAL ? 'personal' 
              : 'otro_negocio')
          : 'todos'
        
        trackDashboardExpenseKPIViewed({
          usuario: user.nickname || 'unknown',
          periodo: period,
          tipo_egreso: tipoEgreso,
          monto_total: total
        })
        analyticsTrackedRef.current = analyticsKey
      }

    } catch (err: any) {
      console.error('Error fetching expense KPI:', err)
      if (err.response?.status === 403) {
        setError('No tiene permisos')
      } else if (err.response?.status === 400) {
        setError('Período inválido')
      } else {
        setError('Error al cargar datos')
      }
    } finally {
      setLoading(false)
    }
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const handleTypeChange = (type: ExpenseTypeFilter) => {
    setSelectedType(type)
  }

  const getTypeLabel = (type: ExpenseTypeFilter) => {
    switch (type) {
      case ExpenseType.OPERATIVO:
        return 'Operativo'
      case ExpenseType.PERSONAL:
        return 'Personal'
      case ExpenseType.OTRO_NEGOCIO:
        return 'Otro'
      default:
        return 'Todos'
    }
  }

  const handleTypeTabMouseEnter = (event: MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.style.borderColor = TYPE_TAB_ACTIVE_COLOR
  }

  const handleTypeTabMouseLeave = (event: MouseEvent<HTMLButtonElement>, active: boolean) => {
    event.currentTarget.style.borderColor = active ? TYPE_TAB_ACTIVE_COLOR : TYPE_TAB_INACTIVE_BORDER
  }

  const handleRetryMouseEnter = (event: MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.style.backgroundColor = RETRY_HOVER_COLOR
  }

  const handleRetryMouseLeave = (event: MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.style.backgroundColor = TYPE_TAB_ACTIVE_COLOR
  }

  return (
    <div className={cardClassName}>
      <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <span className="inline-flex w-fit rounded-full bg-[color:color-mix(in_oklab,var(--color-brand-accent)_12%,white)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:color-mix(in_oklab,var(--color-brand-accent)_76%,black)]">
                  Control de egresos
                </span>
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-raised text-brand-accent shadow-sm">
                    <DollarSign size={22} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="m-0 text-xl font-semibold tracking-[-0.03em] text-text-primary">
                      Egresos del período
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-text-secondary">
                      Filtrá por tipo sin perder la lectura del monto consolidado.
                    </p>
                  </div>
                </div>
              </div>

              {!loading && !error && data && (
                <div className="rounded-xl bg-surface-base px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">Registros</p>
                  <p className="mt-2 text-lg font-semibold text-text-primary">{data.count ?? 0}</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={selectedType === ''}
                className={typeTabBaseClassName}
                style={selectedType === '' ? typeTabActiveStyle : typeTabInactiveStyle}
                onClick={() => handleTypeChange('')}
                onMouseEnter={handleTypeTabMouseEnter}
                onMouseLeave={(event) => handleTypeTabMouseLeave(event, selectedType === '')}
              >
                Todos
              </button>
              <button
                type="button"
                aria-pressed={selectedType === ExpenseType.OPERATIVO}
                className={typeTabBaseClassName}
                style={selectedType === ExpenseType.OPERATIVO ? typeTabActiveStyle : typeTabInactiveStyle}
                onClick={() => handleTypeChange(ExpenseType.OPERATIVO)}
                onMouseEnter={handleTypeTabMouseEnter}
                onMouseLeave={(event) => handleTypeTabMouseLeave(event, selectedType === ExpenseType.OPERATIVO)}
              >
                Operativo
              </button>
              <button
                type="button"
                aria-pressed={selectedType === ExpenseType.PERSONAL}
                className={typeTabBaseClassName}
                style={selectedType === ExpenseType.PERSONAL ? typeTabActiveStyle : typeTabInactiveStyle}
                onClick={() => handleTypeChange(ExpenseType.PERSONAL)}
                onMouseEnter={handleTypeTabMouseEnter}
                onMouseLeave={(event) => handleTypeTabMouseLeave(event, selectedType === ExpenseType.PERSONAL)}
              >
                Personal
              </button>
              <button
                type="button"
                aria-pressed={selectedType === ExpenseType.OTRO_NEGOCIO}
                className={typeTabBaseClassName}
                style={selectedType === ExpenseType.OTRO_NEGOCIO ? typeTabActiveStyle : typeTabInactiveStyle}
                onClick={() => handleTypeChange(ExpenseType.OTRO_NEGOCIO)}
                onMouseEnter={handleTypeTabMouseEnter}
                onMouseLeave={(event) => handleTypeTabMouseLeave(event, selectedType === ExpenseType.OTRO_NEGOCIO)}
              >
                Otro
              </button>
            </div>

            {loading && (
              <div className="flex min-h-[220px] items-center justify-center py-4">
                <div className={skeletonClassName} />
              </div>
            )}

            {!loading && error && (
              <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle bg-surface-raised px-5 py-6 text-center">
                <AlertTriangle className="mb-3 h-8 w-8 text-state-error" aria-hidden="true" />
                <div className="mb-4 text-sm text-state-error">
                  {error}
                </div>
                <button
                  type="button"
                  className="group flex cursor-pointer items-center gap-2 rounded-full border-none bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2"
                  onClick={fetchKPI}
                  onMouseEnter={handleRetryMouseEnter}
                  onMouseLeave={handleRetryMouseLeave}
                >
                  <RefreshCw size={18} aria-hidden="true" />
                  Reintentar
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/14 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1">
                    <ChevronRight size={16} aria-hidden="true" />
                  </span>
                </button>
              </div>
            )}

            {!loading && !error && data && (
              <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(190px,0.8fr)]">
                <div className="rounded-xl bg-surface-base p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">Monto acumulado</p>
                  <div className="mt-4 text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-0.05em] text-text-primary">
                    {formatAmount(data.total)}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-text-muted">
                    {data.count} egreso{data.count !== 1 ? 's' : ''} registrados para {getTypeLabel(selectedType).toLowerCase()}.
                  </p>
                </div>

                <div className="rounded-xl bg-surface-base p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">Filtro activo</p>
                  <p className="mt-4 text-xl font-semibold tracking-[-0.03em] text-text-primary">{getTypeLabel(selectedType)}</p>
                  <p className="mt-3 text-sm leading-6 text-text-secondary">
                    Podés alternar categorías sin recargar la estructura del tablero.
                  </p>
                </div>
              </div>
            )}
      </div>
      </div>
  )
}
