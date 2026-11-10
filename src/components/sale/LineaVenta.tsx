import React, { ChangeEvent, useEffect, useState } from 'react'
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
import axios from 'axios';

export default function LineaVenta({edit}:{edit?: boolean}) {

    const [date, setDate] = React.useState<Date>(new Date());
    const [dateOpen, setDateOpen] = React.useState(false);
    const sale = useAppSelector(getSale)
    const dispatch = useAppDispatch();
    const router: AppRouterInstance = useRouter()
    const [valueStorage , setValue] = useLocalStorage("user", "")
    const [options, setOptions] = useState<SaleClientOption[]>([])
    const [searchState, setSearchState] = useState<'idle' | 'loading' | 'ready' | 'forbidden' | 'error'>('idle')
    const [retry, setRetry] = useState(0)

    useEffect(()=>{
      if (sale.createdAt) {
        const newDate = new Date(sale.createdAt)
        setDate(prevData=>newDate)
      }
    }, [sale.createdAt])

    useEffect(() => {
      const query = sale.cliente.trim()
      let current = true
      setOptions([])
      if (edit || sale.idCliente || query.length < 2 || query.length > 100) {
        setSearchState('idle')
        return () => { current = false }
      }
      setSearchState('loading')
      const timer = setTimeout(() => {
        clientService.saleOptions(query).then((clients) => {
          if (current) { setOptions(clients); setSearchState('ready') }
        }).catch((error: unknown) => {
          if (current) setSearchState(axios.isAxiosError(error) && error.response?.status === 403 ? 'forbidden' : 'error')
        })
      }, 250)
      return () => { current = false; clearTimeout(timer) }
    }, [edit, sale.cliente, sale.idCliente, retry])

  return (
    <div className="flex flex-1 min-w-[50%] flex-col max-[940px]:w-full max-[940px]:h-full">
        <div className="flex flex-1 flex-col p-4">
          <h2 className="text-lg text-text-secondary text-center">CARRITO</h2>
          <div className="border-b-2 border-border-subtle mx-4 my-4 rounded-full" />
          <ListLineaVenta edit={edit} />
        </div>
        <div className="px-4">
          <Input label='Cliente' name='cliente' value={sale.cliente} readOnly={Boolean(edit && sale.idCliente)} onChange={(e:ChangeEvent<HTMLInputElement>)=>{ if (!edit) dispatch(clearClientSaleSelection()); dispatch(onChangeClientSale({client: e.target.value})) }} type='text' />
          {!edit && <div aria-live="polite" className="text-sm text-text-secondary">
            {sale.cliente.trim().length < 2 && !sale.idCliente && <p>Ingresá al menos 2 caracteres para buscar un cliente activo.</p>}
            {sale.cliente.trim().length > 100 && <p>La búsqueda admite hasta 100 caracteres.</p>}
            {searchState === 'loading' && <p>Buscando clientes...</p>}
            {searchState === 'ready' && options.length === 0 && <p>No se encontraron clientes activos.</p>}
            {searchState === 'forbidden' && <p>Necesitás el permiso read_client para seleccionar un cliente. Contactá a un administrador.</p>}
            {searchState === 'error' && <p>No se pudieron buscar clientes. <button type="button" onClick={() => setRetry(retry + 1)}>Reintentar</button></p>}
            {options.length > 0 && <>
              <p>Si los datos no alcanzan para identificar al cliente, verificá su identidad antes de seleccionarlo.</p>
              <ul>{options.map(option => <li key={option.id}><button type="button" onClick={() => dispatch(selectClientSale(option))}>{option.name} · {option.address?.trim() || 'Sin dirección'} · ID: {option.id}</button></li>)}</ul>
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
