import { BadRequestException } from '@nestjs/common';
import { Prisma, StockLocation } from '@prisma/client';

type Tx = Prisma.TransactionClient;

export const STOCK_LOCATION_LABELS: Record<StockLocation, string> = {
  [StockLocation.BODEGA]: 'Bodega / Inventario',
  [StockLocation.TIENDA]: 'Tienda',
  [StockLocation.ONLINE]: 'Venta Online',
  [StockLocation.LIVE]: 'Live / En vivo',
};

export const STOCK_LOCATION_SHORT: Record<StockLocation, string> = {
  [StockLocation.BODEGA]: 'Bodega',
  [StockLocation.TIENDA]: 'Tienda',
  [StockLocation.ONLINE]: 'Online',
  [StockLocation.LIVE]: 'Live',
};

/** Canales de venta con stock guardado de forma explícita. */
export const CHANNEL_LOCATIONS: StockLocation[] = [
  StockLocation.TIENDA,
  StockLocation.ONLINE,
  StockLocation.LIVE,
];

/** Todas las ubicaciones, en orden de visualización. */
export const ALL_LOCATIONS: StockLocation[] = [StockLocation.BODEGA, ...CHANNEL_LOCATIONS];

export type StockByLocation = Record<StockLocation, number>;

async function getChannelRows(
  tx: Tx,
  inventoryId: string,
): Promise<Map<StockLocation, number>> {
  const rows = await tx.inventoryStockLocation.findMany({ where: { inventoryId } });
  const map = new Map<StockLocation, number>();
  for (const row of rows) {
    map.set(row.location, Number(row.quantity) || 0);
  }
  return map;
}

async function setChannelQuantity(
  tx: Tx,
  inventoryId: string,
  location: StockLocation,
  quantity: number,
): Promise<void> {
  const existing = await tx.inventoryStockLocation.findFirst({
    where: { inventoryId, location },
  });
  const next = Math.max(0, quantity);
  if (existing) {
    await tx.inventoryStockLocation.update({
      where: { id: existing.id },
      data: { quantity: next },
    });
  } else if (next > 0) {
    await tx.inventoryStockLocation.create({
      data: { inventoryId, location, quantity: next },
    });
  }
}

/**
 * Stock por ubicación de un producto.
 * BODEGA (inventario general) se deriva: stock total − suma de canales.
 */
export async function getStockByLocation(
  tx: Tx,
  inventory: { id: string; stock: number },
): Promise<StockByLocation> {
  const channels = await getChannelRows(tx, inventory.id);
  const out = {
    [StockLocation.BODEGA]: 0,
    [StockLocation.TIENDA]: 0,
    [StockLocation.ONLINE]: 0,
    [StockLocation.LIVE]: 0,
  } as StockByLocation;

  let channelSum = 0;
  for (const [loc, qty] of channels) {
    out[loc] = qty;
    channelSum += qty;
  }
  out[StockLocation.BODEGA] = Math.max(0, inventory.stock - channelSum);
  return out;
}

export interface ApplyStockDeltaOptions {
  /** Destino cuando se agrega stock (por defecto BODEGA). */
  addDestination?: StockLocation;
  /**
   * 'channels-first': consumir primero de los canales (ventas).
   * 'bodega-first': consumir primero de la bodega (pérdidas, daños, ajustes).
   */
  drainMode?: 'channels-first' | 'bodega-first';
  /** Orden en que se drenan los canales (por defecto TIENDA, ONLINE, LIVE). */
  channelPriority?: StockLocation[];
}

export interface StockDeltaResult {
  newStock: number;
  /** Ubicación principal de la que salió el stock (solo salidas). */
  origin: StockLocation | null;
  /** Ubicación a la que entró el stock (solo entradas). */
  destination: StockLocation | null;
}

/**
 * Aplica un cambio de stock total manteniendo la distribución por ubicación.
 * - Entradas (delta > 0): el stock entra a `addDestination` (BODEGA por defecto).
 * - Salidas (delta < 0): drena canales según `drainMode`; la bodega absorbe el
 *   resto de forma implícita (nunca queda negativa mientras total ≥ delta).
 */
