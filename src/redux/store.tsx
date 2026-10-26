import { configureStore } from '@reduxjs/toolkit'
import userSlice from './userSlice'
import loadingSlice from './loadingSlice'
import alertSlice from './alertSlice'
import saleSlice from './saleSlice'
import buySlice from './buySlice'
import expenseSlice from './expenseSlice'
import purchaseDocSlice from './purchaseDocSlice'
import cashflowSlice from './cashflowSlice'

export const store = configureStore({
    reducer: {
        user: userSlice,
        loading: loadingSlice,
        alert: alertSlice,
        sale: saleSlice,
        buy: buySlice,
        expense: expenseSlice,
        purchaseDoc: purchaseDocSlice,
        cashflow: cashflowSlice,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignorar File object en Redux (solo para uploadForm.file)
                ignoredActions: ['purchaseDoc/setFile'],
                ignoredPaths: ['purchaseDoc.uploadForm.file'],
            },
        }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

