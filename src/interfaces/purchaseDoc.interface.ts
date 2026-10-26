/**
 * ==========================================
 * INTERFACES Y TIPOS PARA CARGA INTELIGENTE DE COMPROBANTES
 * ==========================================
 */

/**
 * ==========================================
 * ENUMS Y TIPOS BASE
 * ==========================================
 */

export enum SourceType {
  INVOICE = 'invoice',
  RECEIPT = 'receipt',
  BUDGET = 'budget',
}

export enum DuplicateDecision {
  CANCEL = 'CANCEL',
  PROCEED = 'PROCEED',
}

export enum LinkingStatus {
  LINKED = 'LINKED',           // Tiene chosenProductId
  NEW_PRODUCT = 'NEW_PRODUCT', // Tiene newProduct completo
  PENDING = 'PENDING',         // Falta vincular
}

/**
 * ==========================================
 * PROVIDER
 * ==========================================
 */

export interface Provider {
  _id: string;
  name: string;
  cuit?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
}

/**
 * ==========================================
 * UPLOAD REQUEST
 * ==========================================
 */

export interface UploadMetadata {
  providerId: string;
  sourceType: SourceType;
}

// FormData con file + metadata JSON stringify

/**
 * ==========================================
 * UPLOAD RESPONSE (Analysis completo)
 * ==========================================
 */

// Respuesta inmediata del upload (backend Opción A)
export interface UploadResponse {
  draftId: string;
  status: 'PROCESSING' | 'READY' | 'FAILED';
  file: {
    filename: string;
    originalName: string;
    path: string;
    mimeType: string;
    size: number;
  };
  providerId?: string;
  sourceType: SourceType;
  message?: string;
}

