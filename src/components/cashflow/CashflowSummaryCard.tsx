'use client'
import styled from 'styled-components'
import type { CashflowSummary } from '@/interfaces/cashflow.interface'

interface KpiItem {
  label: string
  value: number
  color: string
}

interface CashflowSummaryCardProps {
  summary: CashflowSummary | null
  loading: boolean
}

const formatAmount = (amount: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)

export function CashflowSummaryCard({ summary, loading }: CashflowSummaryCardProps) {
  const items: KpiItem[] = [
    { label: 'Saldo inicial', value: summary?.openingBalance ?? 0, color: '#8294C4' },
    { label: 'Total ingresos', value: summary?.totalInflows ?? 0, color: '#4CAF50' },
    { label: 'Total egresos', value: summary?.totalOutflows ?? 0, color: '#E57373' },
    { label: 'Flujo neto', value: summary?.netCashFlow ?? 0, color: '#FF9800' },
    { label: 'Saldo final', value: summary?.closingBalance ?? 0, color: '#3764A0' },
  ]

  if (loading) {
    return (
      <CardGrid>
        {items.map((_, i) => (
          <SkeletonCard key={i}>
            <SkeletonLabel />
            <SkeletonValue />
          </SkeletonCard>
        ))}
      </CardGrid>
    )
  }

  return (
    <CardGrid>
      {items.map((item) => (
        <KpiCard key={item.label} $color={item.color}>
          <KpiLabel>{item.label}</KpiLabel>
          <KpiValue $negative={item.value < 0}>{formatAmount(item.value)}</KpiValue>
        </KpiCard>
      ))}
    </CardGrid>
  )
}

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`

const KpiCard = styled.div<{ $color: string }>`
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-top: 4px solid ${({ $color }) => $color};
`

const KpiLabel = styled.div`
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const KpiValue = styled.div<{ $negative: boolean }>`
  font-size: 22px;
  font-weight: bold;
  color: ${({ $negative }) => ($negative ? '#E57373' : '#333')};
`

const SkeletonCard = styled.div`
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-top: 4px solid #e0e0e0;
`

const SkeletonLabel = styled.div`
  height: 13px;
  width: 70%;
  background: #e0e0e0;
  border-radius: 4px;
  margin-bottom: 12px;
  animation: pulse 1.5s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
`

const SkeletonValue = styled.div`
  height: 22px;
  width: 50%;
  background: #e0e0e0;
  border-radius: 4px;
  animation: pulse 1.5s ease-in-out infinite;
`
