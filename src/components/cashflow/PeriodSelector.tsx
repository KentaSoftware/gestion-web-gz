'use client';

import React from 'react';
import styled from 'styled-components';

interface PeriodSelectorProps {
  startDate: string;
  endDate: string;
  error?: string | null;
  disabled?: boolean;
  onChange: (startDate: string, endDate: string) => void;
  onReload?: () => void;
}

/**
 * Period picker for the cashflow module (PS-T02).
 * Emits ISO `yyyy-MM-dd` values, which is what the backend parses.
 */
export default function PeriodSelector({
  startDate,
  endDate,
  error,
  disabled,
  onChange,
  onReload,
}: PeriodSelectorProps) {
  return (
    <Wrapper>
      <Fields>
        <FieldGroup>
          <Label htmlFor="cashflow-start">Desde</Label>
          <Input
            id="cashflow-start"
            type="date"
            value={startDate}
            max={endDate || undefined}
            disabled={disabled}
            onChange={event => onChange(event.target.value, endDate)}
          />
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="cashflow-end">Hasta</Label>
          <Input
            id="cashflow-end"
            type="date"
            value={endDate}
            min={startDate || undefined}
            disabled={disabled}
            onChange={event => onChange(startDate, event.target.value)}
          />
        </FieldGroup>

        {onReload && (
          <ReloadButton type="button" onClick={onReload} disabled={disabled}>
            Actualizar
          </ReloadButton>
        )}
      </Fields>

      {error && <ErrorText role="alert">{error}</ErrorText>}
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Fields = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 16px;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Label = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
`;

const Input = styled.input`
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  color: #333;
  background: white;

  &:focus {
    outline: none;
    border-color: #3764a0;
  }
`;

const ReloadButton = styled.button`
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

const ErrorText = styled.span`
  font-size: 13px;
  color: #c62828;
`;
