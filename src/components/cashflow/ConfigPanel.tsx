'use client';

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { formatCurrency } from '@/utils/validators';

interface ConfigPanelProps {
  openingBalance: number | null;
  canEdit: boolean;
  saving: boolean;
  error?: string | null;
  onSave: (openingBalance: number) => Promise<void> | void;
}

/**
 * Opening balance configuration panel (PS-T03).
 * Users without `configure_cashflow` see the value read-only.
 */
export default function ConfigPanel({
  openingBalance,
  canEdit,
  saving,
  error,
  onSave,
}: ConfigPanelProps) {
  const [draft, setDraft] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(openingBalance === null ? '' : String(openingBalance));
    setValidationError(null);
  }, [openingBalance]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmed = draft.trim();
    if (trimmed === '') {
      setValidationError('Ingresá un saldo inicial.');
      return;
    }

    const parsed = Number(trimmed.replace(',', '.'));
    if (Number.isNaN(parsed)) {
      setValidationError('El saldo inicial debe ser un número.');
      return;
    }
    if (parsed < 0) {
      setValidationError('El saldo inicial no puede ser negativo.');
      return;
    }

    setValidationError(null);
    await onSave(parsed);
  };

  return (
    <Card>
      <CardHeader>
        <Title>Saldo inicial</Title>
        <CurrentValue>
          Actual: {openingBalance === null ? '—' : formatCurrency(openingBalance)}
        </CurrentValue>
      </CardHeader>

      <Description>
        Es el saldo de apertura con el que se calcula el flujo del período seleccionado.
      </Description>

      {canEdit ? (
        <Form onSubmit={handleSubmit}>
          <Input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={draft}
            disabled={saving}
            aria-label="Saldo inicial"
            onChange={event => setDraft(event.target.value)}
          />
          <SaveButton type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </SaveButton>
        </Form>
      ) : (
        <ReadOnlyHint>
          Tenés acceso de solo lectura. Se requiere el permiso de configuración para modificarlo.
        </ReadOnlyHint>
      )}

      {(validationError || error) && (
        <ErrorText role="alert">{validationError ?? error}</ErrorText>
      )}
    </Card>
  );
}

const Card = styled.section`
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 10px;
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

const CurrentValue = styled.span`
  font-size: 13px;
  color: #666;
`;

const Description = styled.p`
  font-size: 13px;
  color: #777;
  margin: 0;
`;

const Form = styled.form`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
`;

const Input = styled.input`
  padding: 9px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  width: 180px;
  color: #333;

  &:focus {
    outline: none;
    border-color: #3764a0;
  }
`;

const SaveButton = styled.button`
  padding: 9px 18px;
  border: none;
  border-radius: 8px;
  background: #3764a0;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    background: #b9c3d1;
    cursor: not-allowed;
  }
`;

const ReadOnlyHint = styled.p`
  font-size: 13px;
  color: #8a6d3b;
  background: #fcf8e3;
  border: 1px solid #f0e0a8;
  border-radius: 8px;
  padding: 10px 12px;
  margin: 0;
`;

const ErrorText = styled.span`
  font-size: 13px;
  color: #c62828;
`;