export async function applyStockDelta(
  tx: Tx,
  inventory: { id: string; stock: number },
  delta: number,
  options: ApplyStockDeltaOptions = {},
): Promise<StockDeltaResult> {
  const {
    addDestination = StockLocation.BODEGA,
    drainMode = 'bodega-first',
    channelPriority = CHANNEL_LOCATIONS,
  } = options;

  if (delta === 0) {
    return { newStock: inventory.stock, origin: null, destination: null };
  }

  if (delta > 0) {
    const newStock = inventory.stock + delta;
    await tx.inventory.update({
      where: { id: inventory.id },
      data: { stock: newStock },
    });
    if (addDestination !== StockLocation.BODEGA) {
      const current = await getChannelRows(tx, inventory.id);
      await setChannelQuantity(
        tx,
        inventory.id,
        addDestination,
        (current.get(addDestination) ?? 0) + delta,
      );
    }
    return { newStock, origin: null, destination: addDestination };
  }

  let need = -delta;
  if (inventory.stock < need) {
    throw new BadRequestException(
      `Stock insuficiente. Stock actual: ${inventory.stock}, Solicitado: ${need}`,
    );
  }

  const priority = channelPriority.filter((l) => l !== StockLocation.BODEGA);
  const contributions = new Map<StockLocation, number>();
  let fromBodega = 0;

  const drainChannels = async () => {
    if (need <= 0) return;
    const channels = await getChannelRows(tx, inventory.id);
    for (const loc of priority) {
      if (need <= 0) break;
      const available = channels.get(loc) ?? 0;
      if (available <= 0) continue;
      const take = Math.min(need, available);
      await setChannelQuantity(tx, inventory.id, loc, available - take);
      channels.set(loc, available - take);
      contributions.set(loc, (contributions.get(loc) ?? 0) + take);
      need -= take;
    }
  };

  if (drainMode === 'channels-first') {
    await drainChannels();
    fromBodega = need; // lo restante lo absorbe la bodega (implícito)
    need = 0;
  } else {
    // bodega-first: consume bodega hasta donde alcanza y luego los canales.
    const channels = await getChannelRows(tx, inventory.id);
    let channelSum = 0;
    for (const qty of channels.values()) channelSum += qty;
    const bodegaAvailable = Math.max(0, inventory.stock - channelSum);
    fromBodega = Math.min(need, bodegaAvailable);
    need -= fromBodega;
    await drainChannels();
  }

  if (fromBodega > 0) {
    contributions.set(StockLocation.BODEGA, fromBodega);
  }

  const newStock = inventory.stock + delta; // delta negativo
  await tx.inventory.update({
    where: { id: inventory.id },
    data: { stock: newStock },
  });

  let origin: StockLocation | null = null;
  let best = 0;
  for (const [loc, qty] of contributions) {
    if (qty > best) {
      best = qty;
      origin = loc;
    }
  }

  return { newStock, origin, destination: null };
}

/**
 * Traspasa stock entre ubicaciones sin cambiar el total.
 * Valida disponibilidad en el origen y devuelve el reparto resultante.
 */
export async function transferStockLocation(
  tx: Tx,
  inventory: { id: string; stock: number },
  from: StockLocation,
  to: StockLocation,
  quantity: number,
): Promise<StockByLocation> {
  if (from === to) {
    throw new BadRequestException('La ubicación de origen y destino no pueden ser la misma');
  }

  const current = await getStockByLocation(tx, inventory);
  const available = current[from] ?? 0;
  if (available < quantity) {
    throw new BadRequestException(
      `Stock insuficiente en ${STOCK_LOCATION_LABELS[from]}. Disponible: ${available}, Solicitado: ${quantity}`,
    );
  }

  if (from !== StockLocation.BODEGA) {
    await setChannelQuantity(tx, inventory.id, from, available - quantity);
  }
  if (to !== StockLocation.BODEGA) {
    await setChannelQuantity(tx, inventory.id, to, (current[to] ?? 0) + quantity);
  }

  return getStockByLocation(tx, inventory);
}
