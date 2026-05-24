'use client'
import { Suspense, useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Permission } from '@/interfaces/auth.interface'
import { cashflowService } from '@/services/cashflow.service'
import type { CashflowSummary, CashflowTimelineEntry, CashflowMovement } from '@/interfaces/cashflow.interface'
import { CashflowSummaryCard } from '@/components/cashflow/CashflowSummaryCard'
import { CashflowTimelineChart } from '@/components/cashflow/CashflowTimelineChart'
import { CashflowMovementsTable } from '@/components/cashflow/CashflowMovementsTable'
import { CashflowConfigPanel } from '@/components/cashflow/CashflowConfigPanel'
import Loading from '@/components/Loading'

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
    <Container>
      <Header>
        <Title>Flujo de caja</Title>
        <DateRangeBar>
          <DateField>
            <label>Desde</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
            />
          </DateField>
          <DateField>
            <label>Hasta</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
            />
          </DateField>
          <ApplyButton onClick={handleApply}>Aplicar</ApplyButton>
        </DateRangeBar>
        {dateError && <DateErrorText>{dateError}</DateErrorText>}
      </Header>

      <CashflowSummaryCard summary={summary} loading={loadingSummary} />

      <CashflowConfigPanel onConfigUpdated={handleConfigUpdated} />

      <CashflowTimelineChart entries={timeline} loading={loadingTimeline} />

      <CashflowMovementsTable movements={movements} loading={loadingMovements} />
    </Container>
  )
}

export default function CashflowPage() {
  return (
    <ProtectedRoute
      requiredPermission={Permission.READ_CASHFLOW}
      deniedMessage="No tienes permisos para ver el flujo de caja. Contacta a tu administrador si necesitas acceso."
    >
      <Suspense fallback={<Loading />}>
        <CashflowPageContent />
      </Suspense>
    </ProtectedRoute>
  )
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 24px;
  background: #f5f5f5;
`

const Header = styled.div`
  margin-bottom: 24px;
`

const Title = styled.h1`
  color: #3764A0;
  font-size: 32px;
  margin: 0 0 16px 0;
`

const DateRangeBar = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
`

const DateField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  label {
    font-size: 13px;
    color: #666;
    font-weight: 500;
  }

  input {
    padding: 8px 12px;
    border: 1px solid #B4B4B8;
    border-radius: 6px;
    font-size: 14px;
    transition: border-color 0.2s;

    &:focus {
      outline: none;
      border-color: #8294C4;
    }
  }
`

const ApplyButton = styled.button`
  padding: 9px 24px;
  background: #8294C4;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #637195;
  }
`

const DateErrorText = styled.div`
  color: #d32f2f;
  font-size: 13px;
  margin-top: 8px;
  font-weight: 500;
`
