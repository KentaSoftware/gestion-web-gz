/* eslint-disable react-hooks/exhaustive-deps */
'use client'
import React, { Suspense, useEffect, useState } from 'react'
import styled from 'styled-components'
import Button from '@/components/Button'
import { useAppDispatch } from '@/redux/hook'
import { useSelector } from 'react-redux'
import { getUser } from '@/redux/userSlice'
import useLocalStorage from '@/hooks/useLocalStorage'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { setLoading } from '@/redux/loadingSlice'
import { Expense, ExpenseType, PaymentMethod, PaginationMetadata, ExpensePermissions, ExpenseUser } from '@/interfaces/expense.interface'
import { expenseService } from '@/services/expense.service'
import { setExpenses, removeExpense } from '@/redux/expenseSlice'
import { setAlert } from '@/redux/alertSlice'
import { MdEdit, MdDelete, MdVisibility, MdSearch, MdFilterList, MdClose } from 'react-icons/md'
import Confirm from '@/components/Confirm'
import { trackExpenseDeleted, trackExpenseListViewed, trackFilterChange, trackExpenseSearch } from '@/utils/analytics'
import { usePermission } from '@/hooks/usePermission'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Permission } from '@/interfaces/auth.interface'

interface ExpenseFilters {
  page: number;
  limit: number;
  from: string;
  to: string;
  type: ExpenseType | '';
  category: string;
  paymentMethod: PaymentMethod | '';
  search: string;
  sort: string;
}

