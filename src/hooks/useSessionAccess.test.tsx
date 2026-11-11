import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import apiClient from '@/utils/client'
import { Permission, SESSION_STATUS, type UserWithToken } from '@/interfaces/auth.interface'
import reducer, { clearUser, hydrateSession, setUser } from '@/redux/userSlice'

const { useAppSelector } = vi.hoisted(() => ({ useAppSelector: vi.fn() }))
vi.mock('@/redux/hook', () => ({ useAppSelector }))
vi.mock('@/config/moduleRegistry', () => ({
  DEFAULT_MODULE_GATES: { stock: false, finance: true, simulation: false },
}))
import { useSessionAccess } from './useSessionAccess'

const profile = {
  id: 'user-1', nickname: 'verified', role: { id: 'role-1', name: 'Repartidor' },
  permissions: [Permission.READ_ROUTE_PLAN], isAdmin: true,
}
const persisted: UserWithToken = {
  nickname: 'stored', token: 'session-token', isAdmin: true,
  role: { _id: 'old', name: 'old', permissions: [Permission.ADJUST_STOCK] },
}

describe('session hydration', () => {
  beforeEach(() => useAppSelector.mockReturnValue(reducer(undefined, { type: 'init' })))

  it('does not trust persisted permissions or administrator status', () => {
    const state = reducer(undefined, setUser(persisted))
    useAppSelector.mockReturnValue(state)
    const { result } = renderHook(() => useSessionAccess())
    expect(result.current.status).toBe(SESSION_STATUS.HYDRATING)
    expect(result.current.permissions).toEqual([])
    expect(result.current.isAdmin).toBe(false)
  })

  it('exposes only the verified profile after successful hydration', () => {
    let state = reducer(undefined, setUser(persisted))
    state = reducer(state, hydrateSession.pending('request-1', persisted.token))
    state = reducer(state, hydrateSession.fulfilled(profile, 'request-1', persisted.token))
    useAppSelector.mockReturnValue(state)
    const { result } = renderHook(() => useSessionAccess())
    expect(result.current.status).toBe(SESSION_STATUS.READY)
    expect(result.current.permissions).toEqual([Permission.READ_ROUTE_PLAN])
    expect(result.current.isAdmin).toBe(true)
    expect(result.current.gates).toMatchObject({ stock: false, finance: true, simulation: false })
  })

  it('fails closed when hydration fails', () => {
    let state = reducer(undefined, setUser(persisted))
    state = reducer(state, hydrateSession.pending('request-1', persisted.token))
    state = reducer(state, hydrateSession.rejected(new Error('failed'), 'request-1', persisted.token))
    useAppSelector.mockReturnValue(state)
    const { result } = renderHook(() => useSessionAccess())
    expect(result.current.status).toBe(SESSION_STATUS.ANONYMOUS)
    expect(result.current.permissions).toEqual([])
    expect(result.current.isAdmin).toBe(false)
  })

  it('ignores late responses after logout and a new login, even with the same token', () => {
    let state = reducer(undefined, setUser(persisted))
    state = reducer(state, hydrateSession.pending('old', persisted.token))
    state = reducer(state, clearUser())
    state = reducer(state, hydrateSession.fulfilled(profile, 'old', persisted.token))
    expect(state.sessionStatus).toBe(SESSION_STATUS.ANONYMOUS)
    state = reducer(state, setUser(persisted))
    state = reducer(state, hydrateSession.pending('new', persisted.token))
    state = reducer(state, hydrateSession.fulfilled(profile, 'old', persisted.token))
    expect(state.sessionStatus).toBe(SESSION_STATUS.HYDRATING)
    expect(state.isAdmin).toBe(false)
  })

  it('hides previously verified access during revalidation and ignores older responses', () => {
    let state = reducer(undefined, setUser(persisted))
    state = reducer(state, hydrateSession.pending('first', persisted.token))
    state = reducer(state, hydrateSession.fulfilled(profile, 'first', persisted.token))
    state = reducer(state, hydrateSession.pending('refresh-1', persisted.token))
    expect(state.sessionStatus).toBe(SESSION_STATUS.HYDRATING)
    expect(state.role).toBeUndefined()
    state = reducer(state, hydrateSession.pending('refresh-2', persisted.token))
    state = reducer(state, hydrateSession.fulfilled(profile, 'refresh-1', persisted.token))
    expect(state.sessionStatus).toBe(SESSION_STATUS.HYDRATING)
    state = reducer(state, hydrateSession.fulfilled(profile, 'refresh-2', persisted.token))
    expect(state.sessionStatus).toBe(SESSION_STATUS.READY)
  })

  it('fetches the profile using the current token and applies the response', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: profile })
    const store = configureStore({ reducer })
    store.dispatch(setUser(persisted))
    await store.dispatch(hydrateSession(persisted.token))
    expect(get).toHaveBeenCalledWith('/auth/me', { headers: { Authorization: 'Bearer session-token' } })
    expect(store.getState().sessionStatus).toBe(SESSION_STATUS.READY)
    expect(store.getState().role?.permissions).toEqual(profile.permissions)
    get.mockRestore()
  })

  it('removes the matching persisted token on hydration failure', async () => {
    localStorage.setItem('user', JSON.stringify(persisted))
    const get = vi.spyOn(apiClient, 'get').mockRejectedValueOnce(new Error('failed'))
    const store = configureStore({ reducer: { user: reducer } })
    store.dispatch(setUser(persisted))
    await store.dispatch(hydrateSession(persisted.token))
    expect(localStorage.getItem('user')).toBeNull()
    expect(store.getState().user.sessionStatus).toBe(SESSION_STATUS.ANONYMOUS)
    get.mockRestore()
  })

  it('does not remove a newer login when an old request fails', async () => {
    let rejectRequest!: (error: Error) => void
    const get = vi.spyOn(apiClient, 'get').mockReturnValueOnce(new Promise((_, reject) => { rejectRequest = reject }))
    const store = configureStore({ reducer: { user: reducer } })
    store.dispatch(setUser(persisted))
    const pending = store.dispatch(hydrateSession(persisted.token))
    store.dispatch(clearUser())
    store.dispatch(setUser(persisted))
    localStorage.setItem('user', JSON.stringify(persisted))
    rejectRequest(new Error('late failure'))
    await pending
    expect(localStorage.getItem('user')).not.toBeNull()
    expect(store.getState().user.sessionStatus).toBe(SESSION_STATUS.HYDRATING)
    get.mockRestore()
    localStorage.clear()
  })

  it('does not clear a newer session when an older request rejects', () => {
    let state = reducer(undefined, setUser(persisted))
    state = reducer(state, hydrateSession.pending('old', persisted.token))
    state = reducer(state, setUser({ nickname: 'new', token: 'new-token' }))
    state = reducer(state, hydrateSession.pending('new', 'new-token'))
    state = reducer(state, hydrateSession.rejected(new Error('late failure'), 'old', persisted.token))
    expect(state.token).toBe('new-token')
    expect(state.requestId).toBe('new')
    expect(state.sessionStatus).toBe(SESSION_STATUS.HYDRATING)
  })
})
