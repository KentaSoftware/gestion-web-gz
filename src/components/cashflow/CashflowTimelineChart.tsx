'use client'
import styled from 'styled-components'
import type { CashflowTimelineEntry } from '@/interfaces/cashflow.interface'

interface CashflowTimelineChartProps {
  entries: CashflowTimelineEntry[]
  loading: boolean
}

const formatAmount = (amount: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

const SOURCE_LABELS: Record<string, string> = {
  sale: 'Venta',
  buy: 'Compra',
  expense: 'Egreso',
}

export function CashflowTimelineChart({ entries, loading }: CashflowTimelineChartProps) {
  if (loading) {
    return (
      <Container>
        <SectionTitle>Línea de tiempo</SectionTitle>
        <LoadingText>Cargando movimientos...</LoadingText>
      </Container>
    )
  }

  // entries come ordered by cashDate asc from backend; trust that order
  const sorted = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  return (
    <Container>
      <SectionTitle>Línea de tiempo</SectionTitle>
      {sorted.length === 0 ? (
        <EmptyState>
          <EmptyIcon>📊</EmptyIcon>
          <EmptyText>No hay movimientos en el período seleccionado</EmptyText>
        </EmptyState>
      ) : (
        <TimelineList>
          {sorted.map((entry, index) => (
            <TimelineItem key={`${entry.sourceId}-${index}`}>
              <TimelineDate>{formatDate(entry.date)}</TimelineDate>
              <TimelineDot $type={entry.type} />
              <TimelineContent>
                <TimelineDescription>{entry.description}</TimelineDescription>
                <TimelineMeta>
                  <TypeBadge $type={entry.type}>
                    {entry.type === 'inflow' ? 'Ingreso' : 'Egreso'}
                  </TypeBadge>
                  <SourceBadge>{SOURCE_LABELS[entry.source] ?? entry.source}</SourceBadge>
                </TimelineMeta>
              </TimelineContent>
              <TimelineAmount $type={entry.type}>
                {entry.type === 'inflow' ? '+' : '-'}{formatAmount(entry.amount)}
              </TimelineAmount>
            </TimelineItem>
          ))}
        </TimelineList>
      )}
    </Container>
  )
}

const Container = styled.div`
  background: white;
  border-radius: 10px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
`

const SectionTitle = styled.h2`
  color: #3764A0;
  font-size: 20px;
  margin: 0 0 20px 0;
`

const LoadingText = styled.p`
  color: #999;
  font-size: 14px;
`

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
`

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
`

const EmptyText = styled.p`
  color: #666;
  font-size: 16px;
  text-align: center;
`

const TimelineList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 400px;
  overflow-y: auto;
`

const TimelineItem = styled.li`
  display: grid;
  grid-template-columns: 100px 16px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
`

const TimelineDate = styled.span`
  font-size: 13px;
  color: #666;
  white-space: nowrap;
`

const TimelineDot = styled.div<{ $type: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${({ $type }) => ($type === 'inflow' ? '#4CAF50' : '#E57373')};
  flex-shrink: 0;
`

const TimelineContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const TimelineDescription = styled.span`
  font-size: 14px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const TimelineMeta = styled.div`
  display: flex;
  gap: 6px;
`

const TypeBadge = styled.span<{ $type: string }>`
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  background: ${({ $type }) => ($type === 'inflow' ? '#E8F5E9' : '#FFEBEE')};
  color: ${({ $type }) => ($type === 'inflow' ? '#2E7D32' : '#C62828')};
`

const SourceBadge = styled.span`
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: #EDE7F6;
  color: #4527A0;
`

const TimelineAmount = styled.span<{ $type: string }>`
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  color: ${({ $type }) => ($type === 'inflow' ? '#4CAF50' : '#E57373')};
`
