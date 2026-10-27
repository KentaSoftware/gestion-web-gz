'use client';

import React, { useMemo } from 'react';
import styled from 'styled-components';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CashflowMovement } from '@/interfaces/cashflow.interface';
import { aggregateByDay, DailyCashflowPoint } from '@/utils/cashflowAggregation';
import { formatCurrency } from '@/utils/validators';

interface CashflowTimelineProps {
  timeline: CashflowMovement[];
  openingBalance: number;
}

/**
 * Cumulative cash balance plus per-day inflow/outflow bars (PS-T25).
 * One point per day with the day's totals, never one point per movement.
 */
export default function CashflowTimeline({ timeline, openingBalance }: CashflowTimelineProps) {
  const data = useMemo<DailyCashflowPoint[]>(
    () => aggregateByDay(timeline, openingBalance),
    [openingBalance, timeline]
  );

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <Title>Evolución de la caja</Title>
        </CardHeader>
        <EmptyState>No hay movimientos en el período para graficar.</EmptyState>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <Title>Evolución de la caja</Title>
        <Hint>Saldo acumulado partiendo del saldo inicial configurado</Hint>
      </CardHeader>

      <ChartWrapper>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value: number) => compactCurrency(value)}
              width={90}
            />
            <Tooltip content={<CashflowTooltip />} />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Bar dataKey="inflow" name="Ingresos" fill="#2e7d32" radius={[3, 3, 0, 0]} />
            <Bar dataKey="outflow" name="Egresos" fill="#c62828" radius={[0, 0, 3, 3]} />
            <Line
              type="monotone"
              dataKey="balance"
              name="Saldo acumulado"
              stroke="#3764a0"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartWrapper>
    </Card>
  );
}

function compactCurrency(value: number): string {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return String(value);
}

interface TooltipPayloadEntry {
  payload: DailyCashflowPoint;
}

function CashflowTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0].payload;

  return (
    <TooltipBox>
      <TooltipDate>{point.fullDate}</TooltipDate>
      <TooltipRow>({point.movements} movimientos)</TooltipRow>
      <TooltipRow>Ingresos del día: {formatCurrency(point.inflow)}</TooltipRow>
      <TooltipRow>Egresos del día: {formatCurrency(Math.abs(point.outflow))}</TooltipRow>
      <TooltipRow>Saldo acumulado: {formatCurrency(point.balance)}</TooltipRow>
    </TooltipBox>
  );
}

const Card = styled.section`
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const Title = styled.h2`
  font-size: 16px;
  font-weight: 700;
  color: #333;
  margin: 0;
`;

const Hint = styled.span`
  font-size: 12px;
  color: #888;
`;

const ChartWrapper = styled.div`
  width: 100%;
  min-width: 0;
`;

const EmptyState = styled.p`
  font-size: 14px;
  color: #777;
  background: #f7f9fc;
  border: 1px dashed #cdd7e3;
  border-radius: 10px;
  padding: 24px;
  margin: 0;
  text-align: center;
`;

const TooltipBox = styled.div`
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 10px 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  font-size: 12px;
  color: #333;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 260px;
`;

const TooltipDate = styled.span`
  font-weight: 700;
  color: #3764a0;
`;

const TooltipRow = styled.span`
  color: #444;
`;
