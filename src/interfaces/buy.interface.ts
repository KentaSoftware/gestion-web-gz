import { ObjectId, Types } from 'mongoose'

export interface Buy {
  _id?: Types.ObjectId | string
  estado: string
  user?: ObjectId
  proveedor: string
  total: number
  createdAt: string
  docNumber?: string
  /** Compra principal cuando esta se registró aceptando un duplicado. */
  duplicateOf?: string
  itemsBuy: ItemBuy[]
}

export interface ItemBuy {
  _id?: Types.ObjectId | string
  idBuy?: Types.ObjectId
  idProducto: Types.ObjectId | string
  cantidad: number
  total: number
  precio: number
  estado: boolean
}

export interface ExtendItemBuy extends ItemBuy {
  descripcion?: string
  NameCategoria?: string
  precioUnitario?: number
  precioDescuento?: number
}
