/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react'
import styled, { CSSProperties } from 'styled-components';
import Table from '../Table';
import apiClient from '@/utils/client';
import useLocalStorage from '@/hooks/useLocalStorage';
import Logo from '../Logo';
import Modal from '../Modal';
import { Types } from 'mongoose';
import { Buy, ItemBuy } from '@/interfaces/buy.interface';
import { setLoading } from '@/redux/loadingSlice';
import { useAppDispatch } from '@/redux/hook';
import { providerLabel } from '@/utils/providerLabel';
import { providerService } from '@/services/provider.service';
import { Provider } from '@/interfaces/purchaseDoc.interface';
import { formatCurrency } from '@/utils/validators';
import { formatCalendarDate } from '@/utils/dates';

interface ResponseSale {
  r: Buy
  itemsBuy: ItemBuy[]
}

interface Column {
  label: string
  field: string
  width: string
  align?: CSSProperties['textAlign']
  price?: boolean
  date?: boolean
}

export default function InfoBuy({open, handleClose, id}:{open:boolean, handleClose: ()=>void , id:Types.ObjectId | undefined | string}) {

  const [buy, setBuy] = useState<ResponseSale | undefined>(undefined)
  const [providers, setProviders] = useState<Provider[]>([])
  const [valueStorage , setValue] = useLocalStorage("user", "")
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

  useEffect(() => {
    let cancelled = false;
    providerService
      .getProviders()
      .then((list) => { if (!cancelled) setProviders(list); })
      .catch(() => { if (!cancelled) setProviders([]); });

    return () => { cancelled = true; };
  }, []);

  return (
    <Modal open={open} title={'Info de la compra'} eClose={handleClose} height='auto' width='60%' >
      <div>
        <div id={`print`}>
        {
          buy && 
          <>
          <Logo/>
          <div>
              <Tag>Proveedor : {providerLabel(providers, buy.r.proveedor)}</Tag>
              <Tag>FECHA : {formatCalendarDate(buy.r.createdAt)}</Tag>
            </div>
            <div>
              <Table
                data={buy.itemsBuy}
                columns={columns}
                maxHeight={false}
                onClick={() => ''}
              />
            </div>
            <Tag style={{ textAlign: 'end' }}>TOTAL : {formatCurrency(Number(buy.r.total) || 0)}</Tag> 
          </>
        }
        </div>
      </div>
    </Modal>
  );
}

const columns: Column[] = [
  { label: 'Producto', field: 'descripcion', width: '40%' },
  { label: 'Cantidad', field: 'cantidad', width: '20%', align: 'center' },
  { label: 'Precio', field: 'precio', width: '20%', align: 'center', price: true },
  { label: 'Total', field: 'total', width: '20%', align: 'center', price: true },
];



const Tag = styled.h5`
  font-size: 16px;
  padding: 0 15px;
  font-weight: 500;
  margin: 10px 0;
  color: ${process.env.TEXT_COLOR};
  @media only screen and (max-width: 768px) {
    font-size: 14px;
  }
`;