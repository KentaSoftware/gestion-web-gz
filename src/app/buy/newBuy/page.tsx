/* eslint-disable react-hooks/exhaustive-deps */
'use client'
import { useEffect } from 'react'
import { getUser, setUser } from '@/redux/userSlice';
import { useAppDispatch } from '@/redux/hook';
import { useSelector } from 'react-redux';
import useLocalStorage from '@/hooks/useLocalStorage';
import { useRouter } from 'next/navigation';
import { useResize } from '@/hooks/useResize';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import ContainerBuyWeb from '@/components/buy/ContainerBuyWeb';
import { resetBuy } from '@/redux/buySlice';
import ContainerBuyMobile from '@/components/buy/ContainerBuyMobile';

export default function NewBuy() {

    const [valueStorage , setValue] = useLocalStorage("user", "")
    const router: AppRouterInstance = useRouter()
    let {ancho, alto} = useResize()

    const user = useSelector(getUser)
    const dispatch = useAppDispatch();

    useEffect(()=>{
      dispatch(resetBuy({}))
    }, [router])

  return (
    <div className="flex flex-1 max-[940px]:flex-col">
      {
        ancho > 940 ?
        <ContainerBuyWeb/>
        :
        <ContainerBuyMobile/>
      }
      
    </div>
  )
}
