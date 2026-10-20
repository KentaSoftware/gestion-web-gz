/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import DataTable from '../DataTable';
import type { DataColumn } from '../DataTable';
import apiClient from '@/utils/client';
import useLocalStorage from '@/hooks/useLocalStorage';
import Logo from '../Logo';
import Modal from '../Modal';
import { Types } from 'mongoose';
import { ExtendItemSale, ItemSale, Sale } from '@/interfaces/sale.interface';
import { useDispatch } from 'react-redux';
import { setLoading } from '@/redux/loadingSlice';

interface ResponseSale {
  r: Sale
  itemsSale: ItemSale[]
}

export default function InfoSale({open, handleClose, id}:{open:boolean, handleClose: ()=>void, id:string | Types.ObjectId | undefined}) {

  const [sale, setSale] = useState<ResponseSale | undefined>(undefined)
  const [valueStorage , setValue] = useLocalStorage("user", "")
  const dispatch = useDispatch()

  const getSale = () => {
    dispatch(setLoading(true));
    apiClient.get(`/sale/${id}`,{
      headers: {
          Authorization: `Bearer ${valueStorage.token}`
      },
  })
    .then(({data}:{data: ResponseSale})=>{setSale(data);dispatch(setLoading(false));})
    .catch((e)=>{console.log(e);dispatch(setLoading(false));})
  }

  useEffect(()=> {
    getSale()
  },[id])

  return (
    <Modal open={open} title={'Info de la venta'} eClose={handleClose} height='auto' width='60%' >
      <div>
        <div id={`print`}>
        {
          sale && 
          <>
            <Logo/>
            <div>
              <h5 className="my-2.5 px-[15px] text-base font-medium text-text-primary max-md:text-sm">CLIENTE : {sale.r.cliente}</h5>
              <h5 className="my-2.5 px-[15px] text-base font-medium text-text-primary max-md:text-sm">FECHA : {sale.r.createdAt.split("T")[0]}</h5>
            </div>
            <div>
              <DataTable
                data={sale.itemsSale as ExtendItemSale[]}
                columns={columns}
              />
            </div>
            <h5 className="my-2.5 px-[15px] text-right text-base font-medium text-text-primary max-md:text-sm">TOTAL : $ {sale.r.total}</h5>
          </>
        }
        </div>
      </div>
    </Modal>
  );
}

const formatPrice = (value: unknown): string => `$ ${String(value ?? '')}`

const columns: DataColumn<ExtendItemSale>[] = [
  { key: 'descripcion', header: 'Producto', width: '50%' },
  { key: 'cantidad', header: 'Cantidad', width: '20%', align: 'center' },
  { key: 'total', header: 'Total', width: '30%', align: 'center', render: (v) => formatPrice(v) },
];
