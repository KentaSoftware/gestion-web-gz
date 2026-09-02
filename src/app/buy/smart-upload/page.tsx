'use client';

import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { getCurrentStep, resetWizard } from '@/redux/purchaseDocSlice';
import { useAppDispatch } from '@/redux/hook';
import UploadStep from '@/components/buy/smart-upload/UploadStep';
import ReviewStep from '@/components/buy/smart-upload/ReviewStep';
import { ArrowLeft } from 'lucide-react';

export default function SmartUploadPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const currentStep = useSelector(getCurrentStep);

  useEffect(() => {
    // Reset wizard al montar
    return () => {
      dispatch(resetWizard());
    };
  }, [dispatch]);

  const handleGoBack = () => {
    router.push('/buy');
  };

  return (
    <div className='mx-auto flex w-full max-w-[1400px] flex-col gap-6 p-6'>
      <div className='flex flex-col gap-2'>
        <button
          onClick={handleGoBack}
          className='flex cursor-pointer items-center gap-2 border-none bg-transparent py-2 text-sm text-brand-primary hover:underline'
        >
          <ArrowLeft size={24} aria-hidden="true" />
          Volver al listado
        </button>
        <h1 className='m-0 text-heading-sm font-semibold text-text-primary'>
          Carga Inteligente de Comprobantes
        </h1>
        <p className='m-0 text-label text-text-muted'>
          Sube tu factura, remito o presupuesto y deja que el sistema identifique los productos automáticamente
        </p>
      </div>

      <div className='flex items-center justify-center gap-4 py-6'>
        <div
          className='flex flex-col items-center gap-2'
          style={{ opacity: currentStep === 'upload' || currentStep === 'review' ? 1 : 0.4 }}
        >
          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary font-semibold text-text-inverse'>
            1
          </div>
          <span className='text-sm font-medium text-text-primary'>
            Subir Comprobante
          </span>
        </div>
        <div className='mb-6 h-0.5 w-[100px] bg-border-subtle' />
        <div
          className='flex flex-col items-center gap-2'
          style={{ opacity: currentStep === 'review' ? 1 : 0.4 }}
        >
          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary font-semibold text-text-inverse'>
            2
          </div>
          <span className='text-sm font-medium text-text-primary'>
            Revisar y Confirmar
          </span>
        </div>
      </div>

      <div className='flex-1'>
        {currentStep === 'upload' && <UploadStep />}
        {currentStep === 'review' && <ReviewStep />}
      </div>
    </div>
  );
}
