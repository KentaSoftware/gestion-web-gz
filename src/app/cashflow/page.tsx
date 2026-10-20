'use client'
import { Suspense, useState, useEffect, useCallback } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Permission } from '@/interfaces/auth.interface'
import { cashflowService } from '@/services/cashflow.service'
import type { CashflowSummary, CashflowTimelineEntry, CashflowMovement } from '@/interfaces/cashflow.interface'
import { CashflowSummaryCard } from '@/components/cashflow/CashflowSummaryCard'
import { CashflowTimelineChart } from '@/components/cashflow/CashflowTimelineChart'
import { CashflowMovementsTable } from '@/components/cashflow/CashflowMovementsTable'
import { CashflowConfigPanel } from '@/components/cashflow/CashflowConfigPanel'
import { Spinner } from '@/components/ui/spinner'
import Button from '@/components/Button'
import { cn } from '@/lib/cn'
import { PageContainer, PageHeader } from '@/components/layout/PageLayout'

/**
 * Cashflow page — vertical slice pilot.
 * Tailwind 4 semantic token classes. No styled-components.
 */

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

function CashflowPageContent() {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange)

  const [summary, setSummary] = useState<CashflowSummary | null>(null)
  const [timeline, setTimeline] = useState<CashflowTimelineEntry[]>([])
  const [movements, setMovements] = useState<CashflowMovement[]>([])

  const [loadingSummary, setLoadingSummary] = useState(false)
  const [loadingTimeline, setLoadingTimeline] = useState(false)
  const [loadingMovements, setLoadingMovements] = useState(false)

  const [dateError, setDateError] = useState<string>('')

  const fetchSummary = useCallback(async (range: DateRange) => {
    try {
      setLoadingSummary(true)
      const data = await cashflowService.getSummary(range)
      setSummary(data)
    } catch {
      setSummary(null)
    } finally {
      setLoadingSummary(false)
    }
  }, [])

  const fetchTimeline = useCallback(async (range: DateRange) => {
    try {
      setLoadingTimeline(true)
      const data = await cashflowService.getTimeline(range)
      setTimeline(data)
    } catch {
      setTimeline([])
    } finally {
      setLoadingTimeline(false)
    }
  }, [])

  const fetchMovements = useCallback(async (range: DateRange) => {
    try {
      setLoadingMovements(true)
      const data = await cashflowService.getMovements(range)
      setMovements(data)
    } catch {
      setMovements([])
    } finally {
      setLoadingMovements(false)
    }
  }, [])

  const fetchAll = useCallback(
    (range: DateRange) => {
      fetchSummary(range)
      fetchTimeline(range)
      fetchMovements(range)
    },
    [fetchSummary, fetchTimeline, fetchMovements]
  )

  useEffect(() => {
    fetchAll(dateRange)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleApply = () => {
    const from = new Date(dateRange.startDate)
    const to = new Date(dateRange.endDate)
    if (from > to) {
      setDateError('La fecha inicial no puede ser posterior a la fecha final')
      return
    }
    setDateError('')
    fetchAll(dateRange)
  }

  const handleConfigUpdated = () => {
    fetchSummary(dateRange)
  }

  return (
    <PageContainer>
      <PageHeader title="Flujo de caja">
        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <label htmlFor="date-desde" className="text-caption text-text-secondary font-medium">
              Desde
            </label>
            <input
              id="date-desde"
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
              className={cn(
                'px-3 py-2 text-label text-text-primary',
                'bg-surface-base border border-border-strong rounded-sm',
                'transition-colors duration-[120ms]',
                'focus:outline-none focus:border-border-interactive'
              )}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="date-hasta" className="text-caption text-text-secondary font-medium">
              Hasta
            </label>
            <input
              id="date-hasta"
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
              className={cn(
                'px-3 py-2 text-label text-text-primary',
                'bg-surface-base border border-border-strong rounded-sm',
                'transition-colors duration-[120ms]',
                'focus:outline-none focus:border-border-interactive'
              )}
            />
          </div>

          <Button text="Aplicar" onClick={handleApply} size="md" />
        </div>

        {dateError && (
          <p className="text-state-error text-caption mt-2 font-medium">
            {dateError}
          </p>
        )}
      </PageHeader>

      <CashflowSummaryCard summary={summary} loading={loadingSummary} />

      <CashflowConfigPanel onConfigUpdated={handleConfigUpdated} />

      <CashflowTimelineChart entries={timeline} loading={loadingTimeline} />

      <CashflowMovementsTable movements={movements} loading={loadingMovements} />
    </PageContainer>
  )
}

export default function CashflowPage() {
  return (
    <ProtectedRoute
      requiredPermission={Permission.READ_CASHFLOW}
      deniedMessage="No tienes permisos para ver el flujo de caja. Contacta a tu administrador si necesitas acceso."
    >
      <Suspense fallback={<Spinner className="size-12 text-brand-primary" />}>
        <CashflowPageContent />
      </Suspense>
    </ProtectedRoute>
  )
}
