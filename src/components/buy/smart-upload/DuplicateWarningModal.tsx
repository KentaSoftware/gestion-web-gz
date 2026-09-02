'use client';

import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/redux/hook';
import { getPurchaseDocState, setDuplicateModalOpen, setDuplicateDecision } from '@/redux/purchaseDocSlice';
import { DuplicateDecision } from '@/interfaces/purchaseDoc.interface';
import { AlertTriangle, X } from 'lucide-react';
import { formatDate, formatCurrency } from '@/utils/validators';
import Modal from '@/components/Modal';
import { cn } from '@/lib/cn';

// Score → semantic class mapping (no hex in className)
const scoreBadgeClass = (score: number) => {
  if (score >= 0.9) return 'bg-state-error text-text-inverse';
  if (score >= 0.7) return 'bg-state-warning text-text-inverse';
  return 'bg-chart-warning text-text-inverse';
};

export default function DuplicateWarningModal() {
  const dispatch = useAppDispatch();
  const { duplicateCheck, duplicateModalOpen } = useSelector(getPurchaseDocState);

  if (!duplicateCheck || !duplicateCheck.isDuplicate) return null;

  const handleClose = () => {
    dispatch(setDuplicateModalOpen(false));
  };

  const handleCancel = () => {
    dispatch(setDuplicateDecision(DuplicateDecision.CANCEL));
    dispatch(setDuplicateModalOpen(false));
  };

  const handleProceed = () => {
    dispatch(setDuplicateDecision(DuplicateDecision.PROCEED));
    dispatch(setDuplicateModalOpen(false));
  };

  return (
    <Modal
      open={duplicateModalOpen}
      eClose={handleClose}
      title="Posible Comprobante Duplicado"
      width="650px"
      height="auto"
    >
      {/* Warning icon row — rendered inside modal content, below the Modal title */}
      <div className="flex items-center gap-3 mb-4 pt-2">
        <AlertTriangle size={28} className="text-state-warning shrink-0" aria-hidden="true" />
        <p className="text-base text-text-muted m-0">
          Se encontraron comprobantes similares en el sistema. Revisa si el comprobante ya fue registrado:
        </p>
      </div>

      {/* Candidate list */}
      <div className="flex flex-col gap-4 mb-6">
        {duplicateCheck.candidates.map((candidate, index) => (
          <div
            key={index}
            className="border-2 border-state-warning rounded-xl p-4 bg-surface-raised"
          >
            {/* Card header */}
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-semibold text-text-primary m-0">
                Compra #{candidate.buyId}
              </h3>
              <span className={cn(
                'px-3 py-1 rounded-xl text-xs font-semibold',
                scoreBadgeClass(candidate.score)
              )}>
                {(candidate.score * 100).toFixed(0)}% similitud
              </span>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-text-muted">Fecha:</span>
                <span className="text-sm text-text-primary">{formatDate(candidate.date)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-text-muted">Comprobante:</span>
                <span className="text-sm text-text-primary">{candidate.documentNumber || 'N/A'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-text-muted">Total:</span>
                <span className="text-sm text-text-primary">{formatCurrency(candidate.total)}</span>
              </div>
            </div>

            {/* Match reasons */}
            {candidate.matchReasons && candidate.matchReasons.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border-subtle">
                <div className="text-xs font-semibold text-text-muted mb-2">Coincidencias:</div>
                <ul className="m-0 pl-5">
                  {candidate.matchReasons.map((reason, idx) => (
                    <li key={idx} className="text-xs text-text-muted mb-1">{reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Confirm question */}
      <p className="text-base font-semibold text-text-primary text-center mb-4">
        ¿Estás seguro de que deseas continuar con el registro de este comprobante?
      </p>

      {/* Action buttons */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={handleCancel}
          className="flex items-center gap-1.5 bg-state-error border-0 text-text-inverse rounded-lg px-6 py-2.5 text-sm font-semibold cursor-pointer transition-opacity hover:opacity-90"
        >
          <X size={20} aria-hidden="true" />
          Cancelar Registro
        </button>
        <button
          onClick={handleProceed}
          className="bg-state-success border-0 text-text-inverse rounded-lg px-6 py-2.5 text-sm font-semibold cursor-pointer transition-opacity hover:opacity-90"
        >
          Continuar de Todas Formas
        </button>
      </div>
    </Modal>
  );
}
