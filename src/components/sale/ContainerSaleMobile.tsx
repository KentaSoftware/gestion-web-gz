import { useState } from 'react'
import FindProductSale from './FindProductSale'
import { addItemSale, getSale } from '@/redux/saleSlice';
import { Product } from '@/interfaces/product.interface';
import { useAppDispatch, useAppSelector } from '@/redux/hook';
import LineaVenta from './LineaVenta';
import { cn } from '@/lib/cn';

export default function ContainerSaleMobile({edit}:{edit?: boolean}) {

    const dispatch = useAppDispatch();
    const [openLVMobile, setOpenLVMobile] = useState<boolean>(false)
    const sale = useAppSelector(getSale)

  return (
    <div className="relative flex flex-1 flex-col">
        <div className="w-1/2 max-[940px]:w-full">
          <FindProductSale
              onClickItem={(item:Product)=>{dispatch(addItemSale({item}))}}
          />
        </div>
        <div
          className={cn(
            'absolute w-full rounded-[15px] border border-border-subtle bg-surface-subtle p-[15px] shadow-[0px_4px_4px_rgba(0,0,0,0.25)]',
            'flex flex-col overflow-y-scroll',
            openLVMobile ? 'top-[25px] h-[85%]' : 'top-[90%] h-auto'
          )}
        >
            {
              openLVMobile && 
              <div className="flex flex-1" >
                <LineaVenta edit={edit} />
              </div>
            }
            <div className="flex justify-between items-center" >
              <h2 className="text-lg" > {sale.itemsSale.length} Productos </h2>
              <h2 className="text-lg" >Total: $ {sale.total} </h2>
              <h2 className="cursor-pointer text-[18px] text-state-info" onClick={()=>setOpenLVMobile(!openLVMobile)} >{openLVMobile ? 'CERRAR':'ABRIR'}</h2>
            </div>
        </div>
    </div>
  )
}
