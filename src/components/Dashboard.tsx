import { type ReactNode, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { clearUser, getUser, hydrateSession, setUser } from '@/redux/userSlice'
import { SESSION_STATUS } from '@/interfaces/auth.interface'
import type { AppDispatch } from '@/redux/store'
import { useDispatch, useSelector } from 'react-redux'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import AppSidebar from './AppSidebar'

export default function Dashboard({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const user = useSelector(getUser)
  const tokenRef = useRef(user.token)
  tokenRef.current = user.token
  const dispatch = useDispatch<AppDispatch>()
  const router = useRouter()

  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(window.localStorage.getItem('user') || 'null')
      if (stored && typeof stored === 'object' && 'token' in stored && typeof stored.token === 'string' && stored.token) {
        dispatch(setUser({ token: stored.token, nickname: 'nickname' in stored && typeof stored.nickname === 'string' ? stored.nickname : '' }))
      } else {
        dispatch(clearUser())
      }
    } catch {
      dispatch(clearUser())
    }
  }, [dispatch])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== 'user' && event.key !== null) return
      try {
        const stored: unknown = JSON.parse(event.newValue || 'null')
        if (stored && typeof stored === 'object' && 'token' in stored && typeof stored.token === 'string' && stored.token) {
          tokenRef.current = stored.token
          dispatch(setUser({ token: stored.token, nickname: 'nickname' in stored && typeof stored.nickname === 'string' ? stored.nickname : '' }))
          return
        }
      } catch {
        // Invalid storage is treated as an absent session.
      }
      tokenRef.current = ''
      dispatch(clearUser())
    }
    const revalidate = () => {
      if (tokenRef.current) dispatch(hydrateSession(tokenRef.current))
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') revalidate()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', revalidate)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', revalidate)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [dispatch])

  useEffect(() => {
    if (user.token && user.sessionStatus === SESSION_STATUS.HYDRATING && !user.requestId) {
      dispatch(hydrateSession(user.token))
    }
  }, [dispatch, user.token, user.sessionStatus, user.requestId])

  useEffect(() => {
    if (user.sessionStatus === SESSION_STATUS.READY && pathname === '/') router.push('/home')
    if (user.sessionStatus === SESSION_STATUS.ANONYMOUS && pathname !== '/') router.push('/')
  }, [user.sessionStatus, pathname, router])

  if (pathname === '/') {
    return (
      <main className="flex h-screen w-full flex-1 flex-col bg-background-canvas" suppressHydrationWarning={true}>
        {children}
      </main>
    )
  }

  if (user.sessionStatus !== SESSION_STATUS.READY) return null

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
            className="flex h-0 min-h-0 flex-1 flex-col bg-background-canvas"
            suppressHydrationWarning={true}
          >
            <div data-testid="dashboard-scroll-region" className="h-0 min-h-0 flex-1 overflow-y-auto">
              {children}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </>
  )
}
