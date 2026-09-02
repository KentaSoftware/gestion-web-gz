import useLocalStorage from '@/hooks/useLocalStorage'
import { toast } from "sonner";
import apiClient from '@/utils/client'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useDispatch } from 'react-redux'
import Button from '../Button'
import Modal from '../Modal'
import { AsyncCombobox } from '@/components/ui/async-combobox'
import Input from '../Input'
import { setLoading } from '@/redux/loadingSlice'

const updatePriceSchema = z.object({
  categoria: z.string(),
  proveedor: z.string(),
  marca: z.string(),
  porcentaje: z.coerce.number().min(0.01, 'Debe ser mayor a 0'),
  NameCategoria: z.string().optional(),
  NameProveedor: z.string().optional(),
  NameMarca: z.string().optional(),
})

type UpdatePriceForm = z.infer<typeof updatePriceSchema>

const initialValues: UpdatePriceForm = {
  categoria: '',
  proveedor: '',
  marca: '',
  porcentaje: 0,
  NameCategoria: '',
  NameProveedor: '',
  NameMarca: '',
}

export default function UpdatePrice({open, handleClose}:{open: boolean, handleClose: ()=>void}) {

    const dispatch = useDispatch()
    const [valueStorage] = useLocalStorage('user', '')

    const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<UpdatePriceForm>({
        // zodResolver type inference for z.coerce.number() returns unknown;
        // cast is safe because runtime behavior handles coercion correctly.
        resolver: zodResolver(updatePriceSchema) as any,
        defaultValues: initialValues,
    })

    const onSubmit = (formValue: UpdatePriceForm) => {
        dispatch(setLoading(true));
        if (formValue.porcentaje <= 0) {
          toast.error('Porcentaje tiene que ser mayor a 0')
          return 
        }
        if (formValue.categoria !== '' || formValue.marca !== '' || formValue.proveedor !== '') {
          apiClient.patch(`/product`, formValue,
          {
            headers: {
              Authorization: `Bearer ${valueStorage.token}`
            }
          })
          .then(async(response)=>{
            reset()
            handleClose()
            dispatch(setLoading(false));
          })
          .catch(e=>console.log("error", e))
        }else{
          toast.error('Tiene que elegir algun filtro')
          dispatch(setLoading(false));
          return 
        }
    }

  return (
    <Modal open={open} eClose={handleClose} title='Actualizar precios' height='auto' >
        <AsyncCombobox
            value={watch('categoria') ?? ''}
            onChange={(id: string, item: any)=>{
              setValue('categoria', id)
              setValue('NameCategoria', item?.descripcion ?? '')
            }}
            name={'Categoria'} path={'categorie'}
        />
        <AsyncCombobox
            value={watch('proveedor') ?? ''}
            onChange={(id: string, item: any)=>{
              setValue('proveedor', id)
              setValue('NameProveedor', item?.descripcion ?? '')
            }}
            name={'Proveedor'} path={'provider'}
        />
        <AsyncCombobox
            value={watch('marca') ?? ''}
            onChange={(id: string, item: any)=>{
              setValue('marca', id)
              setValue('NameMarca', item?.descripcion ?? '')
            }}
            name={'Marca'} path={'brand'}
        />
        <Input label={'Porcentaje'} type='number' value={watch('porcentaje') ?? 0} {...register('porcentaje')} />
        {errors.porcentaje && <p className="text-left text-red-500">{errors.porcentaje.message}</p>}
        <div className='flex justify-center'>
          <Button text='Actualizar' onClick={handleSubmit(onSubmit)}/>
        </div>
    </Modal>
  )
}
