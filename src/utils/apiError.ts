interface ApiErrorLike {
  message?: string;
  response?: {
    data?: {
      message?: unknown;
      error?: unknown;
    };
  };
}

const isMeaningful = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/**
 * Extrae el mensaje que el usuario debe ver ante un error de API.
 *
 * El backend responde `{ success: false, message | error }`, mientras que axios
 * expone un mensaje crudo en inglés ("Request failed with status code 409") que
 * no le dice nada al usuario. Se prioriza el texto del backend y ese mensaje de
 * transporte se descarta a favor del fallback.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const candidate = error as ApiErrorLike | undefined;
  const data = candidate?.response?.data;

  if (isMeaningful(data?.message)) return data.message.trim();
  if (isMeaningful(data?.error)) return data.error.trim();

  const ownMessage = candidate?.message;
  if (isMeaningful(ownMessage) && !/status code/i.test(ownMessage)) return ownMessage.trim();

  return fallback;
}
