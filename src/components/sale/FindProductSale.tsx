/* eslint-disable react-hooks/exhaustive-deps */
'use client'
import Button from '@/components/Button';
import FilterProduct from '@/components/products/FilterProduct';
import ItemsProducts from '@/components/products/ItemsProducts';
import ModalProduct from '@/components/products/ModalProduct';
import NewProduct from '@/components/products/NewProduct';
import PrintProduct from '@/components/products/PrintProduct';
import UpdatePrice from '@/components/products/UpdatePrice';
import Search from '@/components/Search';
import useLocalStorage from '@/hooks/useLocalStorage';
import { Brand, Categorie, Product, Provider } from '@/interfaces/product.interface';
import { useAppDispatch } from '@/redux/hook';
import { getLoading, setLoading } from '@/redux/loadingSlice';
import { getUser, setUser } from '@/redux/userSlice';
import apiClient from '@/utils/client';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';

interface CBP {
  _id: (string | number)
  descripcion: string
}

export default function FindProductSale({ onClickItem }: { onClickItem: (item: Product) => void }) {

  const [search, setSearch] = useState<string>('')
  const [data, setData] = useState<Product[]>([])
  const [valueStorage, setValue] = useLocalStorage("user", "")
  const [dataSearch, setDataSearch] = useState<Product[]>([])
  const [query, setQuery] = useState<{ skip: number, limit: number }>({ skip: 0, limit: 25 })
  const [selectProduct, setSelectProduct] = useState<Product | undefined>(undefined)
  const [openModalProduct, setOpenModalProduct] = useState<boolean>(false)
  const observer = useRef<IntersectionObserver | null>(null);
  const { open: loading } = useSelector(getLoading)
  const [openNewProduct, setOpenNewProduct] = useState<boolean>(false)
  const [longArray, setLongArray] = useState<number>(0)
  const [openUpdatePrice, setOpenUpdatePrice] = useState<boolean>(false)
  const [openPrintProduct, setOpenPrintProduct] = useState<boolean>(false)
  const [activeCategorie, setActiveCategorie] = useState<CBP>({ _id: 1, descripcion: 'Todas' })
  const [activeBrand, setActiveBrand] = useState<CBP>({ _id: 1, descripcion: 'Todas' })
  const [activeProvider, setActiveProvider] = useState<CBP>({ _id: 1, descripcion: 'Todas' })
  const [openModalFilter, setOpenModalFilter] = useState<boolean>(false)

  const user = useSelector(getUser)
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!user && valueStorage) {
      dispatch(setUser(valueStorage))
    }
  }, [valueStorage, user, dispatch])

  const searchProduct = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(prevData => e.target.value)
  }

  const getProduct = async (skip: number, limit: number) => {
    dispatch(setLoading(true))

    try {
      const response = await apiClient.post(`/product/skip`, { skip, limit },
        {
          headers: {
            Authorization: `Bearer ${valueStorage.token}`
          },
        });
      setData((prevData: Product[]) => {

        if (prevData.length === 0) {
          return response.data.array;
        }
        const newData = response.data.array.filter((element: Product) => {
          return prevData.findIndex((item: Product) => item._id === element._id) === -1;
        });

        return [...prevData, ...newData];
      });
      setLongArray(prevData => response.data.longitud)
      dispatch(setLoading(false));
    } catch (e) {
      console.log("error", e);
      dispatch(setLoading(false));
    } finally {
      dispatch(setLoading(false));
    }
  }

  const getProductSearch = async (input: string, categorie: CBP['_id'], brand: CBP['_id'], provider: CBP['_id']) => {
    dispatch(setLoading(true))
    try {
      const response = await apiClient.post(`/product/search`, { input, categoria: categorie, marca: brand, proveedor: provider },
        {
          headers: {
            Authorization: `Bearer ${valueStorage.token}`
          },
        });
      setDataSearch(response.data);
      dispatch(setLoading(false));
    } catch (e) {
      console.log("error", e);
      dispatch(setLoading(false));
    } finally {
      dispatch(setLoading(false))
    }
  }

  useEffect(() => {
    getProduct(query.skip, query.limit)
  }, [query])

  useEffect(() => {
    if (search !== '' || activeBrand._id !== 1 || activeCategorie._id !== 1 || activeProvider._id !== 1) {
      getProductSearch(search, activeCategorie._id, activeBrand._id, activeProvider._id)
    }
  }, [search, activeBrand, activeCategorie, activeProvider])

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_DB_HOST) {
      return
    }
    const socket = io(process.env.NEXT_PUBLIC_DB_HOST)
    socket.on(`product`, (socket) => {
      refreshProducts()
      setData((prevData: Product[]) => {
        const exist = prevData.find((elem: Product) => elem._id === socket.data._id)
        if (exist) {
          return prevData.map((item: Product) =>
            item._id === socket.data._id ? socket.data : item
          )
        }
        return [...prevData]
      })
    })
    return () => {
      socket.disconnect();
    };
  }, [data, dataSearch])

  const refreshProducts = () => {
    setSearch(prevData => '')
    getProduct(query.skip, query.limit)
  };

  const lastElementRef = useCallback(
    (node: HTMLLIElement | null) => {
      if (loading) {
        return
      };
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          if (search === '') {
            if (data.length < longArray) {
              setQuery(prevData => ({ skip: prevData.skip + 25, limit: prevData.limit }));
            }
          }
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, search, data]
  );

  return (
    <main className='flex flex-1 flex-col'>
      {
        <>
          <div className='flex flex-1 flex-col items-center'>
            <div className='flex w-full items-center px-[15px]'>
              <Search name='search' placeHolder={'Buscar productos'} type='text' value={search} onChange={searchProduct} /* onClickFilter={()=>setOpenModalFilter(true)} */ />
            </div>
            <FilterProduct open={openModalFilter} handleClose={() => setOpenModalFilter(false)}
              activeBrand={activeBrand} activeCategorie={activeCategorie} activeProvider={activeProvider}
              selectCategorie={(item: CBP) => setActiveCategorie(prevData => item)}
              selectBrand={(item: CBP) => setActiveBrand(prevData => item)}
              selectProvider={(item: CBP) => setActiveProvider(prevData => item)}
            />
            <ul className='flex max-h-[75vh] w-full flex-1 flex-col overflow-scroll px-[15px]'>
              {
                search !== '' || activeBrand._id !== 1 || activeCategorie._id !== 1 || activeProvider._id !== 1 ?
                  dataSearch.length !== 0 ?
                    dataSearch.map((item: Product, index: number) => {
                      return <ItemsProducts key={index} item={item} onClick={() => { setSelectProduct(item); setOpenModalProduct(true) }}
                        onClickItem={() => onClickItem(item)}
                        select={false} />
                    })
                    : 'NO HAY PRODUCTOS'
                  :
                  data.length !== 0 ?
                    data.map((item: Product, index: number) => {
                      return <ItemsProducts key={index} item={item} onClick={() => { setSelectProduct(item); setOpenModalProduct(true) }}
                        onClickItem={() => onClickItem(item)} select={false} />
                    })
                    : 'NO HAY PRODUCTOS'
              }
              {
                search !== '' || activeBrand._id !== 1 || activeCategorie._id !== 1 || activeProvider._id !== 1 ?
                  <></> :
                  <li className="list-none p-0 m-0 min-h-[1px]" ref={lastElementRef}></li>
              }
            </ul>
          </div>
          {
            (openModalProduct && selectProduct) &&
            <ModalProduct open={openModalProduct} handleClose={() => setOpenModalProduct(false)} product={selectProduct} ></ModalProduct>
          }
          {
            openNewProduct &&
            <NewProduct open={openNewProduct} handleClose={() => setOpenNewProduct(false)} ></NewProduct>
          }
          {
            openUpdatePrice &&
            <UpdatePrice open={openUpdatePrice} handleClose={() => setOpenUpdatePrice(false)} />
          }
          {
            openPrintProduct &&
            <PrintProduct open={openPrintProduct} handleClose={() => setOpenPrintProduct(false)} />
          }
          {/* {
            openModalFilter &&
            <FilterProduct open={openModalFilter} handleClose={()=>setOpenModalFilter(false)} 
              activeBrand={activeBrand._id} activeCategorie={activeCategorie._id} activeProvider={activeProvider._id}
              selectCategorie={(item: CBP)=>setActiveCategorie(prevData=>item)}
              selectBrand={(item: CBP)=>setActiveBrand(prevData=>item)}
              selectProvider={(item: CBP)=>setActiveProvider(prevData=>item)}
            />
          } */}
        </>
      }
    </main>
  )
}
