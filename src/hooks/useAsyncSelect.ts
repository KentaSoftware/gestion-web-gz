import { useCallback, useEffect, useRef, useState } from 'react'
import apiClient from '@/utils/client'
import { io } from 'socket.io-client'

interface SelectItem {
  _id: string
  descripcion: string
}

interface UseAsyncSelectOptions {
  path: string
  enableRealtime?: boolean
}

interface UseAsyncSelectReturn {
  items: SelectItem[]
  loading: boolean
  saving: boolean
  error: string | null
  refresh: () => Promise<void>
  create: (descripcion: string) => Promise<SelectItem>
  update: (id: string, descripcion: string) => Promise<SelectItem>
}

export function useAsyncSelect({
  path,
  enableRealtime = false,
}: UseAsyncSelectOptions): UseAsyncSelectReturn {
  const [items, setItems] = useState<SelectItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchItems = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.get(path, { signal: controller.signal })
      if (!controller.signal.aborted) {
        setItems(response.data)
        setLoading(false)
      }
    } catch (e: any) {
      if (e?.name !== 'CanceledError' && e?.code !== 'ERR_CANCELED') {
        setError(e?.message || 'Error al cargar datos')
        setLoading(false)
      }
    }
  }, [path])

  const refresh = useCallback(async () => {
    await fetchItems()
  }, [fetchItems])

  const create = useCallback(
    async (descripcion: string): Promise<SelectItem> => {
      setSaving(true)
      setError(null)
      try {
        const response = await apiClient.post(`/${path}`, { descripcion })
        setSaving(false)
        await fetchItems()
        return response.data
      } catch (e: any) {
        setError(e?.message || 'Error al crear')
        setSaving(false)
        throw e
      }
    },
    [path, fetchItems],
  )

  const update = useCallback(
    async (id: string, descripcion: string): Promise<SelectItem> => {
      setSaving(true)
      setError(null)
      try {
        const response = await apiClient.patch(`/${path}/${id}`, { descripcion })
        setSaving(false)
        await fetchItems()
        return response.data
      } catch (e: any) {
        setError(e?.message || 'Error al actualizar')
        setSaving(false)
        throw e
      }
    },
    [path, fetchItems],
  )

  // Socket.io realtime
  useEffect(() => {
    if (!enableRealtime) return

    const socket = io(process.env.NEXT_PUBLIC_DB_HOST || '')
    socket.on(path, (newData: any) => {
      if (Array.isArray(newData)) {
        setItems(newData)
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [path, enableRealtime])

  // Initial fetch
  useEffect(() => {
    fetchItems()
    return () => {
      abortRef.current?.abort()
    }
  }, [fetchItems])

  return { items, loading, saving, error, refresh, create, update }
}
