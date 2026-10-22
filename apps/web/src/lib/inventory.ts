export type StockLocation = 'BODEGA' | 'TIENDA' | 'ONLINE' | 'LIVE';

export const STOCK_LOCATION_LABELS: Record<StockLocation, string> = {
  BODEGA: 'Bodega / Inventario',
  TIENDA: 'Tienda',
  ONLINE: 'Venta Online',
  LIVE: 'Live / En vivo',
};

export const STOCK_LOCATION_SHORT: Record<StockLocation, string> = {
  BODEGA: 'Bodega',
  TIENDA: 'Tienda',
  ONLINE: 'Online',
  LIVE: 'Live',
};

export const ALL_STOCK_LOCATIONS: StockLocation[] = ['BODEGA', 'TIENDA', 'ONLINE', 'LIVE'];

export interface LocationBreakdown {
  location: StockLocation;
  label: string;
  units: number;
  products: number;
}

/** Texto compacto de la ubicación de un movimiento (ej. "Bodega → Tienda"). */
export function movementLocationText(movement: {
  fromLocation?: string | null;
  location?: string | null;
}): string {
  const short = (value?: string | null): string | null => {
    if (!value) return null;
    return STOCK_LOCATION_SHORT[value as StockLocation] ?? value;
  };
  const from = short(movement.fromLocation);
  const to = short(movement.location);
  if (from && to) return `${from} → ${to}`;
  if (to) return `→ ${to}`;
  if (from) return `${from} →`;
  return '—';
}

/**
 * Reparte el stock total de un inventario por ubicación.
 * Los canales vienen explícitos; Bodega = total − suma de canales.
 */
export function computeLocationStock(
  inventory: { stock?: number; locations?: Array<{ location: StockLocation; quantity: number }> } | null | undefined,
): Record<StockLocation, number> {
  const out: Record<StockLocation, number> = { BODEGA: 0, TIENDA: 0, ONLINE: 0, LIVE: 0 };
  if (!inventory) return out;
  let channelSum = 0;
  for (const row of inventory.locations ?? []) {
    const qty = Number(row.quantity) || 0;
    if (qty <= 0) continue;
    out[row.location] = qty;
    channelSum += qty;
  }
  out.BODEGA = Math.max(0, (inventory.stock ?? 0) - channelSum);
  return out;
}
