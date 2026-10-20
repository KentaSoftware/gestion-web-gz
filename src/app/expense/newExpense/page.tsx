/* eslint-disable react-hooks/exhaustive-deps */
'use client'
import { useEffect } from 'react'
import useLocalStorage from '@/hooks/useLocalStorage'
import { useRouter } from 'next/navigation'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import ExpenseForm from '@/components/expense/ExpenseForm'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Permission } from '@/interfaces/auth.interface'

export default function NewExpense() {
  const [valueStorage] = useLocalStorage("user", "")
  const router: AppRouterInstance = useRouter()
  useEffect(() => {
    if (!valueStorage || !valueStorage.token) {
      router.push('/')
    }
  }, [router, valueStorage])

  return (
    <ProtectedRoute
      requiredPermission={Permission.CREATE_EXPENSE}
      deniedMessage="No tienes permisos para crear nuevos egresos. Contacta a tu administrador si necesitas acceso."
    >
      <div className="flex flex-1 bg-background-subtle">
        <ExpenseForm />
      </div>
    </ProtectedRoute>
  )
}