// Respuesta del polling GET /purchaseDoc/:draftId
export interface DraftStatusResponse {
  draftId: string;
  status: 'PROCESSING' | 'READY' | 'FAILED' | 'CONFIRMED';
  file: {
    filename: string;
    originalName: string;
    path: string;
    mimeType: string;
    size: number;
  };
  providerId?: string;
  sourceType: SourceType;
  analysis?: AnalysisResult;  // Solo si status=READY
  possibleDuplicate?: PossibleDuplicate;  // Solo si status=READY
  error?: {
    message: string;
    code?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Analysis result del backend
export interface AnalysisResult {
  header: {
    documentNumber: string;
    documentDate: string;
    providerName: string;
    providerId: string;
    total: number;
    confidence: number;
  };
  items: BackendAnalyzedItem[];
  meta: {
    itemsProcessed: number;
    itemsWithMatch: number;
    itemsWithoutMatch: number;
    avgConfidence: number;
    processingTime: number;
  };
}

export interface BackendAnalyzedItem {
  itemId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  barcode?: string;
  catalogMatch?: {
    productId: string;
    description: string;
    confidence: number;
    method: string;
    source: string;
    candidates?: BackendProductCandidate[];
  };
}

export interface BackendProductCandidate {
  productId: string;
  description: string;
  score: number;
  codigoBarra?: string;
  categoria?: string;
  marca?: string;
}

export interface PossibleDuplicate {
  checkId?: string;
  status: 'CLEAN' | 'SUSPECTED_DUPLICATE';
  duplicates: DuplicateCandidate[];
  canProceed: boolean;
  requiresDecision: boolean;
  message: string;
}

// Formato antiguo compatible (para no romper componentes existentes)
export interface Analysis {
  header: HeaderData;
  items: AnalyzedItem[];
  possibleDuplicate: DuplicateCheck;
  warnings: string[];
  confidenceGlobal: number;
}

export interface HeaderData {
  provider: {
    id: string;
    name: string;
  };
  date: string;              // ISO 8601
  documentNumber: string;
  total: number;
  subtotal?: number;
  tax?: number;
  discount?: number;
  dateConfidence?: number;
  documentNumberConfidence?: number;
  totalConfidence?: number;
}

export interface AnalyzedItem {
  lineId: string;            // UUID generado por backend
  rawDescription: string;    // Texto OCR original
  description: string;       // Descripción normalizada
  quantity: number;
  unitPrice: number;
  subtotal: number;
  catalogLink: CatalogLink;
  suggestions?: ProductSuggestion[];  // Lista plana de sugerencias
  descriptionConfidence?: number;
}

export interface CatalogLink {
  suggestions: ProductSuggestion[];
  actionRequired?: 'CREATE_PRODUCT';  // Si no hay sugerencias viables
}

export interface ProductSuggestion {
  _id: string;               // ID del producto
  productId: string;
  name: string;
  descripcion: string;       // Descripción principal
  description?: string;
  brand?: string;
  category?: string;
  score: number;             // 0-1
  method: string;            // 'exactMatch' | 'fuzzyMatch' | 'semanticMatch'
  barcode?: string;
}

export interface DuplicateCheck {
  isDuplicate: boolean;
  checkId?: string;          // Para endpoint decision (si existe)
  candidates: DuplicateCandidate[];
  confidence?: number;
}

export interface DuplicateCandidate {
  buyId: string;             // ID de la compra
  purchaseId: string;
  documentNumber: string;
  date: string;
  total: number;
  provider: string;
  score: number;
  matchReasons: string[];    // Ej: ['Same document number', 'Similar total']
}

/**
 * ==========================================
 * CONFIRM REQUEST
 * ==========================================
 */

export interface ConfirmRequest {
  headerEdits?: HeaderEdits;
  items: ConfirmItem[];
  duplicateDecision?: DuplicateDecisionData;
}

export interface HeaderEdits {
  date?: string;
  documentNumber?: string;
  total?: number;
  providerId?: string;       // Si usuario cambió proveedor
}

export interface ConfirmItem {
  lineId: string;
  chosenProductId?: string;  // Producto existente seleccionado
  newProduct?: NewProductData; // Producto a crear
  quantity?: number;         // Cantidad corregida por el usuario
  unitPrice?: number;        // Precio unitario corregido por el usuario
  subtotal?: number;         // quantity * unitPrice, recalculado en el cliente
}

/**
 * Ediciones del usuario sobre un ítem detectado por OCR.
 * Los valores numéricos se guardan como texto para respetar lo que tipea el usuario;
 * se parsean con `resolveItemValues` antes de enviarlos.
 */
export interface ItemEdit {
  description?: string;  // Solo para re-buscar el producto; no se persiste
  quantity?: string;
  unitPrice?: string;
}

export interface NewProductData {
  descripcion: string;
  categoriaId: string;
  marcaId: string;
  proveedorId: string;       // Debe coincidir con provider del header
  codigoBarra?: string;
  precioCompra?: number;
  precioVenta?: number;
  stockInicial?: number;
}

export interface DuplicateDecisionData {
  checkId: string;
  decision: DuplicateDecision;
}

/**
 * ==========================================
 * CONFIRM RESPONSE
 * ==========================================
 */

export interface ConfirmResponse {
  success: boolean;
  buyId: string;             // ID de la compra creada
  purchaseId: string;
  message: string;
  createdProducts?: string[]; // IDs de productos creados
  warnings?: string[];
}

/**
 * ==========================================
 * UI STATE (Redux)
 * ==========================================
 */

export interface PurchaseDocWizardState {
  // Wizard flow
  currentStep: 'upload' | 'review';
  
  // Upload step
  uploadForm: {
    file: File | null;
    providerId: string | null;
    sourceType: SourceType;
  };
  
  // Upload result
  draftId: string | null;
  analysis: Analysis | null;
  
  // User edits
  headerEdits: Partial<HeaderEdits>;
  itemLinks: Record<string, ItemLink>; // lineId -> ItemLink
  itemEdits: Record<string, ItemEdit>; // lineId -> ItemEdit
  
  // Duplicate handling
  duplicateCheck: DuplicateCheck | null;
  duplicateModalOpen: boolean;
  duplicateDecision: DuplicateDecision | null;
  
  // Loading states
  uploadLoading: boolean;
  confirmLoading: boolean;
  
  // Errors
  uploadError: string | null;
  confirmError: string | null;
  
  // Success
  confirmSuccess: boolean;
  purchaseId: string | null;
}

export interface ItemLink {
  lineId: string;
  status: LinkingStatus;
  chosenProductId?: string;
  newProduct?: NewProductData;
}

/**
 * ==========================================
 * VALIDATIONS
 * ==========================================
 */

export interface ItemValidation {
  lineId: string;
  isValid: boolean;
  message?: string;
}

export interface WizardValidation {
  canProceed: boolean;
  pendingItems: string[];  // lineIds sin vincular
  errors: string[];
}

/**
 * ==========================================
 * CATALOG ENTITIES (para modal de creación)
 * ==========================================
 */

export interface Category {
  _id: string;
  name: string;
}

export interface Brand {
  _id: string;
  name: string;
}
