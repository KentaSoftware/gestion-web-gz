/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import DataTable from '../DataTable';
import type { DataColumn } from '../DataTable';
import apiClient from '@/utils/client';
import useLocalStorage from '@/hooks/useLocalStorage';
import Logo from '../Logo';
import Modal from '../Modal';
import { Types } from 'mongoose';
import { Buy, ExtendItemBuy, ItemBuy } from '@/interfaces/buy.interface';
import { setLoading } from '@/redux/loadingSlice';
import { useAppDispatch } from '@/redux/hook';

interface ResponseSale {
  r: Buy
  itemsBuy: ItemBuy[]
}

export default function InfoBuy({open, handleClose, id}:{open:boolean, handleClose: ()=>void , id:Types.ObjectId | undefined | string}) {

  const [buy, setBuy] = useState<ResponseSale | undefined>(undefined)
  const [valueStorage] = useLocalStorage('user', '');
  const dispatch = useAppDispatch();

  const getBuy = () => {
    dispatch(setLoading(true));
    apiClient.get(`/buy/${id}`,{
      headers: {
          Authorization: `Bearer ${valueStorage.token}`
      },
  })
    .then(({data}:{data:ResponseSale})=>{setBuy(data);dispatch(setLoading(false));})
    .catch((e)=>{console.log(e);dispatch(setLoading(false));})
  }

  useEffect(()=> {
    getBuy()
  },[id])

  return (
    <Modal open={open} title={'Info de la compra'} eClose={handleClose} height='auto' width='60%' >
      <div>
        <div id={`print`}>
        {
          buy && 
          <>
          <Logo/>
          <div>
              <h5 className="my-2.5 px-[15px] text-base font-medium text-text-primary max-md:text-sm">Proveedor : {buy.r.proveedor}</h5>
              <h5 className="my-2.5 px-[15px] text-base font-medium text-text-primary max-md:text-sm">FECHA : {buy.r.createdAt.split('T')[0]}</h5>
            </div>
            <div>
              <DataTable
                data={buy.itemsBuy as ExtendItemBuy[]}
                columns={columns}
              />
            </div>
            <h5 className="my-2.5 px-[15px] text-right text-base font-medium text-text-primary max-md:text-sm">TOTAL : $ {buy.r.total}</h5>
          </>
        }
        </div>
      </div>
    </Modal>
  );
}

const formatPrice = (value: unknown): string => `$ ${String(value ?? '')}`

const columns: DataColumn<ExtendItemBuy>[] = [
  { key: 'descripcion', header: 'Producto', width: '40%' },
  { key: 'cantidad', header: 'Cantidad', width: '20%', align: 'center' },
  { key: 'precio', header: 'Precio', width: '20%', align: 'center', render: (v) => formatPrice(v) },
  { key: 'total', header: 'Total', width: '20%', align: 'center', render: (v) => formatPrice(v) },
];
