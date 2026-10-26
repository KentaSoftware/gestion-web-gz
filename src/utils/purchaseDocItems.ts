import { AnalyzedItem, ItemEdit } from '@/interfaces/purchaseDoc.interface';

export interface ResolvedItemValues {
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

/** Accepts both `12.5` and `12,5`; returns NaN for empty or invalid input. */
export const parseNumericInput = (raw: string | undefined): number => {
  if (raw === undefined) return Number.NaN;
  const normalized = raw.trim().replace(',', '.');
  if (normalized === '') return Number.NaN;
  return Number(normalized);
};

export const getRawQuantity = (item: AnalyzedItem, edit?: ItemEdit): string =>
  edit?.quantity ?? (Number.isFinite(item.quantity) ? String(item.quantity) : '');

export const getRawUnitPrice = (item: AnalyzedItem, edit?: ItemEdit): string =>
  edit?.unitPrice ?? (Number.isFinite(item.unitPrice) ? String(item.unitPrice) : '');

/**
 * Resolves the values that will be sent on confirm.
 * When the user did not edit a field, the analysis value is used as-is.
 */
export const resolveItemValues = (item: AnalyzedItem, edit?: ItemEdit): ResolvedItemValues => {
  const quantity = parseNumericInput(getRawQuantity(item, edit));
  const unitPrice = parseNumericInput(getRawUnitPrice(item, edit));

  return {
    quantity,
    unitPrice,
    subtotal: Number.isFinite(quantity) && Number.isFinite(unitPrice) ? round2(quantity * unitPrice) : 0,
  };
};

/** Returns a Spanish message describing the first problem, or null when the row is valid. */
export const validateItemValues = (item: AnalyzedItem, edit?: ItemEdit): string | null => {
  const rawQuantity = getRawQuantity(item, edit);
  const rawUnitPrice = getRawUnitPrice(item, edit);

  if (rawQuantity.trim() === '') return 'Falta la cantidad';
  if (rawUnitPrice.trim() === '') return 'Falta el precio unitario';

  const quantity = parseNumericInput(rawQuantity);
  const unitPrice = parseNumericInput(rawUnitPrice);

  if (!Number.isFinite(quantity)) return 'La cantidad debe ser un número';
  if (!Number.isFinite(unitPrice)) return 'El precio unitario debe ser un número';
  if (quantity <= 0) return 'La cantidad debe ser mayor a 0';
  if (unitPrice < 0) return 'El precio unitario no puede ser negativo';

  return null;
};

export const sumSubtasks = (items: AnalyzedItem[], edits: Record<string, ItemEdit>): number =>
  round2(
    items.reduce((total, item) => total + resolveItemValues(item, edits[item.lineId]).subtotal, 0)
  );
