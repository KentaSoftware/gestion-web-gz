/* eslint-disable react-hooks/exhaustive-deps */
'use client'
import { Suspense, useEffect, useState, type ChangeEvent } from 'react'
import Button from '@/components/Button'
import { useAppDispatch } from '@/redux/hook'
import { useSelector } from 'react-redux'
import { getUser } from '@/redux/userSlice'
import useLocalStorage from '@/hooks/useLocalStorage'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { setLoading } from '@/redux/loadingSlice'
import { Expense, ExpenseType, PaymentMethod, PaginationMetadata, ExpenseUser, ListExpensesParams } from '@/interfaces/expense.interface'
import { expenseService } from '@/services/expense.service'
import { setExpenses, removeExpense } from '@/redux/expenseSlice'
import { toast } from "sonner";
import { Pencil, Trash2, Eye, Search, Filter, X } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import Confirm from '@/components/Confirm'
import { trackExpenseDeleted, trackExpenseListViewed, trackFilterChange, trackExpenseSearch } from '@/utils/analytics'
import { usePermission } from '@/hooks/usePermission'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Permission } from '@/interfaces/auth.interface'
import { cn } from '@/lib/cn'
import { PageContainer, PageHeader } from '@/components/layout/PageLayout'
import DataTable from '@/components/DataTable'
import type { DataColumn } from '@/components/DataTable'

const inputBaseClass = 'w-full rounded-md border border-border-subtle bg-surface-base px-2.5 py-2.5 text-label text-text-primary transition-colors focus:border-brand-primary focus:outline-none'

const dateInputClass = 'w-full rounded-sm border border-border-strong bg-surface-base px-3 py-2 text-label text-text-primary transition-colors duration-[120ms] focus:border-border-interactive focus:outline-none'

const getTypeBadgeClass = (type: string) => cn(
  'whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold',
  type === 'operativo' && 'bg-state-success/10 text-state-success',
  type === 'personal' && 'bg-state-warning/10 text-state-warning',
  type !== 'operativo' && type !== 'personal' && 'bg-state-error/10 text-state-error'
)

const getQuickFilterClass = (active: boolean) => cn(
  'rounded-2xl border px-3 py-1.5 text-[13px] transition-colors',
  active
    ? 'border-brand-primary bg-brand-primary font-semibold text-text-inverse'
    : 'border-border-subtle bg-background-subtle text-text-secondary hover:border-brand-primary hover:bg-brand-primary hover:text-text-inverse'
)

const ACTION_VARIANT = {
  DANGER: 'danger',
} as const

type ActionVariant = (typeof ACTION_VARIANT)[keyof typeof ACTION_VARIANT]

const getActionButtonClass = (variant?: ActionVariant) => cn(
  'flex items-center justify-center rounded-md bg-transparent px-2.5 py-1.5 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus',
  variant === ACTION_VARIANT.DANGER
    ? 'text-state-error hover:bg-state-error/10'
    : 'text-brand-primary hover:bg-background-subtle'
)

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

const buildExpenseListParams = (filters: ExpenseFilters): ListExpensesParams => ({
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

const buildExpenseQueryParams = (filters: ExpenseFilters): URLSearchParams => {
  const params = new URLSearchParams()
  const payload = buildExpenseListParams(filters)

  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value))
    }
  })

  return params
}

// ---------------------------------------------------------------------------
// Pure helpers — declared at module level (no hooks, no component state)
// ---------------------------------------------------------------------------

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const formatAmount = (amount: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)

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

// ---------------------------------------------------------------------------
// Column definitions — module level, uses only pure helpers above
// ---------------------------------------------------------------------------

