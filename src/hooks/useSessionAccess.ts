'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAppSelector } from '@/redux/hook'
import { getUser } from '@/redux/userSlice'
import {
  Permission,
  SESSION_STATUS,
  type SessionAccess,
  type SessionStatus,
} from '@/interfaces/auth.interface'
import {
  DEFAULT_MODULE_GATES,
  MODULE_FLAG,
  MODULE_FLAGS,
  MODULE_GATE,
} from '@/config/moduleRegistry'

/**
 * Exposes the session access contract to components.
 *
 * `status` distinguishes a still-hydrating session (`hydrating`) from a
 * genuinely missing one (`anonymous`), so consumers can render a loading or
 * neutral state instead of the forbidden UI while permissions are unknown.
 *
 * The route gate is evidence-backed: it is met only when the route module flag
 * resolves to exactly `true` and the authenticated session can read route
 * plans. Every other module gate keeps its externally approved default.
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

  const routeFlagEnabled = MODULE_FLAGS[MODULE_FLAG.ROUTE]

  const gates = useMemo(() => {
    const canReadRoutePlan =
      status === SESSION_STATUS.READY &&
      permissions.includes(Permission.READ_ROUTE_PLAN)

    return {
      ...DEFAULT_MODULE_GATES,
      [MODULE_GATE.ROUTE]: routeFlagEnabled === true && canReadRoutePlan,
    }
  }, [status, permissions, routeFlagEnabled])

  return {
    status,
    permissions,
    gates,
  }
}
