'use client';

import { useSelector } from 'react-redux';
import { getItemLinks } from '@/redux/purchaseDocSlice';
import { LinkingStatus } from '@/interfaces/purchaseDoc.interface';
import { CheckCircle, Circle } from 'lucide-react';

export default function ProgressIndicator() {
  const itemLinks = useSelector(getItemLinks);
  
  const itemsArray = Object.values(itemLinks);
  const totalItems = itemsArray.length;
  const resolvedItems = itemsArray.filter(
    link => link.status === LinkingStatus.LINKED || link.status === LinkingStatus.NEW_PRODUCT
  ).length;
  
  const percentage = totalItems > 0 ? (resolvedItems / totalItems) * 100 : 0;
  const isComplete = resolvedItems === totalItems && totalItems > 0;
  
  return (
    <div className='rounded-xl bg-surface-base p-6 shadow-sm'>
      <div className='mb-4 flex flex-col items-start gap-2 md:flex-row md:items-center md:justify-between md:gap-0'>
        <h3
          className='m-0 flex items-center gap-2 text-lg font-semibold text-text-primary'
        >
          {isComplete ? (
            <CheckCircle size={24} className="text-state-success" aria-hidden="true" />
          ) : (
            <Circle size={24} className="text-text-muted" aria-hidden="true" />
          )}
          Progreso de Vinculación
        </h3>
        <div className='flex gap-4'>
          <span
            className='text-base font-semibold'
            style={{ color: isComplete ? 'var(--color-state-success)' : 'var(--color-text-secondary)' }}
          >
            {resolvedItems} / {totalItems} ítems vinculados
          </span>
        </div>
      </div>
      
      <div
        className='h-3 w-full overflow-hidden rounded-md bg-background-subtle'
      >
        <div
          className='h-full transition-[width,background] duration-300 ease-in-out'
          style={{
            width: `${percentage}%`,
            backgroundColor: isComplete ? 'var(--color-state-success)' : 'var(--color-brand-accent)',
          }}
        />
      </div>
      
      {!isComplete && totalItems > 0 && (
        <p className='mb-0 mt-3 text-sm text-text-secondary'>
          Vincula todos los ítems para poder confirmar la compra
        </p>
      )}
      
      {isComplete && (
        <p className='mb-0 mt-3 text-sm font-semibold text-state-success'>
          ¡Todos los ítems están vinculados!
        </p>
      )}
    </div>
  );
}
