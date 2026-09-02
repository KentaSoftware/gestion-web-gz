import { Product } from '@/interfaces/product.interface';
import { useState } from 'react';
import Button from '../Button';
import { AnimatedNumber } from '../AnimatedNumber';

export default function ItemsProducts({item, onClick, select = true, onClickItem, line = true}:{item: Product, onClick: ()=>void, select?:boolean, onClickItem?: ()=>void, line?:boolean}) {
    const [openInfo, setOpenInfo] = useState(false);

    return (
        <li
            onClick={onClickItem}
            className="list-none px-4 py-3 font-semibold w-full border border-surface-base mb-1.5 mt-1.5 rounded-xl flex flex-col shrink-0 justify-center min-h-[60px] h-auto bg-surface-base shadow-sm transition-colors duration-500 hover:border-brand-primary hover:bg-background-subtle max-sm:px-2"
        >
            <div className="flex flex-1 max-[480px]:flex-col">
                <div className="flex flex-1 flex-col mr-4">
                    <div className="flex justify-between">
                        <h2 className="text-body font-semibold text-text-primary max-sm:text-label">{item.descripcion}</h2>
                        <h2 className="text-body font-semibold text-brand-accent max-sm:text-label">
                            $ <AnimatedNumber value={item.precioUnitario} />
                        </h2>
                    </div>
                    <div className="flex justify-between">
                        <h5 className="text-label font-normal text-text-muted">{item.NameCategoria}</h5>
                        <h5 className="text-label font-normal text-text-muted">{item.NameMarca}</h5>
                    </div>
                </div>
                {select &&
                <div className="flex items-center gap-2 max-[480px]:justify-center max-[480px]:mt-2.5">
                        <Button text='EDITAR' variant='ghost' onClick={onClick} />
                        <Button text='+ INFO' variant='ghost' onClick={() => setOpenInfo(!openInfo)} />
                    </div>
                }
            </div>
            {openInfo &&
                <div className="pt-4">
                    <p className="text-label font-normal text-text-muted">Stock: {item?.stock || 'No definido'}</p>
                    <p className="text-label font-normal text-text-muted">Proveedor: {item?.NameProveedor || 'No definido'}</p>
                    <p className="text-label font-normal text-text-muted">Codigo de barra: {item?.codigoBarra || 'Sin codigo'}</p>
                    <p className="text-label font-normal text-text-muted">Peso: {item?.peso?.cantidad || 'No definido'} {item?.peso?.unidad}</p>
                    <p className="text-label font-normal text-text-muted">Bulto: {item?.bulto || 'No definido'}</p>
                    <p className="text-label font-normal text-text-muted">Precio Descuento: $ {item?.precioDescuento ? <AnimatedNumber value={item.precioDescuento} /> : 'No definido'}</p>
                    <p className="text-label font-normal text-text-muted">Precio por Bulto: $ {item?.precioBulto ? <AnimatedNumber value={item.precioBulto} /> : 'No definido'}</p>
                    <p className="text-label font-normal text-text-muted">Precio de compra: $ {item?.precioCompra ? <AnimatedNumber value={item.precioCompra} /> : 'No definido'}</p>
                </div>
            }
        </li>
    );
}
