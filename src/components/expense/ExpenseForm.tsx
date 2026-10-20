/* eslint-disable react-hooks/exhaustive-deps */
'use client'
import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Button from '@/components/Button'
import Input from '@/components/Input'
import { ExpenseType, PaymentMethod, CreateExpenseDTO, Expense } from '@/interfaces/expense.interface'
import { expenseService } from '@/services/expense.service'
import { useAppDispatch } from '@/redux/hook'
import { setLoading } from '@/redux/loadingSlice'
import { toast } from "sonner";
import { useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import { getUser } from '@/redux/userSlice'
import { trackExpenseCreated, trackExpenseCreationError, trackExpenseUpdated } from '@/utils/analytics'
import { addExpense, updateExpense } from '@/redux/expenseSlice'
import { cn } from '@/lib/cn'

interface ExpenseFormProps {
  mode?: 'create' | 'edit'
  initialValues?: Expense
  expenseId?: string
  onSubmitSuccess?: () => void
}

const CATEGORY_SUGGESTIONS: string[] = [
  'Combustible',
  'Sueldos',
  'Mantenimiento',
  'Alquiler',
  'Servicios',
  'Insumos',
  'Impuestos',
  'Transporte',
  'Otros',
]

const getToday = () => new Date().toISOString().split('T')[0]

const expenseSchema = z.object({
  date: z.string().min(1, 'La fecha es obligatoria').refine(
    (val) => new Date(val) <= new Date(),
    { message: 'No se puede cargar una fecha futura' }
  ),
  amount: z.string().min(1, 'El monto es obligatorio').refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    { message: 'El monto debe ser mayor a cero' }
  ).refine(
    (val) => /^\d+(\.\d{1,2})?$/.test(val),
    { message: 'Máximo 2 decimales permitidos' }
  ),
  category: z.string().min(2, 'La categoría es obligatoria (mínimo 2 caracteres)'),
  type: z.string().min(1, 'El tipo de egreso es obligatorio'),
  paymentMethod: z.string().min(1, 'El medio de pago es obligatorio'),
  description: z.string().max(500, 'Máximo 500 caracteres permitidos'),
})

type ExpenseFormSchema = z.infer<typeof expenseSchema>

const buildFormData = (mode: 'create' | 'edit', initialValues?: Expense): ExpenseFormSchema => {
  if (mode === 'edit' && initialValues && initialValues.amount !== undefined) {
    const dateOnly = initialValues.date ? initialValues.date.split('T')[0] : getToday()
    return {
      date: dateOnly,
      amount: initialValues.amount?.toString() || '',
      category: initialValues.category || '',
      type: initialValues.type || ExpenseType.OPERATIVO,
      paymentMethod: initialValues.paymentMethod || '',
      description: initialValues.description || '',
    }
  }
  return {
    date: getToday(),
    amount: '',
    category: '',
    type: ExpenseType.OPERATIVO,
    paymentMethod: '',
    description: '',
  }
}

