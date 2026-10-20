'use client';

import { useRouter } from 'next/navigation';
import { Lock, ArrowLeft, Home } from 'lucide-react';

interface AccessDeniedProps {
  /** Mensaje personalizado para mostrar al usuario */
  message?: string;
  /** Título personalizado (default: "Acceso Denegado") */
  title?: string;
  /** Mostrar botón de volver atrás (default: true) */
  showBackButton?: boolean;
  /** Mostrar botón de ir al inicio (default: true) */
  showHomeButton?: boolean;
  /** Mostrar información adicional sobre cómo obtener permisos (default: true) */
  showInfo?: boolean;
}

/**
 * Componente AccessDenied
 *
 * Muestra una pantalla amigable cuando el usuario no tiene permisos para acceder a una página o acción.
 * Se utiliza en dos contextos:
 * 1. Como página completa cuando se detecta 403 en interceptor de Axios
 * 2. Como componente wrapper en ProtectedRoute cuando falta permiso
 *
 * @example
 * ```tsx
 * // Como página completa
 * <AccessDenied
 *   message="No tienes permisos para crear egresos"
 *   showBackButton={true}
 * />
 *
 * // Personalizado sin botón de volver
 * <AccessDenied
 *   title="Permiso Requerido"
 *   message="Solo administradores pueden acceder aquí"
 *   showBackButton={false}
 * />
 * ```
 */
export const AccessDenied = ({
  message = 'No tienes los permisos necesarios para acceder a esta página o realizar esta acción.',
  title = 'Acceso Denegado',
  showBackButton = true,
  showHomeButton = true,
  showInfo = true,
}: AccessDeniedProps) => {
  const router = useRouter();

  const handleGoBack = () => {
    router.back();
  };

  const handleGoHome = () => {
    router.push('/home');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background-canvas p-5">
      <div className="w-full max-w-[500px] rounded-lg bg-surface-base p-10 text-center shadow-md">
        <div className="mb-5 text-[80px] text-state-error animate-[access-denied-shake_0.5s_ease-in-out]">
          <Lock aria-hidden="true" />
        </div>

        <h1 className="mb-3 text-[28px] font-bold text-text-primary">
          {title}
        </h1>
        <p className="mb-5 text-lg font-semibold text-state-error">
          Error 403 - Forbidden
        </p>
        <p className="mb-[30px] text-sm leading-[1.6] text-text-secondary">
          {message}
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          {showBackButton && (
            <button
              className="flex cursor-pointer items-center gap-2 rounded-md border-0 px-6 py-3 text-sm font-semibold bg-background-subtle text-text-primary transition-all duration-[var(--duration-base)] ease-[var(--ease-standard)] hover:bg-border-subtle hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
              onClick={handleGoBack}
              type="button"
            >
              <ArrowLeft aria-hidden="true" />
              Volver Atrás
            </button>
          )}
          {showHomeButton && (
            <button
              className="flex cursor-pointer items-center gap-2 rounded-md border-0 px-6 py-3 text-sm font-semibold bg-brand-primary text-text-inverse transition-all duration-[var(--duration-base)] ease-[var(--ease-standard)] hover:bg-brand-primary-hover hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
              onClick={handleGoHome}
              type="button"
            >
              <Home aria-hidden="true" />
              Ir al Inicio
            </button>
          )}
        </div>

        {showInfo && (
          <div className="mt-6 rounded-sm border-l-4 border-l-state-warning bg-background-subtle p-4 text-left">
            <p className="mb-2 text-sm font-semibold text-state-warning">
              ¿Necesitas acceso?
            </p>
            <p className="m-0 text-[13px] leading-[1.5] text-text-secondary">
              Si crees que deberías tener acceso a esta función, contacta a tu administrador del sistema
              para que actualice tus permisos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccessDenied;
