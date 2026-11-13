import { useLayoutEffect, useState, type ReactNode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Permission, SESSION_STATUS, type AuthMe } from '@/interfaces/auth.interface'
import reducer, { clearUser, setUser } from '@/redux/userSlice'
import apiClient from '@/utils/client'
import Dashboard from './Dashboard'
import { ProtectedRoute } from './ProtectedRoute'

vi.mock('next/navigation', () => ({ usePathname: () => '/sale/newSale', useRouter: () => ({ push: vi.fn() }) }))
vi.mock('./AppSidebar', () => ({ default: () => null }))
vi.mock('@/components/ui/sidebar', () => ({
  SidebarProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarInset: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarTrigger: () => null,
}))

const profile: AuthMe = {
  id: '1', nickname: 'verified', role: { id: '1', name: 'sales' },
  permissions: [Permission.READ_ROUTE_PLAN], isAdmin: false,
}

function deferred() {
  let resolve!: (value: { data: AuthMe }) => void
  let reject!: (error: Error) => void
  const promise = new Promise<{ data: AuthMe }>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

function Draft() {
  const [value, setValue] = useState('')
  return <input aria-label="draft" value={value} onChange={(event) => setValue(event.target.value)} />
}

describe('Dashboard session revalidation', () => {
  beforeEach(() => localStorage.setItem('user', JSON.stringify({ token: 'token', nickname: 'stored' })))
  afterEach(() => { vi.restoreAllMocks(); localStorage.clear() })

  it('keeps a stateful child mounted through concurrent focus and visibility refreshes and applies revocation', async () => {
    const first = deferred()
    const second = deferred()
    const get = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: profile })
      .mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const store = configureStore({ reducer: { user: reducer } })
    render(<Provider store={store}><Dashboard><Draft /></Dashboard></Provider>)
    const input = await screen.findByLabelText('draft')
    fireEvent.change(input, { target: { value: 'unsaved sale' } })
    fireEvent.focus(window)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    fireEvent(document, new Event('visibilitychange'))
    expect(get).toHaveBeenCalledTimes(3)
    expect(screen.getByLabelText('draft')).toBe(input)
    expect(input).toHaveValue('unsaved sale')
    expect(store.getState().user.role?.permissions).toEqual(profile.permissions)
    await act(async () => { second.resolve({ data: { ...profile, permissions: [] } }); await second.promise })
    await waitFor(() => expect(store.getState().user.role?.permissions).toEqual([]))
    await act(async () => { first.resolve({ data: profile }); await first.promise })
    expect(store.getState().user.role?.permissions).toEqual([])
    expect(screen.getByLabelText('draft')).toBe(input)
    expect(input).toHaveValue('unsaved sale')
  })

  it('removes protected content as soon as a refresh revokes its permission', async () => {
    const refresh = deferred()
    const commits = vi.fn()
    function ProtectedDraft() {
      useLayoutEffect(commits)
      return <Draft />
    }
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: profile }).mockReturnValueOnce(refresh.promise)
    const store = configureStore({ reducer: { user: reducer } })
    render(<Provider store={store}><Dashboard><ProtectedRoute requiredPermission={Permission.READ_ROUTE_PLAN}><ProtectedDraft /></ProtectedRoute></Dashboard></Provider>)
    const input = await screen.findByLabelText('draft')
    fireEvent.change(input, { target: { value: 'unsaved sale' } })
    fireEvent.focus(window)
    expect(screen.getByLabelText('draft')).toBe(input)
    expect(input).toHaveValue('unsaved sale')
    commits.mockClear()
    await act(async () => { refresh.resolve({ data: { ...profile, permissions: [] } }); await refresh.promise })
    await waitFor(() => expect(screen.queryByLabelText('draft')).not.toBeInTheDocument())
    expect(commits).not.toHaveBeenCalled()
    expect(store.getState().user.role?.permissions).toEqual([])
  })

  it('clears access on cross-tab logout and ignores the pending refresh', async () => {
    const refresh = deferred()
    const get = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: profile }).mockReturnValueOnce(refresh.promise)
    const store = configureStore({ reducer: { user: reducer } })
    render(<Provider store={store}><Dashboard><Draft /></Dashboard></Provider>)
    await screen.findByLabelText('draft')
    fireEvent.focus(window)
    localStorage.removeItem('user')
    fireEvent(window, new StorageEvent('storage', { key: 'user', newValue: null }))
    expect(store.getState().user.sessionStatus).toBe(SESSION_STATUS.ANONYMOUS)
    expect(screen.queryByLabelText('draft')).not.toBeInTheDocument()
    await act(async () => { refresh.resolve({ data: profile }); await refresh.promise })
    fireEvent.focus(window)
    expect(get).toHaveBeenCalledTimes(2)
    expect(store.getState().user.token).toBe('')
    expect(store.getState().user.role).toBeUndefined()
  })

  it('removes focus, visibility and storage listeners on unmount', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: profile })
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    const store = configureStore({ reducer: { user: reducer } })
    const { unmount } = render(<Provider store={store}><Dashboard><Draft /></Dashboard></Provider>)
    await screen.findByLabelText('draft')
    const state = store.getState().user
    unmount()
    fireEvent.focus(window)
    fireEvent(document, new Event('visibilitychange'))
    fireEvent(window, new StorageEvent('storage', { key: 'user', newValue: null }))
    expect(get).toHaveBeenCalledTimes(1)
    expect(store.getState().user).toEqual(state)
  })

  it('does not reauthenticate on focus or visibility after initial hydration fails', async () => {
    const get = vi.spyOn(apiClient, 'get').mockRejectedValueOnce(new Error('expired'))
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    const store = configureStore({ reducer: { user: reducer } })
    render(<Provider store={store}><Dashboard><Draft /></Dashboard></Provider>)
    await waitFor(() => expect(store.getState().user.sessionStatus).toBe(SESSION_STATUS.ANONYMOUS))
    expect(localStorage.getItem('user')).toBeNull()
    fireEvent.focus(window)
    fireEvent(document, new Event('visibilitychange'))
    expect(get).toHaveBeenCalledTimes(1)
    expect(store.getState().user.token).toBe('')
    expect(screen.queryByLabelText('draft')).not.toBeInTheDocument()
  })

  it('fails closed on refresh rejection and removes the matching stored token', async () => {
    const refresh = deferred()
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: profile }).mockReturnValueOnce(refresh.promise)
    const store = configureStore({ reducer: { user: reducer } })
    render(<Provider store={store}><Dashboard><Draft /></Dashboard></Provider>)
    await screen.findByLabelText('draft')
    fireEvent.focus(window)
    expect(screen.getByLabelText('draft')).toBeInTheDocument()
    await act(async () => { refresh.reject(new Error('expired')); await refresh.promise.catch(() => {}) })
    await waitFor(() => expect(store.getState().user.sessionStatus).toBe(SESSION_STATUS.ANONYMOUS))
    expect(screen.queryByLabelText('draft')).not.toBeInTheDocument()
    expect(localStorage.getItem('user')).toBeNull()
  })

  it('blocks a replacement token and ignores a late refresh failure without deleting its storage', async () => {
    const refresh = deferred()
    const replacement = deferred()
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: profile })
      .mockReturnValueOnce(refresh.promise).mockReturnValueOnce(replacement.promise)
    const store = configureStore({ reducer: { user: reducer } })
    render(<Provider store={store}><Dashboard><Draft /></Dashboard></Provider>)
    await screen.findByLabelText('draft')
    fireEvent.focus(window)
    const stored = JSON.stringify({ token: 'replacement', nickname: 'new', role: { permissions: ['unverified'] }, isAdmin: true })
    localStorage.setItem('user', stored)
    fireEvent(window, new StorageEvent('storage', { key: 'user', newValue: stored }))
    await waitFor(() => expect(store.getState().user.requestId).toBeDefined())
    expect(screen.queryByLabelText('draft')).not.toBeInTheDocument()
    expect(store.getState().user.role).toBeUndefined()
    expect(store.getState().user.isAdmin).toBe(false)
    await act(async () => { refresh.reject(new Error('late')); await refresh.promise.catch(() => {}) })
    expect(localStorage.getItem('user')).toBe(stored)
    expect(store.getState().user.token).toBe('replacement')
    await act(async () => { replacement.resolve({ data: profile }); await replacement.promise })
    await screen.findByLabelText('draft')
  })

  it('ignores an in-flight refresh after logout, even if the same token logs in again', async () => {
    const refresh = deferred()
    const replacement = deferred()
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: profile }).mockReturnValueOnce(refresh.promise).mockReturnValueOnce(replacement.promise)
    const store = configureStore({ reducer: { user: reducer } })
    render(<Provider store={store}><Dashboard><Draft /></Dashboard></Provider>)
    await screen.findByLabelText('draft')
    fireEvent.focus(window)
    act(() => { store.dispatch(clearUser()); store.dispatch(setUser({ token: 'token', nickname: 'new' })) })
    await act(async () => { refresh.resolve({ data: profile }); await refresh.promise })
    expect(store.getState().user.sessionStatus).not.toBe(SESSION_STATUS.READY)
  })
})
