
import { Product } from '@/interfaces/product.interface';
import { ExtendItemSale, ItemSale, Sale } from '@/interfaces/sale.interface';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Types } from 'mongoose';

const initialState: Sale = {
  _id: '',
  cliente: '',
  createdAt: '',
  estado: '',
  itemsSale: [],
  total: 0,
  porcentaje: 0
};

const saleSlice = createSlice({
  name: 'sale',
  initialState,
  reducers: {
    setSale: (state, action: PayloadAction<{ sale: Sale }>) => {
      const saleData = action.payload.sale
      state._id = saleData._id,
        state.cliente = saleData.cliente,
        state.idCliente = saleData.idCliente,
        state.createdAt = saleData.createdAt,
        state.estado = saleData.estado,
        state.itemsSale = saleData.itemsSale.map((elem: ExtendItemSale) => ({ ...elem, precio: elem.precioUnitario || elem.precio })),
        state.total = saleData.total,
        state.porcentaje = saleData.porcentaje
    },
    addItemSale: (state, action: PayloadAction<{ item: Product }>) => {
      const item = action.payload.item
      const exist = state.itemsSale.find((elem: ItemSale) => elem.idProducto === item._id)
      if (exist) {
        return
      }
      const newItem: ItemSale = { ...item, cantidad: 1, total: item.precioUnitario, idProducto: item._id, precio: item.precioUnitario }
      state.itemsSale = [...state.itemsSale, newItem]
      state.total = calculateTotal(state.itemsSale)
    },
    deleteItemSale: (state, action: PayloadAction<{ id: Types.ObjectId | string }>) => {
      const id = action.payload.id
      state.itemsSale = state.itemsSale.filter((elem: ItemSale) => elem.idProducto !== id)
      state.total = calculateTotal(state.itemsSale)
    },
    onChangeClientSale: (state, action: PayloadAction<{ client: string }>) => {
      const client = action.payload.client
      state.cliente = client
      state.total = calculateTotal(state.itemsSale)
    },
    selectClientSale: (state, action: PayloadAction<{ id: string; name: string }>) => {
      state.idCliente = action.payload.id
      state.cliente = action.payload.name
    },
    clearClientSaleSelection: (state) => {
      state.idCliente = undefined
    },
    onChangePrecioUnitarioSale: (state, action: PayloadAction<{ value: string; idProducto: Types.ObjectId | string }>) => {
      const value = action.payload.value
      const idProducto = action.payload.idProducto
      let parseValue = parseFloat(value)
      if (value === '') {
        parseValue = 0
      }
      const itemSale = state.itemsSale.find(elem => elem.idProducto === idProducto)
      if (!itemSale) {
        return
      }
      const newItemSale = { ...itemSale, precio: parseValue, total: itemSale?.cantidad * parseValue }
      const prevFiltered = state.itemsSale.map((elem: ItemSale) => elem.idProducto === idProducto ? newItemSale : elem)
      state.itemsSale = prevFiltered
      state.total = calculateTotal(state.itemsSale)
    },
    upQTYSale: (state, action: PayloadAction<{ id: Types.ObjectId | string }>) => {
      const id = action.payload.id

      state.itemsSale = state.itemsSale.map((elem: ExtendItemSale) => {
        if (elem.idProducto === id) {
          return { ...elem, cantidad: elem.cantidad + 1, total: parseFloat((elem.precio * (elem.cantidad + 1)).toFixed(2)) }
        }
        return elem
      })
      state.total = calculateTotal(state.itemsSale)
    },
    downQTYSale: (state, action: PayloadAction<{ id: Types.ObjectId | string }>) => {
      const id = action.payload.id
      state.itemsSale = state.itemsSale.map((elem: ExtendItemSale) => {
        if (elem.idProducto === id) {
          if (elem.cantidad - 1 > 1) {
            return { ...elem, cantidad: elem.cantidad - 1, total: parseFloat((elem.precio * (elem.cantidad - 1)).toFixed(2)) }
          }
          return { ...elem, cantidad: 1, total: elem.precio }
        }
        return elem
      })
      state.total = calculateTotal(state.itemsSale)
    },
    upQTY10Sale: (state, action: PayloadAction<{ id: Types.ObjectId | string }>) => {
      const id = action.payload.id
      state.itemsSale = state.itemsSale.map((elem: ExtendItemSale) => {
        if (elem.idProducto === id) {
          return { ...elem, cantidad: elem.cantidad + 10, total: parseFloat((elem.precio * (elem.cantidad + 10)).toFixed(2)) }
        }
        return elem
      })
      state.total = calculateTotal(state.itemsSale)
    },
    downQTY10Sale: (state, action: PayloadAction<{ id: Types.ObjectId | string }>) => {
      const id = action.payload.id
      state.itemsSale = state.itemsSale.map((elem: ExtendItemSale) => {
        if (elem.idProducto === id) {
          if (elem.cantidad > 10) {
            return { ...elem, cantidad: elem.cantidad - 10, total: parseFloat((elem.precio * (elem.cantidad - 10)).toFixed(2)) }
          }
          return elem
        }
        return elem
      })
      state.total = calculateTotal(state.itemsSale)
    },
    resetSale: (state, action) => {
      state._id = ''
      state.idCliente = undefined
      state.cliente = '',
        state.createdAt = '',
        state.estado = '',
        state.itemsSale = [],
        state.total = 0,
        state.porcentaje = 0
    }
  },
});

const calculateTotal = (items: ExtendItemSale[]) => items.reduce((accumulator: number, currentValue: ItemSale) => accumulator + currentValue.total, 0)

export const getSale = (state: { sale: Sale }) => state.sale
export const getItemSale = (state: { sale: Sale }) => state.sale.itemsSale
export const { addItemSale, deleteItemSale, onChangeClientSale, selectClientSale, clearClientSaleSelection, onChangePrecioUnitarioSale, upQTYSale, downQTYSale, upQTY10Sale, downQTY10Sale, resetSale, setSale } = saleSlice.actions;
export default saleSlice.reducer;
