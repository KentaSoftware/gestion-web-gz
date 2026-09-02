import Modal from '../Modal'
import Input from '../Input'
import { AsyncComboboxWithActions } from '@/components/ui/async-combobox'
import Button from '../Button'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import apiClient from '@/utils/client'
import useLocalStorage from '@/hooks/useLocalStorage'
import { setLoading } from '@/redux/loadingSlice'
import { useAppDispatch } from '@/redux/hook'
import { toast } from "sonner";

const productSchema = z.object({
  _id: z.string().optional(),
  descripcion: z.string().min(1, 'Required'),
  codigoBarra: z.string().optional(),
  precioBulto: z.coerce.number().optional(),
  precioCompra: z.coerce.number().optional(),
  precioUnitario: z.coerce.number().min(0.01, 'Debe ser mayor a 0'),
  precioDescuento: z.coerce.number().optional(),
  stock: z.coerce.number().min(0, 'Debe ser mayor o igual a 0'),
  sabor: z.string().optional(),
  bulto: z.coerce.number().optional(),
  categoria: z.string().min(1, 'Required'),
  marca: z.string().min(1, 'Required'),
  proveedor: z.string().min(1, 'Required'),
  NameCategoria: z.string().optional(),
  NameMarca: z.string().optional(),
  NameProveedor: z.string().optional(),
  peso: z.object({
    cantidad: z.number(),
    unidad: z.string(),
  }).optional(),
})

type ProductForm = z.infer<typeof productSchema>

const initialValue: ProductForm = {
  _id: '',
  descripcion: '',
  codigoBarra: '',
  precioBulto: 0,
  precioCompra: 0,
  precioUnitario: 0,
  precioDescuento: 0,
  stock: 0,
  sabor: '',
  bulto: 0,
  categoria: '',
  marca: '',
  proveedor: '',
  NameCategoria: '',
  NameMarca: '',
  NameProveedor: '',
}

export default function NewProduct({open, handleClose}:{open: boolean, handleClose: ()=>void}) {
    const [valueStorage] = useLocalStorage('user', '')
    const dispatch = useAppDispatch();

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProductForm>({
      // zodResolver type inference for z.coerce.number() returns unknown;
      // cast is safe because runtime behavior handles coercion correctly.
      resolver: zodResolver(productSchema) as any,
      defaultValues: initialValue,
    })

    const onSubmit = (formValue: ProductForm) => {
      if (formValue.descripcion === '' || formValue.stock <= 0 || formValue.precioUnitario <= 0){
        toast.error('Falta descripcion o stock o precio unitario o son menor a 0')
        return
      }
      if (formValue.categoria === '' || formValue.proveedor === '' || formValue.marca === ''){
        toast.error('Falta categoria o proveedor o marca')
        return
      }
      dispatch(setLoading(true))
      let dataToSend: any
      if (formValue._id === "" || formValue._id === null || formValue._id === undefined) {
        const { _id, ...rest } = formValue
        dataToSend = rest
      } else {
        dataToSend = formValue
      }
      console.log("formValue", dataToSend)
      apiClient.post(`/product`, dataToSend,
      {
        headers: {
          Authorization: `Bearer ${valueStorage.token}`
        }
      })
      .then(async (r)=>{
        dispatch(setLoading(false))
        toast.success('Producto creado correctamente')
        handleClose()
      })
      .catch((e)=>{
        console.log(e.response)
        dispatch(setLoading(false))
        toast.error(e.response.data.error)
      })
    }

    return (
      <Modal open={open} title={'Nuevo producto'} eClose={handleClose} height='auto' >
        <Input label={'Descripcion'} type='text' value={watch('descripcion') ?? ''} {...register('descripcion')} />
        {errors.descripcion && <p className="text-left text-red-500">{errors.descripcion.message}</p>}
        {/* <Input label={'Codigo de barra'} type='text' value={watch('codigoBarra') ?? ''} {...register('codigoBarra')} />
        <Input label={'Precio bulto'} type='number' value={watch('precioBulto') ?? 0} {...register('precioBulto')} /> */}
        <Input label={'Precio compra'} type='number' value={watch('precioCompra') ?? 0} {...register('precioCompra')} />
        <Input label={'Precio unitario'} type='number' value={watch('precioUnitario') ?? 0} {...register('precioUnitario')} />
        {errors.precioUnitario && <p className="text-left text-red-500">{errors.precioUnitario.message}</p>}
        <Input label={'Precio descuento'} type='number' value={watch('precioDescuento') ?? 0} {...register('precioDescuento')} />
        <Input label={'Stock'} type='number' value={watch('stock') ?? 0} {...register('stock')} />
        {errors.stock && <p className="text-left text-red-500">{errors.stock.message}</p>}
        <Input label={'Sabor'} type='text' value={watch('sabor') ?? ''} {...register('sabor')} />
        {/* <Input label={'Bulto'} type='number' value={watch('bulto') ?? 0} {...register('bulto')} /> */}
        <AsyncComboboxWithActions value={watch('categoria') ?? ''} name="Categoria" path="categorie" onChange={(id: any, item: any)=>{
            setValue('categoria', id)
            setValue('NameCategoria', item?.descripcion ?? '')
          }} />
        <AsyncComboboxWithActions value={watch('marca') ?? ''} name="Marca" path="brand" onChange={(id: any, item: any)=>{
            setValue('marca', id)
            setValue('NameMarca', item?.descripcion ?? '')
          }} />
        <AsyncComboboxWithActions value={watch('proveedor') ?? ''} name="Proveedor" path="provider" onChange={(id: any, item: any)=>{
            setValue('proveedor', id)
            setValue('NameProveedor', item?.descripcion ?? '')
          }} />
        <div className='mb-[15px] flex justify-center'>
          <Button text='Crear' onClick={handleSubmit(onSubmit)}/>
        </div>
      </Modal>
    )
}
