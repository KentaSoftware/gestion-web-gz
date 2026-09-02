'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { cn } from '@/lib/cn';

interface ProductCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (product: NewProduct) => void;
  initialDescription?: string;
}

interface NewProduct {
  descripcion: string;
  categoria?: string;
  marca?: string;
  codigoBarras?: string;
  precioCompra?: number;
  precioVenta?: number;
  stock?: number;
}

// Mock data (en producción se obtendrían de servicios)
const mockCategorias = [
  'Golosinas',
  'Bebidas',
  'Snacks',
  'Lácteos',
  'Panadería',
  'Limpieza',
  'Otros',
];

const mockMarcas = [
  'Arcor',
  'Cadbury',
  'Coca-Cola',
  'Pepsi',
  'Fargo',
  'Terrabusi',
  'La Serenísima',
  'Sancor',
  'Otras',
];

const fieldClass = cn(
  'w-full rounded-md border border-border-subtle bg-surface-base px-3 py-2',
  'text-label text-text-primary placeholder:text-text-muted',
  'transition-colors duration-base',
  'focus:border-border-interactive focus:outline-none focus:ring-0'
);

const fieldErrorClass = cn(
  'w-full rounded-md border border-state-error bg-surface-base px-3 py-2',
  'text-label text-text-primary placeholder:text-text-muted',
  'transition-colors duration-base',
  'focus:border-state-error focus:outline-none focus:ring-0'
);

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-text-secondary">
        {label}
        {required && <span className="ml-0.5 text-state-error">*</span>}
      </label>
      {children}
      {error && <span className="text-xs text-state-error">{error}</span>}
    </div>
  );
}

export default function ProductCreateModal({ open, onClose, onCreate, initialDescription }: ProductCreateModalProps) {
  const [formData, setFormData] = useState<NewProduct>({
    descripcion: initialDescription || '',
    categoria: undefined,
    marca: undefined,
    codigoBarras: '',
    precioCompra: undefined,
    precioVenta: undefined,
    stock: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && initialDescription) {
      setFormData(prev => ({ ...prev, descripcion: initialDescription }));
    }
  }, [open, initialDescription]);

  const handleChange = (field: keyof NewProduct, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.descripcion.trim()) {
      newErrors.descripcion = 'La descripción es obligatoria';
    }

    if (formData.precioCompra && formData.precioCompra < 0) {
      newErrors.precioCompra = 'El precio no puede ser negativo';
    }

    if (formData.precioVenta && formData.precioVenta < 0) {
      newErrors.precioVenta = 'El precio no puede ser negativo';
    }

    if (formData.stock && formData.stock < 0) {
      newErrors.stock = 'El stock no puede ser negativo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    onCreate(formData);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      descripcion: '',
      categoria: undefined,
      marca: undefined,
      codigoBarras: '',
      precioCompra: undefined,
      precioVenta: undefined,
      stock: 0,
    });
    setErrors({});
    onClose();
  };

  return (
    <Modal
      open={open}
      eClose={handleClose}
      title="Crear Nuevo Producto"
      width="min(90vw, 640px)"
      height="auto"
    >
      <div className="flex flex-col gap-5 py-2">
        {/* Descripción */}
        <Field label="Descripción" required error={errors.descripcion}>
          <input
            type="text"
            value={formData.descripcion}
            onChange={(e) => handleChange('descripcion', e.target.value)}
            className={errors.descripcion ? fieldErrorClass : fieldClass}
            placeholder="Descripción del producto"
            autoFocus
          />
        </Field>

        {/* Categoría / Marca */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Categoría">
            <input
              type="text"
              list="categorias-list"
              value={formData.categoria || ''}
              onChange={(e) => handleChange('categoria', e.target.value || undefined)}
              className={fieldClass}
              placeholder="Seleccionar o escribir..."
            />
            <datalist id="categorias-list">
              {mockCategorias.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>

          <Field label="Marca">
            <input
              type="text"
              list="marcas-list"
              value={formData.marca || ''}
              onChange={(e) => handleChange('marca', e.target.value || undefined)}
              className={fieldClass}
              placeholder="Seleccionar o escribir..."
            />
            <datalist id="marcas-list">
              {mockMarcas.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </Field>
        </div>

        {/* Código de barras */}
        <Field label="Código de Barras">
          <input
            type="text"
            value={formData.codigoBarras}
            onChange={(e) => handleChange('codigoBarras', e.target.value)}
            className={fieldClass}
            placeholder="Opcional"
          />
        </Field>

        {/* Precios */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Precio de Compra" error={errors.precioCompra}>
            <input
              type="number"
              value={formData.precioCompra ?? ''}
              onChange={(e) => handleChange('precioCompra', parseFloat(e.target.value) || undefined)}
              className={errors.precioCompra ? fieldErrorClass : fieldClass}
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </Field>

          <Field label="Precio de Venta" error={errors.precioVenta}>
            <input
              type="number"
              value={formData.precioVenta ?? ''}
              onChange={(e) => handleChange('precioVenta', parseFloat(e.target.value) || undefined)}
              className={errors.precioVenta ? fieldErrorClass : fieldClass}
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </Field>
        </div>

        {/* Stock inicial */}
        <Field label="Stock Inicial" error={errors.stock}>
          <input
            type="number"
            value={formData.stock}
            onChange={(e) => handleChange('stock', parseInt(e.target.value) || 0)}
            className={errors.stock ? fieldErrorClass : fieldClass}
            placeholder="0"
            step="1"
            min="0"
          />
        </Field>

        {/* Actions */}
        <div className="mt-2 flex justify-end gap-3 border-t border-border-subtle pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="cursor-pointer rounded-md border border-border-strong bg-transparent px-5 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-background-subtle"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="cursor-pointer rounded-md border-0 bg-brand-primary px-5 py-2 text-sm font-semibold text-text-inverse transition-colors hover:bg-brand-primary-hover"
          >
            Crear Producto
          </button>
        </div>
      </div>
    </Modal>
  );
}
