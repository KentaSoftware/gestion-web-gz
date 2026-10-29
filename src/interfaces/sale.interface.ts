import { ObjectId, Types } from 'mongoose'

export interface Sale {
  _id?: Types.ObjectId | string
  estado: string
  user?: ObjectId
  cliente: string
  total: number
  createdAt: string
  /** ISO date string when cobro was confirmed; absent/null = unpaid */
  paidAt?: string | null
  itemsSale: ItemSale[] | ExtendItemSale[]
  porcentaje?: number
}

export interface ItemSale {
  _id?: Types.ObjectId | string
  idVenta?: Types.ObjectId
  idProducto: Types.ObjectId | string
  cantidad: number
  total: number
  precio: number
}

export interface ExtendItemSale extends ItemSale {
  descripcion?: string
  NameCategoria?: string
  precioUnitario?: number
  precioDescuento?: number
}
