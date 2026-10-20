'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAppSelector } from '@/redux/hook'
import { getUser } from '@/redux/userSlice'
import {
  SESSION_STATUS,
  type SessionAccess,
  type SessionStatus,
} from '@/interfaces/auth.interface'
import {
  DEFAULT_MODULE_GATES,
} from '@/config/moduleRegistry'

/**
 * Exposes the session access contract to components.
 *
 * `status` distinguishes a still-hydrating session (`hydrating`) from a
 * genuinely missing one (`anonymous`), so consumers can render a loading or
 * neutral state instead of the forbidden UI while permissions are unknown.
 *
 * Module gates keep their externally approved defaults. Rutas is permission
 * gated through the module registry and does not require a module gate.
 */
export const useSessionAccess = (): SessionAccess => {
  const user = useAppSelector(getUser)
  const [hydrationChecked, setHydrationChecked] = useState(false)

  useEffect(() => {
    setHydrationChecked(true)
  }, [])

  const status: SessionStatus = useMemo(() => {
    if (user.token !== '') {
      return SESSION_STATUS.READY
    }
    if (!hydrationChecked) {
      return SESSION_STATUS.HYDRATING
    }
    return SESSION_STATUS.ANONYMOUS
  }, [user.token, hydrationChecked])

  const permissions = useMemo(() => user.role?.permissions ?? [], [user.role])

  const gates = useMemo(() => DEFAULT_MODULE_GATES, [])

  return {
    status,
    permissions,
    gates,
  }
}
