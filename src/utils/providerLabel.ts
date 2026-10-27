export interface ProviderLike {
  _id: string;
  name: string;
}

const UNKNOWN_PROVIDER = 'Proveedor sin identificar';
const OBJECT_ID = /^[a-f0-9]{24}$/i;

/**
 * Resuelve el nombre visible de un proveedor.
 *
 * `buy.proveedor` es mixto: las compras viejas guardan el nombre ("Efey") y las
 * creadas por Carga Inteligente guardan el ObjectId. Cuando llega un id se
 * resuelve contra el catálogo; cuando no está en el catálogo (todavía cargando o
 * borrado) se devuelve un texto legible, nunca el id crudo.
 */
export function providerLabel(
  providers: ProviderLike[],
  value?: string | null
): string {
  const raw = value?.trim();
  if (!raw) return UNKNOWN_PROVIDER;

  // Nombre heredado: se muestra tal cual.
  if (!OBJECT_ID.test(raw)) return raw;

  const match = providers.find((provider) => provider._id === raw);

  return match?.name?.trim() || UNKNOWN_PROVIDER;
}
