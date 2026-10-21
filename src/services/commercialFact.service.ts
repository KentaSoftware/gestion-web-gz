import apiClient from '@/utils/client'

export interface ConfirmSalePaymentPayload {
  businessDate: string
  idempotencyKey: string
}

export const commercialFactService = {
  confirmSalePayment: async (saleId: string, payload: ConfirmSalePaymentPayload) => {
    const response = await apiClient.post(`/commercialFact/sales/${saleId}/payment`, payload)
    return response.data
  },
}
