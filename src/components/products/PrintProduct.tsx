/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react'
import apiClient from '@/utils/client';
import useLocalStorage from '@/hooks/useLocalStorage';
import Modal from '../Modal';
import { setLoading } from '@/redux/loadingSlice';
import { useAppDispatch } from '@/redux/hook';
import Button from '../Button';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface CBP {
  _id: (string | number) 
  descripcion: string
}

export default function PrintProduct({open, handleClose}:{open: boolean, handleClose: ()=>void}) {

  const [categorie, setCategorie] = useState<CBP[]>([])
  const [selectCategorie, setSelectCategorie] = useState<CBP[]>([{
    _id: 0,
    descripcion: 'Todas'
  }])
  const dispatch = useAppDispatch();
  const [valueStorage , setValue] = useLocalStorage("user", "")
  const [isPrecioUnitario, setIsPrecioUnitario] = useState(true)

  useEffect(()=>{
    const getCategorie = () => {
      dispatch(setLoading(true));
      apiClient.get(`/categorie`)
      .then(function(response){
        console.log(response.data)
        setCategorie(prevData => [{
          _id: 0,
          descripcion: 'Todas'
        }, ...response.data])
        dispatch(setLoading(false));
      })
      .catch(function(error){
          console.log("get",error);
          dispatch(setLoading(false));
      })
    }

    if (open) {
      getCategorie()
    }
}, [open])

  return (
    <Modal open={open} eClose={handleClose} title='Imprimir productos' width='60%' height='auto' >
        <h2 className="font-body text-lg font-semibold text-text-primary max-[500px]:text-body">Categorias :</h2>
        <div className="flex overflow-x-scroll" >
          {
            categorie.map((item: CBP, index: number) => {
              const isActive = selectCategorie.some(elem => elem._id === item._id)

              return <button key={index} type="button" className={`m-[15px] cursor-pointer rounded-md border-2 px-[15px] py-[5px] font-body text-sm transition-colors ${isActive ? 'border-brand-primary bg-brand-primary text-text-inverse' : 'border-border-subtle bg-surface-base text-text-primary hover:border-brand-primary hover:bg-brand-primary hover:text-text-inverse'}`}
               onClick={()=>{
                 setSelectCategorie((prevData: CBP[])=>{
                   if (item._id !== 0) {
                     let clearPrev = prevData.filter((itemPrev)=>itemPrev._id !== 0 && itemPrev._id !== item._id)
                    return [...clearPrev, item]
                  }
                  return [item]
                  
                 })
               }}
             >
               {item.descripcion}
            </button>
            })
          }
        </div>
        <h2 className="font-body text-lg font-semibold text-text-primary max-[500px]:text-body">Tipo de precio :</h2>
        <div className="ml-[15px] flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Checkbox id="precio-unitario" checked={isPrecioUnitario} onCheckedChange={()=>setIsPrecioUnitario(!isPrecioUnitario)} />
            <Label htmlFor="precio-unitario" className="cursor-pointer">Precio unitario</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="precio-descuento" checked={!isPrecioUnitario} onCheckedChange={()=>setIsPrecioUnitario(!isPrecioUnitario)} />
            <Label htmlFor="precio-descuento" className="cursor-pointer">Precio descuento</Label>
          </div>
        </div>
        <div className="mb-[15px] flex justify-center" >
          <Button text='Imprimir' onClick={()=>{
            dispatch(setLoading(true))
            let filterCategorie = selectCategorie.map(item=>item._id !== 0 && item.descripcion)
            apiClient.post(`/product/print/print`, {categories: filterCategorie[0] !== false ? filterCategorie : undefined, isPrecioUnitario: isPrecioUnitario}, { responseType: 'blob',
              headers: {
                Authorization: `Bearer ${valueStorage.token}`
              },
             }) // Importante: usar 'blob' para recibir el PDF
            .then(response => {
              const blob = new Blob([response.data], { type: 'application/pdf' });
              const url = window.URL.createObjectURL(blob);

              // Crear un enlace temporal para descargar el archivo
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', `ListaDePrecios.pdf`); // Nombre del archivo descargado
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);

              // Liberar memoria
              window.URL.revokeObjectURL(url);
              dispatch(setLoading(false))
            })
            .catch(error => {
              console.error('Error descargando el PDF:', error);
              dispatch(setLoading(false))
            });
          }} />
        </div>
    </Modal>
  );
}
