'use client';

import { useState, useEffect, useCallback, type DragEvent, type ChangeEvent } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/redux/hook';
import {
  setFile,
  setProviderId,
  setSourceType,
  startUpload,
  uploadSuccess,
  uploadFailure,
  getPurchaseDocState,
} from '@/redux/purchaseDocSlice';
import { SourceType, Provider, Analysis } from '@/interfaces/purchaseDoc.interface';
import { providerService } from '@/services/provider.service';
import { purchaseDocService } from '@/services/purchaseDoc.service';
import { toast } from "sonner";
import Combobox from '@/components/ui/combobox';
import { Upload, Check } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import Button from '@/components/Button';
import { cn } from '@/lib/cn';

export default function UploadStep() {
  const dispatch = useAppDispatch();
  const { uploadForm, uploadLoading, uploadError } = useSelector(getPurchaseDocState);
  
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [pollingDraftId, setPollingDraftId] = useState<string | null>(null);
  const [pollingMessage, setPollingMessage] = useState('Analizando comprobante...');  
  // Cargar proveedores al montar
  useEffect(() => {
    loadProviders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const loadProviders = async () => {
    setLoadingProviders(true);
    try {
      const data = await providerService.getProviders();
      
      // Asegurarse de que data es un array antes de filtrar
      if (Array.isArray(data)) {
        setProviders(data.filter(p => p.isActive));
      } else {
        console.error('getProviders no devolvió un array:', data);
        setProviders([]);
        toast.error('Formato de datos de proveedores inválido');
      }
    } catch (error: any) {
      console.error('Error al cargar proveedores:', error);
      setProviders([]);
      toast.error('Error al cargar proveedores: ' + (error.response?.data?.message || error.message || 'Error desconocido'));
    } finally {
      setLoadingProviders(false);
    }
  };
  
  const handleFileChange = (file: File | null) => {
    if (!file) {
      dispatch(setFile(null));
      return;
    }
    
    // Validar tipo
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast.error('Tipo de archivo no válido. Solo se permiten PDF, JPG o PNG.');
      return;
    }
    
    // Validar tamaño (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('El archivo es demasiado grande. Máximo 10MB.');
      return;
    }
    
    dispatch(setFile(file));
  };
  
  const handleDrag = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);
  
  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const handleProviderChange = (provider: Provider | null) => {
    setSelectedProvider(provider);
    if (provider) {
      dispatch(setProviderId(provider._id));
    }
  };
  
  const handleSourceTypeChange = (event: ChangeEvent<HTMLInputElement>) => {
    dispatch(setSourceType(event.target.value as SourceType));
  };
  
  const canSubmit = uploadForm.file && uploadForm.providerId && uploadForm.sourceType;
  
  // Polling para consultar estado del draft
  useEffect(() => {
    if (!pollingDraftId) return;
    
    let attempts = 0;
    const maxAttempts = 60; // 60 intentos = 2 minutos máximo
    const pollInterval = 2000; // 2 segundos
    
    const poll = async () => {
      try {
        attempts++;
        setPollingMessage(`Analizando... (${attempts}/${maxAttempts})`);
        
        const draft = await purchaseDocService.getDraft(pollingDraftId);
        
        if (draft.status === 'READY' && draft.analysis) {
          // Análisis completo, convertir a formato esperado por Redux
          const analysis: Analysis = {
            header: {
              provider: {
                id: draft.analysis.header.providerId,
                name: draft.analysis.header.providerName,
              },
              date: draft.analysis.header.documentDate,
              documentNumber: draft.analysis.header.documentNumber,
              total: draft.analysis.header.total,
              dateConfidence: draft.analysis.header.confidence,
              documentNumberConfidence: draft.analysis.header.confidence,
              totalConfidence: draft.analysis.header.confidence,
            },
            items: draft.analysis.items.map(item => ({
              lineId: item.itemId,
              rawDescription: item.description,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
              // Agregar suggestions al nivel del item para ItemLinkingCell
              suggestions: item.catalogMatch?.candidates?.map(c => ({
                _id: c.productId,
                productId: c.productId,
                name: c.description,
                descripcion: c.description,
                score: c.score,
                method: item.catalogMatch?.method || 'fuzzyMatch',
              })) || [],
              catalogLink: {
                suggestions: item.catalogMatch?.candidates?.map(c => ({
                  _id: c.productId,
                  productId: c.productId,
                  name: c.description,
                  descripcion: c.description,
                  score: c.score,
                  method: item.catalogMatch?.method || 'fuzzyMatch',
                })) || [],
                actionRequired: (!item.catalogMatch || !item.catalogMatch.candidates || item.catalogMatch.candidates.length === 0) ? 'CREATE_PRODUCT' as const : undefined,
              },
            })),
            possibleDuplicate: draft.possibleDuplicate ? {
              isDuplicate: draft.possibleDuplicate.status === 'SUSPECTED_DUPLICATE',
              checkId: draft.possibleDuplicate.checkId,
              candidates: draft.possibleDuplicate.duplicates,
              confidence: 0.85,
            } : {
              isDuplicate: false,
              candidates: [],
            },
            warnings: [],
            confidenceGlobal: draft.analysis.meta.avgConfidence,
          };
          
          dispatch(uploadSuccess({
            draftId: pollingDraftId,
            analysis,
          }));
          
          toast.success('Comprobante analizado exitosamente');
          
          setPollingDraftId(null);
          return;
        }
        
        if (draft.status === 'FAILED') {
          const errorMsg = draft.error?.message || 'Error al analizar el comprobante';
          dispatch(uploadFailure(errorMsg));
          toast.error(errorMsg);
          setPollingDraftId(null);
          return;
        }
        
        // Aún en PROCESSING, continuar polling
        if (attempts < maxAttempts) {
          setTimeout(poll, pollInterval);
        } else {
          // Timeout
          dispatch(uploadFailure('El análisis está tardando demasiado. Por favor, intenta nuevamente.'));
          toast.error('Timeout: El análisis no se completó en el tiempo esperado');
          setPollingDraftId(null);
        }
      } catch (error: any) {
        console.error('Error en polling:', error);
        const errorMsg = error.response?.data?.message || error.message || 'Error al consultar el estado';
        dispatch(uploadFailure(errorMsg));
        toast.error(errorMsg);
        setPollingDraftId(null);
      }
    };
    
    // Iniciar polling después de 1 segundo (dar tiempo al backend)
    const timeout = setTimeout(poll, 1000);
    
    return () => clearTimeout(timeout);
  }, [pollingDraftId, dispatch]);
  
  const handleSubmit = async () => {
    if (!canSubmit) return;
    
    dispatch(startUpload());
    
    try {
      // Upload devuelve draftId inmediatamente con status PROCESSING
      const result = await purchaseDocService.upload(uploadForm.file!, {
        providerId: uploadForm.providerId!,
        sourceType: uploadForm.sourceType,
      });
      
      // Iniciar polling para obtener el análisis
      setPollingDraftId(result.draftId);
      setPollingMessage('Analizando comprobante...');
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Error al procesar el comprobante';
      dispatch(uploadFailure(errorMessage));
      toast.error(errorMessage);
    }
  };
  
  if (uploadLoading || pollingDraftId) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <Spinner className="size-12 text-brand-primary" />
        <p className="m-0 text-lg font-semibold text-text-primary">{pollingMessage}</p>
        <p className="m-0 text-sm text-text-muted">Esto puede tardar hasta 2 minutos</p>
      </div>
    );
  }
  
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-base p-8 shadow-md">
      <div className="mb-8">
        <h3 className="mb-4 text-lg font-semibold text-text-primary">1. Seleccionar Proveedor</h3>
        <Combobox<Provider>
          options={providers}
          getOptionLabel={(option) => option.name}
          getOptionValue={(option) => option._id}
          value={selectedProvider}
          onChange={(value) => handleProviderChange(value)}
          loading={loadingProviders}
          placeholder="Buscar proveedor..."
          noOptionsText="No se encontraron proveedores"
        />
      </div>
      
      <div className="mb-8">
        <h3 className="mb-4 text-lg font-semibold text-text-primary">2. Tipo de Comprobante</h3>
        <fieldset className="flex flex-row gap-4 border-0 p-0 m-0">
          <legend className="sr-only">Tipo de Comprobante</legend>
          {[
            { value: SourceType.INVOICE, label: 'Factura' },
            { value: SourceType.RECEIPT, label: 'Remito' },
            { value: SourceType.BUDGET, label: 'Presupuesto' },
          ].map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2"
            >
              <input
                type="radio"
                name="sourceType"
                value={opt.value}
                checked={uploadForm.sourceType === opt.value}
                onChange={handleSourceTypeChange}
                className="h-4 w-4 border-border-subtle text-brand-primary accent-brand-primary focus:ring-state-focus"
              />
              <span className="text-label text-text-primary">{opt.label}</span>
            </label>
          ))}
        </fieldset>
      </div>
      
      <div className="mb-8">
        <h3 className="mb-4 text-lg font-semibold text-text-primary">3. Subir Archivo</h3>
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            'cursor-pointer rounded-xl border-2 border-dashed px-6 py-12 text-center transition-all',
            'hover:border-brand-primary hover:bg-surface-raised',
            dragActive ? 'border-brand-primary bg-surface-raised' : 'border-border-subtle bg-surface-raised'
          )}
        >
          <input
            type="file"
            id="file-upload"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            className="hidden"
          />
          
          {uploadForm.file ? (
            <div className="flex flex-col items-center gap-3">
              <Check size={48} className="text-state-success" aria-hidden="true" />
              <span className="text-base font-semibold text-text-primary">{uploadForm.file.name}</span>
              <span className="text-sm text-text-muted">{(uploadForm.file.size / 1024 / 1024).toFixed(2)} MB</span>
              <label
                htmlFor="file-upload"
                className="inline-block cursor-pointer rounded-lg border border-brand-primary bg-transparent px-4 py-2 text-sm text-brand-primary hover:bg-surface-raised"
              >
                Cambiar archivo
              </label>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Upload size={64} className="text-text-muted" aria-hidden="true" />
              <p className="m-0 text-base text-text-muted">Arrastra tu archivo aquí o</p>
              <label
                htmlFor="file-upload"
                className="inline-block cursor-pointer rounded-lg border-0 bg-brand-primary px-6 py-3 text-sm font-semibold text-text-inverse hover:opacity-90"
              >
                Seleccionar archivo
              </label>
              <span className="text-xs text-text-muted">PDF, JPG o PNG - Máximo 10MB</span>
            </div>
          )}
        </div>
      </div>
      
      {uploadError && (
        <div className="mt-4 rounded-lg border border-state-error bg-state-error/10 px-4 py-3 text-sm text-state-error">
          {uploadError}
        </div>
      )}
      
      <div className="mt-8 flex justify-end gap-4">
        <Button
          text="Analizar Comprobante"
          variant="primary"
          size="lg"
          disabled={!canSubmit}
          onClick={handleSubmit}
        />
      </div>
    </div>
  );
}
