import { ChangeEvent, useEffect, useRef, useState } from 'react'
import ItemLineaVenta from './ItemLineaVenta'
import apiClient from '@/utils/client';
import { setLoading } from '@/redux/loadingSlice';
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from '@/redux/hook';
import Input from '../Input';
import Button from '../Button';
import { useRouter } from 'next/navigation';
import useLocalStorage from '@/hooks/useLocalStorage';
import { ExtendItemSale, ItemSale } from '@/interfaces/sale.interface';
import { Types } from 'mongoose';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { format } from 'date-fns';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ShoppingCart } from 'lucide-react';
import { AnimatedNumber } from '../AnimatedNumber';
import { clearClientSaleSelection, getSale, onChangeClientSale, selectClientSale } from '@/redux/saleSlice';
import ListLineaVenta from './ListLineaVenta';
import { clientService } from '@/services/client.service';
import type { SaleClientOption } from '@/interfaces/client.interface';
import Combobox from '@/components/ui/combobox';
import axios from 'axios';

export default function LineaVenta({edit}:{edit?: boolean}) {

    const [date, setDate] = useState<Date>(new Date());
    const [dateOpen, setDateOpen] = useState(false);
    const sale = useAppSelector(getSale)
    const dispatch = useAppDispatch();
    const router: AppRouterInstance = useRouter()
    const [valueStorage , setValue] = useLocalStorage("user", "")
    const [options, setOptions] = useState<SaleClientOption[]>([])
    const [searchState, setSearchState] = useState<'idle' | 'loading' | 'ready' | 'forbidden' | 'error'>('idle')
    const [retry, setRetry] = useState(0)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectorOpen, setSelectorOpen] = useState(false)
    const [nextCursor, setNextCursor] = useState<string | null>(null)
    const [loadingMore, setLoadingMore] = useState(false)
    const [pageError, setPageError] = useState(false)
    const searchRequestVersion = useRef(0)
    const loadingMoreRef = useRef(false)
    const debounceSearch = useRef(false)
    const selectedClient: SaleClientOption | null = sale.idCliente ? { id: String(sale.idCliente), name: sale.cliente } : null

    useEffect(() => () => { searchRequestVersion.current += 1 }, [])

    useEffect(()=>{
      if (sale.createdAt) {
        const newDate = new Date(sale.createdAt)
        setDate(prevData=>newDate)
      }
    }, [sale.createdAt])

    useEffect(() => {
      const query = searchQuery.trim()
      const requestVersion = searchRequestVersion.current
      let current = true
      setOptions([])
      setNextCursor(null)
      if (edit || !selectorOpen || query.length > 100) {
        setSearchState('idle')
        return () => { current = false }
      }
      setSearchState('loading')
      const fetchPage = () => { void Promise.resolve().then(() => clientService.saleOptionsPage(query)).then((page) => {
          if (current && requestVersion === searchRequestVersion.current) { setOptions(page.clients); setNextCursor(page.nextCursor); setSearchState('ready') }
        }).catch((error: unknown) => {
          if (current && requestVersion === searchRequestVersion.current) setSearchState(axios.isAxiosError(error) && error.response?.status === 403 ? 'forbidden' : 'error')
        }) }
      const timer = debounceSearch.current ? setTimeout(fetchPage, 300) : undefined
      if (!debounceSearch.current) fetchPage()
      return () => { current = false; if (timer) clearTimeout(timer) }
    }, [edit, searchQuery, selectorOpen, retry])

    const handleClientSearch = (query: string): Promise<void> => {
      searchRequestVersion.current += 1
      debounceSearch.current = true
      setPageError(false)
      loadingMoreRef.current = false
      setLoadingMore(false)
      setOptions([])
      setNextCursor(null)
      if (sale.idCliente) dispatch(clearClientSaleSelection())
      setSearchQuery(query)
      return Promise.resolve()
    }

    const handleSelectorOpen = (open: boolean) => {
      searchRequestVersion.current += 1
      debounceSearch.current = false
      setPageError(false)
      loadingMoreRef.current = false
      setLoadingMore(false)
      setSearchQuery('')
      setOptions([])
      setNextCursor(null)
      setSelectorOpen(open)
    }

    const loadMore = () => {
      if (!nextCursor || loadingMoreRef.current) return
      const version = searchRequestVersion.current
      loadingMoreRef.current = true
      setLoadingMore(true)
      setPageError(false)
      setSearchState('ready')
      void clientService.saleOptionsPage(searchQuery.trim(), nextCursor).then((page) => {
        if (version !== searchRequestVersion.current) return
        setOptions(current => [...current, ...page.clients.filter(client => !current.some(existing => existing.id === client.id))])
        setNextCursor(page.nextCursor)
        setSearchState('ready')
      }).catch((error: unknown) => {
        if (version === searchRequestVersion.current) {
          setPageError(true)
          setSearchState(axios.isAxiosError(error) && error.response?.status === 403 ? 'forbidden' : 'error')
        }
      }).finally(() => {
        if (version === searchRequestVersion.current) { loadingMoreRef.current = false; setLoadingMore(false) }
      })
    }

    const handleClientSelection = (option: SaleClientOption | null) => {
      if (option) {
        dispatch(selectClientSale(option))
      } else {
        dispatch(clearClientSaleSelection())
        setSearchQuery('')
        setOptions([])
        setSearchState('idle')
      }
    }

    const clearSelectedClient = () => {
      setSearchQuery('')
      setOptions([])
      setSearchState('idle')
      dispatch(clearClientSaleSelection())
    }

  return (
    <div className="flex flex-1 min-w-[50%] flex-col max-[940px]:w-full max-[940px]:h-full">
        <div className="flex flex-1 flex-col p-4">
          <h2 className="text-lg text-text-secondary text-center">CARRITO</h2>
          <div className="border-b-2 border-border-subtle mx-4 my-4 rounded-full" />
          <ListLineaVenta edit={edit} />
        </div>
        <div className="px-4">
          {edit ? (
            <Input label='Cliente' name='cliente' value={sale.cliente} readOnly={Boolean(sale.idCliente)} onChange={(e:ChangeEvent<HTMLInputElement>)=>dispatch(onChangeClientSale({client: e.target.value}))} type='text' />
          ) : (
            <div className="my-4 flex flex-col gap-1 text-center">
              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                Cliente
                <Combobox
                  options={options}
                  value={selectedClient}
                  getOptionLabel={(option) => option.name}
                  getOptionValue={(option) => option.id}
                  onChange={handleClientSelection}
                  onSearch={handleClientSearch}
                  immediateSearch
                  onOpenChange={handleSelectorOpen}
                  footer={(nextCursor || searchState === 'error') && <button type="button" className="w-full border-t border-border-subtle p-2 text-sm hover:bg-background-subtle" disabled={loadingMore} onClick={() => { if (pageError || nextCursor) loadMore(); else { debounceSearch.current = false; setRetry(current => current + 1) } }}>{loadingMore ? 'Cargando...' : searchState === 'error' ? 'Reintentar' : 'Cargar más clientes'}</button>}
                  placeholder="Seleccionar cliente"
                  noOptionsText={searchState === 'forbidden' || searchState === 'error' ? 'No se pudieron cargar clientes.' : 'No se encontraron clientes activos.'}
                  loading={searchState === 'loading'}
                  className="text-left"
                  renderOption={(option) => (
                    <div className="flex min-w-0 flex-col items-start text-left">
                      <span className="font-medium text-text-primary">{option.name}</span>
                      <span className="text-xs text-text-secondary">{option.address?.trim() || 'Sin dirección'} · ID: {option.id}</span>
                    </div>
                  )}
                />
              </label>
              {selectedClient && (
                <button type="button" className="self-start text-sm text-text-secondary underline underline-offset-2 hover:text-text-primary" onClick={clearSelectedClient}>
                  Limpiar selección
                </button>
              )}
            </div>
          )}
          {!edit && <div aria-live="polite" className="text-sm text-text-secondary">
            {searchQuery.trim().length > 100 && <p>La búsqueda admite hasta 100 caracteres.</p>}
            {searchState === 'loading' && <p>Buscando clientes...</p>}
            {searchState === 'ready' && options.length === 0 && <p>No se encontraron clientes activos.</p>}
            {searchState === 'forbidden' && <p>Necesitás el permiso read_client para seleccionar un cliente. Contactá a un administrador.</p>}
            {searchState === 'error' && <p>No se pudieron buscar clientes.</p>}
            {options.length > 0 && <>
              <p>Si los datos no alcanzan para identificar al cliente, verificá su identidad antes de seleccionarlo.</p>
            </>}
          </div>}
          <div className="flex justify-around">
            <span>Fecha de venta</span>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-border-subtle bg-surface-base px-4 text-label text-text-primary hover:bg-background-subtle transition-colors"
                >
                  {format(date, 'dd/MM/yyyy')}
                </button>
              </PopoverTrigger>
              <PopoverContent>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newValue) => {
                    if (newValue) setDate(newValue);
                    setDateOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex justify-between my-4">
            <h2 className="text-lg text-text-secondary max-[940px]:hidden">
              <AnimatedNumber value={sale.itemsSale.length} /> productos
            </h2>
            <h2 className="text-lg text-text-secondary max-[940px]:hidden">
              Total: $ <AnimatedNumber value={sale.total} />
            </h2>
          </div>
          <div className="flex justify-center mb-4">
            <Button text='Crear' variant='secondary' className="mx-1 my-1 px-3.5 shadow-sm hover:bg-brand-primary hover:text-text-inverse hover:border-brand-primary active:translate-y-px" onClick={()=>{
              if (sale.itemsSale.length===0 || sale.total <= 0) {
                toast.warning('No se agregaron productos al carrito')
                return
              }
              if (sale.cliente==='' || sale.cliente===undefined) {
                toast.warning('No se ingreso ningun cliente')
                return
              }
              if (!edit && !sale.idCliente) {
                toast.warning('Seleccioná un cliente activo de los resultados')
                return
              }
              dispatch(setLoading(true))
              !edit?
              apiClient.post('/sale', {itemsSale: sale.itemsSale, idCliente: sale.idCliente, total: sale.total, estado: 'Creado', createdAt: date, porcentaje: sale.porcentaje},{
                headers: {
                  Authorization: `Bearer ${valueStorage.token}` 
                }
              })
              .then((r)=>{
                dispatch(setLoading(false))
                toast.success('Venta creada correctamente')
                router.back()
              })
              .catch((e)=>{
                dispatch(setLoading(false))
                toast.error(e.response.data.error)
              }):
              apiClient.patch(`/sale/${sale._id}`, {itemsSale: sale.itemsSale, cliente: sale.cliente, total: sale.total, estado: sale.estado === 'Cancelado' ? sale.estado : 'Modificado', createdAt: sale.createdAt, porcentaje: sale.porcentaje},{
                headers: {
                  Authorization: `Bearer ${valueStorage.token}` 
                }
              })
              .then((r)=>{
                dispatch(setLoading(false))
                toast.success('Venta modificada correctamente')
                router.back()
              })
              .catch((e)=>{
                dispatch(setLoading(false))
                toast.error(e.response.data.error)
              })
            }} />
          </div>
        </div>
    </div>
  )
}
