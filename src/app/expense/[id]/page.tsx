/* eslint-disable react-hooks/exhaustive-deps */
'use client'
import React, { useEffect, useState, useRef } from 'react'
import styled from 'styled-components'
import { useAppDispatch } from '@/redux/hook'
import { useSelector } from 'react-redux'
import { getUser } from '@/redux/userSlice'
import useLocalStorage from '@/hooks/useLocalStorage'
import { useRouter, useParams } from 'next/navigation'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { setLoading } from '@/redux/loadingSlice'
import { Expense, ExpenseUser } from '@/interfaces/expense.interface'
import { expenseService } from '@/services/expense.service'
import { setAlert } from '@/redux/alertSlice'
import { MdEdit, MdDelete, MdArrowBack } from 'react-icons/md'
import Confirm from '@/components/Confirm'
import { trackExpenseDeleted, trackExpenseDetailViewed } from '@/utils/analytics'
import { removeExpense } from '@/redux/expenseSlice'
import { usePermission } from '@/hooks/usePermission'

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
        dispatch(setAlert({ message: 'Este egreso fue eliminado', type: 'error' }))
        router.push('/expense')
      } else if (error.response?.status === 404) {
        dispatch(setAlert({ message: 'El egreso no existe', type: 'error' }))
        router.push('/expense')
      } else if (error.response?.status === 403) {
        dispatch(setAlert({ message: 'No tiene permisos para ver este egreso', type: 'error' }))
        router.push('/expense')
      } else {
        dispatch(setAlert({ message: 'Error al cargar el egreso', type: 'error' }))
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
      const expenseId = (expense._id || (expense as any).id)?.toString() || ''
      await expenseService.delete(expenseId)
      
      dispatch(removeExpense(expenseId))
      
      trackExpenseDeleted({
        usuario: user.nickname || 'unknown',
        timestamp: Date.now(),
        id_egreso: (expense._id || (expense as any).id)?.toString() || 'unknown',
        monto: expense.amount,
        tipo_egreso: expense.type,
        categoria: expense.category,
        medio_pago: expense.paymentMethod,
      })
      
      dispatch(setAlert({ message: 'Egreso eliminado exitosamente', type: 'success' }))
      router.push('/expense')
    } catch (error: any) {
      console.error('Error al eliminar egreso:', error)
      
      if (error.response?.status === 403) {
        dispatch(setAlert({ message: 'No tiene permisos para eliminar egresos', type: 'error' }))
      } else if (error.response?.status === 410 || error.response?.status === 404) {
        dispatch(setAlert({ message: 'El egreso ya fue eliminado', type: 'error' }))
        router.push('/expense')
      } else {
        dispatch(setAlert({ message: 'Error al eliminar el egreso', type: 'error' }))
      }
    } finally {
      dispatch(setLoading(false))
    }
  }

  if (!expense) {
    return (
      <Container>
        <EmptyState>Cargando...</EmptyState>
      </Container>
    )
  }

  const createdByInfo = getUserInfo(expense.createdBy)
  const updatedByInfo = getUserInfo(expense.updatedBy)

  return (
    <Container>
      <Header>
        <BackButton onClick={() => router.push('/expense')}>
          <MdArrowBack size={24} />
          Volver al listado
        </BackButton>
        <Actions>
          {canUpdateExpense && (
            <EditButton onClick={() => router.push(`/expense/${expense._id || (expense as any).id}/edit`)}>
              <MdEdit size={18} />
              Editar
            </EditButton>
          )}
          {canDeleteExpense && (
            <DeleteButton onClick={openDeleteConfirm}>
              <MdDelete size={18} />
              Eliminar
            </DeleteButton>
          )}
        </Actions>
      </Header>

      <Content>
        <Title>Detalle del Egreso</Title>
        
        <Section>
          <SectionTitle>Información General</SectionTitle>
          <Grid>
            <Field>
              <Label>Fecha</Label>
              <Value>{formatDate(expense.date)}</Value>
            </Field>
            
            <Field>
              <Label>Categoría</Label>
              <Value>{expense.category}</Value>
            </Field>
            
            <Field>
              <Label>Tipo</Label>
              <Value>
                <TypeBadge type={expense.type}>
                  {expense.type === 'operativo' ? 'Operativo' : 
                   expense.type === 'personal' ? 'Personal' : 'Otro Negocio'}
                </TypeBadge>
              </Value>
            </Field>
            
            <Field>
              <Label>Monto</Label>
              <AmountValue>{formatAmount(expense.amount)}</AmountValue>
            </Field>
            
            <Field>
              <Label>Medio de Pago</Label>
              <Value>{expense.paymentMethod}</Value>
            </Field>
          </Grid>
          
          <FullWidthField>
            <Label>Descripción</Label>
            <ValueBlock>{expense.description || 'Sin descripción'}</ValueBlock>
          </FullWidthField>
        </Section>

        <Section>
          <SectionTitle>Información de Auditoría</SectionTitle>
          <Grid>
            <Field>
              <Label>Creado por</Label>
              <Value>
                {createdByInfo.name}
                {createdByInfo.email && <Email>{createdByInfo.email}</Email>}
              </Value>
            </Field>
            
            <Field>
              <Label>Fecha de creación</Label>
              <Value>{formatDate(expense.createdAt)}</Value>
            </Field>
            
            <Field>
              <Label>Modificado por</Label>
              <Value>
                {updatedByInfo.name}
                {updatedByInfo.email && <Email>{updatedByInfo.email}</Email>}
              </Value>
            </Field>
            
            <Field>
              <Label>Última modificación</Label>
              <Value>{formatDate(expense.updatedAt)}</Value>
            </Field>
            
            {expense.deletedBy && (
              <>
                <Field>
                  <Label>Eliminado por</Label>
                  <Value>
                    <DeletedInfo>
                      {getUserInfo(expense.deletedBy).name}
                      {getUserInfo(expense.deletedBy).email && <Email>{getUserInfo(expense.deletedBy).email}</Email>}
                    </DeletedInfo>
                  </Value>
                </Field>
                
                <Field>
                  <Label>Fecha de eliminación</Label>
                  <Value>
                    <DeletedInfo>{formatDate(expense.deletedAt)}</DeletedInfo>
                  </Value>
                </Field>
              </>
            )}
          </Grid>
        </Section>

        <Section>
          <SectionTitle>Identificadores</SectionTitle>
          <Grid>
            <FullWidthField>
              <Label>ID del Egreso</Label>
              <MonoValue>
                {(() => {
                  const id = expense._id || (expense as any).id
                  if (!id) return 'N/A'
                  return typeof id === 'object' ? id.toString() : id.toString()
                })()}
              </MonoValue>
            </FullWidthField>
          </Grid>
        </Section>
      </Content>

      <Confirm
        open={confirmOpen}
        message={`¿Está seguro que desea eliminar el egreso de ${expense.category} por ${formatAmount(expense.amount)}? Esta acción no se puede deshacer.`}
        handleClose={closeDeleteConfirm}
        handleConfirm={handleDeleteExpense}
      />
    </Container>
  )
}

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 20px;
  background: #f5f5f5;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  @media only screen and (max-width: 768px) {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
