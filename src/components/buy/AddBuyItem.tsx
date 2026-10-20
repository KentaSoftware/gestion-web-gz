import React from 'react'
import Modal from '../Modal'
import { Product } from '@/interfaces/product.interface'
import { ExtendItemBuy, ItemBuy } from '@/interfaces/buy.interface'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Input from '../Input'
import Button from '../Button'
import { toast } from "sonner";
import { AnimatedNumber } from '../AnimatedNumber'

const AddBuyItemSchema = z.object({
  idProducto: z.any(),
  cantidad: z.number(),
  total: z.number(),
  precio: z.number(),
  descripcion: z.string(),
  NameCategoria: z.string().optional(),
  estado: z.boolean(),
})

type AddBuyItemForm = z.infer<typeof AddBuyItemSchema>

export default function AddBuyItem({open, handleClose, item, onClickItem}:{open: boolean, handleClose: ()=>void, item: Product, onClickItem: (item:ExtendItemBuy)=>void}) {

    const initialValue: AddBuyItemForm = {
        idProducto: item._id,
        cantidad: 0,
        total: 0,
        precio: 0,
        descripcion: item.descripcion,
        NameCategoria: item.NameCategoria,
        estado: true
    }

    const { register, handleSubmit, watch } = useForm<AddBuyItemForm>({
        resolver: zodResolver(AddBuyItemSchema),
        defaultValues: initialValue,
    })

    const onSubmit = (formValue: AddBuyItemForm) => {
        if (formValue.cantidad <= 0 && formValue.precio <= 0) {
            toast.warning('Falta ingresar cantidad o precio')
            return
        }
        onClickItem({ ...formValue, total: formValue.cantidad * formValue.precio })
    }

  return (
    <Modal open={open} eClose={handleClose} title='Agregar producto a la compra' width='40%' height='auto'  >
        <h2 className="text-base text-text-primary my-[15px]">{item.descripcion}</h2>
        <Input label={'Cantidad'} type='number' value={watch('cantidad') ?? 0} {...register('cantidad', { valueAsNumber: true })} />
        <Input label={'Precio compra'} type='number' value={watch('precio') ?? 0} {...register('precio', { valueAsNumber: true })} />
        <h2 className="text-base text-text-primary">Total: $<AnimatedNumber value={watch('cantidad') * watch('precio')} /></h2>
        <div className="flex justify-around mt-[15px]">
            <Button text='Cancelar' variant='secondary' className="mx-1 my-1 px-3.5 shadow-sm hover:bg-brand-primary hover:text-text-inverse hover:border-brand-primary active:translate-y-px" onClick={handleClose} />
            <Button text='Agregar' variant='secondary' className="mx-1 my-1 px-3.5 shadow-sm hover:bg-brand-primary hover:text-text-inverse hover:border-brand-primary active:translate-y-px" onClick={handleSubmit(onSubmit)}/>
        </div>
    </Modal>
  )
}
