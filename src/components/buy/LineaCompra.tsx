import React, { useState } from 'react'
import ListLineaCompra from './ListLineaCompra'
import { AsyncComboboxWithActions } from '@/components/ui/async-combobox'
import { useAppDispatch, useAppSelector } from '@/redux/hook'
import { getBuy, onChangeProveedor, resetBuy, setItemsBuy } from '@/redux/buySlice'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { AnimatedNumber } from '../AnimatedNumber'
import Button from '../Button'
import { toast } from "sonner";
import { setLoading } from '@/redux/loadingSlice'
import apiClient from '@/utils/client'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { useRouter } from 'next/navigation';
import useLocalStorage from '@/hooks/useLocalStorage'
import ModalAutoGenerate from './ModalAutoGenerate'
import { addHours, endOfDay, format, startOfDay } from 'date-fns';

export default function LineaCompra({edit}:{edit?: boolean}) {

    const buy = useAppSelector(getBuy)
    const dispatch = useAppDispatch();
    const [date, setDate] = React.useState<Date>(new Date());
    const [dateOpen, setDateOpen] = React.useState(false);
    const router: AppRouterInstance = useRouter()
    const [valueStorage , setValue] = useLocalStorage("user", "")
    const [openAutoGenerate, setOpenAutoGenerate] = useState<boolean>(false)

    const generateAutoBuy = (start: Date, end: Date, isSelectRange: boolean) => {
        start = addHours(startOfDay(start), 3)
        end = addHours(endOfDay(end), 3)
        if (isSelectRange) {
          apiClient.get(`/itemSale/listbuy/${format(start, 'MM-dd-yyyy')}/${format(end, 'MM-dd-yyyy')}/${buy.proveedor}`,{
            headers: {
              Authorization: `Bearer ${valueStorage.token}` 
            }
          })
          .then((r)=>{
            dispatch(setLoading(false))
            toast.success('Generado correctamente')
            console.log(r)
            dispatch(setItemsBuy({itemsBuy: r.data}))
            setOpenAutoGenerate(false)
          })
          .catch((e)=>{
            console.log(e.response)
            dispatch(setLoading(false))
            toast.error(e.response.data.error)
          })
          return
        }
        apiClient.get(`/itemSale/listbuyavg/${buy.proveedor}`,{
          headers: {
            Authorization: `Bearer ${valueStorage.token}` 
          }
        })
        .then((r)=>{
          dispatch(setLoading(false))
          toast.success('Generado correctamente')
          console.log(r)
          dispatch(setItemsBuy({itemsBuy: r.data}))
          setOpenAutoGenerate(false)
        })
        .catch((e)=>{
          console.log(e.response)
          dispatch(setLoading(false))
          toast.error(e.response.data.error)
        })
        return
      }

  return (
    <div className="flex flex-1 w-1/2 flex-col max-[940px]:w-full max-[940px]:h-[90%]">
        <div className="flex flex-1 flex-col p-4">
          <h2 className="text-lg text-text-secondary text-center">CARRITO</h2>
          <div className="border-b-2 border-border-subtle mx-4 my-4 rounded-full" />
          <ListLineaCompra edit={edit} />
        </div>
        <div className="flex justify-center flex-col px-4">
            <AsyncComboboxWithActions name={'Proveedor'} path={'provider'}
                value={buy.proveedor}
                onChange={(id:any, item:any)=>dispatch(onChangeProveedor({proveedor: item?.descripcion ?? ''}))}
            />
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
            <div className="flex justify-between my-4">
              <h2 className="text-lg text-text-secondary max-[940px]:hidden">
                <AnimatedNumber value={buy.itemsBuy.length} /> productos
              </h2>
              <h2 className="text-lg text-text-secondary max-[940px]:hidden">
                Total: $ <AnimatedNumber value={buy.total} />
              </h2>
            </div>
            <div className="flex justify-center my-4">
              {!edit && (
                <Button text='VACIAR' variant='secondary' className="mx-1 my-1 px-3.5 shadow-sm hover:bg-brand-primary hover:text-text-inverse hover:border-brand-primary active:translate-y-px" onClick={()=>{dispatch(resetBuy({}))}}/>
              )}
              <Button text='AUTO Generar' variant='secondary' className="mx-1 my-1 px-3.5 shadow-sm hover:bg-brand-primary hover:text-text-inverse hover:border-brand-primary active:translate-y-px" onClick={()=>{
                if (buy.proveedor === '') {
                  toast.warning('Primero elige un proveedor')
                  return
                }
                if (buy.itemsBuy.length > 0) {
                  toast.warning('Primero quita los productos de la lista')
                  return
                }
                setOpenAutoGenerate(true)
              }}/>
              <Button text='Crear' variant='secondary' className="mx-1 my-1 px-3.5 shadow-sm hover:bg-brand-primary hover:text-text-inverse hover:border-brand-primary active:translate-y-px" onClick={()=>{
                if (buy.itemsBuy.length===0 || buy.total <= 0) {
                  toast.warning('No se agregaron productos al carrito')
                  return
                }
                if (buy.proveedor==='' || buy.proveedor === undefined) {
                  toast.warning('No se ingreso ningun proveedor')
                  return
                }
                dispatch(setLoading(true))
                apiClient.post('/buy', {itemsBuy: buy.itemsBuy, proveedor: buy.proveedor, total: buy.total, estado: 'Entregado', createdAt: date},{
                  headers: {
                    Authorization: `Bearer ${valueStorage.token}` 
                  }
                })
                .then((r)=>{
                  dispatch(setLoading(false))
                  toast.success('Compra creada correctamente')
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
        {openAutoGenerate && (
            <ModalAutoGenerate open={openAutoGenerate} handleClose={()=>setOpenAutoGenerate(false)} handleSubmit={generateAutoBuy} />
        )}
    </div>
  )
}
