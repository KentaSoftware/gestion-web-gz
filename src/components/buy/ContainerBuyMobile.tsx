import { useState } from 'react'
import FindProductSale from '../sale/FindProductSale';
import { Product } from '@/interfaces/product.interface';
import { addItemBuy, getBuy } from '@/redux/buySlice';
import { useAppDispatch, useAppSelector } from '@/redux/hook';
import LineaCompra from './LineaCompra';
import { AnimatedNumber } from '../AnimatedNumber';
import { cn } from '@/lib/cn';

export default function ContainerBuyMobile({edit}:{edit?: boolean}) {

    const dispatch = useAppDispatch();
    const [openLVMobile, setOpenLVMobile] = useState<boolean>(false)
    const buy = useAppSelector(getBuy)

  return (
    <div className="relative flex flex-1 flex-col">
        <FindProductSale
            onClickItem={(item:Product)=>{dispatch(addItemBuy({item}))}}
        />
        <div
          className={cn(
            'absolute flex w-full flex-col overflow-y-scroll rounded-[15px] border border-border-subtle bg-surface-subtle p-[15px] shadow-[0px_4px_4px_rgba(0,0,0,0.25)]',
            openLVMobile ? 'top-[25px] h-[85%]' : 'top-[90%] h-auto'
          )}
        >
            {
              openLVMobile && 
              <div className="flex flex-1">
                <LineaCompra edit={edit} />
              </div>
            }
            <div
              className={cn(
                'flex items-center justify-between',
                openLVMobile ? 'p-[15px]' : 'p-0'
              )}
            >
                <h2 className="text-[18px]"> {buy.itemsBuy.length} Productos </h2>
                <h2 className="text-[18px]">Total: $ <AnimatedNumber value={buy.total} /> </h2>
                <h2 className="cursor-pointer text-[18px] text-state-info" onClick={()=>setOpenLVMobile(!openLVMobile)}>{openLVMobile ? 'CERRAR':'ABRIR'}</h2>
            </div>
        </div>
    </div>
  )
}