`

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: white;
  border: 2px solid #8294C4;
  border-radius: 8px;
  color: #8294C4;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #8294C4;
    color: white;
  }
`

const Actions = styled.div`
  display: flex;
  gap: 10px;

  @media only screen and (max-width: 768px) {
    flex-direction: column;
  }
`

const EditButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #8294C4;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #637195;
  }
`

const DeleteButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #d32f2f;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #b71c1c;
  }
`

const Content = styled.div`
  background: white;
  border-radius: 10px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`

const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  font-size: 18px;
  color: #666;
`

const Title = styled.h1`
  color: #3764A0;
  font-size: 28px;
  margin: 0 0 30px 0;
`

const Section = styled.div`
  margin-bottom: 30px;
  padding-bottom: 30px;
  border-bottom: 1px solid #e0e0e0;

  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }
`

const SectionTitle = styled.h2`
  color: #8294C4;
  font-size: 20px;
  margin: 0 0 20px 0;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`

const FullWidthField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  grid-column: 1 / -1;
`

const Label = styled.div`
  font-size: 14px;
  color: #666;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const Value = styled.div`
  font-size: 16px;
  color: #333;
`

const ValueBlock = styled.div`
  font-size: 16px;
  color: #333;
  padding: 15px;
  background: #f9f9f9;
  border-radius: 5px;
  border-left: 3px solid #8294C4;
`

const AmountValue = styled.div`
  font-size: 24px;
  font-weight: bold;
  color: #8294C4;
`

const Email = styled.div`
  font-size: 14px;
  color: #888;
  font-style: italic;
  margin-top: 3px;
`

const DeletedInfo = styled.div`
  color: #DC8686;
  font-weight: 600;
`

const TypeBadge = styled.span<{ type: string }>`
  display: inline-block;
  padding: 6px 14px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  background: ${props => 
    props.type === 'operativo' ? '#B6E2A1' : 
    props.type === 'personal' ? '#EA906C' : '#F7A4A4'};
  color: ${props => 
    props.type === 'operativo' ? '#2d5016' : 
    props.type === 'personal' ? '#5c2d0f' : '#5c0f0f'};
`

const NotesBox = styled.div`
  padding: 20px;
  background: #fffbf0;
  border-radius: 8px;
  border: 1px solid #ffe082;
  color: #333;
  font-size: 16px;
  line-height: 1.6;
  white-space: pre-wrap;
`

const MonoValue = styled.div`
  font-size: 14px;
  color: #333;
  font-family: 'Courier New', monospace;
  background: #f5f5f5;
  padding: 10px;
  border-radius: 5px;
  word-break: break-all;
`
