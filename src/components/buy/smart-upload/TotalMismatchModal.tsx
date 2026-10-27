'use client';

import React from 'react';
import styled from 'styled-components';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { MdWarning, MdClose } from 'react-icons/md';
import { formatCurrency } from '@/utils/validators';

interface TotalMismatchModalProps {
  open: boolean;
  itemsSubtotal: number;
  headerTotal: number;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Confirmación obligatoria cuando la suma de los ítems no coincide con el total
 * del comprobante. La creación no se bloquea, pero el usuario tiene que aceptar
 * el descuadre de forma explícita.
 */
export default function TotalMismatchModal({
  open,
  itemsSubtotal,
  headerTotal,
  onCancel,
  onConfirm,
}: TotalMismatchModalProps) {
  const difference = Math.abs(itemsSubtotal - headerTotal);

  return (
    <StyledDialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>
        <TitleBar>
          <MdWarning size={28} color="#ff9800" />
          <Title>El total no coincide</Title>
        </TitleBar>
      </DialogTitle>

      <DialogContent>
        <Message>
          La suma de los ítems cargados no coincide con el total del comprobante:
        </Message>

        <Comparison>
          <Row>
            <Label>Total de los ítems</Label>
            <Value>{formatCurrency(itemsSubtotal)}</Value>
          </Row>
          <Row>
            <Label>Total del comprobante</Label>
            <Value>{formatCurrency(headerTotal)}</Value>
          </Row>
          <Row $highlight>
            <Label>Diferencia</Label>
            <Value>{formatCurrency(difference)}</Value>
          </Row>
        </Comparison>

        <Message>
          Podés corregir cantidades o precios volviendo atrás, o registrar la compra igual.
          ¿Querés continuar?
        </Message>
      </DialogContent>

      <DialogActions>
        <CancelButton onClick={onCancel}>
          <MdClose size={20} />
          Volver a revisar
        </CancelButton>
        <ConfirmButton onClick={onConfirm}>Sí, registrar igual</ConfirmButton>
      </DialogActions>
    </StyledDialog>
  );
}

const StyledDialog = styled(Dialog)`
  .MuiDialog-paper {
    border-radius: 12px;
  }
`;

const TitleBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Title = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: #333;
  margin: 0;
`;

const Message = styled.p`
  font-size: 14px;
  color: #555;
  line-height: 1.6;
  margin: 0 0 16px;
`;

const Comparison = styled.div`
  border: 1px solid #ffe082;
  background: #fff8e1;
  border-radius: 10px;
  padding: 14px 18px;
  margin-bottom: 16px;
`;

const Row = styled.div<{ $highlight?: boolean }>`
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 4px 0;
  font-weight: ${(props) => (props.$highlight ? 700 : 400)};
  color: ${(props) => (props.$highlight ? '#a33a33' : '#555')};
`;

const Label = styled.span`
  font-size: 14px;
`;

const Value = styled.span`
  font-size: 14px;
`;

const CancelButton = styled.button`
  background: #f44336;
  border: none;
  color: white;
  border-radius: 8px;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover {
    background: #da190b;
  }
`;

const ConfirmButton = styled.button`
  background: #4caf50;
  border: none;
  color: white;
  border-radius: 8px;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: #45a049;
  }
`;
