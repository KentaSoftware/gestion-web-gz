'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePermission } from '@/hooks/usePermission';
import { useSessionAccess } from '@/hooks/useSessionAccess';
import { Permission, SESSION_STATUS } from '@/interfaces/auth.interface';
import AccessDenied from './AccessDenied';
import { Spinner } from '@/components/ui/spinner';

interface ProtectedRouteProps {
  /** Contenido a renderizar si el usuario tiene permisos */
  children: ReactNode;
  /** Permiso(s) requerido(s) para acceder a la ruta */
  requiredPermission?: Permission | Permission[];
  /** Mensaje personalizado si no tiene permisos */
  deniedMessage?: string;
  /** Redirigir a otra página en lugar de mostrar AccessDenied (opcional) */
  redirectTo?: string;
  /** Requerir autenticación (verificar token) - default: true */
  requireAuth?: boolean;
}

/**
 * Componente ProtectedRoute
 * 
 * Wrapper para proteger rutas que requieren permisos específicos.
 * Verifica automáticamente si el usuario tiene los permisos necesarios
 * y muestra AccessDenied o redirige si no los tiene.
 * 
 * @example
 * ```tsx
 * // En una página que requiere permiso de crear egresos
 * export default function NewExpensePage() {
 *   return (
 *     <ProtectedRoute 
 *       requiredPermission={Permission.CREATE_EXPENSE}
 *       deniedMessage="No tienes permiso para crear egresos"
 *     >
 *       <ExpenseForm mode="create" />
 *     </ProtectedRoute>
 *   );
 * }
 * 
 * // Con múltiples permisos (requiere AL MENOS UNO)
 * <ProtectedRoute 
 *   requiredPermission={[Permission.UPDATE_EXPENSE, Permission.DELETE_EXPENSE]}
 * >
 *   <EditExpenseForm />
 * </ProtectedRoute>
 * 
 * // Con redirección
 * <ProtectedRoute 
 *   requiredPermission={Permission.CREATE_EXPENSE}
 *   redirectTo="/expense"
 * >
 *   <NewExpenseForm />
 * </ProtectedRoute>
 * ```
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  deniedMessage,
  redirectTo,
  requireAuth = true,
}) => {
  const router = useRouter();
  const { status } = useSessionAccess();
  const { hasPermission, hasAnyPermission } = usePermission();
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  const hydrating = status === SESSION_STATUS.HYDRATING;
  const anonymous = status === SESSION_STATUS.ANONYMOUS;

  useEffect(() => {
    // While the session is hydrating, never evaluate access: show loading only.
    if (hydrating) {
      setIsChecking(true);
      return;
    }

    // Require authentication when configured; a genuinely absent session
    // redirects, it does not flash the forbidden UI.
    if (requireAuth && anonymous) {
      setIsChecking(false);
      setHasAccess(false);
      router.push('/');
      return;
    }

    // Si no se especificó permiso, solo verificar auth
    if (!requiredPermission) {
      setHasAccess(true);
      setIsChecking(false);
      return;
    }

    // Verificar permisos
    const permitted = Array.isArray(requiredPermission)
      ? hasAnyPermission(requiredPermission)
      : hasPermission(requiredPermission);

    setHasAccess(permitted);
    setIsChecking(false);

    // Si no tiene acceso y se especificó redirección
    if (!permitted && redirectTo) {
      router.push(redirectTo);
    }
  }, [hydrating, anonymous, requiredPermission, redirectTo, requireAuth, hasPermission, hasAnyPermission, router]);

  // Mostrar loading mientras se verifica o durante la hidratación de sesión
  if (hydrating || isChecking) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner className="size-12 text-brand-primary" />
      </div>
    );
  }

  // Sesión ausente con autenticación requerida: se redirige en el useEffect
  if (requireAuth && anonymous) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner className="size-12 text-brand-primary" />
      </div>
    );
  }

  // Si no tiene acceso y no hay redirección, mostrar AccessDenied
  if (!hasAccess && !redirectTo) {
    const permissionText = Array.isArray(requiredPermission)
      ? requiredPermission.join(', ')
      : requiredPermission || 'desconocido';

    const defaultMessage = deniedMessage || 
      `No tienes permisos suficientes para acceder a esta página. Se requiere: ${permissionText}`;

    return <AccessDenied message={defaultMessage} />;
  }

  // Si no tiene acceso y hay redirección, no renderizar nada (se redirige en el useEffect)
  if (!hasAccess && redirectTo) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner className="size-12 text-brand-primary" />
      </div>
    );
  }

  // Si tiene acceso, renderizar el contenido
  return <>{children}</>;
};

export default ProtectedRoute;
