import type { AuthMe } from '@/interfaces/auth.interface'
import apiClient from '@/utils/client'

export async function getCurrentUser(token: string): Promise<AuthMe> {
  const { data } = await apiClient.get<unknown>('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (typeof data !== 'object' || data === null || !('id' in data) || typeof data.id !== 'string' ||
    !('nickname' in data) || typeof data.nickname !== 'string' ||
    !('role' in data) || typeof data.role !== 'object' || data.role === null ||
    !('id' in data.role) || typeof data.role.id !== 'string' ||
    !('name' in data.role) || typeof data.role.name !== 'string' ||
    !('permissions' in data) || !Array.isArray(data.permissions) ||
    !data.permissions.every((permission: unknown) => typeof permission === 'string') ||
    !('isAdmin' in data) || typeof data.isAdmin !== 'boolean') {
    throw new Error('Invalid session response')
  }
  return data as AuthMe
}
