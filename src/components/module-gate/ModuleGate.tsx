'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { MODULE_FLAGS, isModuleEnabled, type ModuleRegistryEntry } from '@/config/moduleRegistry'
import { SESSION_STATUS } from '@/interfaces/auth.interface'
import { useSessionAccess } from '@/hooks/useSessionAccess'
import { MODULE_ACCESS_STATE, ModuleGateState } from './ModuleGateState'

interface ModuleGateProps {
  children: ReactNode
  entry?: ModuleRegistryEntry
}

export const ModuleGate = ({ children, entry }: ModuleGateProps) => {
  const router = useRouter()
  const access = useSessionAccess()

  if (!entry || access.status === SESSION_STATUS.ANONYMOUS) {
    return <>{children}</>
  }

  if (access.status === SESSION_STATUS.HYDRATING) {
    return <ModuleGateState state={MODULE_ACCESS_STATE.LOADING} moduleLabel={entry.label} />
  }

  if (isModuleEnabled(entry, access)) {
    return <>{children}</>
  }

  const unavailable =
    (entry.flag !== null && !MODULE_FLAGS[entry.flag]) ||
    (entry.gate !== null && access.gates[entry.gate] !== true)

  return (
    <ModuleGateState
      state={unavailable ? MODULE_ACCESS_STATE.UNAVAILABLE : MODULE_ACCESS_STATE.FORBIDDEN}
      moduleLabel={entry.label}
      onRetry={() => router.refresh()}
    />
  )
}
