export interface ProviderLike {
  _id: string;
  name: string;
}

const UNKNOWN_PROVIDER = 'Proveedor sin identificar';

/**
 * Resuelve el nombre visible de un proveedor a partir de su id.
 *
 * El detalle de compra recibe `proveedor` como ObjectId crudo; mostrar ese hex
 * no le dice nada al usuario. Cuando el id no está en el catálogo (todavía
 * cargando, borrado o respuesta incompleta) se devuelve un texto legible y
 * nunca el id.
 */
export function providerLabel(
  providers: ProviderLike[],
  providerId?: string | null
): string {
  if (!providerId) return UNKNOWN_PROVIDER;

  const match = providers.find((provider) => provider._id === providerId);

  return match?.name?.trim() || UNKNOWN_PROVIDER;
}