function ExpenseScreenContent() {
  const [valueStorage] = useLocalStorage("user", "")
  const router: AppRouterInstance = useRouter()
  const searchParams = useSearchParams()
  const dispatch = useAppDispatch()
  const user = useSelector(getUser)
  const { canCreateExpense, canUpdateExpense, canDeleteExpense } = usePermission()
  
  const [data, setData] = useState<Expense[]>([])
  const [pagination, setPagination] = useState<PaginationMetadata>({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1,
  })
  const [permissions, setPermissions] = useState<ExpensePermissions>({
    canEdit: true,
    canDelete: true,
  })
  const [filters, setFilters] = useState<ExpenseFilters>(getDefaultFilters())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null)
  const [dateError, setDateError] = useState<string>('')
  const [searchError, setSearchError] = useState<string>('')

  // Obtener filtros por defecto (mes actual)
  function getDefaultFilters(): ExpenseFilters {
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    return {
      page: 1,
      limit: 20,
      from: firstDayOfMonth.toISOString().split('T')[0],
      to: now.toISOString().split('T')[0],
      type: '',
      category: '',
      paymentMethod: '',
      search: '',
      sort: '-date'
    }
  }

  // Inicializar filtros desde URL al montar
  useEffect(() => {
    if (!valueStorage || !valueStorage.token) {
      router.push('/')
      return
    }

    const urlFilters = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      from: searchParams.get('from') || getDefaultFilters().from,
      to: searchParams.get('to') || getDefaultFilters().to,
      type: (searchParams.get('type') || '') as ExpenseType | '',
      category: searchParams.get('category') || '',
      paymentMethod: (searchParams.get('paymentMethod') || '') as PaymentMethod | '',
      search: searchParams.get('search') || '',
      sort: searchParams.get('sort') || '-date',
    }
    
    setFilters(urlFilters)
  }, [])

  // Actualizar URL cuando cambien filtros
  useEffect(() => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value.toString())
    })
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [filters])

  // Fetch egresos cuando cambien filtros
  useEffect(() => {
    if (valueStorage?.token && filters.from && filters.to) {
      fetchExpenses()
    }
  }, [filters])

  const fetchExpenses = async () => {
    try {
      dispatch(setLoading(true))
      
      const response = await expenseService.list({
        page: filters.page,
        limit: filters.limit,
        from: filters.from,
        to: filters.to,
        type: filters.type || undefined,
        category: filters.category || undefined,
        paymentMethod: filters.paymentMethod || undefined,
        search: filters.search || undefined,
        sort: filters.sort,
      })
      
      // Transformar amountCents a amount (pesos)
      const expensesWithAmount = response.expenses.map(expense => ({
        ...expense,
        amount: expense.amountCents / 100
      }))
      
      setData(expensesWithAmount)
      setPagination(response.pagination)
      setPermissions(response.permissions)
      dispatch(setExpenses({ expenses: expensesWithAmount, total: response.pagination.total }))
      
      // Analytics: Emitir evento de búsqueda si hay término activo (EG07)
      const trimmedSearch = filters.search.trim()
      if (trimmedSearch) {
        trackExpenseSearch({
          usuario: user.nickname || 'unknown',
          timestamp: Date.now(),
          termino: trimmedSearch,
          longitud: trimmedSearch.length,
          hay_resultados: response.pagination.total > 0
        })
      }
      
      // Analytics: Emitir evento de listado visto
      trackExpenseListViewed({
        usuario: user.nickname || 'unknown',
        timestamp: Date.now(),
        rango_fechas: {
          from: filters.from,
          to: filters.to,
        },
        filtros_aplicados: {
          type: filters.type || undefined,
          category: filters.category || undefined,
          paymentMethod: filters.paymentMethod || undefined,
          search: trimmedSearch || undefined,
        },
        pagination: response.pagination,
      })
      
    } catch (error: any) {
      console.error('Error al cargar egresos:', error)
      
      if (error.response?.status === 403) {
        dispatch(setAlert({ message: 'No tiene permisos para ver egresos', type: 'error' }))
        router.push('/home')
      } else if (error.response?.status === 400) {
        setSearchError('Búsqueda inválida. Debe tener entre 2 y 100 caracteres.')
        dispatch(setAlert({ message: 'Error en los filtros de búsqueda', type: 'error' }))
      } else {
        dispatch(setAlert({ message: 'Error al cargar los egresos', type: 'error' }))
      }
    } finally {
      dispatch(setLoading(false))
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)
  }

  const truncate = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const getUserName = (createdBy: ExpenseUser | string | any): string => {
    if (typeof createdBy === 'string') return 'Desconocido'
    return createdBy?.name || 'Desconocido'
  }

  const getExpenseId = (expense: Expense): string => {
    if (expense._id) {
      return typeof expense._id === 'object' ? expense._id.toString() : expense._id.toString()
    }
    return (expense as any).id?.toString() || ''
  }

  const openDeleteConfirm = (expense: Expense) => {
    setExpenseToDelete(expense)
    setConfirmOpen(true)
  }

  const closeDeleteConfirm = () => {
    setConfirmOpen(false)
    setExpenseToDelete(null)
  }

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return

    try {
      dispatch(setLoading(true))
      const expenseId = getExpenseId(expenseToDelete)
      await expenseService.delete(expenseId)
      
      dispatch(removeExpense(expenseId))
      
      // Si se elimina y queda la página vacía, ir a la anterior
      const remainingItems = pagination.total - 1
      const remainingPages = Math.ceil(remainingItems / filters.limit)
      
      if (filters.page > remainingPages && remainingPages > 0) {
        setFilters({ ...filters, page: remainingPages })
      } else {
        fetchExpenses()
      }
      
      trackExpenseDeleted({
        usuario: user.nickname || 'unknown',
        timestamp: Date.now(),
        id_egreso: getExpenseId(expenseToDelete),
        monto: expenseToDelete.amount,
        tipo_egreso: expenseToDelete.type,
        categoria: expenseToDelete.category,
        medio_pago: expenseToDelete.paymentMethod,
      })
      
      dispatch(setAlert({ message: 'Egreso eliminado exitosamente', type: 'success' }))
      closeDeleteConfirm()
    } catch (error: any) {
      console.error('Error al eliminar egreso:', error)
      
      if (error.response?.status === 403) {
        dispatch(setAlert({ message: 'No tiene permisos para eliminar egresos', type: 'error' }))
      } else if (error.response?.status === 404) {
        dispatch(setAlert({ message: 'El egreso no existe o ya fue eliminado', type: 'error' }))
      } else {
        dispatch(setAlert({ message: 'Error al eliminar el egreso', type: 'error' }))
      }
    } finally {
      dispatch(setLoading(false))
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.pages) return
    setFilters({ ...filters, page: newPage })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleLimitChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = parseInt(event.target.value)
    setFilters({ ...filters, limit: newLimit, page: 1 })
  }

  const applyFilters = () => {
    // Validar que 'from' no sea posterior a 'to'
    const fromDate = new Date(filters.from)
    const toDate = new Date(filters.to)
    
    if (fromDate > toDate) {
      setDateError('La fecha "Desde" no puede ser posterior a la fecha "Hasta"')
      return
    }
    
    // Validar búsqueda (EG07)
    const trimmedSearch = filters.search.trim()
    
    if (trimmedSearch && trimmedSearch.length < 2) {
      setSearchError('La búsqueda debe tener al menos 2 caracteres')
      return
    }
    
    if (trimmedSearch && trimmedSearch.length > 100) {
      setSearchError('La búsqueda no puede exceder 100 caracteres')
      return
    }
    
    setDateError('')
    setSearchError('')
    setFilters({ ...filters, page: 1 })
    
    // Analytics: Emitir evento de cambio de filtro manual (EG06 completo)
    // Construir descripción de filtros aplicados
    const filtrosActivos: string[] = []
    if (filters.type) filtrosActivos.push(`tipo:${filters.type}`)
    if (filters.category) filtrosActivos.push(`categoría:${filters.category}`)
    if (filters.paymentMethod) filtrosActivos.push(`pago:${filters.paymentMethod}`)
    if (trimmedSearch) filtrosActivos.push(`búsqueda:${trimmedSearch}`)
    
    trackFilterChange(
      'manual',
      filtrosActivos.length > 0 
        ? `Filtros aplicados (${filtrosActivos.join(', ')})`
        : 'Filtro personalizado',
      {
        from: filters.from,
        to: filters.to,
      },
      user.nickname || 'unknown'
    )
  }

  const clearFilters = () => {
    setFilters(getDefaultFilters())
    setActiveQuickFilter(null)
    setDateError('')
    setSearchError('')
  }

  // Calcular cantidad de filtros activos (EG06 - UX)
  const getActiveFiltersCount = (): number => {
    return [
      filters.type,
      filters.category,
      filters.paymentMethod,
      filters.search.trim()
    ].filter(Boolean).length
  }

  // Remover filtro individual (EG06 - UX)
  const removeFilter = (filterKey: keyof ExpenseFilters) => {
    const newFilters = { ...filters, [filterKey]: '', page: 1 }
    setFilters(newFilters)
  }

  const setQuickFilter = (type: 'today' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'last7Days' | 'last30Days') => {
    const now = new Date()
    let from = ''
    let to = now.toISOString().split('T')[0]
    let label = ''

    switch (type) {
      case 'today':
        from = to
        label = 'Hoy'
        break
      case 'thisWeek':
        const firstDayOfWeek = new Date(now)
        const dayOfWeek = now.getDay()
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Lunes es el primer día
        firstDayOfWeek.setDate(now.getDate() + diff)
        from = firstDayOfWeek.toISOString().split('T')[0]
        label = 'Esta semana'
        break
      case 'thisMonth':
        from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        label = 'Este mes'
        break
      case 'lastMonth':
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
        to = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
        label = 'Mes anterior'
        break
      case 'thisYear':
        from = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
        label = 'Este año'
        break
      case 'last7Days':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        label = 'Últimos 7 días'
        break
      case 'last30Days':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        label = 'Últimos 30 días'
        break
    }

    setDateError('')
    setActiveQuickFilter(type)
    setFilters({ ...filters, from, to, page: 1 })
    
    // Analytics: Emitir evento de cambio de filtro rápido
    trackFilterChange(
      'quick_filter',
      label,
      { from, to },
      user.nickname || 'unknown'
    )
  }

  return (
    <Container>
      <Header>
        <Title>Egresos</Title>
        <HeaderActions>
          <FilterToggleButton onClick={() => setShowFilters(!showFilters)}>
            <MdFilterList size={20} />
            {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
            {getActiveFiltersCount() > 0 && (
              <FilterBadge>{getActiveFiltersCount()}</FilterBadge>
            )}
          </FilterToggleButton>
          {canCreateExpense && (
            <Button text="Nuevo Egreso" onClick={() => {}} to="/expense/newExpense" />
          )}
        </HeaderActions>
      </Header>

      {/* Chips de filtros activos (EG06 - UX) */}
      {(filters.type || filters.category || filters.paymentMethod || filters.search.trim()) && (
        <ActiveFiltersRow>
          <ActiveFiltersLabel>Filtros activos:</ActiveFiltersLabel>
          {filters.type && (
            <ActiveFilterChip>
              Tipo: {filters.type === 'operativo' ? 'Operativo' : filters.type === 'personal' ? 'Personal' : 'Otro Negocio'}
              <MdClose 
                size={16} 
                onClick={() => removeFilter('type')} 
                style={{ cursor: 'pointer', marginLeft: '6px' }}
              />
            </ActiveFilterChip>
          )}
          {filters.category && (
            <ActiveFilterChip>
              Categoría: {filters.category}
              <MdClose 
                size={16} 
                onClick={() => removeFilter('category')} 
                style={{ cursor: 'pointer', marginLeft: '6px' }}
              />
            </ActiveFilterChip>
          )}
          {filters.paymentMethod && (
            <ActiveFilterChip>
              Pago: {filters.paymentMethod}
              <MdClose 
                size={16} 
                onClick={() => removeFilter('paymentMethod')} 
                style={{ cursor: 'pointer', marginLeft: '6px' }}
              />
            </ActiveFilterChip>
          )}
          {filters.search.trim() && (
            <ActiveFilterChip>
              Búsqueda: &quot;{filters.search.trim()}&quot;
              <MdClose 
                size={16} 
                onClick={() => removeFilter('search')} 
                style={{ cursor: 'pointer', marginLeft: '6px' }}
              />
            </ActiveFilterChip>
          )}
        </ActiveFiltersRow>
      )}

      {showFilters && (
        <FiltersCard>
          <FilterSection>
            <FilterLabel>Rango de Fechas</FilterLabel>
            <FilterRow>
              <DateInput $hasError={!!dateError}>
                <label>Desde</label>
                <input 
                  type="date" 
                  value={filters.from} 
                  onChange={(e) => {
                    setFilters({ ...filters, from: e.target.value })
                    setActiveQuickFilter(null)
                    setDateError('')
                  }}
                />
              </DateInput>
              <DateInput $hasError={!!dateError}>
                <label>Hasta</label>
                <input 
                  type="date" 
                  value={filters.to} 
                  onChange={(e) => {
                    setFilters({ ...filters, to: e.target.value })
                    setActiveQuickFilter(null)
                    setDateError('')
                  }}
                />
              </DateInput>
            </FilterRow>
            {dateError && <ErrorText>{dateError}</ErrorText>}
            <QuickFilters>
              <Chip $active={activeQuickFilter === 'today'} onClick={() => setQuickFilter('today')}>Hoy</Chip>
              <Chip $active={activeQuickFilter === 'thisWeek'} onClick={() => setQuickFilter('thisWeek')}>Esta semana</Chip>
              <Chip $active={activeQuickFilter === 'thisMonth'} onClick={() => setQuickFilter('thisMonth')}>Este mes</Chip>
              <Chip $active={activeQuickFilter === 'lastMonth'} onClick={() => setQuickFilter('lastMonth')}>Mes anterior</Chip>
              <Chip $active={activeQuickFilter === 'last7Days'} onClick={() => setQuickFilter('last7Days')}>Últimos 7 días</Chip>
              <Chip $active={activeQuickFilter === 'last30Days'} onClick={() => setQuickFilter('last30Days')}>Últimos 30 días</Chip>
              <Chip $active={activeQuickFilter === 'thisYear'} onClick={() => setQuickFilter('thisYear')}>Este año</Chip>
            </QuickFilters>
          </FilterSection>

          <FilterSection>
            <FilterLabel>Búsqueda y Filtros</FilterLabel>
            <FilterRow>
              <SearchInputWrapper $hasError={!!searchError}>
                <MdSearch size={20} />
                <input
                  type="text"
                  placeholder="Buscar en descripción..."
                  value={filters.search}
                  onChange={(e) => {
                    setFilters({ ...filters, search: e.target.value })
                    if (searchError) setSearchError('')
                  }}
                />
              </SearchInputWrapper>
              {searchError && <ErrorText>{searchError}</ErrorText>}
              
              <SelectInput>
                <label>Tipo</label>
                <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value as ExpenseType | '' })}>
                  <option value="">Todos</option>
                  <option value="operativo">Operativo</option>
                  <option value="personal">Personal</option>
                  <option value="otro_negocio">Otro Negocio</option>
                </select>
              </SelectInput>
              
              <SelectInput>
                <label>Medio de Pago</label>
                <select value={filters.paymentMethod} onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value as PaymentMethod | '' })}>
                  <option value="">Todos</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="cheque">Cheque</option>
                  <option value="otro">Otro</option>
                </select>
              </SelectInput>
              
              <TextInput>
                <label>Categoría</label>
                <input
                  type="text"
                  placeholder="Filtrar por categoría..."
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                />
              </TextInput>
            </FilterRow>
            
            <FilterActions>
              <ClearButton onClick={clearFilters}>Limpiar</ClearButton>
              <ApplyButton onClick={applyFilters}>Aplicar</ApplyButton>
            </FilterActions>
          </FilterSection>
        </FiltersCard>
      )}

      <Content>
        <Stats>
          <StatCard>
            <StatLabel>Total de Egresos</StatLabel>
            <StatValue>{pagination.total}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Monto Total</StatLabel>
            <StatValue>
              {formatAmount(data.reduce((sum, exp) => sum + exp.amount, 0))}
            </StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Página</StatLabel>
            <StatValue>{pagination.page} / {pagination.pages}</StatValue>
          </StatCard>
        </Stats>

        {data.length === 0 ? (
          <EmptyState>
            <EmptyIcon>{filters.search.trim() ? '🔍' : '📋'}</EmptyIcon>
            <EmptyText>
              {filters.search.trim() 
                ? `No se encontraron egresos con "${filters.search.trim()}"`
                : 'No hay egresos en el período seleccionado'
              }
            </EmptyText>
            <EmptySubText>
              {filters.search.trim()
                ? 'Intenta con otro término de búsqueda o limpia los filtros'
                : 'Intenta ajustar los filtros o crear un nuevo egreso'
              }
            </EmptySubText>
          </EmptyState>
        ) : (
          <>
            <TableContainer>
              <Table>
                <thead>
                  <tr>
                    <Th>Fecha</Th>
                    <Th>Descripción</Th>
                    <Th>Categoría</Th>
                    <Th>Tipo</Th>
                    <Th>Monto</Th>
                    <Th>Medio de Pago</Th>
                    <Th>Usuario</Th>
                    <Th>Acciones</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((expense) => (
                    <tr key={getExpenseId(expense)}>
                      <Td>{formatDate(expense.date)}</Td>
                      <Td>
                        <Description title={expense.description || 'Sin descripción'}>
                          {truncate(expense.description || 'Sin descripción', 50)}
                        </Description>
                      </Td>
                      <Td>{expense.category}</Td>
                      <Td>
                        <TypeBadge type={expense.type}>
                          {expense.type === 'operativo' ? 'Operativo' : 
                           expense.type === 'personal' ? 'Personal' : 'Otro Negocio'}
                        </TypeBadge>
                      </Td>
                      <Td><Amount>{formatAmount(expense.amount)}</Amount></Td>
                      <Td>{expense.paymentMethod}</Td>
                      <Td>
                        <UserInfo>
                          <UserName>{getUserName(expense.createdBy)}</UserName>
                        </UserInfo>
                      </Td>
                      <Td>
                        <ActionContainer>
                          <ActionButton 
                            onClick={() => router.push(`/expense/${getExpenseId(expense)}`)}
                            title="Ver detalle"
                          >
                            <MdVisibility size={18} />
                          </ActionButton>
                          {canUpdateExpense && (
                            <ActionButton 
                              onClick={() => router.push(`/expense/${getExpenseId(expense)}/edit`)}
                              title="Editar"
                            >
                              <MdEdit size={18} />
                            </ActionButton>
                          )}
                          {canDeleteExpense && (
                            <ActionButton 
                              onClick={() => openDeleteConfirm(expense)} 
                              $variant="danger"
                              title="Eliminar"
                            >
                              <MdDelete size={18} />
                            </ActionButton>
                          )}
                        </ActionContainer>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableContainer>

            <PaginationContainer>
              <PaginationInfo>
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} egresos
              </PaginationInfo>
              
              <PaginationControls>
                <PaginationButton 
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  ← Anterior
                </PaginationButton>
                
                <PageInfo>Página {pagination.page} de {pagination.pages}</PageInfo>
                
                <PaginationButton 
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                >
                  Siguiente →
                </PaginationButton>
              </PaginationControls>
              
              <LimitSelector>
                Mostrar: 
                <select value={filters.limit} onChange={handleLimitChange}>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                por página
              </LimitSelector>
            </PaginationContainer>
          </>
        )}
      </Content>

      <Confirm
        open={confirmOpen}
        message={`¿Está seguro que desea eliminar el egreso de ${expenseToDelete?.category || ''} por ${formatAmount(expenseToDelete?.amount ?? 0)}? Esta acción no se puede deshacer.`}
        handleClose={closeDeleteConfirm}
        handleConfirm={handleDeleteExpense}
      />
    </Container>
  )
}

