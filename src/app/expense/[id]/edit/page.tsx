/* eslint-disable react-hooks/exhaustive-deps */
'use client'
import React, { useEffect, useState } from 'react'
import { useAppDispatch } from '@/redux/hook'
import { useSelector } from 'react-redux'
import { getUser } from '@/redux/userSlice'
import useLocalStorage from '@/hooks/useLocalStorage'
import styled from 'styled-components'
import { useRouter } from 'next/navigation'
import { useResize } from '@/hooks/useResize'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import ExpenseForm from '@/components/expense/ExpenseForm'
import ExpenseFormMobile from '@/components/expense/ExpenseFormMobile'
import { expenseService } from '@/services/expense.service'
import { Expense } from '@/interfaces/expense.interface'
import { setLoading } from '@/redux/loadingSlice'
import { setAlert } from '@/redux/alertSlice'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Permission } from '@/interfaces/auth.interface'

export default function EditExpense({ params }: { params: { id: string } }) {
  const [valueStorage] = useLocalStorage("user", "")
  const router: AppRouterInstance = useRouter()
  let { ancho } = useResize()

  const user = useSelector(getUser)
  const dispatch = useAppDispatch()

  const [expense, setExpense] = useState<Expense | null>(null)
  const [loadingExpense, setLoadingExpense] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Verificar autenticación
    if (!valueStorage || !valueStorage.token) {
      router.push('/')
      return
    }

    // Cargar egreso
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
    } catch (error: any) {
      console.error('Error al cargar egreso:', error)
      
      if (error.response?.status === 410) {
        setError('Este egreso fue eliminado y ya no puede ser editado')
      } else if (error.response?.status === 404) {
        setError('El egreso no existe o fue eliminado')
      } else if (error.response?.status === 403) {
        setError('No tienes permisos para ver este egreso')
      } else {
        setError('Error al cargar el egreso. Intenta nuevamente.')
      }

      dispatch(setAlert({
        message: error.response?.data?.message || 'Error al cargar el egreso',
        type: 'error'
      }))

      setLoadingExpense(false)
      dispatch(setLoading(false))
    }
  }

  const handleSuccess = () => {
    router.push('/expense')
  }

  // Mostrar error si hay
  if (error && !loadingExpense) {
    return (
      <Container>
        <ErrorContainer>
          <ErrorIcon>❌</ErrorIcon>
          <ErrorTitle>No se pudo cargar el egreso</ErrorTitle>
          <ErrorMessage>{error}</ErrorMessage>
          <BackButton onClick={() => router.push('/expense')}>
            Volver al listado
          </BackButton>
        </ErrorContainer>
      </Container>
    )
  }

  // Mostrar spinner mientras carga
  if (loadingExpense || !expense) {
    return (
      <Container>
        <LoadingContainer>
          <Spinner />
          <LoadingText>Cargando egreso...</LoadingText>
        </LoadingContainer>
      </Container>
    )
  }

  // Renderizar formulario con datos (protegido por permisos)
  return (
    <ProtectedRoute 
      requiredPermission={Permission.UPDATE_EXPENSE}
      deniedMessage="No tienes permisos para editar egresos. Contacta a tu administrador si necesitas acceso."
    >
      <Container>
        {ancho > 940 ? (
          <ExpenseForm
            mode="edit"
            initialValues={expense}
            expenseId={params.id}
            onSubmitSuccess={handleSuccess}
          />
        ) : (
          <ExpenseFormMobile
            mode="edit"
            initialValues={expense}
            expenseId={params.id}
            onSubmitSuccess={handleSuccess}
          />
        )}
      </Container>
    </ProtectedRoute>
  )
}

const Container = styled.div`
  display: flex;
  flex: 1;
  background: #f5f5f5;
  
  @media only screen and (max-width: 940px) {
    flex-direction: column;
  }
`

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  width: 100%;
`

const Spinner = styled.div`
  border: 4px solid #f3f3f3;
  border-top: 4px solid #8294C4;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`

const LoadingText = styled.div`
  font-size: 18px;
  color: #666;
  font-weight: 500;
`

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin: 50px auto;
  max-width: 500px;
`

const ErrorIcon = styled.div`
  font-size: 64px;
  margin-bottom: 20px;
`

const ErrorTitle = styled.h2`
  color: #666;
  font-size: 24px;
  margin-bottom: 10px;
  text-align: center;
`

const ErrorMessage = styled.p`
  color: #999;
  font-size: 16px;
  margin-bottom: 30px;
  text-align: center;
`

const BackButton = styled.button`
  border: 0;
  background-color: #8294C4;
  padding: 10px 25px;
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #637195;
  }
`
