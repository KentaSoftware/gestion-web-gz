'use client'

import { useAppSelector } from '@/redux/hook'
import { getUser } from '@/redux/userSlice'
import { SESSION_STATUS, type SessionAccess } from '@/interfaces/auth.interface'
import { DEFAULT_MODULE_GATES } from '@/config/moduleRegistry'

export const useSessionAccess = (): SessionAccess => {
  const user = useAppSelector(getUser)
  const status = user.sessionStatus ?? SESSION_STATUS.HYDRATING
  const ready = status === SESSION_STATUS.READY
  return {
    status,
    permissions: ready ? user.role?.permissions ?? [] : [],
    isAdmin: ready && user.isAdmin === true,
    gates: DEFAULT_MODULE_GATES,
  }
}
