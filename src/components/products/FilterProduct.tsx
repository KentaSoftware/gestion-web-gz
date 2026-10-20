/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import apiClient from '@/utils/client'
import Button from '../Button'
import { useAppDispatch } from '@/redux/hook'
import { setLoading } from '@/redux/loadingSlice'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface CBP {
  _id: (string | number)
  descripcion: string
}

export default function FilterProduct({open, handleClose, activeCategorie, activeBrand, activeProvider, selectCategorie, selectBrand, selectProvider}:
    {open: boolean, handleClose: ()=>void, activeCategorie: CBP, activeBrand: CBP, activeProvider: CBP,
      selectCategorie: (item: CBP)=>void, selectBrand: (item: CBP)=>void, selectProvider: (item: CBP)=>void}) {

    const [categorie, setCategorie] = useState<CBP[]>([])
    const [brand, setBrand] = useState<CBP[]>([])
    const [provider, setProvider] = useState<CBP[]>([])
    const dispatch = useAppDispatch();

    const getCategorie = () => {
      dispatch(setLoading(true));
      apiClient.get(`/categorie`)
      .then(function(response){
        setCategorie([ {_id: 1 , descripcion: 'Todas'}, ...response.data])
        dispatch(setLoading(false));
      })
      .catch(function(error){
          console.log("get",error);
          dispatch(setLoading(false));
      })
    }

    const getBrand = () => {
      dispatch(setLoading(true));
      apiClient.get(`/brand`)
      .then(function(response){
        setBrand([ {_id: 1 , descripcion: 'Todas'}, ...response.data])
        dispatch(setLoading(false));
      })
      .catch(function(error){
          console.log("get",error);
          dispatch(setLoading(false));
      })
    }

    const getProvider = () => {
        dispatch(setLoading(true));
        apiClient.get(`/provider`)
        .then(function(response){
          setProvider([ {_id: 1 , descripcion: 'Todas'}, ...response.data])
          dispatch(setLoading(false));
        })
        .catch(function(error){
            console.log("get",error);
            dispatch(setLoading(false));
        })
    }

    useEffect(()=>{
        if (true) {
          getCategorie()
          getBrand()
          getProvider()
        }
    }, [open])

  return (
    <div className="flex w-full mb-2.5 max-sm:flex-wrap">
      <Select
        value={String(activeCategorie._id)}
        onValueChange={(val) => {
          const item = categorie.find(i => String(i._id) === val);
          if (item) selectCategorie(item);
        }}
      >
        <SelectTrigger className="mx-1 min-w-[150px] max-w-[315px]">
          <SelectValue placeholder="Categorias" />
        </SelectTrigger>
        <SelectContent>
          {categorie.map(item => (
            <SelectItem key={item._id} value={String(item._id)}>{item.descripcion}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={String(activeBrand._id)}
        onValueChange={(val) => {
          const item = brand.find(i => String(i._id) === val);
          if (item) selectBrand(item);
        }}
      >
        <SelectTrigger className="mx-1 min-w-[150px] max-w-[315px]">
          <SelectValue placeholder="Marcas" />
        </SelectTrigger>
        <SelectContent>
          {brand.map(item => (
            <SelectItem key={item._id} value={String(item._id)}>{item.descripcion}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={String(activeProvider._id)}
        onValueChange={(val) => {
          const item = provider.find(i => String(i._id) === val);
          if (item) selectProvider(item);
        }}
      >
        <SelectTrigger className="mx-1 min-w-[150px] max-w-[315px]">
          <SelectValue placeholder="Proveedores" />
        </SelectTrigger>
        <SelectContent>
          {provider.map(item => (
            <SelectItem key={item._id} value={String(item._id)}>{item.descripcion}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