export default function ExpenseScreen() {
  return (
    <ProtectedRoute
      requiredPermission={Permission.READ_EXPENSE}
      deniedMessage="No tienes permisos para ver egresos. Contacta a tu administrador si necesitas acceso."
    >
      <Suspense fallback={
        <LoadingContainer>
          <LoadingText>Cargando egresos...</LoadingText>
        </LoadingContainer>
      }>
        <ExpenseScreenContent />
      </Suspense>
    </ProtectedRoute>
  )
}

// Styled Components
const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f5f5f5;
`

const LoadingText = styled.div`
  font-size: 16px;
  color: #666;
`

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

const HeaderActions = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;

  @media only screen and (max-width: 768px) {
    flex-direction: column;
  }
`

const Title = styled.h1`
  color: #3764A0;
  font-size: 32px;
  margin: 0;
`

const FilterToggleButton = styled.button`
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
  position: relative;

  &:hover {
    background: #8294C4;
    color: white;
  }
`

const FilterBadge = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: #EA906C;
  color: white;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  margin-left: 4px;
`

const ActiveFiltersRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
  flex-wrap: wrap;
`

const ActiveFiltersLabel = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #666;
`

const ActiveFilterChip = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #8294C4;
  color: white;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: #637195;
  }

  svg {
    transition: transform 0.2s;

    &:hover {
      transform: scale(1.2);
    }
  }
`

