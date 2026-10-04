'use client';

import { useCallback } from 'react';
import { Permission, SESSION_STATUS } from '@/interfaces/auth.interface';
import { useSessionAccess } from '@/hooks/useSessionAccess';

/**
 * Hook personalizado para verificar permisos del usuario
 *
 * Returns permission helpers plus the session status. While the session is
 * `hydrating`, helpers report no permission but `hydrating` is true so callers
 * render loading instead of a forbidden state.
 *
 * @example
 * ```tsx
 * const { hasPermission, hydrating, canCreateExpense } = usePermission();
 *
 * if (hydrating) {
 *   return <Spinner />
 * }
 *
 * if (canCreateExpense) {
 *   return <button onClick={handleCreate}>Crear Egreso</button>
 * }
 *
 * if (hasPermission(Permission.DELETE_EXPENSE)) {
 *   return <button onClick={handleDelete}>Eliminar</button>
 * }
 * ```
 */
export const usePermission = () => {
  const { status, permissions } = useSessionAccess();
  const hydrating = status === SESSION_STATUS.HYDRATING;

  /**
   * Verifica si el usuario tiene un permiso específico
   * @param permission - Permiso a verificar (usar enum Permission)
   * @returns true si el usuario tiene el permiso, false en caso contrario
   */
  const hasPermission = useCallback(
    (permission: Permission | string): boolean => permissions.includes(permission),
    [permissions]
  );

  /**
   * Verifica si el usuario tiene al menos uno de los permisos especificados
   * @param required - Array de permisos a verificar
   * @returns true si el usuario tiene al menos uno de los permisos
   */
  const hasAnyPermission = useCallback(
    (required: (Permission | string)[]): boolean =>
      required.some((permission) => permissions.includes(permission)),
    [permissions]
  );

  /**
   * Verifica si el usuario tiene todos los permisos especificados
   * @param required - Array de permisos a verificar
   * @returns true si el usuario tiene todos los permisos
   */
  const hasAllPermissions = useCallback(
    (required: (Permission | string)[]): boolean =>
      required.every((permission) => permissions.includes(permission)),
    [permissions]
  );

  // Helpers específicos para egresos (shortcuts)
  const canCreateExpense = hasPermission(Permission.CREATE_EXPENSE);
  const canReadExpense = hasPermission(Permission.READ_EXPENSE);
  const canUpdateExpense = hasPermission(Permission.UPDATE_EXPENSE);
  const canDeleteExpense = hasPermission(Permission.DELETE_EXPENSE);

  // Helper para verificar si tiene permisos de escritura completos (crear + actualizar + eliminar)
  const hasFullExpenseAccess = canCreateExpense && canUpdateExpense && canDeleteExpense;

  // Helper para verificar si solo tiene permisos de lectura
  const isReadOnly = canReadExpense && !canCreateExpense && !canUpdateExpense && !canDeleteExpense;

  return {
    hydrating,
    status,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canCreateExpense,
    canReadExpense,
    canUpdateExpense,
    canDeleteExpense,
    hasFullExpenseAccess,
    isReadOnly,
  };
};
