/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { AnimatedNumber } from '@/components/AnimatedNumber'
import Button from '@/components/Button'
import Confirm from '@/components/Confirm'
import InfoSale from '@/components/sale/InfoSale'
import ModalPrintSale from '@/components/sale/ModalPrintSale'
import PrintMultipleSale from '@/components/sale/PrintMultipleSale'
import Search from '@/components/Search'
import { PageContainer, PageHeader } from '@/components/layout/PageLayout'
import useLocalStorage from '@/hooks/useLocalStorage'
import { Sale } from '@/interfaces/sale.interface'
import { useAppDispatch } from '@/redux/hook'
import { getLoading, setLoading } from '@/redux/loadingSlice'
import { getUser, setUser } from '@/redux/userSlice'
import { commercialFactService } from '@/services/commercialFact.service'
import apiClient from '@/utils/client'
import { Types } from 'mongoose'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { useRouter } from 'next/navigation'
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useSelector } from 'react-redux'
import { io } from 'socket.io-client'

const isSalePayable = (item: Sale): boolean =>
  !item.paidAt && item.estado !== 'Cancelado'

const todayCivilDate = (): string => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ─── Local row component (approved in TICKET-07) ─────────────────────────────

interface SaleRowProps {
  item: Sale
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onPrint: () => void
  onInfo: () => void
  onCollect?: () => void
}