const FiltersCard = styled.div`
  background: white;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`

const FilterSection = styled.div`
  margin-bottom: 20px;

  &:last-child {
    margin-bottom: 0;
  }
`

const FilterLabel = styled.h3`
  color: #3764A0;
  font-size: 16px;
  margin: 0 0 15px 0;
`

const FilterRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 15px;
`

const DateInput = styled.div<{ $hasError?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 5px;

  label {
    font-size: 14px;
    color: ${props => props.$hasError ? '#d32f2f' : '#666'};
    font-weight: 500;
  }

  input {
    padding: 10px;
    border: 1px solid ${props => props.$hasError ? '#d32f2f' : '#B4B4B8'};
    border-radius: 5px;
    font-size: 14px;
    transition: border-color 0.2s;

    &:focus {
      outline: none;
      border-color: ${props => props.$hasError ? '#d32f2f' : '#8294C4'};
    }
  }
`

const SearchInputWrapper = styled.div<{ $hasError?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid ${props => props.$hasError ? '#d32f2f' : '#B4B4B8'};
  border-radius: 5px;
  background: white;
  transition: border-color 0.2s;

  &:focus-within {
    border-color: ${props => props.$hasError ? '#d32f2f' : '#8294C4'};
  }

  svg {
    color: ${props => props.$hasError ? '#d32f2f' : '#666'};
  }

  input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 14px;
  }
