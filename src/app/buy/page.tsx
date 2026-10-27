'use client'

import { AnimatedNumber } from '@/components/AnimatedNumber'
import Button from '@/components/Button'
import ButtonUI from '@/components/ButtonUI'
import InfoBuy from '@/components/buy/InfoBuy'
import InfoSale from '@/components/sale/InfoSale'
import ModalPrintSale from '@/components/sale/ModalPrintSale'
import Search from '@/components/Search'
import useLocalStorage from '@/hooks/useLocalStorage'
import { usePermission } from '@/hooks/usePermission'
import { Buy } from '@/interfaces/buy.interface'
import { Permission } from '@/interfaces/auth.interface'
import { useAppDispatch } from '@/redux/hook'
import { getLoading, setLoading } from '@/redux/loadingSlice'
import { getUser, setUser } from '@/redux/userSlice'
import apiClient from '@/utils/client'
import { providerLabel } from '@/utils/providerLabel'
import { providerService } from '@/services/provider.service'
import { Provider } from '@/interfaces/purchaseDoc.interface'
import { Types } from 'mongoose'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { useRouter } from 'next/navigation'
import React, { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import { BsPrinterFill } from 'react-icons/bs'
import { MdEdit, MdInfo } from 'react-icons/md'
import { useSelector } from 'react-redux'
import styled from 'styled-components'

export default function BuyScreen() {

    const [search, setSearch] = useState<string>('')
    const [data, setData] = useState<Buy[]>([])
    const [longArray, setLongArray] = useState<number>(0)
    const [dataSearch, setDataSearch] = useState<Buy[]>([])
    const user = useSelector(getUser)
    const { hasPermission } = usePermission()
    const canCreateBuy = hasPermission(Permission.CREATE_BUY)
    const [valueStorage , setValue] = useLocalStorage("user", "")
    const dispatch = useAppDispatch();
    const router: AppRouterInstance = useRouter()
    const {open: loading} = useSelector(getLoading)
    const [buySelected, setBuySelected] = useState< Types.ObjectId | undefined | string>(undefined)
    const [openInfoBuy, setOpenInfoBuy] = useState<boolean>(false)
    const [query, setQuery] = useState<{skip: number, limit: number}>({skip: 0, limit: 25})
    const [providers, setProviders] = useState<Provider[]>([])
    const observer = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
      let cancelled = false
      providerService
        .getProviders()
        .then((list) => { if (!cancelled) setProviders(list) })
        .catch(() => { if (!cancelled) setProviders([]) })

      return () => { cancelled = true }
    }, [])

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
    <main>
        <ContainerSearch>
          <Search name='search' placeHolder={'Buscar compras'} type='text' value={search} onChange={(e:ChangeEvent<HTMLInputElement>)=>setSearch(e.target.value)} />
          <ButtonUI label='NUEVO'  onClick={()=>{}} to='/buy/newBuy'/>
          {canCreateBuy && <ButtonUI label='CARGA INTELIGENTE' onClick={()=>{}} to='/buy/smart-upload'/>}
        </ContainerSearch>
        <ListSale>
            {
              search !== '' ?
                dataSearch.length !== 0 ?
                dataSearch.map((item:Buy, index:number)=>
                <Item key={index} onClick={()=>setBuySelected(item._id)} >
                  <ContainerTag >
                    <div>
                      <Tag>{providerLabel(providers, item.proveedor)}</Tag>
                      <TagDate>{item.createdAt.split("T")[0]}</TagDate>
                      {item.duplicateOf && <DuplicateTag>DUPLICADO</DuplicateTag>}
                    </div>
                    <Tag style={{fontWeight: 600, color: '#FA9B50'}}>$ <AnimatedNumber value={item.total}  /></Tag>
                  </ContainerTag>
                  <div  style={{display: 'flex'}}>
                    <ButtonUI label='CONTROL' onClick={()=>{
                        router.push(`/buy/editBuy/${item._id}`);
                      }}/>
                    <ButtonUI label='EDITAR' onClick={()=>{
                        router.push(`/buy/editBuy/${item._id}`);
                      }}/>
                    <ButtonUI label='+INFO'  onClick={()=>setOpenInfoBuy(true)}/>
                  </div>  
                </Item>)
                :
                'no hay compras'
              :
                data.length !== 0 ?
                data.map((item:Buy, index:number)=>
                <Item key={index} onClick={()=>setBuySelected(item._id)} >
                  <ContainerTag >
                    <div>
                      <Tag>{providerLabel(providers, item.proveedor)}</Tag>
                      <TagDate>{item.createdAt.split("T")[0]}</TagDate>
                      {item.duplicateOf && <DuplicateTag>DUPLICADO</DuplicateTag>}
                    </div>
                    <Tag style={{fontWeight: 600, color: '#FA9B50'}}>$ <AnimatedNumber value={item.total}  /></Tag>
                  </ContainerTag>
                  <div  style={{display: 'flex'}}>
                    <ButtonUI label='EDITAR' onClick={()=>{
                        router.push(`/buy/editBuy/${item._id}`);
                      }}/>
                    <ButtonUI label='+INFO'  onClick={()=>setOpenInfoBuy(true)}/>
                  </div>
                </Item>)
                :
                'no hay compras'
            }
            {search === '' && data.length < longArray && (
              <li
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 15,
                  minHeight: 5
                }}
                ref={lastElementRef}
              >
                final
              </li>
            )}
        </ListSale>
        {
          openInfoBuy && 
          <InfoBuy open={openInfoBuy} handleClose={()=>setOpenInfoBuy(false)} id={buySelected} />
        }
    </main>
  )
}

