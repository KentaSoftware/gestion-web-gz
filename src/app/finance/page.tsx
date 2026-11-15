'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Permission } from '@/interfaces/auth.interface'
import { financeService } from '@/services/finance.service'
import type { FinanceDashboard } from '@/interfaces/finance.interface'
import { FinanceKpiCards } from '@/components/finance/FinanceKpiCards'
import {
  FinanceChartsPanel,
  FinanceProjectionChart,
} from '@/components/finance/FinanceChartsPanel'
import { FinanceMovementsPanel } from '@/components/finance/FinanceMovementsPanel'
import { FinanceInsightsPanel } from '@/components/finance/FinanceInsightsPanel'
import { FinanceRulesPanel } from '@/components/finance/FinanceRulesPanel'
import { RegisterExpenseModal } from '@/components/finance/RegisterExpenseModal'
import { Spinner } from '@/components/ui/spinner'
import Button from '@/components/Button'
import { cn } from '@/lib/cn'
import { PageContainer, PageHeader } from '@/components/layout/PageLayout'
import { createFinanceDemo, demo, DEMO_MAX_DAYS } from './financeDemo'
import { createProjectionPdf } from './financeProjectionPdf'
import { financeBusinessDate, FutureFinancePeriodError } from './financeProjection'

interface DateRange {
  startDate: string
  endDate: string
}

function getDefaultDateRange(): DateRange {
  const now = new Date()
  if (demo) {
    const endDate = financeBusinessDate(now)
    return { startDate: `${endDate.slice(0, 7)}-01`, endDate }
  }
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  return {
    startDate: firstDay.toISOString().split('T')[0],
    endDate: now.toISOString().split('T')[0],
  }
}

