import { CashflowConfig, CashflowMovement, CashflowSummary } from '@/interfaces/cashflow.interface';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CashflowState {
  summary: CashflowSummary | null;
  timeline: CashflowMovement[];
  movements: CashflowMovement[];
  config: CashflowConfig | null;
  loading: boolean;
  error: string | null;
}

const initialState: CashflowState = {
  summary: null,
  timeline: [],
  movements: [],
  config: null,
  loading: false,
  error: null,
};

const cashflowSlice = createSlice({
  name: 'cashflow',
  initialState,
  reducers: {
    setSummary: (state, action: PayloadAction<CashflowSummary>) => {
      state.summary = action.payload;
    },
    setTimeline: (state, action: PayloadAction<CashflowMovement[]>) => {
      state.timeline = action.payload;
    },
    setMovements: (state, action: PayloadAction<CashflowMovement[]>) => {
      state.movements = action.payload;
    },
    setConfig: (state, action: PayloadAction<CashflowConfig>) => {
      state.config = action.payload;
    },
    setCashflowLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setCashflowError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearCashflow: (state) => {
      state.summary = null;
      state.timeline = [];
      state.movements = [];
      state.config = null;
      state.loading = false;
      state.error = null;
    },
  },
});

export const getCashflowState = (state: { cashflow: CashflowState }) => state.cashflow;
export const getCashflowSummary = (state: { cashflow: CashflowState }) => state.cashflow.summary;
export const getCashflowTimeline = (state: { cashflow: CashflowState }) => state.cashflow.timeline;
export const getCashflowMovements = (state: { cashflow: CashflowState }) => state.cashflow.movements;
export const getCashflowConfig = (state: { cashflow: CashflowState }) => state.cashflow.config;
export const getCashflowLoading = (state: { cashflow: CashflowState }) => state.cashflow.loading;
export const getCashflowError = (state: { cashflow: CashflowState }) => state.cashflow.error;

export const {
  setSummary,
  setTimeline,
  setMovements,
  setConfig,
  setCashflowLoading,
  setCashflowError,
  clearCashflow,
} = cashflowSlice.actions;

export default cashflowSlice.reducer;
