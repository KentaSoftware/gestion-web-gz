'use client';

import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '@/redux/hook';
import {
  getPurchaseDocState,
  getAnalysis,
  getItemLinks,
  startConfirm,
  confirmSuccess,
  confirmFailure,
  setDuplicateModalOpen,
} from '@/redux/purchaseDocSlice';
import { purchaseDocService } from '@/services/purchaseDoc.service';
import { toast } from "sonner";
import { LinkingStatus, DuplicateDecision } from '@/interfaces/purchaseDoc.interface';
import ProgressIndicator from './ProgressIndicator';
import HeaderCard from './HeaderCard';
import ItemsReviewTable from './ItemsReviewTable';
import DuplicateWarningModal from './DuplicateWarningModal';
import Button from '@/components/Button';
import { AlertTriangle } from 'lucide-react';

export default function ReviewStep() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { draftId, headerEdits, confirmLoading, duplicateCheck, duplicateDecision } = useSelector(getPurchaseDocState);
  const analysis = useSelector(getAnalysis);
  const itemLinks = useSelector(getItemLinks);

  if (!analysis) {
    return (
      <div className="rounded-lg border border-state-error bg-state-error/10 p-6 text-center text-base text-state-error">
        No hay datos de análisis
      </div>
    );
  }

  // Validaciones
  const itemsArray = Object.values(itemLinks);
  const pendingItems = itemsArray.filter(link => link.status === LinkingStatus.PENDING);
  const linkedItems = itemsArray.filter(link => link.status === LinkingStatus.LINKED);
  const newProductItems = itemsArray.filter(link => link.status === LinkingStatus.NEW_PRODUCT);

  const allItemsResolved = pendingItems.length === 0;
  const hasDuplicateWarning = duplicateCheck && duplicateCheck.isDuplicate;

  const canConfirm = allItemsResolved && (!hasDuplicateWarning || duplicateDecision !== null);

  const handleConfirm = async () => {
    if (!canConfirm || !draftId) return;

    // Si hay duplicado y no se ha decidido, mostrar modal
    if (hasDuplicateWarning && duplicateDecision === null) {
      dispatch(setDuplicateModalOpen(true));
      return;
    }

    dispatch(startConfirm());

    try {
      // Construir el payload de confirmación
      const items = Object.entries(itemLinks).map(([lineId, link]) => {
        if (link.status === LinkingStatus.LINKED && link.chosenProductId) {
          return {
            lineId,
            chosenProductId: link.chosenProductId,
          };
        } else if (link.status === LinkingStatus.NEW_PRODUCT && link.newProduct) {
          return {
            lineId,
            newProduct: link.newProduct,
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

      toast.success(`Compra creada exitosamente (ID: ${result.buyId})`);

      // Redirigir al detalle de la compra
      router.push(`/buy/${result.buyId}`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Error al confirmar la compra';
      dispatch(confirmFailure(errorMessage));
      toast.error(errorMessage);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <ProgressIndicator />

      <HeaderCard />

      {pendingItems.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-state-warning bg-state-warning/10 p-4">
          <AlertTriangle className="shrink-0 text-state-warning" size={24} aria-hidden="true" />
          <span className="text-sm text-text-primary">
            Hay {pendingItems.length} ítems sin vincular. Debes vincular todos los ítems antes de confirmar.
          </span>
        </div>
      )}

      {hasDuplicateWarning && duplicateDecision === null && (
        <div className="flex items-center gap-3 rounded-lg border border-state-warning bg-state-warning/10 p-4">
          <AlertTriangle className="shrink-0 text-state-warning" size={24} aria-hidden="true" />
          <span className="text-sm text-text-primary">
            Se detectó un posible duplicado. Revisa la advertencia antes de confirmar.
          </span>
        </div>
      )}

      <ItemsReviewTable />

      <div className="mt-4 flex justify-end gap-4">
        <Button
          text={confirmLoading ? 'Confirmando...' : 'Confirmar y Crear Compra'}
          variant="primary"
          size="lg"
          disabled={!canConfirm || confirmLoading}
          onClick={handleConfirm}
        />
      </div>

      <DuplicateWarningModal />
    </div>
  );
}
