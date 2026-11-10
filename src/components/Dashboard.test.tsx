import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { SESSION_STATUS } from '@/interfaces/auth.interface'
import reducer from '@/redux/userSlice'
import apiClient from '@/utils/client'

const { user, dispatch, push, mode } = vi.hoisted(() => ({ user: vi.fn(), dispatch: vi.fn(), push: vi.fn(), mode: { real: false } }))
vi.mock('react-redux', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-redux')>()
  return { ...actual, useSelector: (...args: Parameters<typeof actual.useSelector>) => mode.real ? actual.useSelector(...args) : user(...args), useDispatch: () => mode.real ? actual.useDispatch() : dispatch }
})
vi.mock('next/navigation', () => ({ usePathname: () => '/home', useRouter: () => ({ push }) }))
vi.mock('./AppSidebar', () => ({ default: () => null }))
vi.mock('@/components/ui/sidebar', () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarInset: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarTrigger: () => null,
}))
import Dashboard from './Dashboard'

describe('Dashboard session boundary', () => {
  it.each([SESSION_STATUS.HYDRATING, SESSION_STATUS.ANONYMOUS])('hides protected children for %s', (sessionStatus) => {
    user.mockReturnValue({ token: '', sessionStatus })
    render(<Dashboard><span>Protected content</span></Dashboard>)
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
  })

  it('revalidates the active token when the window regains focus', () => {
    user.mockReturnValue({ token: 'active-token', sessionStatus: SESSION_STATUS.READY })
    dispatch.mockClear()
    render(<Dashboard><span>Protected content</span></Dashboard>)
    dispatch.mockClear()
    window.dispatchEvent(new Event('focus'))
    expect(dispatch).toHaveBeenCalled()
  })

  it('clears the session when another tab logs out', () => {
    user.mockReturnValue({ token: 'active-token', sessionStatus: SESSION_STATUS.READY })
    dispatch.mockClear()
    render(<Dashboard><span>Protected content</span></Dashboard>)
    dispatch.mockClear()
    window.dispatchEvent(new StorageEvent('storage', { key: 'user', newValue: null }))
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'user/clearUser' }))
  })

  it('hydrates a replacement token without trusting the stored role', () => {
    user.mockReturnValue({ token: 'old-token', sessionStatus: SESSION_STATUS.READY })
    render(<Dashboard><span>Protected content</span></Dashboard>)
    dispatch.mockClear()
    window.dispatchEvent(new StorageEvent('storage', { key: 'user', newValue: JSON.stringify({ token: 'new-token', nickname: 'new', role: { name: 'admin' } }) }))
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'user/setUser', payload: { token: 'new-token', nickname: 'new' } }))
  })

  it('revalidates on visibility and removes listeners on unmount', () => {
    user.mockReturnValue({ token: 'active-token', sessionStatus: SESSION_STATUS.READY })
    const { unmount } = render(<Dashboard><span>Protected content</span></Dashboard>)
    dispatch.mockClear()
    document.dispatchEvent(new Event('visibilitychange'))
    expect(dispatch).toHaveBeenCalled()
    unmount()
    dispatch.mockClear()
    window.dispatchEvent(new Event('focus'))
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new StorageEvent('storage', { key: 'user', newValue: null }))
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('does not reauthenticate on focus after a failed hydration', async () => {
    const store = configureStore({ reducer: { user: reducer } })
    const get = vi.spyOn(apiClient, 'get').mockRejectedValueOnce(new Error('expired'))
    localStorage.setItem('user', JSON.stringify({ nickname: 'user', token: 'expired-token' }))
    mode.real = true
    const view = render(<Provider store={store}><Dashboard><span>Protected content</span></Dashboard></Provider>)
    try {
      await waitFor(() => expect(store.getState().user.sessionStatus).toBe(SESSION_STATUS.ANONYMOUS))
      expect(localStorage.getItem('user')).toBeNull()
      act(() => window.dispatchEvent(new Event('focus')))
      expect(get).toHaveBeenCalledTimes(1)
      expect(store.getState().user.token).toBe('')
      expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
    } finally {
      view.unmount()
      mode.real = false
      get.mockRestore()
      localStorage.removeItem('user')
    }
  })
})
