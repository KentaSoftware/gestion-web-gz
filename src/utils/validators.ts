import { WizardValidation, ItemLink, LinkingStatus } from '@/interfaces/purchaseDoc.interface';
import { calendarParts } from './dates';

/**
 * Validador de archivos para upload
 */
export const fileValidators = {
  /**
   * Valida tipo de archivo permitido
   */
  validateFileType(file: File): { valid: boolean; error?: string } {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    
    if (!validTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Tipo de archivo no válido. Solo se permiten PDF, JPG o PNG.',
      };
    }
    
    return { valid: true };
  },
  
  /**
   * Valida tamaño de archivo (máximo 10MB)
   */
  validateFileSize(file: File, maxSizeMB: number = 10): { valid: boolean; error?: string } {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `El archivo es demasiado grande. Máximo ${maxSizeMB}MB.`,
      };
    }
    
    return { valid: true };
  },
  
  /**
   * Validación completa de archivo
   */
  validateFile(file: File): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    const typeValidation = this.validateFileType(file);
    if (!typeValidation.valid && typeValidation.error) {
      errors.push(typeValidation.error);
    }
    
    const sizeValidation = this.validateFileSize(file);
    if (!sizeValidation.valid && sizeValidation.error) {
      errors.push(sizeValidation.error);
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  },
};

/**
 * Validador de wizard completo
 */
export const wizardValidators = {
  /**
   * Valida que todos los items estén vinculados
   */
  validateItemLinks(
    itemLinks: Record<string, ItemLink>,
    totalItems: number
  ): WizardValidation {
    const pendingItems: string[] = [];
    const errors: string[] = [];
    
    // Verificar que existan links para todos los items
    if (Object.keys(itemLinks).length !== totalItems) {
      errors.push('Faltan items por procesar');
      return {
        canProceed: false,
        pendingItems: [],
        errors,
      };
    }
    
    // Verificar status de cada item
    Object.values(itemLinks).forEach(link => {
      if (link.status === LinkingStatus.PENDING) {
        pendingItems.push(link.lineId);
      } else if (link.status === LinkingStatus.LINKED && !link.chosenProductId) {
        errors.push(`Item ${link.lineId} marcado como vinculado pero sin productId`);
      } else if (link.status === LinkingStatus.NEW_PRODUCT && !link.newProduct) {
        errors.push(`Item ${link.lineId} marcado como nuevo producto pero sin datos`);
      }
    });
    
    // Validar campos de newProduct si existen
    Object.values(itemLinks).forEach(link => {
      if (link.newProduct) {
        const product = link.newProduct;
        
        if (!product.descripcion || product.descripcion.trim().length === 0) {
          errors.push(`Item ${link.lineId}: descripción del producto requerida`);
        }
        if (!product.categoriaId) {
          errors.push(`Item ${link.lineId}: categoría del producto requerida`);
        }
        if (!product.marcaId) {
          errors.push(`Item ${link.lineId}: marca del producto requerida`);
        }
        if (!product.proveedorId) {
          errors.push(`Item ${link.lineId}: proveedor del producto requerido`);
        }
      }
    });
    
    return {
      canProceed: pendingItems.length === 0 && errors.length === 0,
      pendingItems,
      errors,
    };
  },
  
  /**
   * Valida ediciones de header
   */
  validateHeaderEdits(edits: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (edits.date) {
      const date = new Date(edits.date);
      if (isNaN(date.getTime())) {
        errors.push('Fecha inválida');
      }
      
      // No permitir fechas futuras
      if (date > new Date()) {
        errors.push('La fecha no puede ser futura');
      }
    }
    
    if (edits.total !== undefined) {
      const total = parseFloat(edits.total);
      if (isNaN(total) || total <= 0) {
        errors.push('El total debe ser un número positivo');
      }
    }
    
    if (edits.documentNumber && edits.documentNumber.trim().length === 0) {
      errors.push('El número de documento no puede estar vacío');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  },
};

/**
 * Helpers para formateo
 */
export const formatHelpers = {
  /**
   * Formatea número a moneda argentina
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  },
  
  /**
   * Formatea fecha ISO a DD/MM/YYYY
   * Maneja fechas en formato YYYY-MM-DD sin problemas de zona horaria
   */
  formatDate(dateStr: string): string {
    try {
      if (!dateStr) return dateStr;

      // Día de calendario (sin hora, o ISO a medianoche UTC): formatear por partes
      // para no restar el huso y mostrar el día anterior.
      const parts = calendarParts(dateStr);
      if (parts) {
        const day = String(parts.day).padStart(2, '0');
        const month = String(parts.month).padStart(2, '0');
        return `${day}/${month}/${parts.year}`;
      }

      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('es-AR');
    } catch {
      return dateStr;
    }
  },
  
  /**
   * Formatea tamaño de archivo
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  },
  
  /**
   * Normaliza número de documento (remueve espacios, guiones)
   */
  normalizeDocumentNumber(docNumber: string): string {
    return docNumber.replace(/[\s\-]/g, '').toUpperCase();
  },
};

// Export individual functions for convenience
export const formatCurrency = formatHelpers.formatCurrency;
export const formatDate = formatHelpers.formatDate;
export const formatFileSize = formatHelpers.formatFileSize;
export const normalizeDocumentNumber = formatHelpers.normalizeDocumentNumber;

