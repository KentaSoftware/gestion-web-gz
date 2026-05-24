import React, { ReactNode, useEffect, useState } from 'react'
import Logo from './Logo'
import styled from 'styled-components'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation';
import useLocalStorage from '@/hooks/useLocalStorage';
import { clearUser, getUser, setUser } from '@/redux/userSlice';
import { useAppDispatch } from '@/redux/hook';
import { useSelector } from 'react-redux';
import { useResize } from '@/hooks/useResize';
import { BiMenu } from 'react-icons/bi';
import { MdMenuOpen } from 'react-icons/md';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { UserWithToken } from '@/interfaces/auth.interface';
import { setLoading } from '@/redux/loadingSlice';
import { MdExitToApp } from "react-icons/md";
import { RandomAvatar } from "react-random-avatars";
import { GoHome, GoPackage } from "react-icons/go";
import { AiOutlineDollar } from 'react-icons/ai';
import { LiaClipboardListSolid } from "react-icons/lia";
import { MdOutlineMoneyOff, MdUploadFile } from "react-icons/md";
import { RiLineChartLine } from 'react-icons/ri'
import Burger from './Burger';

export default function Dashboard({children}: {children: ReactNode} ) {

    const itemsLi = [
        {path: 'HOME', name: 'INICIO', icon: <GoHome /> },
        {path: 'PRODUCT', name: 'PRODUCTOS', icon: <GoPackage />},
        {path: 'SALE', name: 'VENTAS', icon: <AiOutlineDollar />},
        {path: 'BUY', name: 'COMPRAS', icon: <LiaClipboardListSolid />},
        {path: 'BUY/SMART-UPLOAD', name: 'CARGA INTELIGENTE', icon: <MdUploadFile />},
        {path: 'EXPENSE', name: 'EGRESOS', icon: <MdOutlineMoneyOff />},
        {path: 'CASHFLOW', name: 'FLUJO DE CAJA', icon: <RiLineChartLine />}
    ]
    const pathname = usePathname()
    let {ancho, alto} = useResize()

    const user:any = useSelector(getUser)
    const [valueStorage , setValue, clearValue] = useLocalStorage("user", "")
    const dispatch = useAppDispatch();
    const router: AppRouterInstance = useRouter()
    const [openMenu, setOpenMenu] = useState(false)

    useEffect(() => {
        console.log('siempre estoy en dashboard')
        const isLogIn = async () => {
          if (valueStorage.nickname !== '' && valueStorage.token !== '' && valueStorage.nickname !== undefined && valueStorage.token !== undefined) {
            if (pathname === '/') {
               router.push('/home')
                return
            }
            return
          }
          if (pathname === '/') {
            return
          }
          router.push('/')
          return
        }
        if (valueStorage !== undefined && valueStorage !== '') {
            isLogIn()
        }else{
            if (pathname !== '/') {
                router.push('/')
                return
            }
        }
        
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router])

    useEffect(() => {
        const saveLogIn = async () => {
            if (user.nickname === '' && user.token === '' && valueStorage.nickname !== '' && valueStorage.token !== ''){
                
                // 🔧 MIGRACIÓN EG11: Verificar que el usuario tenga estructura actualizada con role
                if (!valueStorage.role) {
                    console.warn('⚠️ Usuario en localStorage sin campo "role". Forzando re-login para actualizar estructura.');
                    console.warn('📋 Datos actuales:', valueStorage);
                    
                    // Limpiar sesión para forzar re-login
                    clearValue();
                    dispatch(clearUser());
                    router.push('/');
                    return;
                }
                
                dispatch(setUser({...valueStorage}))
            }
        }
        if (valueStorage !== undefined) {
            saveLogIn()
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, valueStorage])
    
  return (
    <div style={{display: 'flex', flexDirection: 'column', flex: 1, height: '100vh'}} suppressHydrationWarning={true}>
        {
            ancho > 940 ?
            <ContainerBig suppressHydrationWarning={true}>
                {
                    pathname !== '/' &&
                    <LeftDash $open={true}>
                        <div style={{padding: 15, display: 'flex', justifyContent: 'center'}} >
                            {
                                ancho > 1240 ?
                                <Logo />
                                :
                                <div style={{display: 'flex', textAlign: 'center'}}>
                                    <h2 style={{color: '#3764A0', fontSize: 40}}>G</h2>
                                    <h2 style={{color: '#FA9B50', fontSize: 40}}>Z</h2>
                                </div>
                            }
                        </div>
                        <WrapperUserContainer>
                            <UserContainer suppressHydrationWarning={true}>
                                <RandomAvatar name={'sergio'} size={ ancho < 940 ? 25 : 50} mode='pattern' square={true} />
                                {(ancho > 1240) && <label style={{fontSize: 16, fontWeight: 600}} suppressHydrationWarning={true}>{valueStorage.user || user.nickname || undefined}</label>}
                                <SignOut onClick={() => {clearValue(); router.push('/')}}><MdExitToApp /></SignOut>
                            </UserContainer>
                        </WrapperUserContainer>
                        <ul>
                            {
                                itemsLi.map((item, index)=>{
                                    return(
                                    <Link href={"/"+(item.path.toLowerCase().split(' ').join(''))} style={{textDecoration: 'none'}}  key={index}> 
                                        <ItemLi $isSelect={pathname === "/"+(item.path.toLowerCase().split(' ').join(''))}>
                                            <IconWrapper2>
                                                {item.icon}
                                            </IconWrapper2>
                                            <LabelItemLi>
                                                {item.name}
                                            </LabelItemLi>
                                        </ItemLi>
                                    </Link>

                                )})
                            }
                        </ul>
                    </LeftDash>
                }
                <ContainerChildren suppressHydrationWarning={true}>
                    <Children suppressHydrationWarning={true}>
                        {children}
                    </Children>
                </ContainerChildren>
            </ContainerBig>
            :
            <ContainerSmall suppressHydrationWarning={true}>
                {
                    pathname !== '/' &&
                    <Header suppressHydrationWarning={true}>
                         <IconWrapper>
                            <Burger open={openMenu} toggle={()=>setOpenMenu(!openMenu)} />
                         </IconWrapper>
                        {/* {
                            !openMenu ? 
                            <IconWrapper onClick={()=>setOpenMenu(true)} suppressHydrationWarning={true}>
                                <BiMenu/>
                            </IconWrapper>:
                            <IconWrapper onClick={()=>setOpenMenu(false)} suppressHydrationWarning={true}>
                                <MdMenuOpen />
                            </IconWrapper>
                        } */}
                        <div style={{display: 'flex', justifyContent: 'center', flex: 1}} suppressHydrationWarning={true}>
                            <Logo small={true}/>
                        </div>
                    </Header>
                }
                <LeftDash suppressHydrationWarning={true} $open={openMenu}>
                    <WrapperUserContainer>
                        <UserContainer suppressHydrationWarning={true}>
                            <RandomAvatar name={'sergio'} size={50} mode='pattern' square={true} />
                            {ancho > 1240 && <label style={{fontSize: 18, fontWeight: 600}} suppressHydrationWarning={true}>{valueStorage.user || user.nickname || undefined}</label>}
                            <SignOut onClick={() => {clearValue(); router.push('/')}}><MdExitToApp /></SignOut>
                        </UserContainer>
                    </WrapperUserContainer>
                    <ul>
                        {
                            itemsLi.map((item, index)=>{
                                return(
                                <Link href={"/"+(item.path.toLowerCase().split(' ').join(''))} style={{textDecoration: 'none'}}  key={index} onClick={()=>setOpenMenu(false)}> 
                                    <ItemLi $isSelect={pathname === "/"+(item.path.toLowerCase().split(' ').join(''))}>
                                        <IconWrapper2>
                                            {item.icon}
                                        </IconWrapper2>
                                        <LabelItemLi>
                                            {item.name}
                                        </LabelItemLi>
                                    </ItemLi>
                                </Link>
                            )})
                        }
                    </ul>
                </LeftDash>
            
                <div style={{display: 'flex', flex: 1, flexDirection: 'column', overflowY: 'scroll'}} suppressHydrationWarning={true}>
                    {children}
                </div>
            </ContainerSmall>
        }
    </div>
  )
}

const ContainerChildren = styled.div `
    display: flex;
    flex-direction: column;
    flex: 1;
    background-color: #f1f1f1;
`

const Children = styled.div`
    display: flex; 
    flex: 1; 
    flex-direction: column; 
    overflow-y: scroll;
`

const WrapperUserContainer = styled.div `
    padding: 0 15px;
    margin-top: 15px;
    margin-bottom: 50px;
    @media only screen and (max-width: 940px) {
        margin-bottom: 25px;
    }
`

const UserContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #d9d9d9;
  border-bottom: 1px solid #d9d9d9;
  padding: 10px 0;
  
`;

const Header = styled.div`
    width: 100%;
    display: flex;
    background-color: #d9d9d9;
`

const ContainerSmall = styled.div `
    width: 100%;
    display: none;
    flex:1;
    position: relative;
    max-height: 100vh;
    overflow-y: scroll;
    @media only screen and (max-width: 940px) {
        display: flex;
        flex-direction: column;
        flex: 1;
    }
`

const IconWrapper = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    color: #716A6A;
    padding: 5px 15px;
    margin: 0px 5px;
    border-left: 1px solid #d9d9d9;
    cursor: pointer;
    &:hover {
        background-color: #d9d9d9;
    }
    
`

const IconWrapper2 = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 25px;
    padding: 5px 15px;
    margin: 0px 5px;
    cursor: pointer;
    @media only screen and (max-width: 940px) {
        font-size: 22px;
    }
`

const ContainerBig = styled.div `
    width: 100%;
    display: flex;
    flex:1;
    max-height: 100vh;
    overflow-y: scroll;
    @media only screen and (max-width: 940px) {
        display: none
    }
`

const SignOut = styled.h2`
    font-size: 25px;
    color: #7F8487;
    margin-top: 5px;
    cursor: pointer;
    &:hover{
        color: #8294C4;
    }
`

const LeftDash = styled.div<{$open?: boolean}> `
    opacity: ${({$open})=>$open ? '1' : '0'};
    left: ${({$open})=>$open ? '0px' : '-120px'};
    transition: opacity 0.5s, left 0.8s ease-in-out;
    height: 100vh;
    background: #f5f5f5;
    border-right: 1px solid #E2DAD6;
    position: relative;
    @media only screen and (max-width: 940px) {
        position: absolute;
        z-index: 2;
        top: 60px;
    }
`

interface ItemLiProps {
    $isSelect: boolean;
}

const ItemLi = styled.li<ItemLiProps>`
    display: flex;
    align-items: center;
    list-style: none;
    margin: 10px 0;
    padding: 10px 15px;
    border-bottom: 1px solid #d9d9d9;
    background-color: ${({ $isSelect }) => ($isSelect ? '#3764A0' : 'none')};
    color: ${({ $isSelect }) => ($isSelect ? 'white' : '#252525')};
    transition: background-color .5s ease-in-out;
    cursor: pointer;
    &:hover {
        background-color: #3764A0;
        color: white;
    }
    @media only screen and (max-width: 1240px) {
        flex-direction: column;
    }
    @media only screen and (max-width: 940px) {
        margin: 5px 0;
        padding: 5px;
    }
`;

const LabelItemLi = styled.label `
    font-weight: 600;
    font-size: 14px;
    @media only screen and (max-width: 940px) {
        font-size: 12px;
    }
`