const expenseColumns: DataColumn<Expense>[] = [
  {
    key: 'date',
    header: 'Fecha',
    width: '120px',
    render: (v) => formatDate(v as string),
  },
  {
    key: 'description',
    header: 'Descripcion',
    width: '220px',
    render: (v) => (
      <span
        className="block max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap"
        title={String(v ?? 'Sin descripción')}
      >
        {truncate(String(v ?? 'Sin descripción'), 50)}
      </span>
    ),
  },
  {
    key: 'category',
    header: 'Categoria',
    width: '150px',
  },
  {
    key: 'type',
    header: 'Tipo',
    width: '130px',
    render: (v) => (
      <span className={getTypeBadgeClass(String(v))}>
        {v === 'operativo' ? 'Operativo' : v === 'personal' ? 'Personal' : 'Otro Negocio'}
      </span>
    ),
  },
  {
    key: 'amount',
    header: 'Monto',
    width: '140px',
    render: (v) => (
      <span className="whitespace-nowrap font-semibold text-brand-primary">
        {formatAmount(v as number)}
      </span>
    ),
  },
  {
    key: 'paymentMethod',
    header: 'Medio de Pago',
    width: '160px',
  },
  {
    key: 'createdBy',
    header: 'Usuario',
    width: '160px',
    render: (v) => (
      <div className="flex flex-col">
        <div className="text-label text-text-primary">{getUserName(v)}</div>
      </div>
    ),
  },
]

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
    const params = buildExpenseQueryParams(filters)
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
      
      const response = await expenseService.list(buildExpenseListParams(filters))
      
      // Transformar amountCents a amount (pesos)
      const expensesWithAmount = response.expenses.map(expense => ({
        ...expense,
        amount: expense.amountCents / 100
      }))
      
      setData(expensesWithAmount)
      setPagination(response.pagination)
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
        toast.error('No tiene permisos para ver egresos')
        router.push('/home')
      } else if (error.response?.status === 400) {
        setSearchError('Búsqueda inválida. Debe tener entre 2 y 100 caracteres.')
        toast.error('Error en los filtros de búsqueda')
      } else {
        toast.error('Error al cargar los egresos')
      }
    } finally {
      dispatch(setLoading(false))
    }
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
      
      toast.success('Egreso eliminado exitosamente')
      closeDeleteConfirm()
    } catch (error: any) {
      console.error('Error al eliminar egreso:', error)
      
      if (error.response?.status === 403) {
        toast.error('No tiene permisos para eliminar egresos')
      } else if (error.response?.status === 404) {
        toast.error('El egreso no existe o ya fue eliminado')
      } else {
        toast.error('Error al eliminar el egreso')
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

  const handleLimitChange = (event: ChangeEvent<HTMLSelectElement>) => {
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
    <PageContainer>
      <PageHeader
        title="Egresos"
        actions={
          <div className="flex items-center gap-2.5 max-md:flex-col">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="relative flex items-center gap-2 rounded-md border border-border-interactive bg-transparent px-5 py-2.5 text-label font-semibold text-brand-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus hover:bg-background-subtle"
            >
              <Filter size={20} aria-hidden="true" />
              {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
              {getActiveFiltersCount() > 0 && (
                <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-state-warning px-1.5 text-[11px] font-bold text-text-inverse">
                  {getActiveFiltersCount()}
                </span>
              )}
            </button>
            {canCreateExpense && (
              <Button text="Nuevo Egreso" onClick={() => {}} to="/expense/newExpense" />
            )}
          </div>
        }
      />

      {/* Chips de filtros activos (EG06 - UX) */}
      {(filters.type || filters.category || filters.paymentMethod || filters.search.trim()) && (
        <div className="mb-5 flex flex-wrap items-center gap-2.5 rounded-lg bg-background-subtle px-4 py-3">
          <span className="text-[13px] font-semibold text-text-secondary">Filtros activos:</span>
          {filters.type && (
            <div className="flex items-center gap-1 rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-[13px] font-medium text-brand-primary">
              Tipo: {filters.type === 'operativo' ? 'Operativo' : filters.type === 'personal' ? 'Personal' : 'Otro Negocio'}
              <button
                type="button"
                onClick={() => removeFilter('type')}
                aria-label="Eliminar filtro de tipo"
                className="ml-1 flex items-center rounded-full transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          )}
          {filters.category && (
            <div className="flex items-center gap-1 rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-[13px] font-medium text-brand-primary">
              Categoría: {filters.category}
              <button
                type="button"
                onClick={() => removeFilter('category')}
                aria-label="Eliminar filtro de categoría"
                className="ml-1 flex items-center rounded-full transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          )}
          {filters.paymentMethod && (
            <div className="flex items-center gap-1 rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-[13px] font-medium text-brand-primary">
              Pago: {filters.paymentMethod}
              <button
                type="button"
                onClick={() => removeFilter('paymentMethod')}
                aria-label="Eliminar filtro de medio de pago"
                className="ml-1 flex items-center rounded-full transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          )}
          {filters.search.trim() && (
            <div className="flex items-center gap-1 rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-[13px] font-medium text-brand-primary">
              Búsqueda: &quot;{filters.search.trim()}&quot;
              <button
                type="button"
                onClick={() => removeFilter('search')}
                aria-label="Eliminar filtro de búsqueda"
                className="ml-1 flex items-center rounded-full transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}

      {showFilters && (
        <div className="mb-5 rounded-lg border border-border-subtle bg-surface-base p-5 shadow-md">
          <div className="mb-5 last:mb-0">
            <h3 className="mb-4 mt-0 text-base font-semibold text-brand-primary">Rango de Fechas</h3>
            <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
              <div className="flex flex-col gap-1">
                <label className={cn('text-label font-medium', dateError ? 'text-state-error' : 'text-text-secondary')}>Desde</label>
                <input 
                  type="date" 
                  value={filters.from} 
                  onChange={(e) => {
                    setFilters({ ...filters, from: e.target.value })
                    setActiveQuickFilter(null)
                    setDateError('')
                  }}
                  className={cn(dateInputClass, dateError && 'border-state-error focus:border-state-error')}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={cn('text-label font-medium', dateError ? 'text-state-error' : 'text-text-secondary')}>Hasta</label>
                <input 
                  type="date" 
                  value={filters.to} 
                  onChange={(e) => {
                    setFilters({ ...filters, to: e.target.value })
                    setActiveQuickFilter(null)
                    setDateError('')
                  }}
                  className={cn(dateInputClass, dateError && 'border-state-error focus:border-state-error')}
                />
              </div>
            </div>
            {dateError && <div className="mt-2 text-[13px] font-medium text-state-error">{dateError}</div>}
            <div className="mt-2.5 flex flex-wrap gap-2.5">
              <button type="button" className={getQuickFilterClass(activeQuickFilter === 'today')} onClick={() => setQuickFilter('today')}>Hoy</button>
              <button type="button" className={getQuickFilterClass(activeQuickFilter === 'thisWeek')} onClick={() => setQuickFilter('thisWeek')}>Esta semana</button>
              <button type="button" className={getQuickFilterClass(activeQuickFilter === 'thisMonth')} onClick={() => setQuickFilter('thisMonth')}>Este mes</button>
              <button type="button" className={getQuickFilterClass(activeQuickFilter === 'lastMonth')} onClick={() => setQuickFilter('lastMonth')}>Mes anterior</button>
              <button type="button" className={getQuickFilterClass(activeQuickFilter === 'last7Days')} onClick={() => setQuickFilter('last7Days')}>Últimos 7 días</button>
              <button type="button" className={getQuickFilterClass(activeQuickFilter === 'last30Days')} onClick={() => setQuickFilter('last30Days')}>Últimos 30 días</button>
              <button type="button" className={getQuickFilterClass(activeQuickFilter === 'thisYear')} onClick={() => setQuickFilter('thisYear')}>Este año</button>
            </div>
          </div>

          <div className="mb-0">
            <h3 className="mb-4 mt-0 text-base font-semibold text-brand-primary">Búsqueda y Filtros</h3>
            <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
              <div className={cn('flex items-center gap-2.5 rounded-md border border-border-subtle bg-surface-base p-2.5 transition-colors focus-within:border-brand-primary', searchError && 'border-state-error focus-within:border-state-error')}>
                <Search size={20} className={cn(searchError ? 'text-state-error' : 'text-text-secondary')} aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Buscar en descripción..."
                  value={filters.search}
                  onChange={(e) => {
                    setFilters({ ...filters, search: e.target.value })
                    if (searchError) setSearchError('')
                  }}
                  className="min-w-0 flex-1 border-0 bg-transparent text-label text-text-primary outline-none"
                />
              </div>
              {searchError && <div className="mt-2 text-[13px] font-medium text-state-error">{searchError}</div>}
               
              <div className="flex flex-col gap-1">
                <label className="text-label font-medium text-text-secondary">Tipo</label>
                <select className={inputBaseClass} value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value as ExpenseType | '' })}>
                  <option value="">Todos</option>
                  <option value="operativo">Operativo</option>
                  <option value="personal">Personal</option>
                  <option value="otro_negocio">Otro Negocio</option>
                </select>
              </div>
               
              <div className="flex flex-col gap-1">
                <label className="text-label font-medium text-text-secondary">Medio de Pago</label>
                <select className={inputBaseClass} value={filters.paymentMethod} onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value as PaymentMethod | '' })}>
                  <option value="">Todos</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="cheque">Cheque</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
               
              <div className="flex flex-col gap-1">
                <label className="text-label font-medium text-text-secondary">Categoría</label>
                <input
                  type="text"
                  placeholder="Filtrar por categoría..."
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className={inputBaseClass}
                />
              </div>
            </div>
            
            <div className="mt-4 flex justify-end gap-2.5">
              <Button text="Limpiar" variant="ghost" onClick={clearFilters} size="sm" />
              <Button text="Aplicar" variant="primary" onClick={applyFilters} size="sm" />
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border-subtle bg-surface-base p-6 shadow-md">
        <div className="mb-6 flex gap-5 max-md:flex-col">
          <div className="flex-1 rounded-lg border border-border-subtle border-t-4 border-t-brand-primary bg-surface-base p-5">
            <div className="mb-2 text-label text-text-secondary">Total de Egresos</div>
            <div className="text-[28px] font-bold text-text-primary">{pagination.total}</div>
          </div>
          <div className="flex-1 rounded-lg border border-border-subtle border-t-4 border-t-state-error bg-surface-base p-5">
            <div className="mb-2 text-label text-text-secondary">Monto Total</div>
            <div className="text-[28px] font-bold text-text-primary">
              {formatAmount(data.reduce((sum, exp) => sum + exp.amount, 0))}
            </div>
          </div>
          <div className="flex-1 rounded-lg border border-border-subtle border-t-4 border-t-text-secondary bg-surface-base p-5">
            <div className="mb-2 text-label text-text-secondary">Página</div>
            <div className="text-[28px] font-bold text-text-primary">{pagination.page} / {pagination.pages}</div>
          </div>
        </div>

        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-[60px]">
            <div className="mb-5 text-[64px]">{filters.search.trim() ? '🔍' : '📋'}</div>
            <h2 className="mb-2.5 text-center text-2xl font-semibold text-text-secondary">
              {filters.search.trim() 
                ? `No se encontraron egresos con "${filters.search.trim()}"`
                : 'No hay egresos en el período seleccionado'
              }
            </h2>
            <p className="text-center text-base text-text-muted">
              {filters.search.trim()
                ? 'Intenta con otro término de búsqueda o limpia los filtros'
                : 'Intenta ajustar los filtros o crear un nuevo egreso'
              }
            </p>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <DataTable
                columns={expenseColumns}
                data={data}
                keyExtractor={(row) => getExpenseId(row)}
                actions={(row) => (
                  <TooltipProvider>
                    <div className="flex flex-nowrap gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => router.push(`/expense/${getExpenseId(row)}`)}
                            title="Ver detalle"
                            aria-label="Ver detalle"
                            className={getActionButtonClass()}
                          >
                            <Eye size={18} aria-hidden="true" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Ver detalle</p>
                        </TooltipContent>
                      </Tooltip>
                      {canUpdateExpense && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => router.push(`/expense/${getExpenseId(row)}/edit`)}
                              title="Editar"
                              aria-label="Editar egreso"
                              className={getActionButtonClass()}
                            >
                              <Pencil size={18} aria-hidden="true" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Editar egreso</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {canDeleteExpense && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => openDeleteConfirm(row)}
                              title="Eliminar"
                              aria-label="Eliminar egreso"
                              className={getActionButtonClass('danger')}
                            >
                              <Trash2 size={18} aria-hidden="true" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Eliminar egreso</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TooltipProvider>
                )}
              />
            </div>

            <div className="flex items-center justify-between gap-5 py-5 max-md:flex-col max-md:items-stretch">
              <div className="text-label text-text-secondary">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} egresos
              </div>
              
              <div className="flex items-center gap-4">
                <Button
                  text="← Anterior"
                  variant="primary"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                />
                
                <div className="text-label font-semibold text-text-primary">Página {pagination.page} de {pagination.pages}</div>
                
                <Button
                  text="Siguiente →"
                  variant="primary"
                  size="sm"
                  disabled={pagination.page === pagination.pages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                />
              </div>
              
              <div className="flex items-center gap-2 text-label text-text-secondary">
                Mostrar: 
                <select className="rounded-md border border-border-subtle bg-surface-base px-2.5 py-1 text-label text-text-primary focus:border-brand-primary focus:outline-none" value={filters.limit} onChange={handleLimitChange}>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                por página
              </div>
            </div>
          </>
        )}
      </div>

      <Confirm
        open={confirmOpen}
        message={`¿Está seguro que desea eliminar el egreso de ${expenseToDelete?.category || ''} por ${formatAmount(expenseToDelete?.amount ?? 0)}? Esta acción no se puede deshacer.`}
        handleClose={closeDeleteConfirm}
        handleConfirm={handleDeleteExpense}
      />
    </PageContainer>
  )
}

export default function ExpenseScreen() {
  return (
    <ProtectedRoute
      requiredPermission={Permission.READ_EXPENSE}
      deniedMessage="No tienes permisos para ver egresos. Contacta a tu administrador si necesitas acceso."
    >
      <Suspense fallback={
        <div className="flex min-h-screen items-center justify-center bg-background-canvas">
          <div className="text-base text-text-secondary">Cargando egresos...</div>
        </div>
      }>
        <ExpenseScreenContent />
      </Suspense>
    </ProtectedRoute>
  )
}
