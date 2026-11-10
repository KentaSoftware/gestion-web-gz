import axios from "axios";

const apiClient = axios.create({
  // URL para variable de entorno
  baseURL: process.env.NEXT_PUBLIC_DB_HOST
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = window.localStorage.getItem('user')
    if (token && !config.headers.Authorization) {
      const tokenParsed = JSON.parse(token)
      config.headers.Authorization = `Bearer ${tokenParsed.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de respuesta para manejar errores 403
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Verificar si el error es 403 (Forbidden)
    if (error.response && error.response.status === 403) {
      // Guardar información del error en sessionStorage para mostrar mensaje específico
      const errorData = {
        message: error.response.data || 'PERMISO_NO_ENCONTRADO',
        timestamp: new Date().toISOString(),
        url: error.config?.url,
      };
      
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('lastForbiddenError', JSON.stringify(errorData));
      }

      // Obtener el mensaje de error del backend
      const backendMessage = error.response.data;
      let userMessage = 'No tienes permisos para realizar esta acción.';

      // Personalizar mensaje según el error del backend
      switch (backendMessage) {
        case 'TOKEN_NO_VALIDO_O_SIN_PERMISOS':
          userMessage = 'Tu sesión no es válida o no tienes permisos asignados.';
          break;
        case 'PERMISO_NO_ENCONTRADO':
          userMessage = 'No tienes el permiso necesario para realizar esta acción.';
          break;
        case 'USUARIO_NO_ACTIVO':
          userMessage = 'Tu usuario no está activo. Contacta al administrador.';
          break;
        case 'BASE_DE_DATOS_NO_DISPONIBLE':
        case 'ERROR_BASE_DE_DATOS':
          userMessage = 'Error de conexión con la base de datos. Intenta más tarde.';
          break;
        case 'ERROR_VERIFICANDO_PERMISOS':
          userMessage = 'Error al verificar permisos. Intenta nuevamente.';
          break;
        default:
          userMessage = backendMessage || 'No tienes permisos para realizar esta acción.';
      }

      // Agregar el mensaje al error para que pueda ser mostrado en el componente
      error.userMessage = userMessage;
    }

    return Promise.reject(error);
  }
);

export default apiClient;
