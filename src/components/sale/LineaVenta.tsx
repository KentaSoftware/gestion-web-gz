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
import { getSale, onChangeClientSale, onChangePrecioUnitarioSale } from '@/redux/saleSlice';
import ListLineaVenta from './ListLineaVenta';

export default function LineaVenta({edit}:{edit?: boolean}) {

    const [date, setDate] = React.useState<Date>(new Date());
    const [dateOpen, setDateOpen] = React.useState(false);
    const sale = useAppSelector(getSale)
    const dispatch = useAppDispatch();
    const router: AppRouterInstance = useRouter()
    const [valueStorage , setValue] = useLocalStorage("user", "")

    useEffect(()=>{
      if (sale.createdAt) {
        const newDate = new Date(sale.createdAt)
        setDate(prevData=>newDate)
      }
    }, [sale])

  return (
    <div className="flex flex-1 min-w-[50%] flex-col max-[940px]:w-full max-[940px]:h-full">
        <div className="flex flex-1 flex-col p-4">
          <h2 className="text-lg text-text-secondary text-center">CARRITO</h2>
          <div className="border-b-2 border-border-subtle mx-4 my-4 rounded-full" />
          <ListLineaVenta edit={edit} />
        </div>
        <div className="px-4">
          <Input label='Cliente' name='cliente' value={sale.cliente} onChange={(e:ChangeEvent<HTMLInputElement>)=>dispatch(onChangeClientSale({client: e.target.value}))} type='text' />
          <div className="flex justify-around">
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
              dispatch(setLoading(true))
              !edit?
              apiClient.post('/sale', {itemsSale: sale.itemsSale, cliente: sale.cliente, total: sale.total, estado: 'Creado', createdAt: date, porcentaje: sale.porcentaje},{
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
                console.log(e)
                dispatch(setLoading(false))
                toast.error(e.response.data.error)
              }):
              apiClient.patch(`/sale/${sale._id}`, {itemsSale: sale.itemsSale, cliente: sale.cliente, total: sale.total, estado: 'Modificado', createdAt: sale.createdAt, porcentaje: sale.porcentaje},{
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
                console.log(e.response)
                dispatch(setLoading(false))
                toast.error(e.response.data.error)
              })
            }} />
          </div>
        </div>
    </div>
  )
}
