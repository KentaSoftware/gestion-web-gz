import FindProductSale from './FindProductSale'
import { useAppDispatch } from '@/redux/hook';
import { addItemSale } from '@/redux/saleSlice';
import { Product } from '@/interfaces/product.interface';
import LineaVenta from './LineaVenta';

export default function ContainerSaleWeb({edit}:{edit?: boolean}) {

  const dispatch = useAppDispatch();

  return (
     <div className="flex flex-1">
      <div className="w-1/2 max-[940px]:w-full">
        <FindProductSale
            onClickItem={(item:Product)=>{dispatch(addItemSale({item}))}}
        />
      </div>
      <LineaVenta edit={edit} />
    </div>
  )
}
