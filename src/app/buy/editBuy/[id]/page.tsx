/* eslint-disable react-hooks/exhaustive-deps */
'use client'
import ContainerBuyMobile from '@/components/buy/ContainerBuyMobile'
import ContainerBuyWeb from '@/components/buy/ContainerBuyWeb'
import useLocalStorage from '@/hooks/useLocalStorage'
import { useResize } from '@/hooks/useResize'
import { Buy, ItemBuy } from '@/interfaces/buy.interface'
import { setBuy } from '@/redux/buySlice'
import { useAppDispatch } from '@/redux/hook'
import { setLoading } from '@/redux/loadingSlice'
import apiClient from '@/utils/client'
import { useEffect } from 'react'

interface ResponseBuy {
  r: Buy
  itemsBuy: ItemBuy[]
}

export default function EditBuy({ params }: { params: { id: string } }) {
  const [valueStorage] = useLocalStorage('user', '')
  const { ancho } = useResize()
  const { id } = params
  const dispatch = useAppDispatch()

  useEffect(() => {
    const getBuy = () => {
      dispatch(setLoading(true))
      apiClient
      .get(`/buy/${id}`, {
        headers: {
          Authorization: `Bearer ${valueStorage.token}`,
        },
      })
      .then(({ data }: { data: ResponseBuy }) => {
        dispatch(setLoading(false))
        console.log(data)
        dispatch(
          setBuy({
            buy: {
              _id: id,
              proveedor: data.r.proveedor,
              createdAt: data.r.createdAt,
              estado: data.r.estado,
              total: data.r.total,
              itemsBuy: data.itemsBuy,
            },
          })
        )
      })
      .catch((e) => {
        console.log(e)
        dispatch(setLoading(false))
      })
    }
    if (id) {
      getBuy()
    }
  }, [id])

  return (
    <div className='flex flex-1 max-[940px]:flex-col'>
      {ancho > 940 ? <ContainerBuyWeb edit={true} /> : <ContainerBuyMobile edit={true} />}
      {/* {
      (openAddProduct && productSelected) &&
      <AddBuyItem open={openAddProduct} handleClose={()=>setOpenAddProduct(false)} item={productSelected}
        onClickItem={(item:ExtendItemBuy)=>{
          setLineaCompra((prevData:ExtendItemBuy[])=>{
              const exist = prevData.find((elem:ExtendItemBuy)=>elem.idProducto===item.idProducto)
              if (exist) {
                  return prevData.map((elem: ExtendItemBuy) =>
                      elem.idProducto === item.idProducto ? item : elem
                  )
              }
              return [...prevData, item]
          })
          setOpenAddProduct(false)
        } }
      />
    } */}
    </div>
  )
}
