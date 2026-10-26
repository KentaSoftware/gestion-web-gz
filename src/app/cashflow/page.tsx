'use client';

import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { useAppDispatch } from '@/redux/hook';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Permission } from '@/interfaces/auth.interface';
import { cashflowService } from '@/services/cashflow.service';
import {
  getCashflowError,
  getCashflowLoading,
  getCashflowSummary,
  setCashflowError,
  setCashflowLoading,
  setSummary,
} from '@/redux/cashflowSlice';
import PeriodSelector from '@/components/cashflow/PeriodSelector';
import SummaryCards from '@/components/cashflow/SummaryCards';

const toInputDate = (date: Date): string => format(date, 'yyyy-MM-dd');

function CashflowScreen() {
  const dispatch = useAppDispatch();

  const summary = useSelector(getCashflowSummary);
  const loading = useSelector(getCashflowLoading);
  const error = useSelector(getCashflowError);

  const [startDate, setStartDate] = useState<string>(() => toInputDate(startOfMonth(new Date())));
  const [endDate, setEndDate] = useState<string>(() => toInputDate(endOfMonth(new Date())));
  const [periodError, setPeriodError] = useState<string | null>(null);

  const isValidPeriod = Boolean(startDate) && Boolean(endDate) && startDate <= endDate;

  const loadSummary = useCallback(async () => {
    if (!isValidPeriod) {
      setPeriodError('La fecha "desde" no puede ser posterior a la fecha "hasta".');
      return;
    }

    setPeriodError(null);
    dispatch(setCashflowLoading(true));
    dispatch(setCashflowError(null));

    try {
      const data = await cashflowService.getSummary({ startDate, endDate });
      dispatch(setSummary(data));
    } catch (requestError: unknown) {
      dispatch(setCashflowError(resolveErrorMessage(requestError)));
    } finally {
      dispatch(setCashflowLoading(false));
    }
  }, [dispatch, endDate, isValidPeriod, startDate]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const handlePeriodChange = (nextStart: string, nextEnd: string) => {
    setStartDate(nextStart);
    setEndDate(nextEnd);
  };

  const handleReload = () => {
    void loadSummary();
  };

  const periodWithoutMovements =
    summary !== null && summary.totalInflows === 0 && summary.totalOutflows === 0;

  return (
    <Container>
      <Header>
        <TitleBlock>
          <Title>Flujo de Caja</Title>
          <Subtitle>Movimientos consolidados de ventas, compras y egresos</Subtitle>
        </TitleBlock>
      </Header>

      <PeriodSelector
        startDate={startDate}
        endDate={endDate}
        error={periodError}
        disabled={loading}
        onChange={handlePeriodChange}
        onReload={handleReload}
      />

      {error && (
        <ErrorBox role="alert">
          <ErrorText>{error}</ErrorText>
          <RetryButton type="button" onClick={handleReload}>
            Reintentar
          </RetryButton>
        </ErrorBox>
      )}

      <SummaryCards summary={summary} loading={loading} />

      {periodWithoutMovements && (
        <EmptyNotice>No hay movimientos registrados en el período seleccionado.</EmptyNotice>
      )}
    </Container>
  );
}

function resolveErrorMessage(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response?.status;

  if (status === 401) {
    return 'Tu sesión expiró. Volvé a iniciar sesión para consultar el flujo de caja.';
  }
  if (status === 403) {
    return 'No tenés permisos para consultar el flujo de caja.';
  }
  if (status === 400) {
    return 'El período enviado no es válido. Revisá las fechas.';
  }
  if (typeof status === 'number' && status >= 500) {
    return 'El servidor no pudo calcular el flujo de caja. Intentá nuevamente en unos minutos.';
  }
  return 'No se pudo cargar el flujo de caja. Revisá tu conexión e intentá de nuevo.';
}

export default function CashflowPage() {
  return (
    <ProtectedRoute
      requiredPermission={Permission.READ_CASHFLOW}
      deniedMessage="No tenés permiso para acceder al flujo de caja"
    >
      <CashflowScreen />
    </ProtectedRoute>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  box-sizing: border-box;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
`;

const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Title = styled.h1`
  font-size: 26px;
  font-weight: 700;
  color: #333;
  margin: 0;
`;

const Subtitle = styled.p`
  font-size: 14px;
  color: #777;
  margin: 0;
`;

const ErrorBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  background: #fdecea;
  border: 1px solid #f5c2c0;
  border-radius: 10px;
  padding: 14px 18px;
`;

const ErrorText = styled.span`
  font-size: 14px;
  color: #b71c1c;
`;

const RetryButton = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: #b71c1c;
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
`;

const EmptyNotice = styled.p`
  font-size: 14px;
  color: #777;
  background: #f7f9fc;
  border: 1px dashed #cdd7e3;
  border-radius: 10px;
  padding: 16px;
  margin: 0;
  text-align: center;
`;
