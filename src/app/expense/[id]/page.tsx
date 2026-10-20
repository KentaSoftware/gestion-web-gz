/* eslint-disable react-hooks/exhaustive-deps */
'use client'
import { useEffect, useRef, useState } from 'react'
import { useAppDispatch } from '@/redux/hook'
import { useSelector } from 'react-redux'
import { getUser } from '@/redux/userSlice'
import useLocalStorage from '@/hooks/useLocalStorage'
import { useRouter, useParams } from 'next/navigation'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { setLoading } from '@/redux/loadingSlice'
import { Expense, ExpenseUser } from '@/interfaces/expense.interface'
import { expenseService } from '@/services/expense.service'
import { toast } from "sonner";
import { Pencil, Trash2, ArrowLeft } from 'lucide-react'
import Confirm from '@/components/Confirm'
import { trackExpenseDeleted, trackExpenseDetailViewed } from '@/utils/analytics'
import { removeExpense } from '@/redux/expenseSlice'
import { usePermission } from '@/hooks/usePermission'
import { cn } from '@/lib/cn'

const fieldClass = 'flex flex-col gap-1'
const fullWidthFieldClass = 'col-span-full flex flex-col gap-1'
const labelClass = 'text-label font-semibold uppercase tracking-[0.5px] text-text-secondary'
const valueClass = 'text-base text-text-primary'

const getTypeBadgeClass = (type: string) => cn(
  'inline-block whitespace-nowrap rounded-xl px-3.5 py-1.5 text-label font-semibold',
  type === 'operativo' && 'bg-state-success/20 text-state-success',
  type === 'personal' && 'bg-state-warning/20 text-state-warning',
  type !== 'operativo' && type !== 'personal' && 'bg-state-error/20 text-state-error'
)

const getExpenseId = (expense: Expense): string => {
  const id = expense._id || (expense as any).id
  if (!id) return ''
  return typeof id === 'object' ? id.toString() : id.toString()
}