const ContainerSearch = styled.div `
  display: flex; 
  justify-content: space-between; 
  width: 100%; 
  padding: 0px 15px; 
  align-items: center;
  @media only screen and (max-width: 500px) {
    flex-direction: column;
  }
`

const Item = styled.li `
  list-style: none;
  padding: 15px;
  font-weight: 600;
  width: 100%;
  margin-bottom: 5px;
  margin-top: 5px;
  display: flex; 
  justify-content: center; 
  align-items: center;
  border-radius: 10px;
  min-height: 70px;  
  height: auto;  
  cursor: pointer;
  background-color: #FFF;
  box-shadow: 5px 5px 5px #e0e0e0;
  transition: background-color .5s linear, border-color .1s ease;
  &:hover {
    border: 1px solid #6A5BCD;
    background-color: rgba(217, 217, 217, 0.3);
  }
  @media only screen and (max-width: 500px) {
    padding: 15px 15px 15px 15px;
    flex-direction: column;
  }
`

const IconWrapper = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 25px;
    color: #716A6A;
    padding: 5px 15px;
    margin: 0px 5px;
    border-left: 1px solid #d9d9d9;
    cursor: pointer;
    &:hover {
        background-color: #d9d9d9;
    }
`

const ListSale = styled.ul `
  display: flex;
  flex: 1;
  width: 100%;
  flex-direction: column;
  padding: 0 15px;
  overflow: scroll;
  max-height: 82vh;
`

const ContainerTag = styled.div`
  display: flex; 
  justify-content: space-between; 
  width : 100%; 
  align-items: center;
  margin-right: 15px;
  @media only screen and (max-width: 500px) {
    margin-right: 0px;
  }
`

const Tag = styled.h2`
  font-size: 18px;
  color: #252525;
  @media only screen and (max-width: 500px) {
    font-size: 14px;
  }
`

const TagDate = styled.h2`
  font-size: 14px;
  color: #252525;
  @media only screen and (max-width: 500px) {
    font-size: 12px;
  }
`

const DuplicateTag = styled.span`
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #fdecea;
  border: 1px solid #f5c2c0;
  color: #a33a33;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  vertical-align: middle;
`