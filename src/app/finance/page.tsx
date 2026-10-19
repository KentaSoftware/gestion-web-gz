'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Permission } from '@/interfaces/auth.interface'
import { financeService } from '@/services/finance.service'
import type { FinanceDashboard } from '@/interfaces/finance.interface'
import { FinanceKpiCards } from '@/components/finance/FinanceKpiCards'
import { FinanceProjectionPanel } from '@/components/finance/FinanceProjectionPanel'
import { FinanceInsightsPanel } from '@/components/finance/FinanceInsightsPanel'
import { FinanceRulesPanel } from '@/components/finance/FinanceRulesPanel'
import { Spinner } from '@/components/ui/spinner'
import Button from '@/components/Button'
import { cn } from '@/lib/cn'
import { PageContainer, PageHeader } from '@/components/layout/PageLayout'
import Link from 'next/link'

interface DateRange {
  startDate: string
  endDate: string
}

function getDefaultDateRange(): DateRange {
  const now = new Date()
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

  const fetchDashboard = useCallback(async (range: DateRange) => {
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
    if (from > to) {
      setDateError('La fecha inicial no puede ser posterior a la fecha final')
      return
    }
    setDateError('')
    void fetchDashboard(dateRange)
  }

  const handleExportPdf = async () => {
    try {
      setExporting(true)
      const blob = await financeService.exportReportPdf(dateRange)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `golozur360-finance-${dateRange.startDate}_${dateRange.endDate}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setLoadError('No se pudo exportar el PDF. Reintentá o verificá permisos.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <PageContainer>
      <PageHeader title="Finanzas">
        <div className="flex items-end gap-4 flex-wrap">
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
          <Button
            text={exporting ? 'Exportando…' : 'Exportar reporte'}
            onClick={handleExportPdf}
            size="md"
          />
        </div>

        {(dateError || loadError) && (
          <p className="text-state-error text-caption mt-2 font-medium">{dateError || loadError}</p>
        )}

        <p className="text-caption text-text-secondary mt-3">
          Panel unificado Golozur360. También podés usar{' '}
          <Link href="/expense" className="text-brand-primary underline">
            Egresos
          </Link>{' '}
          y{' '}
          <Link href="/cashflow" className="text-brand-primary underline">
            Flujo de caja
          </Link>
          .
          {dashboard && (
            <>
              {' '}
              · Reglas: <strong>{dashboard.rulesVersion}</strong>
            </>
          )}
        </p>
      </PageHeader>

      <FinanceKpiCards historical={dashboard?.historical ?? null} loading={loading} />
      <FinanceProjectionPanel projection={dashboard?.projection ?? null} loading={loading} />
      <FinanceInsightsPanel insights={dashboard?.insights ?? []} loading={loading} />
      <FinanceRulesPanel onUpdated={() => void fetchDashboard(dateRange)} />
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
