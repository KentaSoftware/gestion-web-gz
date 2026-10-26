'use client';

import React from 'react';
import styled from 'styled-components';
import { CashflowSummary } from '@/interfaces/cashflow.interface';
import { formatCurrency } from '@/utils/validators';

interface SummaryCardsProps {
  summary: CashflowSummary | null;
  loading?: boolean;
}

interface CardDefinition {
  key: keyof CashflowSummary;
  label: string;
  tone: 'neutral' | 'inflow' | 'outflow' | 'net' | 'closing';
  hint?: string;
}

const CARDS: CardDefinition[] = [
  { key: 'openingBalance', label: 'Saldo inicial', tone: 'neutral' },
  { key: 'totalInflows', label: 'Total ingresos', tone: 'inflow' },
  { key: 'totalOutflows', label: 'Total egresos', tone: 'outflow' },
  { key: 'netCashFlow', label: 'Flujo neto', tone: 'net', hint: 'Ingresos − Egresos' },
  { key: 'closingBalance', label: 'Saldo final', tone: 'closing', hint: 'Saldo inicial + Flujo neto' },
];

/**
 * Five summary cards for the selected period (PS-T02).
 */
export default function SummaryCards({ summary, loading }: SummaryCardsProps) {
  return (
    <Grid>
      {CARDS.map(card => {
        const raw = summary ? summary[card.key] : null;
        const value = typeof raw === 'number' ? raw : null;

        return (
          <Card key={card.key} $tone={card.tone}>
            <CardLabel>{card.label}</CardLabel>

            {loading && value === null ? (
              <Skeleton />
            ) : (
              <CardValue $tone={card.tone}>
                {value === null ? '—' : formatCurrency(value)}
              </CardValue>
            )}

            {card.hint && <CardHint>{card.hint}</CardHint>}
          </Card>
        );
      })}
    </Grid>
  );
}

const toneColor = (tone: CardDefinition['tone']): string => {
  switch (tone) {
    case 'inflow':
      return '#2e7d32';
    case 'outflow':
      return '#c62828';
    case 'net':
      return '#1565c0';
    case 'closing':
      return '#3764a0';
    default:
      return '#333';
  }
};

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 16px;
`;

const Card = styled.div<{ $tone: CardDefinition['tone'] }>`
  background: white;
  border-radius: 12px;
  padding: 18px 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-left: 4px solid ${props => toneColor(props.$tone)};
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const CardLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.4px;
  color: #666;
  text-transform: uppercase;
`;

const CardValue = styled.span<{ $tone: CardDefinition['tone'] }>`
  font-size: 22px;
  font-weight: 700;
  color: ${props => toneColor(props.$tone)};
  word-break: break-word;
`;

const CardHint = styled.span`
  font-size: 11px;
  color: #999;
`;

const Skeleton = styled.div`
  height: 26px;
  width: 70%;
  border-radius: 6px;
  background: linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
`;