const ExpenseForm = ({ mode = 'create', initialValues, expenseId, onSubmitSuccess }: ExpenseFormProps) => {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const user = useSelector(getUser)

  const { register, handleSubmit, formState: { errors }, watch, setError, reset, getValues, setValue } = useForm<ExpenseFormSchema>({
    resolver: zodResolver(expenseSchema),
    defaultValues: buildFormData(mode, initialValues),
  })

  const originalDataRef = useRef<ExpenseFormSchema | null>(
    mode === 'edit' && initialValues ? buildFormData(mode, initialValues) : null
  )

  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false)

  useEffect(() => {
    if (mode === 'edit' && initialValues && initialValues.amount !== undefined) {
      const newFormData = buildFormData(mode, initialValues)
      reset(newFormData)
      originalDataRef.current = newFormData
    }
  }, [initialValues, mode, reset])

  const calculateModifiedFields = (): string[] => {
    if (!originalDataRef.current) return []
    const values = getValues()
    const modified: string[] = []
    if (originalDataRef.current.date !== values.date) modified.push('date')
    if (parseFloat(originalDataRef.current.amount) !== parseFloat(values.amount)) modified.push('amount')
    if (originalDataRef.current.category !== values.category.trim()) modified.push('category')
    if (originalDataRef.current.type !== values.type) modified.push('type')
    if (originalDataRef.current.paymentMethod !== values.paymentMethod) modified.push('paymentMethod')
    const origDesc = originalDataRef.current.description || ''
    const updatedDesc = values.description.trim()
    if (origDesc !== updatedDesc) modified.push('description')
    return modified
  }

  const onSubmit = async (data: ExpenseFormSchema) => {
    if (mode === 'edit') {
      const modifiedFields = calculateModifiedFields()
      if (modifiedFields.length === 0) {
        toast.warning('No hay cambios para guardar')
        return
      }
    }
    try {
      dispatch(setLoading(true))
      const payload: CreateExpenseDTO = {
        date: data.date,
        amount: parseFloat(data.amount),
        category: data.category.trim(),
        type: data.type as ExpenseType,
        paymentMethod: data.paymentMethod as PaymentMethod,
        ...(data.description && { description: data.description.trim() }),
      }
      if (mode === 'create') {
        const newExpense = await expenseService.create(payload)
        trackExpenseCreated({
          type: newExpense.type,
          category: newExpense.category,
          paymentMethod: newExpense.paymentMethod,
          amount: newExpense.amount,
          date: newExpense.date,
          user: user.nickname,
        })
        dispatch(addExpense(newExpense))
        toast.success('Egreso registrado exitosamente')
      } else {
        const updatedExpense = await expenseService.update(expenseId!, payload)
        const modifiedFields = calculateModifiedFields()
        trackExpenseUpdated({
          usuario: user.nickname,
          timestamp: Date.now(),
          id_egreso: expenseId!,
          campos_modificados: modifiedFields,
          tipo_egreso: updatedExpense.type,
          categoria: updatedExpense.category,
          monto: updatedExpense.amount,
        })
        dispatch(updateExpense(updatedExpense))
        toast.success('Egreso actualizado exitosamente')
      }
      if (onSubmitSuccess) {
        onSubmitSuccess()
      } else {
        router.push('/expense')
      }
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string> } }; message?: string }
      trackExpenseCreationError({
        errorType: err.response?.status === 400 ? 'validation_error' : 'server_error',
        errorMessage: err.response?.data?.message || err.message || 'Unknown error',
        user: user.nickname,
      })
      if (err.response?.status === 400) {
        const backendErrors = err.response.data?.errors || {}
        if (backendErrors.date) setError('date', { message: String(backendErrors.date) })
        if (backendErrors.amount) setError('amount', { message: String(backendErrors.amount) })
        if (backendErrors.category) setError('category', { message: String(backendErrors.category) })
        if (backendErrors.type) setError('type', { message: String(backendErrors.type) })
        if (backendErrors.paymentMethod) setError('paymentMethod', { message: String(backendErrors.paymentMethod) })
        if (backendErrors.description) setError('description', { message: String(backendErrors.description) })
        toast.error('Revisa los campos marcados')
      } else if (err.response?.status === 403) {
        toast.error('No tienes permisos para crear egresos')
      } else {
        toast.error('Error al guardar el egreso. Intenta nuevamente.')
      }
    } finally {
      dispatch(setLoading(false))
    }
  }

  const onFormError = () => {
    toast.error('Por favor, corrige los errores en el formulario')
  }

  const watchedCategory = watch('category') || ''
  const watchedDescription = watch('description') || ''

  const filteredCategories = CATEGORY_SUGGESTIONS.filter(cat =>
    cat.toLowerCase().includes(watchedCategory.toLowerCase())
  )

  const formatDateTime = (isoString?: string): string => {
    if (!isoString) return ''
    return new Date(isoString).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  // TICKET-03: height unified to h-10 (--control-height-md); focus token aligned to border-border-interactive.
  const selectClass = 'h-10 w-full px-3 border border-border-subtle rounded-md text-sm sm:text-base text-text-primary bg-surface-base cursor-pointer transition-colors focus:outline-none focus:border-2 focus:border-border-interactive'

  return (
    <div className="flex justify-center items-start p-4 sm:p-5 flex-1">
      <div className="bg-surface-base rounded-[10px] p-5 sm:p-[30px] shadow-md w-full max-w-[800px] border border-border-subtle">

        <h1 className="text-brand-primary text-2xl sm:text-[28px] font-bold mb-5 text-center">
          {mode === 'edit' ? 'Editar Egreso' : 'Nuevo Egreso'}
        </h1>

        {mode === 'edit' && initialValues && (
          <p className="text-text-muted text-sm text-center mb-5 italic">
            Última modificación: {formatDateTime(initialValues.updatedAt)}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit, onFormError)} className="flex flex-col gap-4 sm:gap-5">

          {/* Date + Amount row */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 w-full">
            <div className="w-full sm:w-[48%]">
              <Input
                label="Fecha"
                type="date"
                {...register('date')}
                value={watch('date')}
                width="100%"
                name="date"
              />
              {errors.date && (
                <span className="text-state-error text-xs mt-1 block">{errors.date.message}</span>
              )}
            </div>
            <div className="w-full sm:w-[48%]">
              <Input
                label="Monto ($)"
                type="number"
                {...register('amount')}
                value={watch('amount')}
                width="100%"
                name="amount"
              />
              {errors.amount && (
                <span className="text-state-error text-xs mt-1 block">{errors.amount.message}</span>
              )}
            </div>
          </div>

          {/* Category + Type row */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 w-full">
            {/* Category with suggestions */}
            <div className="relative flex flex-col w-full sm:w-[48%]">
              <Input
                label="Categoría"
                type="text"
                {...register('category', {
                  onChange: () => setShowCategorySuggestions(true),
                })}
                value={watch('category')}
                width="100%"
                name="category"
              />
              {showCategorySuggestions && filteredCategories.length > 0 && watchedCategory && (
                <ul className="absolute top-full left-0 right-0 bg-surface-base border border-border-subtle rounded-md max-h-[200px] overflow-y-auto z-dropdown list-none p-0 mt-1 shadow-md">
                  {filteredCategories.map((cat, idx) => (
                    <li
                      key={idx}
                      onClick={() => {
                        setValue('category', cat)
                        setShowCategorySuggestions(false)
                      }}
                      className="px-4 py-2.5 sm:py-3 cursor-pointer text-sm sm:text-base text-text-primary hover:bg-surface-subtle transition-colors"
                    >
                      {cat}
                    </li>
                  ))}
                </ul>
              )}
              {errors.category && (
                <span className="text-state-error text-xs mt-1 block">{errors.category.message}</span>
              )}
            </div>

            {/* Type select */}
            <div className="flex flex-col w-full sm:w-[48%]">
              <label className="text-sm text-text-muted mb-1 font-medium">Tipo de Egreso *</label>
              <select
                {...register('type')}
                className={selectClass}
              >
                <option value={ExpenseType.OPERATIVO}>Operativo</option>
                <option value={ExpenseType.PERSONAL}>Personal</option>
                <option value={ExpenseType.OTRO_NEGOCIO}>Otro Negocio</option>
              </select>
              {errors.type && (
                <span className="text-state-error text-xs mt-1 block">{errors.type.message}</span>
              )}
            </div>
          </div>

          {/* Payment method */}
          <div className="flex flex-col w-full">
            <label className="text-sm text-text-muted mb-1 font-medium">Medio de Pago *</label>
            <select
              {...register('paymentMethod')}
              className={selectClass}
            >
              <option value="">Seleccionar...</option>
              <option value={PaymentMethod.EFECTIVO}>Efectivo</option>
              <option value={PaymentMethod.TRANSFERENCIA}>Transferencia</option>
              <option value={PaymentMethod.TARJETA}>Tarjeta</option>
              <option value={PaymentMethod.CHEQUE}>Cheque</option>
              <option value={PaymentMethod.OTRO}>Otro</option>
            </select>
            {errors.paymentMethod && (
              <span className="text-state-error text-xs mt-1 block">{errors.paymentMethod.message}</span>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col w-full">
            <label className="text-sm text-text-muted mb-1 font-medium">Descripción (opcional)</label>
            <textarea
              {...register('description')}
              placeholder="Detalles adicionales..."
              maxLength={500}
              className="min-h-[100px] sm:min-h-[120px] p-2.5 sm:p-3 border border-border-subtle rounded-md text-sm sm:text-base text-text-primary font-[inherit] resize-y transition-colors focus:outline-none focus:border-2 focus:border-border-interactive"
            />
            <span className="text-xs text-text-muted text-right mt-1">{watchedDescription.length}/500</span>
            {errors.description && (
              <span className="text-state-error text-xs mt-1 block">{errors.description.message}</span>
            )}
          </div>

          {/* Buttons */}
          <div className={cn(
            'flex gap-4 sm:gap-5 justify-center mt-4 sm:mt-5',
            'flex-col sm:flex-row'
          )}>
            <Button text="Cancelar" onClick={() => router.push('/expense')} width="100%" />
            <button
              type="submit"
              className="border-0 bg-brand-primary px-6 py-2.5 rounded-md text-text-inverse text-sm font-semibold w-full cursor-pointer transition-colors hover:bg-brand-accent mx-0 sm:mx-2.5"
            >
              Guardar
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

export default ExpenseForm
