import apiClient from '@/utils/client';

export interface Product {
  _id: string;
  descripcion: string;
  categoria?: string;
  marca?: string;
  proveedor?: string;
  codigoBarra?: string;
  precioCompra?: number;
  precioUnitario?: number;
  stock?: number;
}

export interface SearchProductsResponse {
  products: Product[];
  total: number;
}

/**
 * Servicio para búsqueda de productos
 */
export const productService = {
  /**
   * Buscar productos por término de búsqueda
   * @param query - Término de búsqueda
   * @param limit - Cantidad máxima de resultados (default: 20)
   * @returns Lista de productos que coinciden con la búsqueda
   */
  async searchProducts(query: string, limit: number = 20): Promise<Product[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    try {
      const response = await apiClient.post('/product/search', {
        input: query.trim(),
        skip: 0,
        limit
      });

      // El backend puede devolver { success: true, data: [...] } o directamente el array
      if (response.data.success && Array.isArray(response.data.data)) {
        return response.data.data;
      } else if (Array.isArray(response.data)) {
        return response.data;
      }

      return [];
    } catch (error) {
      console.error('Error buscando productos:', error);
      return [];
    }
  },
};
