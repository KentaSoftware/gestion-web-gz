'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAppSelector } from '@/redux/hook'
import { getUser } from '@/redux/userSlice'
import {
  SESSION_STATUS,
  type SessionAccess,
  type SessionStatus,
  type UserWithToken,
} from '@/interfaces/auth.interface'
import { DEFAULT_MODULE_GATES } from '@/config/moduleRegistry'

/**
 * Reads the persisted session without side effects. A session is considered
 * present only when it carries both a token and a role; anything else is
 * treated as absent so a stale payload cannot grant access.
 */
const readPersistedSession = (): UserWithToken | null => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem('user')
    if (raw === null || raw === '') {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<UserWithToken>
    const token = typeof parsed.token === 'string' ? parsed.token : ''
    if (token === '' || parsed.role == null) {
      return null
    }

    return parsed as UserWithToken
  } catch {
    return null
  }
}

/**
 * Exposes the session access contract to components.
 *
 * `status` distinguishes a still-hydrating session (`hydrating`) from a
 * genuinely missing one (`anonymous`), so consumers can render a loading or
 * neutral state instead of the forbidden UI while permissions are unknown.
 */
export const useSessionAccess = (): SessionAccess => {
  const user = useAppSelector(getUser)
  const [hydrationChecked, setHydrationChecked] = useState(false)
  const [hasPersistedSession, setHasPersistedSession] = useState(false)

  useEffect(() => {
    if (user.token !== '') {
      setHasPersistedSession(true)
    } else {
      setHasPersistedSession(readPersistedSession() !== null)
    }
    setHydrationChecked(true)
  }, [user.token])

  const status: SessionStatus = useMemo(() => {
    if (user.token !== '') {
      return SESSION_STATUS.READY
    }
    if (!hydrationChecked || hasPersistedSession) {
      return SESSION_STATUS.HYDRATING
    }
    return SESSION_STATUS.ANONYMOUS
  }, [user.token, hydrationChecked, hasPersistedSession])

  const permissions = useMemo(() => user.role?.permissions ?? [], [user.role])

  return {
    status,
    permissions,
    gates: DEFAULT_MODULE_GATES,
  }
}