function SaleRow({ item, isSelected, onSelect, onEdit, onPrint, onInfo, onCollect }: SaleRowProps) {
  return (
    <li
      className={`my-1.5 flex h-auto min-h-[70px] w-full cursor-pointer list-none items-center justify-center rounded-xl border p-4 font-semibold transition-[background-color,border-color] duration-500 ease-linear hover:border-brand-primary hover:bg-background-subtle max-[500px]:flex-col ${isSelected ? 'border-brand-primary bg-background-subtle' : 'border-border-subtle bg-surface-base'}`}
    >
      <div
        className="mr-4 flex w-full items-center justify-between max-[500px]:mr-0"
        onClick={onSelect}
      >
        <div>
          <h2 className="text-body text-text-primary max-[500px]:text-label">{item.cliente}</h2>
          <h2 className="text-label text-text-primary max-[500px]:text-caption">
            {item.createdAt.split('T')[0]}
          </h2>
        </div>
        <h2 className="text-body font-semibold text-brand-accent max-[500px]:text-label">
          $ <AnimatedNumber value={item.total} />
        </h2>
      </div>
      <div className="flex items-center gap-2">
        {onCollect && (
          <Button text='COBRAR' variant='primary' onClick={onCollect} />
        )}
        <Button text='EDITAR'   variant='ghost' onClick={onEdit} />
        <Button text='IMPRIMIR' variant='ghost' onClick={onPrint} />
        <Button text='+INFO'    variant='ghost' onClick={onInfo} />
      </div>
    </li>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SaleScreen() {

    const [search, setSearch] = useState<string>('')
    const [data, setData] = useState<Sale[]>([])
    const [longArray, setLongArray] = useState(0)
    const [dataSearch, setDataSearch] = useState<Sale[]>([])
    const user = useSelector(getUser)
    const [valueStorage , setValue] = useLocalStorage("user", "")
    const dispatch = useAppDispatch();
    const router: AppRouterInstance = useRouter()
    const {open: loading} = useSelector(getLoading)
    const [openPrintSale, setOpenPrintSale] = useState<boolean>(false)
    const [saleSelected, setSaleSelected] = useState< Types.ObjectId | undefined | string>(undefined)
    const [openInfoSale, setOpenInfoSale] = useState<boolean>(false)
    const observer = useRef<IntersectionObserver | null>(null);
    const [query, setQuery] = useState<{skip: number, limit: number}>({skip: 0, limit: 25})
    const [selectSaleArray, setSelectSaleArray] = useState<(string | Types.ObjectId)[]>([])
    const [openMultipleSale, setOpenMultipleSale] = useState(false)
    const [openConfirmPayment, setOpenConfirmPayment] = useState(false)
    const [saleToCollect, setSaleToCollect] = useState<Sale | null>(null)

    const markSalePaid = (saleId: string | Types.ObjectId, paidAt: string) => {
      const patch = (list: Sale[]) =>
        list.map((s) => (String(s._id) === String(saleId) ? { ...s, paidAt } : s))
      setData(patch)
      setDataSearch(patch)
    }

    const openCollectConfirm = (item: Sale) => {
      setSaleToCollect(item)
      setOpenConfirmPayment(true)
    }

    const closeCollectConfirm = () => {
      setOpenConfirmPayment(false)
      setSaleToCollect(null)
    }

    const handleConfirmPayment = async () => {
      if (!saleToCollect?._id) return
      const saleId = String(saleToCollect._id)
      const businessDate = todayCivilDate()
      dispatch(setLoading(true))
      try {
        await commercialFactService.confirmSalePayment(saleId, {
          businessDate,
          idempotencyKey: `sale-payment-${saleId}-${businessDate}`,
        })
        markSalePaid(saleId, businessDate)
        closeCollectConfirm()
      } catch (e) {
        console.error('Error confirmando cobro', e)
      } finally {
        dispatch(setLoading(false))
      }
    }

    const addSaleArray = (item: string | Types.ObjectId) => {
      /* setSelectSaleArray(prevData=>{
        const exist = prevData.find((elem: Sale) => elem._id === item._id)
        if (exist) {
          return prevData.filter((elem: Sale) => elem._id !== item._id)
        }
        return[...prevData, item._id]
      }) */
        setSelectSaleArray(prevData=>{
          const exist = prevData.find((elem: (string | Types.ObjectId)) => elem === item)
          if (exist) {
            return prevData.filter((elem: (string | Types.ObjectId)) => elem !== item)
          }
          return[...prevData, item]
        })
    }

    const getSale = async (skip: number, limit: number) => {
      dispatch(setLoading(true))
      try {
        const response = await apiClient.post(`/sale/skip`, { skip, limit },
          {
              headers: {
                  Authorization: `Bearer ${valueStorage.token}`
              },
          });
          setData((prevData:Sale[]) => {
  
            if (prevData.length === 0) {
                return response.data.array;
            }
            const newData = response.data.array.filter((element: Sale) => {
                return prevData.findIndex((item: Sale) => item._id === element._id) === -1;
            });

            return [...prevData, ...newData];
          })
          setLongArray(prevData=>response.data.longitud)
          dispatch(setLoading(false))
      } catch (e) {
        console.log("error getSale",e);dispatch(setLoading(false))
      } finally {
        dispatch(setLoading(false));
      }
    }

    const getSaleSearch = async (input: string) => {
      dispatch(setLoading(true))
      try {
          const {data}:{data:Sale[]} = await apiClient.post(`/sale/search`, {input});
          setDataSearch(data);
          dispatch(setLoading(false));
      } catch (e) {
          console.log("error", e);
          dispatch(setLoading(false));
      } finally {
        dispatch(setLoading(false))
      }
    }

    useEffect(()=>{
      if ( search !== '') {
        getSaleSearch(search)
      }
    },[search]) 

    useEffect(()=>{
      if (valueStorage) {
        getSale(query.skip, query.limit)
      }
    },[query])


    useEffect(()=>{
      if (!process.env.NEXT_PUBLIC_DB_HOST) {
        return
      }
      const socket = io(process.env.NEXT_PUBLIC_DB_HOST)
      socket.on(`sale`, (socket) => {
        setData((prevData:Sale[])=>{
          return [...prevData, socket.data]
        })
      })
      return () => {
        socket.disconnect();
      }; 
    },[data])
      
    const lastElementRef = useCallback(
      (node: HTMLLIElement | null) => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
          if (entries[0].isIntersecting) {
            if (data.length < longArray) {
              setQuery(prevData => ({ skip: prevData.skip + 25, limit: prevData.limit }));
            }
          }
        });
        if (node) observer.current.observe(node);
      },
      [loading, data, search, query]
    );

    const buildPrintHandler = (item: Sale) => () => {
      dispatch(setLoading(true))
      apiClient.get(`/sale/print/${item._id}`, { responseType: 'blob' })
        .then(response => {
          const blob = new Blob([response.data], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `venta-${item.cliente}.pdf`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          dispatch(setLoading(false))
        })
        .catch(error => {
          console.error('Error descargando el PDF:', error);
          dispatch(setLoading(false))
        });
    }

  return (
    <PageContainer>
        <PageHeader
          title="Ventas"
          actions={
            selectSaleArray.length === 0 ? (
              <>
                <Search name='search' placeHolder={'Buscar ventas'} type='text' value={search} onChange={(e:ChangeEvent<HTMLInputElement>)=>setSearch(e.target.value)} />
                <Button text='Nuevo' variant='primary' onClick={()=>{}} to='/sale/newSale' />
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div
                  className="flex cursor-pointer items-center justify-center border-l border-border-subtle p-[5px] text-[25px] text-text-muted hover:rounded-full hover:bg-background-subtle hover:text-brand-primary"
                  onClick={()=>setSelectSaleArray(prevData=>[])}
                >
                  <X aria-hidden="true" />
                </div>
                <h2 className="text-base text-text-primary">{selectSaleArray.length} Ventas seleccionadas</h2>
                <Button text='Imprimir' variant='secondary' className="mx-1 my-1" onClick={()=>{
                  dispatch(setLoading(true))
                  apiClient.post(`/sale/print`, selectSaleArray, { responseType: 'blob' })
                            .then(response => {
                              const blob = new Blob([response.data], { type: 'application/pdf' });
                              const url = window.URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.setAttribute('download', `ventas.pdf`);
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              window.URL.revokeObjectURL(url);
                              dispatch(setLoading(false))
                            })
                            .catch(error => {
                              console.error('Error descargando el PDF:', error);
                              dispatch(setLoading(false))
                            });
                }}/>
              </div>
            )
          }
        />
        <ul className="flex max-h-[82vh] w-full flex-1 flex-col overflow-scroll max-[500px]:px-0">
            {
               search !== '' ?
                dataSearch.length !== 0 ?
                dataSearch.map((item: Sale, index: number) => (
                  <SaleRow
                    key={index}
                    item={item}
                    isSelected={!!selectSaleArray.find(elem => elem === item._id)}
                    onSelect={() => item._id && addSaleArray(item._id)}
                    onEdit={() => router.push(`/sale/editSale/${item._id}`)}
                    onPrint={buildPrintHandler(item)}
                    onInfo={() => { setOpenInfoSale(true); setSaleSelected(item._id) }}
                    onCollect={isSalePayable(item) ? () => openCollectConfirm(item) : undefined}
                  />
                ))
                :
                 <li className="list-none flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <span className="select-none text-5xl leading-none" aria-hidden="true">🔍</span>
                  <p className="text-body font-semibold text-text-secondary">No hay ventas</p>
                </li>
              :
                data.length !== 0 ?
                data.map((item: Sale, index: number) => (
                  <SaleRow
                    key={index}
                    item={item}
                    isSelected={!!selectSaleArray.find(elem => elem === item._id)}
                    onSelect={() => item._id && addSaleArray(item._id)}
                    onEdit={() => router.push(`/sale/editSale/${item._id}`)}
                    onPrint={buildPrintHandler(item)}
                    onInfo={() => { setOpenInfoSale(true); setSaleSelected(item._id) }}
                    onCollect={isSalePayable(item) ? () => openCollectConfirm(item) : undefined}
                  />
                ))
                :
                <li className="list-none flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <span className="select-none text-5xl leading-none" aria-hidden="true">📋</span>
                  <p className="text-body font-semibold text-text-secondary">No hay ventas</p>
                </li>
            }
            {search === '' && data.length < longArray && (
              <li
                className="m-[15px] min-h-[5px] list-none p-0"
                ref={lastElementRef}
                aria-hidden="true"
              />
            )}
        </ul>
        {
          openPrintSale && 
          <ModalPrintSale open={openPrintSale} handleClose={()=>setOpenPrintSale(false)} id={saleSelected} />
        }
        {
          openInfoSale && 
          <InfoSale open={openInfoSale} handleClose={()=>setOpenInfoSale(false)} id={saleSelected} />
        }
        <Confirm
          open={openConfirmPayment}
          message={
            saleToCollect
              ? `¿Confirmar cobro de la venta a ${saleToCollect.cliente} por $${saleToCollect.total}?`
              : ''
          }
          handleClose={closeCollectConfirm}
          handleConfirm={() => { void handleConfirmPayment() }}
        />
        {/* {
          openMultipleSale &&
          <PrintMultipleSale open={openMultipleSale} handleClose={()=>setOpenMultipleSale(false)} salesIds={selectSaleArray} />
        } */}
    </PageContainer>
  )
}
