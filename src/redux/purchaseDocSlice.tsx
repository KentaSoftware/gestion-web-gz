import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  PurchaseDocWizardState,
  SourceType,
  Analysis,
  ItemLink,
  LinkingStatus,
  HeaderEdits,
  DuplicateDecision,
  NewProductData,
  ItemEdit,
} from '@/interfaces/purchaseDoc.interface';

const initialState: PurchaseDocWizardState = {
  currentStep: 'upload',
  
  uploadForm: {
    file: null,
    providerId: null,
    sourceType: SourceType.INVOICE,
  },
  
  draftId: null,
  analysis: null,
  
  headerEdits: {},
  itemLinks: {},
  itemEdits: {},
  
  duplicateCheck: null,
  duplicateModalOpen: false,
  duplicateDecision: null,
  
  uploadLoading: false,
  confirmLoading: false,
  
  uploadError: null,
  confirmError: null,
  
  confirmSuccess: false,
  purchaseId: null,
};

const purchaseDocSlice = createSlice({
  name: 'purchaseDoc',
  initialState,
  reducers: {
    // ========== UPLOAD STEP ==========
    
    setFile: (state, action: PayloadAction<File | null>) => {
      state.uploadForm.file = action.payload;
    },
    
    setProviderId: (state, action: PayloadAction<string>) => {
      state.uploadForm.providerId = action.payload;
    },
    
    setSourceType: (state, action: PayloadAction<SourceType>) => {
      state.uploadForm.sourceType = action.payload;
    },
    
    startUpload: (state) => {
      state.uploadLoading = true;
      state.uploadError = null;
    },
    
    uploadSuccess: (state, action: PayloadAction<{ draftId: string; analysis: Analysis }>) => {
      state.uploadLoading = false;
      state.draftId = action.payload.draftId;
      state.analysis = action.payload.analysis;
      state.duplicateCheck = action.payload.analysis.possibleDuplicate;
      state.currentStep = 'review';
      
      // Inicializar itemLinks con status PENDING
      const itemLinks: Record<string, ItemLink> = {};
      action.payload.analysis.items.forEach(item => {
        itemLinks[item.lineId] = {
          lineId: item.lineId,
          status: LinkingStatus.PENDING,
        };
      });
      state.itemLinks = itemLinks;
      state.itemEdits = {};
      
      // Abrir modal de duplicado si aplica
      if (action.payload.analysis.possibleDuplicate.isDuplicate) {
        state.duplicateModalOpen = true;
      }
    },
    
    uploadFailure: (state, action: PayloadAction<string>) => {
      state.uploadLoading = false;
      state.uploadError = action.payload;
    },
    
    // ========== REVIEW STEP ==========
    
    updateHeaderEdit: (state, action: PayloadAction<Partial<HeaderEdits>>) => {
      state.headerEdits = { ...state.headerEdits, ...action.payload };
    },
    
    selectProduct: (state, action: PayloadAction<{ lineId: string; productId: string }>) => {
      const { lineId, productId } = action.payload;
      state.itemLinks[lineId] = {
        lineId,
        status: LinkingStatus.LINKED,
        chosenProductId: productId,
        newProduct: undefined, // Limpiar newProduct si existía
      };
    },
    
    setNewProduct: (state, action: PayloadAction<{ lineId: string; newProduct: NewProductData }>) => {
      const { lineId, newProduct } = action.payload;
      state.itemLinks[lineId] = {
        lineId,
        status: LinkingStatus.NEW_PRODUCT,
        chosenProductId: undefined, // Limpiar chosenProductId
        newProduct,
      };
    },
    
    clearItemLink: (state, action: PayloadAction<string>) => {
      const lineId = action.payload;
      state.itemLinks[lineId] = {
        lineId,
        status: LinkingStatus.PENDING,
      };
    },

    setItemEdit: (state, action: PayloadAction<{ lineId: string; edit: ItemEdit }>) => {
      const { lineId, edit } = action.payload;
      state.itemEdits[lineId] = { ...state.itemEdits[lineId], ...edit };
    },
    
    // ========== DUPLICATE MODAL ==========
    
    setDuplicateModalOpen: (state, action: PayloadAction<boolean>) => {
      state.duplicateModalOpen = action.payload;
    },
    
    setDuplicateDecision: (state, action: PayloadAction<DuplicateDecision>) => {
      state.duplicateDecision = action.payload;
      state.duplicateModalOpen = false;
    },
    
    // ========== CONFIRM ==========
    
    startConfirm: (state) => {
      state.confirmLoading = true;
      state.confirmError = null;
    },
    
    confirmSuccess: (state, action: PayloadAction<{ purchaseId: string }>) => {
      state.confirmLoading = false;
      state.confirmSuccess = true;
      state.purchaseId = action.payload.purchaseId;
    },
    
    confirmFailure: (state, action: PayloadAction<string>) => {
      state.confirmLoading = false;
      state.confirmError = action.payload;
    },
    
    // ========== RESET ==========
    
    resetWizard: () => initialState,
    
    goBackToUpload: (state) => {
      state.currentStep = 'upload';
      state.draftId = null;
      state.analysis = null;
      state.itemLinks = {};
      state.itemEdits = {};
      state.headerEdits = {};
      state.duplicateDecision = null;
      state.uploadError = null;
      state.confirmError = null;
    },
  },
});

export const {
  setFile,
  setProviderId,
  setSourceType,
  startUpload,
  uploadSuccess,
  uploadFailure,
  updateHeaderEdit,
  selectProduct,
  setNewProduct,
  clearItemLink,
  setItemEdit,
  setDuplicateModalOpen,
  setDuplicateDecision,
  startConfirm,
  confirmSuccess,
  confirmFailure,
  resetWizard,
  goBackToUpload,
} = purchaseDocSlice.actions;

export default purchaseDocSlice.reducer;

// Selectors
export const getPurchaseDocState = (state: { purchaseDoc: PurchaseDocWizardState }) => state.purchaseDoc;
export const getCurrentStep = (state: { purchaseDoc: PurchaseDocWizardState }) => state.purchaseDoc.currentStep;
export const getAnalysis = (state: { purchaseDoc: PurchaseDocWizardState }) => state.purchaseDoc.analysis;
export const getItemLinks = (state: { purchaseDoc: PurchaseDocWizardState }) => state.purchaseDoc.itemLinks;
export const getItemEdits = (state: { purchaseDoc: PurchaseDocWizardState }) => state.purchaseDoc.itemEdits;
