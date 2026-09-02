import FindProductSale from '../sale/FindProductSale'
import { useAppDispatch } from '@/redux/hook';
import { Product } from '@/interfaces/product.interface';
import LineaCompra from './LineaCompra';
import { addItemBuy } from '@/redux/buySlice';

export default function ContainerBuyWeb({edit}:{edit?: boolean}) {

    const dispatch = useAppDispatch();

  return (
    <div className="flex flex-1">
        <div className="w-1/2 max-[940px]:w-full">
          <FindProductSale
              onClickItem={(item:Product)=>{dispatch(addItemBuy({item}))}}
          />
        </div>
        <LineaCompra edit={edit} />
    </div>
  )
}
