'use client';

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '@/redux/hook';
import {
  getPurchaseDocState,
  getAnalysis,
  getItemLinks,
  getItemEdits,
  startConfirm,
  confirmSuccess,
  confirmFailure,
  setDuplicateModalOpen,
} from '@/redux/purchaseDocSlice';
import { purchaseDocService } from '@/services/purchaseDoc.service';
import { setAlert } from '@/redux/alertSlice';
import { LinkingStatus, DuplicateDecision } from '@/interfaces/purchaseDoc.interface';
import { resolveItemValues, sumSubtasks, validateItemValues } from '@/utils/purchaseDocItems';
import { apiErrorMessage } from '@/utils/apiError';
import { nextConfirmGate } from '@/utils/confirmGate';
import { formatCurrency } from '@/utils/validators';
import ProgressIndicator from './ProgressIndicator';
import HeaderCard from './HeaderCard';
import ItemsReviewTable from './ItemsReviewTable';
import DuplicateWarningModal from './DuplicateWarningModal';
import TotalMismatchModal from './TotalMismatchModal';
import Loading from '@/components/Loading';
import { MdWarning } from 'react-icons/md';

export default function ReviewStep() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { draftId, headerEdits, confirmLoading, duplicateCheck, duplicateDecision } = useSelector(getPurchaseDocState);
  const analysis = useSelector(getAnalysis);
  const itemLinks = useSelector(getItemLinks);
  const itemEdits = useSelector(getItemEdits);
  
  if (!analysis) {
    return <ErrorContainer>No hay datos de análisis</ErrorContainer>;
  }
  
  // Validaciones
  const itemsArray = Object.values(itemLinks);
  const pendingItems = itemsArray.filter(link => link.status === LinkingStatus.PENDING);
  const linkedItems = itemsArray.filter(link => link.status === LinkingStatus.LINKED);
  const newProductItems = itemsArray.filter(link => link.status === LinkingStatus.NEW_PRODUCT);
  
  const allItemsResolved = pendingItems.length === 0;
  const hasDuplicateWarning = duplicateCheck && duplicateCheck.isDuplicate;

  const invalidItems = analysis.items
    .map((item, index) => ({
      index: index + 1,
      lineId: item.lineId,
      error: validateItemValues(item, itemEdits[item.lineId]),
    }))
    .filter(entry => entry.error !== null);

  const itemsSubtotal = sumSubtasks(analysis.items, itemEdits);
  const headerTotal =
    headerEdits.total !== undefined && headerEdits.total !== null
      ? Number(headerEdits.total)
      : Number(analysis.header.total);
  const totalMismatch =
    Number.isFinite(headerTotal) && Math.abs(itemsSubtotal - headerTotal) > 0.01;

  const canConfirm =
    allItemsResolved &&
    invalidItems.length === 0 &&
    Number.isFinite(itemsSubtotal) &&
    (!hasDuplicateWarning || duplicateDecision !== null);
  
  const [mismatchModalOpen, setMismatchModalOpen] = useState(false);
  const [mismatchAcknowledged, setMismatchAcknowledged] = useState(false);

  const handleConfirm = async (options: { acknowledgedMismatch?: boolean } = {}) => {
    if (!canConfirm || !draftId) return;

    const gate = nextConfirmGate({
      duplicatePending: Boolean(hasDuplicateWarning) && duplicateDecision === null,
      totalMismatch,
      mismatchAcknowledged: mismatchAcknowledged || options.acknowledgedMismatch === true,
    });

    if (gate === 'duplicate') {
      dispatch(setDuplicateModalOpen(true));
      return;
    }

    if (gate === 'totalMismatch') {
      setMismatchModalOpen(true);
      return;
    }

    setMismatchModalOpen(false);
    dispatch(startConfirm());
    
    try {
      // Construir el payload de confirmación
      const items = Object.entries(itemLinks).map(([lineId, link]) => {
        const analysisItem = analysis.items.find(item => item.lineId === lineId);
        const values = analysisItem
          ? resolveItemValues(analysisItem, itemEdits[lineId])
          : { quantity: 0, unitPrice: 0, subtotal: 0 };

        if (link.status === LinkingStatus.LINKED && link.chosenProductId) {
          return {
            lineId,
            chosenProductId: link.chosenProductId,
            quantity: values.quantity,
            unitPrice: values.unitPrice,
            subtotal: values.subtotal,
          };
        } else if (link.status === LinkingStatus.NEW_PRODUCT && link.newProduct) {
          return {
            lineId,
            newProduct: link.newProduct,
            quantity: values.quantity,
            unitPrice: values.unitPrice,
            subtotal: values.subtotal,
          };
        }
        throw new Error(`Item ${lineId} no tiene vinculación válida`);
      });
      
      const result = await purchaseDocService.confirm(draftId, {
        headerEdits: headerEdits || undefined,
        items,
        duplicateDecision: duplicateCheck?.checkId && duplicateDecision ? {
          checkId: duplicateCheck.checkId,
          decision: duplicateDecision,
        } : undefined,
      });
      
      dispatch(confirmSuccess({ purchaseId: result.buyId }));
      
      dispatch(setAlert({
        message: `Compra creada exitosamente (ID: ${result.buyId})`,
        type: 'success',
      }));
      
      // Redirigir al detalle de la compra
      router.push(`/buy/${result.buyId}`);
    } catch (error: any) {
      const errorMessage = apiErrorMessage(error, 'Error al confirmar la compra');
      dispatch(confirmFailure(errorMessage));
      dispatch(setAlert({
        message: errorMessage,
        type: 'error',
      }));
    }
  };
  
  return (
    <Container>
      <ProgressIndicator />
      
      <HeaderCard />
      
      {pendingItems.length > 0 && (
        <WarningBox>
          <MdWarning size={24} />
          <WarningText>
            Hay {pendingItems.length}{' '}
            {pendingItems.length === 1 ? 'ítem sin vincular' : 'ítems sin vincular'}. Debes vincular
            todos los ítems antes de confirmar.
          </WarningText>
        </WarningBox>
      )}
      
      {hasDuplicateWarning && duplicateDecision === null && (
        <WarningBox warning>
          <MdWarning size={24} />
          <WarningText>
            Se detectó un posible duplicado. Revisa la advertencia antes de confirmar.
          </WarningText>
        </WarningBox>
      )}

      {invalidItems.length > 0 && (
        <WarningBox>
          <MdWarning size={24} />
          <WarningText>
            {invalidItems.length === 1
              ? `Línea ${invalidItems[0].index}: ${invalidItems[0].error}.`
              : `Hay ${invalidItems.length} ítems con valores inválidos (línea ${invalidItems[0].index}: ${invalidItems[0].error}).`}
          </WarningText>
        </WarningBox>
      )}

      {totalMismatch && (
        <WarningBox warning>
          <MdWarning size={24} />
          <WarningText>
            La suma de los ítems ({formatCurrency(itemsSubtotal)}) no coincide con el total del
            comprobante ({formatCurrency(headerTotal)}). Diferencia:{' '}
            {formatCurrency(Math.abs(itemsSubtotal - headerTotal))}. Podés continuar.
          </WarningText>
        </WarningBox>
      )}
      
      <ItemsReviewTable />
      
      <Actions>
        <ConfirmButton onClick={() => void handleConfirm()} disabled={!canConfirm || confirmLoading}>
          {confirmLoading ? 'Confirmando...' : 'Confirmar y Crear Compra'}
        </ConfirmButton>
      </Actions>
      
      <DuplicateWarningModal />

      <TotalMismatchModal
        open={mismatchModalOpen}
        itemsSubtotal={itemsSubtotal}
        headerTotal={headerTotal}
        onCancel={() => setMismatchModalOpen(false)}
        onConfirm={() => {
          setMismatchAcknowledged(true);
          setMismatchModalOpen(false);
          void handleConfirm({ acknowledgedMismatch: true });
        }}
      />
    </Container>
  );
}

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const WarningBox = styled.div<{ warning?: boolean }>`
  background: ${props => props.warning ? '#fff3cd' : '#fff8e1'};
  border: 1px solid ${props => props.warning ? '#ffc107' : '#ffb300'};
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  
  svg {
    color: ${props => props.warning ? '#ff9800' : '#ffa726'};
    flex-shrink: 0;
  }
`;

const WarningText = styled.span`
  font-size: 14px;
  color: #333;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 16px;
`;

const ConfirmButton = styled.button`
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 14px 32px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  
  &:hover:not(:disabled) {
    background: #45a049;
  }
  
  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const ErrorContainer = styled.div`
  background: #ffebee;
  border: 1px solid #f44336;
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  color: #c62828;
  font-size: 16px;
`;