function FinancePageContent() {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange)
  const [dashboard, setDashboard] = useState<FinanceDashboard | null>(null)
  const [loading, setLoading] = useState(false)
  const [dateError, setDateError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const exportingRef = useRef(false)

  const fetchDashboard = useCallback(async (range: DateRange) => {
    if (demo) {
      setLoadError('')
      setDashboard(createFinanceDemo(range))
      return
    }
    try {
      setLoading(true)
      setLoadError('')
      const data = await financeService.getDashboard(range)
      setDashboard(data)
    } catch (err: any) {
      setDashboard(null)
      const code = err?.response?.data?.code
      if (code === 'FINANCE_INVALID_PERIOD') {
        setLoadError('El rango de fechas es inválido.')
      } else {
        setLoadError(
          err?.response?.data?.error ||
            err?.userMessage ||
            'No se pudo cargar el panel financiero. Verificá el backend y tus permisos (read_cashflow).'
        )
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchDashboard(dateRange)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleApply = () => {
    const from = new Date(dateRange.startDate)
    const to = new Date(dateRange.endDate)
    if (from > to || (demo && (!dateRange.startDate || !dateRange.endDate))) {
      setDateError('La fecha inicial no puede ser posterior a la fecha final')
      return
    }
    if (demo && dateRange.endDate > financeBusinessDate()) {
      setDateError(new FutureFinancePeriodError().message)
      return
    }
    if (demo && (to.getTime() - from.getTime()) / 86400000 + 1 > DEMO_MAX_DAYS) {
      setDateError(`El rango no puede superar ${DEMO_MAX_DAYS} días.`)
      return
    }
    setDateError('')
    void fetchDashboard(dateRange)
  }

  const handleExportPdf = async () => {
    if (exportingRef.current) return
    if (demo && (!dashboard || dashboard.startDate !== dateRange.startDate || dashboard.endDate !== dateRange.endDate)) return
    exportingRef.current = true
    try {
      setExporting(true)
      setLoadError('')
      const blob = demo && dashboard ? createProjectionPdf(dashboard).output('blob') : await financeService.exportReportPdf(dateRange)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `golozur360-finance-${dateRange.startDate}_${dateRange.endDate}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      setLoadError(error instanceof FutureFinancePeriodError ? error.message : 'No se pudo exportar el PDF. Reintentá o verificá permisos.')
    } finally {
      exportingRef.current = false
      setExporting(false)
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Gestión Financiera"
        actions={
          <>
            <Button
              text={exporting ? 'Exportando…' : 'Exportar Reporte'}
              onClick={() => { void handleExportPdf() }}
              size="md"
              variant="secondary"
              disabled={exporting || (demo && (!dashboard || dashboard.startDate !== dateRange.startDate || dashboard.endDate !== dateRange.endDate))}
            />
            <Button
              text="+ Nuevo Movimiento"
              onClick={() => { if (!demo) setExpenseOpen(true) }}
              size="md"
              variant="primary"
            />
          </>
        }
      >
        <div className="flex items-end gap-4 flex-wrap mt-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="fin-desde" className="text-caption text-text-secondary font-medium">
              Desde
            </label>
            <input
              id="fin-desde"
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
              className={cn(
                'px-3 py-2 text-label text-text-primary',
                'bg-surface-base border border-border-strong rounded-sm',
                'focus:outline-none focus:border-border-interactive'
              )}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="fin-hasta" className="text-caption text-text-secondary font-medium">
              Hasta
            </label>
            <input
              id="fin-hasta"
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
              className={cn(
                'px-3 py-2 text-label text-text-primary',
                'bg-surface-base border border-border-strong rounded-sm',
                'focus:outline-none focus:border-border-interactive'
              )}
            />
          </div>
          <Button text="Aplicar" onClick={handleApply} size="md" />
        </div>

        {(dateError || loadError) && (
          <p role="alert" className="text-state-error text-caption mt-2 font-medium">{dateError || loadError}</p>
        )}
      </PageHeader>

      {dashboard?.emptyPeriod && !loading && (
        <div className="mb-6 rounded-md border border-state-warning/40 bg-state-warning/10 p-4">
          <p className="text-label font-medium text-text-primary">
            No se encontraron registros para las fechas seleccionadas
          </p>
          <p className="text-caption text-text-secondary mt-1">
            Probá otro rango o registrá un egreso con Nuevo Movimiento / cobrá ventas pendientes.
          </p>
        </div>
      )}

      <FinanceKpiCards kpis={dashboard?.kpis ?? null} loading={loading} />
      <FinanceChartsPanel
        timeline={dashboard?.timeline ?? []}
        distribution={dashboard?.expenseDistribution ?? []}
        weekly={dashboard?.weeklyProjection ?? []}
        loading={loading}
        showProjection={false}
        showSinglePoint={demo}
      />
      {demo && dashboard && dashboard.startDate === dashboard.endDate && (
        <p className="text-caption text-text-secondary mb-4">Ingresos: {dashboard.kpis.totalInflows.toLocaleString('es-AR')} · Egresos: {dashboard.kpis.totalOutflows.toLocaleString('es-AR')}</p>
      )}
      {/* Mock row: Proyección vs Real | Últimos Movimientos */}
      <section className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        <FinanceProjectionChart
          weekly={dashboard?.weeklyProjection ?? []}
          loading={loading}
        />
        <FinanceMovementsPanel
          movements={dashboard?.recentMovements ?? []}
          loading={loading}
          compact
          allowNavigation={!demo}
        />
      </section>
      <FinanceInsightsPanel
        insights={dashboard?.insights ?? []}
        opportunity={dashboard?.opportunity ?? null}
        loading={loading}
      />
      <FinanceRulesPanel readOnly={demo} onUpdated={() => void fetchDashboard(dateRange)} />

      {!demo && <RegisterExpenseModal
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        onCreated={() => void fetchDashboard(dateRange)}
      />}
    </PageContainer>
  )
}

export default function FinancePage() {
  return (
    <ProtectedRoute
      requiredPermission={Permission.READ_CASHFLOW}
      deniedMessage="No tienes permisos para ver Finanzas. Se requiere el permiso de lectura de flujo de caja (read_cashflow)."
    >
      <Suspense fallback={<Spinner className="size-12 text-brand-primary" />}>
        <FinancePageContent />
      </Suspense>
    </ProtectedRoute>
  )
}