export default function ExpenseDetailScreen() {
  const [valueStorage] = useLocalStorage("user", "")
  const router: AppRouterInstance = useRouter()
  const params = useParams()
  const dispatch = useAppDispatch()
  const user = useSelector(getUser)
  const { canUpdateExpense, canDeleteExpense } = usePermission()
  
  const [expense, setExpense] = useState<Expense | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const analyticsTrackedRef = useRef(false)

  useEffect(() => {
    if (!valueStorage || !valueStorage.token) {
      router.push('/')
      return
    }

    if (params?.id) {
      analyticsTrackedRef.current = false // Resetear al cambiar ID
      fetchExpense(params.id as string)
    }
  }, [params?.id])

  const fetchExpense = async (id: string) => {
    try {
      dispatch(setLoading(true))
      const expenseData = await expenseService.getById(id)
      
      // Normalize amount: use amount if present, else derive from amountCents
      const expenseWithAmount = {
        ...expenseData,
        amount: expenseData.amount || (expenseData.amountCents / 100),
      }
      
      setExpense(expenseWithAmount)
      
      // Analytics EG08: Registrar visualización de detalle
      if (!analyticsTrackedRef.current) {
        trackExpenseDetailViewed({
          usuario: user.nickname || 'unknown',
          timestamp: Date.now(),
          id_egreso: id,
        })
        analyticsTrackedRef.current = true
      }
    } catch (error: any) {
      console.error('Error al cargar egreso:', error)
      
      if (error.response?.status === 410) {
        toast.error('Este egreso fue eliminado')
        router.push('/expense')
      } else if (error.response?.status === 404) {
        toast.error('El egreso no existe')
        router.push('/expense')
      } else if (error.response?.status === 403) {
        toast.error('No tiene permisos para ver este egreso')
        router.push('/expense')
      } else {
        toast.error('Error al cargar el egreso')
      }
    } finally {
      dispatch(setLoading(false))
    }
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Fecha inválida'
      return date.toLocaleDateString('es-AR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return 'Fecha inválida'
    }
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)
  }

  const getUserInfo = (userField: ExpenseUser | string | any): { name: string; email: string } => {
    if (!userField) {
      return { name: 'Sin información', email: '' }
    }
    if (typeof userField === 'string') {
      return { name: `Usuario ${userField.substring(0, 8)}...`, email: '' }
    }
    // Si solo tiene _id (no populated)
    if (userField._id && !userField.name) {
      return { name: `Usuario ${userField._id.toString().substring(0, 8)}...`, email: '' }
    }
    return {
      name: userField?.name || 'Desconocido',
      email: userField?.email || ''
    }
  }

  const openDeleteConfirm = () => {
    setConfirmOpen(true)
  }

  const closeDeleteConfirm = () => {
    setConfirmOpen(false)
  }

  const handleDeleteExpense = async () => {
    if (!expense) return

    try {
      dispatch(setLoading(true))
      const expenseId = getExpenseId(expense)
      await expenseService.delete(expenseId)
      
      dispatch(removeExpense(expenseId))
      
      trackExpenseDeleted({
        usuario: user.nickname || 'unknown',
        timestamp: Date.now(),
        id_egreso: expenseId || 'unknown',
        monto: expense.amount,
        tipo_egreso: expense.type,
        categoria: expense.category,
        medio_pago: expense.paymentMethod,
      })
      
      toast.success('Egreso eliminado exitosamente')
      router.push('/expense')
    } catch (error: any) {
      console.error('Error al eliminar egreso:', error)
      
      if (error.response?.status === 403) {
        toast.error('No tiene permisos para eliminar egresos')
      } else if (error.response?.status === 410 || error.response?.status === 404) {
        toast.error('El egreso ya fue eliminado')
        router.push('/expense')
      } else {
        toast.error('Error al eliminar el egreso')
      }
    } finally {
      dispatch(setLoading(false))
    }
  }

  if (!expense) {
    return (
      <div className="flex flex-1 flex-col bg-background-canvas p-5">
        <div className="flex items-center justify-center px-5 py-[60px] text-lg text-text-secondary">Cargando...</div>
      </div>
    )
  }

  const createdByInfo = getUserInfo(expense.createdBy)
  const updatedByInfo = getUserInfo(expense.updatedBy)

  return (
    <div className="flex flex-1 flex-col bg-background-canvas p-5">
      <div className="mb-5 flex items-center justify-between max-md:flex-col max-md:items-stretch max-md:gap-4">
        <button
          type="button"
          onClick={() => router.push('/expense')}
          className="flex items-center gap-2 rounded-lg border-2 border-brand-primary bg-surface-base px-5 py-2.5 text-label font-semibold text-brand-primary transition-colors hover:bg-brand-primary hover:text-text-inverse"
        >
          <ArrowLeft size={24} aria-hidden="true" />
          Volver al listado
        </button>
        <div className="flex gap-2.5 max-md:flex-col">
          {canUpdateExpense && (
            <button
              type="button"
              onClick={() => router.push(`/expense/${getExpenseId(expense)}/edit`)}
              className="flex items-center gap-2 rounded-lg bg-brand-primary px-5 py-2.5 text-label font-semibold text-text-inverse transition-colors hover:bg-brand-primary-hover"
            >
              <Pencil size={18} aria-hidden="true" />
              Editar
            </button>
          )}
          {canDeleteExpense && (
            <button
              type="button"
              onClick={openDeleteConfirm}
              className="flex items-center gap-2 rounded-lg bg-state-error px-5 py-2.5 text-label font-semibold text-text-inverse transition-opacity hover:opacity-90"
            >
              <Trash2 size={18} aria-hidden="true" />
              Eliminar
            </button>
          )}
        </div>
      </div>

      <div className="rounded-[10px] border border-border-subtle bg-surface-base p-[30px] shadow-md">
        <h1 className="mb-[30px] mt-0 text-heading-sm font-bold text-brand-primary">Detalle del Egreso</h1>
        
        <section className="mb-[30px] border-b border-border-subtle pb-[30px]">
          <h2 className="mb-5 mt-0 text-subheading font-semibold text-brand-primary">Información General</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-5">
            <div className={fieldClass}>
              <div className={labelClass}>Fecha</div>
              <div className={valueClass}>{formatDate(expense.date)}</div>
            </div>
            
            <div className={fieldClass}>
              <div className={labelClass}>Categoría</div>
              <div className={valueClass}>{expense.category}</div>
            </div>
            
            <div className={fieldClass}>
              <div className={labelClass}>Tipo</div>
              <div className={valueClass}>
                <span className={getTypeBadgeClass(expense.type)}>
                  {expense.type === 'operativo' ? 'Operativo' : 
                   expense.type === 'personal' ? 'Personal' : 'Otro Negocio'}
                </span>
              </div>
            </div>
            
            <div className={fieldClass}>
              <div className={labelClass}>Monto</div>
              <div className="text-2xl font-bold text-brand-primary">{formatAmount(expense.amount)}</div>
            </div>
            
            <div className={fieldClass}>
              <div className={labelClass}>Medio de Pago</div>
              <div className={valueClass}>{expense.paymentMethod}</div>
            </div>
          </div>
          
          <div className="mt-5 flex flex-col gap-1">
            <div className={labelClass}>Descripción</div>
            <div className="rounded-md border-l-4 border-brand-primary bg-surface-subtle p-4 text-base text-text-primary">{expense.description || 'Sin descripción'}</div>
          </div>
        </section>

        <section className="mb-[30px] border-b border-border-subtle pb-[30px]">
          <h2 className="mb-5 mt-0 text-subheading font-semibold text-brand-primary">Información de Auditoría</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-5">
            <div className={fieldClass}>
              <div className={labelClass}>Creado por</div>
              <div className={valueClass}>
                {createdByInfo.name}
                {createdByInfo.email && <div className="mt-1 text-label italic text-text-muted">{createdByInfo.email}</div>}
              </div>
            </div>
            
            <div className={fieldClass}>
              <div className={labelClass}>Fecha de creación</div>
              <div className={valueClass}>{formatDate(expense.createdAt)}</div>
            </div>
            
            <div className={fieldClass}>
              <div className={labelClass}>Modificado por</div>
              <div className={valueClass}>
                {updatedByInfo.name}
                {updatedByInfo.email && <div className="mt-1 text-label italic text-text-muted">{updatedByInfo.email}</div>}
              </div>
            </div>
            
            <div className={fieldClass}>
              <div className={labelClass}>Última modificación</div>
              <div className={valueClass}>{formatDate(expense.updatedAt)}</div>
            </div>
            
            {expense.deletedBy && (
              <>
                <div className={fieldClass}>
                  <div className={labelClass}>Eliminado por</div>
                  <div className={valueClass}>
                    <div className="font-semibold text-state-error">
                      {getUserInfo(expense.deletedBy).name}
                      {getUserInfo(expense.deletedBy).email && <div className="mt-1 text-label italic text-text-muted">{getUserInfo(expense.deletedBy).email}</div>}
                    </div>
                  </div>
                </div>
                
                <div className={fieldClass}>
                  <div className={labelClass}>Fecha de eliminación</div>
                  <div className={valueClass}>
                    <div className="font-semibold text-state-error">{formatDate(expense.deletedAt)}</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="mb-0 pb-0">
          <h2 className="mb-5 mt-0 text-subheading font-semibold text-brand-primary">Identificadores</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-5">
            <div className={fullWidthFieldClass}>
              <div className={labelClass}>ID del Egreso</div>
              <div className="break-all rounded-md bg-surface-subtle p-2.5 font-mono text-code text-text-primary">
                {getExpenseId(expense) || 'N/A'}
              </div>
            </div>
          </div>
        </section>
      </div>

      <Confirm
        open={confirmOpen}
        message={`¿Está seguro que desea eliminar el egreso de ${expense.category} por ${formatAmount(expense.amount)}? Esta acción no se puede deshacer.`}
        handleClose={closeDeleteConfirm}
        handleConfirm={handleDeleteExpense}
      />
    </div>
  )
}
