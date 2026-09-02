'use client';

import { useSelector } from 'react-redux';
import { getAnalysis, getItemLinks } from '@/redux/purchaseDocSlice';
import { LinkingStatus } from '@/interfaces/purchaseDoc.interface';
import ItemLinkingCell from './ItemLinkingCell';
import { formatCurrency } from '@/utils/validators';
import { CheckCircle, PlusCircle, Circle } from 'lucide-react';

export default function ItemsReviewTable() {
  const analysis = useSelector(getAnalysis);
  const itemLinks = useSelector(getItemLinks);

  const getTdClassName = ({
    center,
    right,
    bold,
  }: {
    center?: boolean;
    right?: boolean;
    bold?: boolean;
  }) => {
    let className = 'border-b border-border-subtle p-3 align-top';

    if (center) {
      className += ' text-center';
    } else if (right) {
      className += ' text-right';
    } else {
      className += ' text-left';
    }

    className += bold ? ' font-semibold' : ' font-normal';

    return className;
  };

  if (!analysis) return null;

  const { items } = analysis;

  const getStatusIcon = (lineId: string) => {
    const link = itemLinks[lineId];
    if (!link) return <Circle size={20} className="text-text-muted" aria-hidden="true" />;

    switch (link.status) {
      case LinkingStatus.LINKED:
        return <CheckCircle size={20} className="text-state-success" aria-hidden="true" />;
      case LinkingStatus.NEW_PRODUCT:
        return <PlusCircle size={20} className="text-state-info" aria-hidden="true" />;
      default:
        return <Circle size={20} className="text-text-muted" aria-hidden="true" />;
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  };

  return (
    <div className="rounded-xl bg-surface-base p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="m-0 text-lg font-semibold text-text-primary">Ítems del Comprobante</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b-2 border-border-strong bg-background-subtle p-3 text-left font-semibold text-text-muted" style={{ width: '40px' }}>Estado</th>
              <th className="border-b-2 border-border-strong bg-background-subtle p-3 text-left font-semibold text-text-muted" style={{ width: '60px' }}>#</th>
              <th className="border-b-2 border-border-strong bg-background-subtle p-3 text-left font-semibold text-text-muted">Descripción Detectada</th>
              <th className="border-b-2 border-border-strong bg-background-subtle p-3 text-left font-semibold text-text-muted" style={{ width: '100px' }}>Cantidad</th>
              <th className="border-b-2 border-border-strong bg-background-subtle p-3 text-left font-semibold text-text-muted" style={{ width: '120px' }}>Precio Unit.</th>
              <th className="border-b-2 border-border-strong bg-background-subtle p-3 text-left font-semibold text-text-muted" style={{ width: '120px' }}>Subtotal</th>
              <th className="border-b-2 border-border-strong bg-background-subtle p-3 text-left font-semibold text-text-muted" style={{ width: '300px' }}>Vinculación</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.lineId} className="hover:bg-background-subtle">
                <td className={getTdClassName({ center: true })}>
                  {getStatusIcon(item.lineId)}
                </td>
                <td className={getTdClassName({ center: true })}>{index + 1}</td>
                <td className={getTdClassName({})}>
                  <div className="mb-1 text-text-primary">{item.description || item.rawDescription}</div>
                  {item.descriptionConfidence && item.descriptionConfidence < 0.7 && (
                    <div className="text-xs italic text-state-warning">Baja confianza ({(item.descriptionConfidence * 100).toFixed(0)}%)</div>
                  )}
                </td>
                <td className={getTdClassName({ right: true })}>{item.quantity?.toFixed(2) || '-'}</td>
                <td className={getTdClassName({ right: true })}>{item.unitPrice ? formatCurrency(item.unitPrice) : '-'}</td>
                <td className={getTdClassName({ right: true, bold: true })}>{item.subtotal ? formatCurrency(item.subtotal) : '-'}</td>
                <td className={getTdClassName({})}>
                  <ItemLinkingCell lineId={item.lineId} item={item} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th className="border-b-2 border-border-strong bg-background-subtle p-3 font-semibold text-text-muted text-right" colSpan={5}>Total</th>
              <th className="border-b-2 border-border-strong bg-background-subtle p-3 font-semibold text-text-muted text-right">{formatCurrency(calculateTotal())}</th>
              <th className="border-b-2 border-border-strong bg-background-subtle p-3 font-semibold text-text-muted"></th>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
