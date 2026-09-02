import { ExtendItemBuy } from '@/interfaces/buy.interface'
import { ExtendItemSale } from '@/interfaces/sale.interface'
import { Types } from 'mongoose'
import React, { ChangeEvent, useState } from 'react'
import { Trash2, Plus, DollarSign } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AnimatedNumber } from '../AnimatedNumber'
import { useAppDispatch } from '@/redux/hook'
import { cn } from '@/lib/cn'

export default function ItemLineaVenta({ elem, onClick, upQTY, downQTY, downQTY10, upQTY10, onChangePrecioUnitario, compra }:
    {
        onClick: () => void, upQTY: (id: string | Types.ObjectId | undefined) => void,
        onChangePrecioUnitario?: (value: string, D: any) => void
        downQTY: (id: string | Types.ObjectId | undefined) => void, upQTY10: (id: string | Types.ObjectId | undefined) => void,
        downQTY10: (id: string | Types.ObjectId | undefined) => void, elem: ExtendItemSale | ExtendItemBuy, compra?: boolean
    }) {

    const [openHandler, setOpenHandler] = useState(false)
    const [openPrecioUnitario, setOpenPrecioUnitario] = useState(false)

    return (
        <li className="list-none px-2 py-2 font-semibold w-full border-b border-border-subtle flex justify-between cursor-pointer max-sm:flex-col max-sm:justify-center max-sm:py-4">
            <div className="w-full">
                <div>
                    <h2 className="text-base text-text-primary overflow-hidden whitespace-nowrap text-ellipsis max-w-[95%]">
                        {elem.descripcion}
                    </h2>
                    <div className="flex justify-between items-center">
                        <h2 className="text-sm font-semibold text-text-muted">X {elem.cantidad} UNIDAD</h2>
                        <label className="text-sm font-semibold text-brand-accent mr-1">
                            $ <AnimatedNumber value={elem.total} />
                        </label>
                    </div>
                </div>
                <TooltipProvider>
                <div className="flex justify-center items-center my-1.5">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div
                                onClick={() => setOpenHandler(!openHandler)}
                                className={cn(
                                    'flex items-center justify-center p-1.5 rounded-[15px] cursor-pointer transition-transform duration-500 hover:bg-border-subtle',
                                    openHandler ? 'rotate-[135deg]' : 'rotate-0'
                                )}
                                aria-label="Ajustar cantidad"
                            >
                                <Plus className="mx-1 text-brand-primary" aria-hidden="true" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Ajustar cantidad</p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div
                                onClick={() => setOpenPrecioUnitario(!openPrecioUnitario)}
                                className={cn(
                                    'flex items-center justify-center p-1.5 rounded-[15px] cursor-pointer transition-transform duration-500 hover:bg-border-subtle',
                                    openPrecioUnitario ? 'rotate-180' : 'rotate-0'
                                )}
                                aria-label="Cambiar precio unitario"
                            >
                                <DollarSign className="text-xl mx-1 text-state-success" aria-hidden="true" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Cambiar precio unitario</p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center justify-center p-1.5 rounded-[15px] cursor-pointer hover:bg-border-subtle" aria-label="Eliminar línea">
                                <Trash2 className="text-xl mx-1 text-state-error" onClick={onClick} aria-hidden="true" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Eliminar línea</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </TooltipProvider>
                {(openPrecioUnitario && onChangePrecioUnitario) && (
                    <div className="flex items-center">
                        <label className="text-sm font-normal text-text-muted mr-1">Precio u. : $</label>
                        <input
                            value={elem.precio}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => onChangePrecioUnitario(e.target.value, elem.idProducto)}
                            className="px-2.5 py-1 text-base max-w-[100px] rounded-xl border border-border-subtle text-text-primary bg-surface-base transition-colors focus:outline-none focus:border-brand-primary"
                        />
                    </div>
                )}
                {openHandler && (
                    <div className="flex w-full justify-center items-center">
                        <div>
                            <div className="flex w-full">
                                <div className="flex">
                                    <div
                                        onClick={() => downQTY10(elem.idProducto)}
                                        className="text-sm font-normal text-text-muted px-2.5 py-1 cursor-pointer hover:bg-border-subtle hover:rounded-full hover:text-brand-primary"
                                    >-10</div>
                                    <div
                                        onClick={() => downQTY(elem.idProducto)}
                                        className="text-sm font-normal text-text-muted px-2.5 py-1 cursor-pointer hover:bg-border-subtle hover:rounded-full hover:text-brand-primary"
                                    >-</div>
                                </div>
                                <div className="text-base text-text-primary px-2.5 py-1 hover:bg-border-subtle hover:rounded-full hover:text-brand-primary">
                                    <AnimatedNumber value={elem.cantidad} />
                                </div>
                                <div className="flex">
                                    <div
                                        onClick={() => upQTY(elem.idProducto)}
                                        className="text-sm font-normal text-text-muted px-2.5 py-1 cursor-pointer hover:bg-border-subtle hover:rounded-full hover:text-brand-primary"
                                    >+</div>
                                    <div
                                        onClick={() => upQTY10(elem.idProducto)}
                                        className="text-sm font-normal text-text-muted px-2.5 py-1 cursor-pointer hover:bg-border-subtle hover:rounded-full hover:text-brand-primary"
                                    >+10</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </li>
    )
}
