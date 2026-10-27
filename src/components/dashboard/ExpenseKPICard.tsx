/**
 * Componente KPI de Egresos para Dashboard
 * EG09: Muestra el total de egresos del período seleccionado
 * con filtro por tipo de egreso (operativo, personal, otro negocio)
 */
'use client'
import React, { useState, useEffect, useRef } from 'react'
import styled from 'styled-components'
import { expenseService } from '@/services/expense.service'
import { trackDashboardExpenseKPIViewed } from '@/utils/analytics'
import { useSelector } from 'react-redux'
import { getUser } from '@/redux/userSlice'
import { MdAttachMoney, MdRefresh } from 'react-icons/md'
import { ExpenseType } from '@/interfaces/expense.interface'

interface Props {
  period: {
    from: string;  // YYYY-MM-DD
    to: string;    // YYYY-MM-DD
  };
}

type ExpenseTypeFilter = ExpenseType | ''

export default function ExpenseKPICard({ period }: Props) {
  const user = useSelector(getUser)
  const [selectedType, setSelectedType] = useState<ExpenseTypeFilter>('')
  const [data, setData] = useState<{ total: number; count?: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const analyticsTrackedRef = useRef<string | null>(null)

  useEffect(() => {
    fetchKPI()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period.from, period.to, selectedType])

  const fetchKPI = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await expenseService.getKPITotal({
        from: period.from,
        to: period.to,
        type: selectedType || undefined
      })

      // El backend puede retornar la data directamente o envuelta
      const kpiData = (response as any).data || response

      // Conversión si viene en centavos
      const total = kpiData.total || (kpiData.totalCents ? kpiData.totalCents / 100 : 0)
      const count = typeof kpiData.count === 'number' ? kpiData.count : undefined

      setData({ total, count })

      // Analytics
      const analyticsKey = `${period.from}_${period.to}_${selectedType || 'all'}`
      if (analyticsTrackedRef.current !== analyticsKey) {
        const tipoEgreso = selectedType 
          ? (selectedType === ExpenseType.OPERATIVO ? 'operativo' 
              : selectedType === ExpenseType.PERSONAL ? 'personal' 
              : 'otro_negocio')
          : 'todos'
        
        trackDashboardExpenseKPIViewed({
          usuario: user.nickname || 'unknown',
          periodo: period,
          tipo_egreso: tipoEgreso,
          monto_total: total
        })
        analyticsTrackedRef.current = analyticsKey
      }

    } catch (err: any) {
      console.error('Error fetching expense KPI:', err)
      if (err.response?.status === 403) {
        setError('No tiene permisos')
      } else if (err.response?.status === 400) {
        setError('Período inválido')
      } else {
        setError('Error al cargar datos')
      }
    } finally {
      setLoading(false)
    }
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const handleTypeChange = (type: ExpenseTypeFilter) => {
    setSelectedType(type)
  }

  const getTypeLabel = (type: ExpenseTypeFilter) => {
    switch (type) {
      case ExpenseType.OPERATIVO:
        return 'Operativo'
      case ExpenseType.PERSONAL:
        return 'Personal'
      case ExpenseType.OTRO_NEGOCIO:
        return 'Otro'
      default:
        return 'Todos'
    }
  }

  return (
    <Card>
      <Header>
        <IconWrapper>
          <MdAttachMoney size={24} color="#EA906C" />
        </IconWrapper>
        <Title>Egresos del Período</Title>
      </Header>

      <TypeTabs>
        <TypeTab $active={selectedType === ''} onClick={() => handleTypeChange('')}>
          Todos
        </TypeTab>
        <TypeTab $active={selectedType === ExpenseType.OPERATIVO} onClick={() => handleTypeChange(ExpenseType.OPERATIVO)}>
          Operativo
        </TypeTab>
        <TypeTab $active={selectedType === ExpenseType.PERSONAL} onClick={() => handleTypeChange(ExpenseType.PERSONAL)}>
          Personal
        </TypeTab>
        <TypeTab $active={selectedType === ExpenseType.OTRO_NEGOCIO} onClick={() => handleTypeChange(ExpenseType.OTRO_NEGOCIO)}>
          Otro
        </TypeTab>
      </TypeTabs>

      {loading && (
        <LoadingState>
          <Skeleton />
        </LoadingState>
      )}

      {!loading && error && (
        <ErrorState>
          <ErrorIcon>⚠️</ErrorIcon>
          <ErrorText>{error}</ErrorText>
          <RetryButton onClick={fetchKPI}>
            <MdRefresh size={18} />
            Reintentar
          </RetryButton>
        </ErrorState>
      )}

      {!loading && !error && data && (
        <AmountDisplay>
          <Amount>{formatAmount(data.total)}</Amount>
          {data.count !== undefined && (
            <SubText>
              {data.count} egreso{data.count !== 1 ? 's' : ''} • {getTypeLabel(selectedType)}
            </SubText>
          )}
        </AmountDisplay>
      )}
    </Card>
  )
}

// Styled Components
const Card = styled.div`
  background: white;
  border-radius: 10px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #EA906C;
  min-height: 220px;
  display: flex;
  flex-direction: column;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
`

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`

const Title = styled.h3`
  color: #3764A0;
  font-size: 16px;
  font-weight: 600;
  margin: 0;
`

const TypeTabs = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`

const TypeTab = styled.button<{ $active: boolean }>`
  padding: 6px 12px;
  border: 2px solid ${props => props.$active ? '#8294C4' : '#e0e0e0'};
  background: ${props => props.$active ? '#8294C4' : 'white'};
  color: ${props => props.$active ? 'white' : '#666'};
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: ${props => props.$active ? '600' : '400'};
  transition: all 0.2s;
  white-space: nowrap;
  
  &:hover {
    border-color: #8294C4;
  }

  @media (max-width: 768px) {
    flex: 1;
    min-width: calc(50% - 3px);
  }
`

const AmountDisplay = styled.div`
  text-align: center;
  padding: 20px 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
`

const Amount = styled.div`
  font-size: 32px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;

  @media (max-width: 768px) {
    font-size: 28px;
  }
`

const SubText = styled.div`
  font-size: 14px;
  color: #888;
`

const LoadingState = styled.div`
  padding: 40px 0;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`

const Skeleton = styled.div`
  width: 100%;
  height: 40px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 4px;
  
  @keyframes loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`

const ErrorState = styled.div`
  text-align: center;
  padding: 20px 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`

const ErrorIcon = styled.div`
  font-size: 32px;
  margin-bottom: 12px;
`

const ErrorText = styled.div`
  color: #d32f2f;
  font-size: 14px;
  margin-bottom: 16px;
`

const RetryButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: #8294C4;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
  
  &:hover {
    background: #637195;
  }
`
