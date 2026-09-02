import { ExtendItemSale, ItemSale } from '@/interfaces/sale.interface'
import { useAppDispatch, useAppSelector } from '@/redux/hook'
import { deleteItemSale, downQTY10Sale, downQTYSale, getItemSale, getSale, onChangePrecioUnitarioSale, upQTY10Sale, upQTYSale } from '@/redux/saleSlice'
import React from 'react'
import ItemLineaVenta from './ItemLineaVenta'
import { Types } from 'mongoose'
import useLocalStorage from '@/hooks/useLocalStorage'
import apiClient from '@/utils/client'
import { setLoading } from '@/redux/loadingSlice'

export default function ListLineaVenta({edit}:{edit?: boolean}) {

    const itemSale = useAppSelector(getItemSale)
    const dispatch = useAppDispatch();
    const sale = useAppSelector(getSale)
    const [valueStorage , setValue] = useLocalStorage("user", "")

  return (
    <ul className="flex flex-1 w-full flex-col px-4 overflow-y-scroll max-h-[60vh] max-[625px]:px-0 max-[625px]:min-h-[35vh] max-[625px]:max-h-[40vh]">
        { 
            itemSale.length === 0 ? 'No se selecciono productos' :
            itemSale.map((item: ExtendItemSale, index:number)=>{
              return <ItemLineaVenta key={index} elem={item}
                onChangePrecioUnitario={(value:string, idProducto: string)=>dispatch(onChangePrecioUnitarioSale({value: value, idProducto: idProducto}))}
                onClick={() =>{
                  if (edit) {
                    if (sale._id) {
                      dispatch(setLoading(true));
                      apiClient.patch(`/itemSale/${item._id}`, {estado: false},{
                        headers: {
                            Authorization: `Bearer ${valueStorage.token}`
                        },
                      })
                      .then((r)=>{
                        dispatch(setLoading(false));
                        dispatch(deleteItemSale({id: item.idProducto}))
                      })
                      .catch((e)=>{
                        dispatch(setLoading(false))
                      })
                    }
                    return
                  }
                  dispatch(deleteItemSale({id: item.idProducto}))
                }}
                upQTY={() => dispatch(upQTYSale({id: item.idProducto}))}
                downQTY={() => dispatch(downQTYSale({id: item.idProducto}))}
                upQTY10={() => dispatch(upQTY10Sale({id: item.idProducto}))}
                downQTY10={() => dispatch(downQTY10Sale({id: item.idProducto}))} 
              />
            })
        }
    </ul>
  )
}
