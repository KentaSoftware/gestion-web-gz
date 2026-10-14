import { ReactNode, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import useLocalStorage from '@/hooks/useLocalStorage'
import { clearUser, getUser, setUser } from '@/redux/userSlice'
import { useAppDispatch } from '@/redux/hook'
import { useSelector } from 'react-redux'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import AppSidebar from './AppSidebar'

export default function Dashboard({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const user: any = useSelector(getUser)
  const [valueStorage, setValue, clearValue] = useLocalStorage('user', '')
  const dispatch = useAppDispatch()
  const router = useRouter()

  useEffect(() => {
    console.log('siempre estoy en dashboard')
    const isLogIn = async () => {
      if (
        valueStorage.nickname !== '' &&
        valueStorage.token !== '' &&
        valueStorage.nickname !== undefined &&
        valueStorage.token !== undefined
      ) {
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
    } else {
      if (pathname !== '/') {
        router.push('/')
        return
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  useEffect(() => {
    const saveLogIn = async () => {
      if (user.nickname === '' && user.token === '' && valueStorage.nickname !== '' && valueStorage.token !== '') {
        // 🔧 MIGRACIÓN EG11: Verificar que el usuario tenga estructura actualizada con role
        if (!valueStorage.role) {
          console.warn('⚠️ Usuario en localStorage sin campo "role". Forzando re-login para actualizar estructura.')
          console.warn('📋 Datos actuales:', valueStorage)

          // Limpiar sesión para forzar re-login
          clearValue()
          dispatch(clearUser())
          router.push('/')
          return
        }

        dispatch(setUser({ ...valueStorage }))
      }
    }
    if (valueStorage !== undefined) {
      saveLogIn()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, valueStorage])

  if (pathname === '/') {
    return (
      <main className="flex h-screen w-full flex-1 flex-col bg-background-canvas" suppressHydrationWarning={true}>
        {children}
      </main>
    )
  }

  return (
    <>
      <a
        href="#dashboard-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-toast focus:rounded-md focus:bg-surface-base focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-text-primary"
      >
        Saltar al contenido principal
      </a>
      <SidebarProvider className="h-dvh min-h-0" suppressHydrationWarning={true}>
        <AppSidebar />
        <SidebarInset className="h-dvh min-h-0 overflow-hidden">
          <header className="flex min-h-[48px] shrink-0 items-center border-b border-border-subtle bg-background-subtle px-4 shadow-sm">
            <SidebarTrigger />
          </header>
          <main
            id="dashboard-main"
            className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-background-canvas"
            suppressHydrationWarning={true}
          >
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </>
  )
}
