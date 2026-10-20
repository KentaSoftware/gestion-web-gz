'use client'

import { AnimatedNumber } from '@/components/AnimatedNumber'
import Button from '@/components/Button'
import InfoBuy from '@/components/buy/InfoBuy'
import Search from '@/components/Search'
import { PageContainer, PageHeader } from '@/components/layout/PageLayout'
import useLocalStorage from '@/hooks/useLocalStorage'
import { Buy } from '@/interfaces/buy.interface'
import { useAppDispatch } from '@/redux/hook'
import { getLoading, setLoading } from '@/redux/loadingSlice'
import apiClient from '@/utils/client'
import { Types } from 'mongoose'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { useRouter } from 'next/navigation'
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'

const listItemClass = 'my-1.5 flex h-auto min-h-[70px] w-full cursor-pointer list-none items-center justify-center rounded-xl border border-border-subtle bg-surface-base p-4 font-semibold shadow-sm transition-[background-color,border-color] duration-500 ease-linear hover:border-brand-primary hover:bg-background-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus max-[500px]:flex-col'

interface BuyRowProps {
  item: Buy
  onSelect: (id: Types.ObjectId | string | undefined) => void
  onEdit: () => void
  onInfo: () => void
  showControlButton?: boolean
}

function BuyRow({ item, onSelect, onEdit, onInfo, showControlButton }: BuyRowProps) {
  return (
    <li
      className={listItemClass}
      tabIndex={0}
      onClick={() => onSelect(item._id)}
    >
      <div className="mr-4 flex w-full items-center justify-between max-[500px]:mr-0">
        <div>
          <h2 className="text-body text-text-primary max-[500px]:text-label">{item.proveedor}</h2>
          <h2 className="text-label text-text-primary max-[500px]:text-caption">{item.createdAt.split("T")[0]}</h2>
        </div>
        <h2 className="text-body font-semibold text-brand-accent">$ <AnimatedNumber value={item.total} /></h2>
      </div>
      <div className="flex items-center gap-2">
        {showControlButton && (
          <Button text='CONTROL' variant='ghost' onClick={onEdit} />
        )}
        <Button text='EDITAR' variant='ghost' onClick={onEdit} />
        <Button text='+INFO' variant='ghost' onClick={onInfo} />
      </div>
    </li>
  )
}

export default function BuyScreen() {

    const [search, setSearch] = useState<string>('')
    const [data, setData] = useState<Buy[]>([])
    const [longArray, setLongArray] = useState<number>(0)
    const [dataSearch, setDataSearch] = useState<Buy[]>([])
    const [valueStorage] = useLocalStorage("user", "")
    const dispatch = useAppDispatch();
    const router: AppRouterInstance = useRouter()
    const {open: loading} = useSelector(getLoading)
    const [buySelected, setBuySelected] = useState< Types.ObjectId | undefined | string>(undefined)
    const [openInfoBuy, setOpenInfoBuy] = useState<boolean>(false)
    const [query, setQuery] = useState<{skip: number, limit: number}>({skip: 0, limit: 25})
    const observer = useRef<IntersectionObserver | null>(null);

    useEffect(()=>{

      const getSaleSearch = async (input: string) => {
        dispatch(setLoading(true))
        try {
            const response = await apiClient.post(`/buy/search`, {input});
            setDataSearch(response.data);
            dispatch(setLoading(false));
        } catch (e) {
            console.log("error", e);
            dispatch(setLoading(false));
        } finally {
          dispatch(setLoading(false))
        }
      }

      if ( search !== '') {
        getSaleSearch(search)
      }
    },[dispatch, search]) 

    useEffect(()=>{

      const getSale = async (skip: number, limit: number) => {
        dispatch(setLoading(true))
        try {
          const response = await apiClient.post(`/buy/skip`, { skip, limit },
            {
                headers: {
                    Authorization: `Bearer ${valueStorage.token}`
                },
            });
            setData((prevData:Buy[]) => {
    
              if (prevData.length === 0) {
                  return response.data.array;
              }
              const newData = response.data.array.filter((element: Buy) => {
                  return prevData.findIndex((item: Buy) => item._id === element._id) === -1;
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

      if (valueStorage) {
        getSale(query.skip, query.limit)
      }
    },[dispatch, query, valueStorage])

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
    [loading, data.length, longArray]
  );

  return (
    <PageContainer>
        <PageHeader
          title="Compras"
          actions={
            <>
              <Search name='search' placeHolder={'Buscar compras'} type='text' value={search} onChange={(e:ChangeEvent<HTMLInputElement>)=>setSearch(e.target.value)} />
              <Button text='NUEVO' variant='primary' onClick={()=>{}} to='/buy/newBuy'/>
            </>
          }
        />
        <ul className="flex max-h-[82vh] w-full flex-1 flex-col overflow-scroll">
            {
              search !== '' ?
                dataSearch.length !== 0 ?
                dataSearch.map((item: Buy, index: number) =>
                  <BuyRow
                    key={index}
                    item={item}
                    onSelect={setBuySelected}
                    onEdit={() => router.push(`/buy/editBuy/${item._id}`)}
                    onInfo={() => setOpenInfoBuy(true)}
                    showControlButton
                  />)
                :
                <li className="list-none flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <span className="select-none text-5xl leading-none" aria-hidden="true">🔍</span>
                  <p className="text-body font-semibold text-text-secondary">No hay compras</p>
                </li>
              :
                data.length !== 0 ?
                data.map((item: Buy, index: number) =>
                  <BuyRow
                    key={index}
                    item={item}
                    onSelect={setBuySelected}
                    onEdit={() => router.push(`/buy/editBuy/${item._id}`)}
                    onInfo={() => setOpenInfoBuy(true)}
                  />)
                :
                <li className="list-none flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <span className="select-none text-5xl leading-none" aria-hidden="true">📋</span>
                  <p className="text-body font-semibold text-text-secondary">No hay compras</p>
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
          openInfoBuy && 
          <InfoBuy open={openInfoBuy} handleClose={()=>setOpenInfoBuy(false)} id={buySelected} />
        }
    </PageContainer>
  )
}
