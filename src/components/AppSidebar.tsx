'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useSelector } from 'react-redux'
import useLocalStorage from '@/hooks/useLocalStorage'
import { useSessionAccess } from '@/hooks/useSessionAccess'
import { SESSION_STATUS } from '@/interfaces/auth.interface'
import { getUser } from '@/redux/userSlice'
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  Home,
  Package,
  DollarSign,
  ClipboardList,
  Upload,
  CircleDollarSign,
  LineChart,
  LogOut,
  ChevronUp,
  Sun,
  Moon,
} from 'lucide-react'

const itemsLi = [
  { path: 'HOME', name: 'INICIO', icon: Home },
  { path: 'PRODUCT', name: 'PRODUCTOS', icon: Package },
  { path: 'SALE', name: 'VENTAS', icon: DollarSign },
  { path: 'BUY', name: 'COMPRAS', icon: ClipboardList },
  { path: 'BUY/SMART-UPLOAD', name: 'CARGA INTELIGENTE', icon: Upload },
  { path: 'EXPENSE', name: 'EGRESOS', icon: CircleDollarSign },
  { path: 'CASHFLOW', name: 'FLUJO DE CAJA', icon: LineChart },
]

export default function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const user: any = useSelector(getUser)
  const [valueStorage, , clearValue] = useLocalStorage('user', '')
  const { theme, setTheme } = useTheme()
  const { status } = useSessionAccess()

  // While the session hydrates, the user name is unknown: render a neutral
  // placeholder instead of treating the session as logged out.
  const hydrating = status === SESSION_STATUS.HYDRATING
  const userName = valueStorage?.nickname || user?.nickname || ''
  const displayName = userName || (hydrating ? '' : 'Usuario')

  function getHref(item: { path: string }): string {
    return '/' + item.path.toLowerCase().split(' ').join('')
  }

  function isActive(href: string): boolean {
    return pathname === href
  }

  function handleLogout() {
    clearValue()
    router.push('/')
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-5 py-4 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-2">
        <Link
          href="/home"
          className="flex h-11 min-w-0 items-center gap-3 rounded-lg px-3 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:gap-0"
          aria-label="Ir al inicio"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-xs font-semibold tracking-tight text-sidebar-primary-foreground">
            GZ
          </span>
          <span className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold">Golozur</span>
            <span className="truncate text-xs text-sidebar-foreground/70">Distribuidora</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-5 py-3 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:gap-1">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {itemsLi.map((item) => {
                const href = getHref(item)
                const Icon = item.icon
                const active = isActive(href)
                return (
                  <SidebarMenuItem key={item.path} className="list-none">
                    <Link
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      className={`flex h-10 min-w-0 items-center gap-3 rounded-lg pl-5 pr-3 text-sm font-medium transition-colors group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:overflow-hidden ${
                        active
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      }`}
                      title={item.name}
                    >
                      <Icon className="size-5 shrink-0 text-current group-data-[collapsible=icon]:size-5" aria-hidden="true" />
                      <span className="min-w-0 truncate group-data-[collapsible=icon]:hidden">
                        {item.name}
                      </span>
                    </Link>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-5 py-4 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-11 w-full min-w-0 items-center gap-3 rounded-lg px-3 text-left text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:overflow-hidden"
              aria-label="Abrir menú de usuario"
              aria-busy={hydrating}
            >
              <Avatar className="size-8 shrink-0 rounded-lg group-data-[collapsible=icon]:size-6">
                <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  {userName ? userName.charAt(0).toUpperCase() : hydrating ? '' : 'U'}
                </AvatarFallback>
              </Avatar>
              {hydrating && userName === '' ? (
                <span
                  className="h-3 min-w-0 flex-1 animate-pulse rounded bg-sidebar-accent group-data-[collapsible=icon]:hidden"
                  aria-hidden="true"
                />
              ) : (
                <span className="min-w-0 flex-1 truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
                  {displayName}
                </span>
              )}
              <ChevronUp className="ml-auto size-4 shrink-0 group-data-[collapsible=icon]:hidden" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" className="w-[var(--radix-popper-anchor-width)]">
            <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun /> : <Moon />}
              {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
