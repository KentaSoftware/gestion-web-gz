import { describe, expect, it } from 'vitest';
import { apiErrorMessage } from './apiError';

describe('apiErrorMessage', () => {
  it('usa el mensaje del backend cuando viene en data.message', () => {
    const error = { response: { data: { success: false, message: 'Confirmación cancelada por duplicado' } } };

    expect(apiErrorMessage(error, 'Error al confirmar la compra')).toBe('Confirmación cancelada por duplicado');
  });

  it('usa data.error cuando el backend no envía data.message', () => {
    const error = { response: { data: { success: false, error: 'Draft no encontrado' } } };

    expect(apiErrorMessage(error, 'Error al confirmar la compra')).toBe('Draft no encontrado');
  });

  it('nunca expone el mensaje crudo de axios', () => {
    const error = { message: 'Request failed with status code 409', response: { data: {} } };

    expect(apiErrorMessage(error, 'Error al confirmar la compra')).toBe('Error al confirmar la compra');
  });

  it('cae al fallback cuando el error no trae nada útil', () => {
    expect(apiErrorMessage(undefined, 'Error al confirmar la compra')).toBe('Error al confirmar la compra');
    expect(apiErrorMessage({}, 'Error al confirmar la compra')).toBe('Error al confirmar la compra');
    expect(apiErrorMessage({ response: { data: { message: '   ' } } }, 'Error al confirmar la compra')).toBe(
      'Error al confirmar la compra'
    );
  });

  it('propaga un mensaje propio que no sea de axios', () => {
    expect(apiErrorMessage(new Error('Item 2 no tiene vinculación válida'), 'Error')).toBe(
      'Item 2 no tiene vinculación válida'
    );
  });
});