`

const SelectInput = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;

  label {
    font-size: 14px;
    color: #666;
    font-weight: 500;
  }

  select {
    padding: 10px;
    border: 1px solid #B4B4B8;
    border-radius: 5px;
    font-size: 14px;
    cursor: pointer;
    transition: border-color 0.2s;

    &:focus {
      outline: none;
      border-color: #8294C4;
    }
  }
`

const TextInput = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;

  label {
    font-size: 14px;
    color: #666;
    font-weight: 500;
  }

  input {
    padding: 10px;
    border: 1px solid #B4B4B8;
    border-radius: 5px;
    font-size: 14px;
    transition: border-color 0.2s;

    &:focus {
      outline: none;
      border-color: #8294C4;
    }
  }
`

const QuickFilters = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
`

const ErrorText = styled.div`
  color: #d32f2f;
  font-size: 13px;
  margin-top: 8px;
  font-weight: 500;
`

const Chip = styled.button<{ $active?: boolean }>`
  padding: 6px 12px;
  background: ${props => props.$active ? '#8294C4' : '#f0f0f0'};
  border: 1px solid ${props => props.$active ? '#8294C4' : '#ddd'};
  border-radius: 16px;
  font-size: 13px;
  color: ${props => props.$active ? 'white' : '#666'};
  cursor: pointer;
  transition: all 0.2s;
  font-weight: ${props => props.$active ? '600' : '400'};

  &:hover {
    background: #8294C4;
    color: white;
    border-color: #8294C4;
  }
`

const FilterActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 15px;
`

const ClearButton = styled.button`
  padding: 10px 20px;
  background: #f0f0f0;
  border: none;
  border-radius: 5px;
  color: #666;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #e0e0e0;
  }
`

const ApplyButton = styled.button`
  padding: 10px 20px;
  background: #8294C4;
  border: none;
  border-radius: 5px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #637195;
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
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
`

const EmptyIcon = styled.div`
  font-size: 64px;
  margin-bottom: 20px;
`

const EmptyText = styled.h2`
  color: #666;
  font-size: 24px;
  margin-bottom: 10px;
  text-align: center;
`

const EmptySubText = styled.p`
  color: #999;
  font-size: 16px;
  text-align: center;
`

const Stats = styled.div`
  display: flex;
  gap: 20px;
  margin-bottom: 30px;

  @media only screen and (max-width: 768px) {
    flex-direction: column;
  }
`

const StatCard = styled.div`
  flex: 1;
  background: linear-gradient(135deg, #8294C4 0%, #637195 100%);
  padding: 20px;
  border-radius: 10px;
  color: white;
`

const StatLabel = styled.div`
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 8px;
`

const StatValue = styled.div`
  font-size: 28px;
  font-weight: bold;
`

const TableContainer = styled.div`
  overflow-x: auto;
  margin-bottom: 20px;
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`

const Th = styled.th`
  text-align: left;
  padding: 12px;
  border-bottom: 2px solid #e0e0e0;
  color: #666;
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
`

const Td = styled.td`
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
`

const Description = styled.span`
  display: block;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const TypeBadge = styled.span<{ type: string }>`
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  background: ${props => 
    props.type === 'operativo' ? '#B6E2A1' : 
    props.type === 'personal' ? '#EA906C' : '#F7A4A4'};
  color: ${props => 
    props.type === 'operativo' ? '#2d5016' : 
    props.type === 'personal' ? '#5c2d0f' : '#5c0f0f'};
`

const Amount = styled.span`
  font-weight: 600;
  color: #8294C4;
  white-space: nowrap;
`

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
`

const UserName = styled.div`
  font-size: 14px;
  color: #333;
`

const ActionContainer = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: nowrap;
`

const ActionButton = styled.button<{ $variant?: 'danger' }>`
  background: transparent;
  border: none;
  color: ${props => props.$variant === 'danger' ? '#d32f2f' : '#8294C4'};
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.$variant === 'danger' ? '#ffebee' : '#f0f0f0'};
    color: ${props => props.$variant === 'danger' ? '#b71c1c' : '#637195'};
  }

  &:active {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const PaginationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  gap: 20px;

  @media only screen and (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`

const PaginationInfo = styled.div`
  font-size: 14px;
  color: #666;
`

const PaginationControls = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
`

const PaginationButton = styled.button`
  padding: 8px 16px;
  background: #8294C4;
  border: none;
  border-radius: 5px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #637195;
  }

  &:disabled {
    background: #e0e0e0;
    color: #999;
    cursor: not-allowed;
  }
`

const PageInfo = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #333;
`

const LimitSelector = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;

  select {
    padding: 5px 10px;
    border: 1px solid #B4B4B8;
    border-radius: 5px;
    font-size: 14px;
    cursor: pointer;

    &:focus {
      outline: none;
      border-color: #8294C4;
    }
  }
`
