'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/redux/hook';
import { getAnalysis, updateHeaderEdit } from '@/redux/purchaseDocSlice';
import { Pencil, Save, X, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/validators';
import { cn } from '@/lib/cn';

// Semantic confidence class — no hex in className
const confidenceClass = (confidence?: number): string => {
  if (!confidence) return 'text-text-muted';
  if (confidence >= 0.9) return 'text-state-success';
  if (confidence >= 0.7) return 'text-state-warning';
  return 'text-state-error';
};

const getConfidenceLabel = (confidence?: number): string => {
  if (!confidence) return 'Desconocido';
  if (confidence >= 0.9) return 'Alta';
  if (confidence >= 0.7) return 'Media';
  return 'Baja';
};

// Shared input style for native edit fields
const inputClass =
  'h-9 w-full px-3 border border-border-subtle rounded-md text-sm text-text-primary bg-surface-base focus:outline-none focus:border-brand-primary transition-colors';

export default function HeaderCard() {
  const dispatch = useAppDispatch();
  const analysis = useSelector(getAnalysis);
  const [editMode, setEditMode] = useState(false);
  const [tempValues, setTempValues] = useState({
    date: '',
    documentNumber: '',
    total: '',
  });

  if (!analysis) return null;

  const { header } = analysis;

  const handleStartEdit = () => {
    setTempValues({
      date: header.date || '',
      documentNumber: header.documentNumber || '',
      total: header.total?.toString() || '',
    });
    setEditMode(true);
  };

  const handleSave = () => {
    const edits: Record<string, string | number> = {};
    if (tempValues.date !== header.date) edits.date = tempValues.date;
    if (tempValues.documentNumber !== header.documentNumber) edits.documentNumber = tempValues.documentNumber;
    if (parseFloat(tempValues.total) !== header.total) edits.total = parseFloat(tempValues.total);
    if (Object.keys(edits).length > 0) dispatch(updateHeaderEdit(edits));
    setEditMode(false);
  };

  const handleCancel = () => {
    setEditMode(false);
  };

  const hasLowConfidence =
    (header.dateConfidence && header.dateConfidence < 0.7) ||
    (header.documentNumberConfidence && header.documentNumberConfidence < 0.7) ||
    (header.totalConfidence && header.totalConfidence < 0.7);

  return (
    <div className="bg-surface-base rounded-xl p-6 shadow-md border border-border-subtle">

      {/* Card header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-text-primary m-0">Datos del Comprobante</h3>
        {!editMode ? (
          <button
            onClick={handleStartEdit}
            className="flex items-center gap-1.5 bg-transparent border border-brand-primary text-brand-primary rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer hover:bg-surface-raised transition-colors"
          >
            <Pencil size={20} aria-hidden="true" />
            Editar
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 bg-state-success border-0 text-text-inverse rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer transition-opacity hover:opacity-90"
            >
              <Save size={20} aria-hidden="true" />
              Guardar
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 bg-state-error border-0 text-text-inverse rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer transition-opacity hover:opacity-90"
            >
              <X size={20} aria-hidden="true" />
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Low-confidence warning */}
      {hasLowConfidence && (
        <div className="bg-surface-raised border border-state-warning rounded-lg p-3 flex items-center gap-2 mb-4">
          <AlertTriangle size={20} className="text-state-warning shrink-0" aria-hidden="true" />
          <span className="text-sm text-text-primary">
            Algunos campos tienen baja confianza. Revisa y corrige si es necesario.
          </span>
        </div>
      )}

      {/* Fields grid */}
      <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-6">

        {/* Date */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-text-muted">Fecha</label>
          {editMode ? (
            <input
              type="date"
              value={tempValues.date}
              onChange={(e) => setTempValues({ ...tempValues, date: e.target.value })}
              className={inputClass}
            />
          ) : (
            <>
              <span className="text-base text-text-primary">{formatDate(header.date)}</span>
              <span className={cn('text-xs font-semibold', confidenceClass(header.dateConfidence))}>
                Confianza: {getConfidenceLabel(header.dateConfidence)}
                {header.dateConfidence && ` (${(header.dateConfidence * 100).toFixed(0)}%)`}
              </span>
            </>
          )}
        </div>

        {/* Document number */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-text-muted">Número de Comprobante</label>
          {editMode ? (
            <input
              type="text"
              value={tempValues.documentNumber}
              onChange={(e) => setTempValues({ ...tempValues, documentNumber: e.target.value })}
              placeholder="0001-00001234"
              className={inputClass}
            />
          ) : (
            <>
              <span className="text-base text-text-primary">{header.documentNumber || 'No detectado'}</span>
              <span className={cn('text-xs font-semibold', confidenceClass(header.documentNumberConfidence))}>
                Confianza: {getConfidenceLabel(header.documentNumberConfidence)}
                {header.documentNumberConfidence && ` (${(header.documentNumberConfidence * 100).toFixed(0)}%)`}
              </span>
            </>
          )}
        </div>

        {/* Total */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-text-muted">Total</label>
          {editMode ? (
            <input
              type="number"
              value={tempValues.total}
              onChange={(e) => setTempValues({ ...tempValues, total: e.target.value })}
              step="0.01"
              className={inputClass}
            />
          ) : (
            <>
              <span className="text-base text-text-primary">{formatCurrency(header.total)}</span>
              <span className={cn('text-xs font-semibold', confidenceClass(header.totalConfidence))}>
                Confianza: {getConfidenceLabel(header.totalConfidence)}
                {header.totalConfidence && ` (${(header.totalConfidence * 100).toFixed(0)}%)`}
              </span>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
