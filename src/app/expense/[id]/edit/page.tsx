/* eslint-disable react-hooks/exhaustive-deps */
'use client'
import { useEffect, useState } from 'react'
import { useAppDispatch } from '@/redux/hook'
import useLocalStorage from '@/hooks/useLocalStorage'
import { useRouter } from 'next/navigation'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import ExpenseForm from '@/components/expense/ExpenseForm'
import { expenseService } from '@/services/expense.service'
import { Expense } from '@/interfaces/expense.interface'
import { setLoading } from '@/redux/loadingSlice'
import { toast } from "sonner";
import ProtectedRoute from '@/components/ProtectedRoute'
import { Permission } from '@/interfaces/auth.interface'

export default function EditExpense({ params }: { params: { id: string } }) {
  const [valueStorage] = useLocalStorage("user", "")
  const router: AppRouterInstance = useRouter()

  const dispatch = useAppDispatch()

  const [expense, setExpense] = useState<Expense | null>(null)
  const [loadingExpense, setLoadingExpense] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!valueStorage || !valueStorage.token) {
      router.push('/')
      return
    }
    loadExpense()
  }, [params.id])

  const loadExpense = async () => {
    try {
      setLoadingExpense(true)
      setError(null)
      const expenseData = await expenseService.getById(params.id)
      setExpense(expenseData)
      setLoadingExpense(false)
      dispatch(setLoading(false))
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { message?: string } } }
      console.error('Error al cargar egreso:', err)
      if (err.response?.status === 410) {
        setError('Este egreso fue eliminado y ya no puede ser editado')
      } else if (err.response?.status === 404) {
        setError('El egreso no existe o fue eliminado')
      } else if (err.response?.status === 403) {
        setError('No tienes permisos para ver este egreso')
      } else {
        setError('Error al cargar el egreso. Intenta nuevamente.')
      }
      toast.error(err.response?.data?.message || 'Error al cargar el egreso')
      setLoadingExpense(false)
      dispatch(setLoading(false))
    }
  }

  const handleSuccess = () => {
    router.push('/expense')
  }

  if (error && !loadingExpense) {
    return (
      <div className="flex flex-1 bg-background-subtle">
        <div className="flex flex-col items-center justify-center p-[60px_20px] bg-surface-base rounded-[10px] shadow-md mx-auto my-[50px] max-w-[500px] w-full">
          <div className="text-[64px] mb-5">❌</div>
          <h2 className="text-text-muted text-2xl font-semibold mb-2.5 text-center">No se pudo cargar el egreso</h2>
          <p className="text-text-subtle text-base mb-[30px] text-center">{error}</p>
          <button
            onClick={() => router.push('/expense')}
            className="border-0 bg-brand-primary px-6 py-2.5 rounded-[10px] text-text-inverse text-sm font-semibold cursor-pointer transition-colors hover:bg-brand-accent"
          >
            Volver al listado
          </button>
        </div>
      </div>
    )
  }

  if (loadingExpense || !expense) {
    return (
      <div className="flex flex-1 bg-background-subtle">
        <div className="flex flex-col items-center justify-center p-[60px_20px] w-full">
          <div className="border-4 border-surface-subtle border-t-brand-primary rounded-full w-[50px] h-[50px] animate-spin mb-5" />
          <div className="text-lg text-text-muted font-medium">Cargando egreso...</div>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute
      requiredPermission={Permission.UPDATE_EXPENSE}
      deniedMessage="No tienes permisos para editar egresos. Contacta a tu administrador si necesitas acceso."
    >
      <div className="flex flex-1 bg-background-subtle">
        <ExpenseForm
          mode="edit"
          initialValues={expense}
          expenseId={params.id}
          onSubmitSuccess={handleSuccess}
        />
      </div>
    </ProtectedRoute>
  )
}
