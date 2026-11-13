import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { SESSION_STATUS, type UserWithToken } from '@/interfaces/auth.interface'
import { getCurrentUser } from '@/services/auth.service'

const initialState: UserWithToken = {
  nickname: '', token: '', id: '', email: '', role: undefined,
  sessionStatus: SESSION_STATUS.HYDRATING, isAdmin: false,
}

export const hydrateSession = createAsyncThunk('user/hydrate', async (token: string, { getState, requestId }) => {
  try {
    return await getCurrentUser(token)
  } catch (error) {
    const state = getState() as { user: UserWithToken }
    if (state.user.token === token && state.user.requestId === requestId && typeof window !== 'undefined') {
      try {
        const stored: unknown = JSON.parse(window.localStorage.getItem('user') || 'null')
        if (stored && typeof stored === 'object' && 'token' in stored && stored.token === token) {
          window.localStorage.removeItem('user')
        }
      } catch {
        // Storage may be unavailable or contain invalid JSON.
      }
    }
    throw error
  }
})

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (_state, action: PayloadAction<UserWithToken>) => ({
      ...initialState, nickname: action.payload.nickname, token: action.payload.token,
      sessionStatus: SESSION_STATUS.HYDRATING,
    }),
    clearUser: () => ({ ...initialState, sessionStatus: SESSION_STATUS.ANONYMOUS }),
  },
  extraReducers: (builder) => {
    builder.addCase(hydrateSession.pending, (state, action) => {
      if (state.token !== action.meta.arg) return
      state.requestId = action.meta.requestId
      // A ready session's permissions came from this token's verified profile.
      // Keep them while refreshing; new or replaced tokens still hydrate closed.
      if (state.sessionStatus !== SESSION_STATUS.READY) {
        state.sessionStatus = SESSION_STATUS.HYDRATING
        state.role = undefined
        state.isAdmin = false
      }
    })
    builder.addCase(hydrateSession.fulfilled, (state, action) => {
      if (state.requestId !== action.meta.requestId || state.token !== action.meta.arg) return
      const user = action.payload
      state.nickname = user.nickname
      state.id = user.id
      state.role = { _id: user.role.id, name: user.role.name, permissions: user.permissions }
      state.isAdmin = user.isAdmin
      state.sessionStatus = SESSION_STATUS.READY
      state.requestId = undefined
    })
    builder.addCase(hydrateSession.rejected, (state, action) => {
      if (state.requestId !== action.meta.requestId || state.token !== action.meta.arg) return
      return { ...initialState, sessionStatus: SESSION_STATUS.ANONYMOUS }
    })
  },
})

export const getUser = (state: { user: UserWithToken }) => state.user
export const { setUser, clearUser } = userSlice.actions
export default userSlice.reducer
