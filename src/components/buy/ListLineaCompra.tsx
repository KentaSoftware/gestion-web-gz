import { ExtendItemSale, ItemSale } from '@/interfaces/sale.interface'
import { useAppDispatch, useAppSelector } from '@/redux/hook'
import React from 'react'
import ItemLineaCompra from './ItemLineaCompra'
import { deleteItemBuy, downQTY10Buy, downQTYBuy, getBuy, getItemBuy, onChangePrecioUnitarioBuy, upQTY10Buy, upQTYBuy } from '@/redux/buySlice'
import { ExtendItemBuy } from '@/interfaces/buy.interface'
import apiClient from '@/utils/client'
import { setLoading } from '@/redux/loadingSlice'
import useLocalStorage from '@/hooks/useLocalStorage'

export default function ListLineaCompra({edit}:{edit?: boolean}) {

    const itemBuy = useAppSelector(getItemBuy)
    const dispatch = useAppDispatch();
    const buy = useAppSelector(getBuy)

    const [valueStorage , setValue] = useLocalStorage("user", "")

  return (
    <ul className="flex flex-1 w-full flex-col px-4 overflow-y-scroll max-h-[60vh] max-[625px]:px-0 max-[625px]:min-h-[35vh] max-[625px]:max-h-[40vh]">
        { 
            itemBuy.length === 0 ? 'No se selecciono productos' :
            itemBuy.map((item: ExtendItemBuy, index:number)=>{
              return <ItemLineaCompra key={index} elem={item}
                onChangePrecioCompra={(value:string, idProducto: string)=>dispatch(onChangePrecioUnitarioBuy({value: value, idProducto: idProducto}))}
                onClick={() =>{
                  if (edit) {
                    if (buy._id) {
                      dispatch(setLoading(true));
                      apiClient.patch(`/itemBuy/${item._id}`, {estado: false},{
                        headers: {
                            Authorization: `Bearer ${valueStorage.token}`
                        },
                      })
                      .then((r)=>{
                        dispatch(setLoading(false));
                        dispatch(deleteItemBuy({id: item.idProducto}))
                      })
                      .catch((e)=>{
                        dispatch(setLoading(false))
                      })
                    }
                    return
                  }
                  dispatch(deleteItemBuy({id: item.idProducto}))
                }}
                upQTY={() => {dispatch(upQTYBuy({id: item.idProducto}))}}
                downQTY={() => {dispatch(downQTYBuy({id: item.idProducto}))}}
                upQTY10={() => {dispatch(upQTY10Buy({id: item.idProducto}))}}
                downQTY10={() => {dispatch(downQTY10Buy({id: item.idProducto}))}} 
              />
            })
        }
    </ul>
  )
}
