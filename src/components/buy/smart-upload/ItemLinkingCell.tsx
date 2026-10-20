'use client';

// TICKET-03 + EP6-03: MUI Autocomplete replaced with Combobox (DS-native).
// MUI Autocomplete + TextField removed; debounce now internal to Combobox.
// slate-* colors replaced with text-text-primary/secondary/muted DS tokens.
// MUI Chip replaced with inline Badge divs (LINKED + NEW_PRODUCT states).
// MUI CircularProgress replaced with CSS spinner (animate-spin).
// Redux dispatch, ProductCreateModal, badge divs unchanged.

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/redux/hook';
import { getItemLinks, selectProduct, clearItemLink, setNewProduct } from '@/redux/purchaseDocSlice';
import { AnalyzedItem, LinkingStatus, ProductSuggestion } from '@/interfaces/purchaseDoc.interface';
import Combobox from '@/components/ui/combobox';
import { Plus, X, CheckCircle, Search } from 'lucide-react';
import ProductCreateModal from './ProductCreateModal';
import { productService, Product } from '@/services/product.service';

interface ItemLinkingCellProps {
  lineId: string;
  item: AnalyzedItem;
}



export default function ItemLinkingCell({ lineId, item }: ItemLinkingCellProps) {
  const dispatch = useAppDispatch();
  const itemLinks = useSelector(getItemLinks);
  const link = itemLinks[lineId];
  
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  
  if (!link) return <div>Error: no se encontró el link</div>;
  
  const handleSelectProduct = (productId: string | null) => {
    if (productId) {
      dispatch(selectProduct({ lineId, productId }));
    }
  };
  
  const handleSelectSearchResult = (product: Product | null) => {
    if (product) {
      dispatch(selectProduct({ lineId, productId: product._id }));
    }
  };
  
  const handleClear = () => {
    dispatch(clearItemLink(lineId));
  };
  
  const handleOpenCreateModal = () => {
    setCreateModalOpen(true);
  };
  
  const handleCloseCreateModal = () => {
    setCreateModalOpen(false);
  };
  
  const handleCreateProduct = (newProduct: any) => {
    dispatch(setNewProduct({ lineId, newProduct }));
    setCreateModalOpen(false);
  };
  
  // ESTADO: PENDING — show suggestions or search
  if (link.status === LinkingStatus.PENDING) {
    const hasSuggestions = item.suggestions && item.suggestions.length > 0;
    
    if (hasSuggestions) {
      return (
        <div className="flex flex-col gap-2">
          <Combobox<ProductSuggestion>
            options={item.suggestions || []}
            getOptionLabel={(option) => option.descripcion}
            getOptionValue={(option) => option._id}
            onChange={(value) => handleSelectProduct(value?._id || null)}
            placeholder="Selecciona un producto..."
            noOptionsText="Sin sugerencias"
            renderOption={(option) => (
              <>
                <span className="text-sm text-text-primary">{option.descripcion}</span>
                <span className="text-xs font-semibold text-text-secondary">Score: {(option.score * 100).toFixed(0)}%</span>
              </>
            )}
          />
          
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-1 rounded-md border border-border-interactive bg-surface-base px-3 py-2 text-[13px] font-semibold text-brand-primary hover:bg-background-subtle transition-colors"
          >
            <Plus size={16} aria-hidden="true" />
            Crear Producto
          </button>
          
          <ProductCreateModal
            open={createModalOpen}
            onClose={handleCloseCreateModal}
            onCreate={handleCreateProduct}
            initialDescription={item.description || item.rawDescription}
          />
        </div>
      );
    } else {
      // No suggestions: show search autocomplete
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 py-1 text-xs text-text-muted">
            <Search size={16} aria-hidden="true" />
            <span className="italic">Busca el producto en el catálogo</span>
          </div>
          
          <Combobox<Product>
            options={searchResults}
            getOptionLabel={(option) => option.descripcion}
            getOptionValue={(option) => option._id}
            onChange={(value) => handleSelectSearchResult(value)}
            onSearch={async (query) => {
              if (query.trim().length < 2) {
                setSearchResults([]);
                return;
              }
              setSearching(true);
              try {
                const results = await productService.searchProducts(query, 20);
                setSearchResults(results);
              } catch (error) {
                console.error('Error searching products:', error);
                setSearchResults([]);
              } finally {
                setSearching(false);
              }
            }}
            loading={searching}
            placeholder="Buscar producto..."
            noOptionsText="No se encontraron productos"
            renderOption={(option) => (
              <>
                <span className="text-sm text-text-primary">{option.descripcion}</span>
                {option.marca && <span className="ml-2 text-[11px] text-text-muted">Marca: {option.marca}</span>}
              </>
            )}
          />
          
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-1 rounded-md border-0 bg-brand-primary px-3 py-2 text-[13px] font-semibold text-text-inverse hover:bg-brand-primary-hover transition-colors"
          >
            <Plus size={16} aria-hidden="true" />
            Crear Producto Nuevo
          </button>
          
          <ProductCreateModal
            open={createModalOpen}
            onClose={handleCloseCreateModal}
            onCreate={handleCreateProduct}
            initialDescription={item.description || item.rawDescription}
          />
        </div>
      );
    }
  }
  
  // ESTADO: LINKED — show selected product
  if (link.status === LinkingStatus.LINKED && link.chosenProductId) {
    const selectedProduct = 
      item.suggestions?.find((s: ProductSuggestion) => s._id === link.chosenProductId) ||
      searchResults.find((p: Product) => p._id === link.chosenProductId);
    
    return (
      <div className="flex flex-col gap-2">
        <div
          className="inline-flex items-center gap-1.5 rounded-full bg-state-success px-3 py-1 text-[13px] font-medium text-text-inverse"
        >
          <CheckCircle size={18} aria-hidden="true" />
          <span>{selectedProduct?.descripcion || 'Producto seleccionado'}</span>
          <button
            onClick={handleClear}
            className="ml-1 flex items-center justify-center rounded-full p-0.5 opacity-80 transition-opacity hover:opacity-100"
            aria-label="Eliminar"
            type="button"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }
  
  // ESTADO: NEW_PRODUCT — show that a new product will be created
  if (link.status === LinkingStatus.NEW_PRODUCT && link.newProduct) {
    return (
      <div className="flex flex-col gap-2">
        <div
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-primary px-3 py-1 text-[13px] font-medium text-text-inverse"
        >
          <Plus size={18} aria-hidden="true" />
          <span>Nuevo: {link.newProduct.descripcion}</span>
          <button
            onClick={handleClear}
            className="ml-1 flex items-center justify-center rounded-full p-0.5 opacity-80 transition-opacity hover:opacity-100"
            aria-label="Eliminar"
            type="button"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }
  
  return <div>Estado desconocido</div>;
}
