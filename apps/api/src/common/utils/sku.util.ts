import { Prisma } from '@prisma/client';

export interface SkuDimensions {
  tipo: string;
  material: string;
  color: string;
  shape?: string | null;
}

/** Normaliza un nombre a un código corto de 3 caracteres (mayúsculas, sin acentos). */
export function skuSegment(name?: string | null): string {
  const normalized = (name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return normalized.slice(0, 3) || 'GEN';
}

/** Prefijo del SKU: TIPO-MATERIAL-COLOR[-FORMA]. */
export function buildSkuPrefix(dims: SkuDimensions): string {
  const parts = [skuSegment(dims.tipo), skuSegment(dims.material), skuSegment(dims.color)];
  if (dims.shape && dims.shape.trim()) parts.push(skuSegment(dims.shape));
  return parts.join('-');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Siguiente número de secuencia para un prefijo dado, a partir de los SKUs
 * existentes (extrae el máximo sufijo numérico y suma 1).
 */
export function nextSequenceFromSkus(skus: string[], prefix: string): number {
  const pattern = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`);
  let max = 0;
  for (const sku of skus) {
    const match = sku.match(pattern);
    if (match) {
      max = Math.max(max, parseInt(match[1], 10));
    }
  }
  return max + 1;
}

/**
 * Formatea la secuencia con 5 dígitos rellenados con ceros
 * (00001 … 99999) y crece automáticamente a 6+ dígitos al superarlo.
 */
export function formatSkuSequence(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(5, '0')}`;
}

/**
 * Genera el siguiente SKU único para un conjunto de dimensiones:
 * busca los SKUs existentes con el mismo prefijo y continúa la secuencia.
 */
export async function nextSkuFor(
  tx: Pick<Prisma.TransactionClient, 'product'>,
  dims: SkuDimensions,
): Promise<string> {
  const prefix = buildSkuPrefix(dims);
  const existing = await tx.product.findMany({
    where: { sku: { startsWith: `${prefix}-` } },
    select: { sku: true },
  });

  let sequence = nextSequenceFromSkus(
    existing.map((p) => p.sku),
    prefix,
  );
  let sku = formatSkuSequence(prefix, sequence);

  // Colisiones con SKUs escritos a mano en el mismo formato.
  while (await tx.product.findUnique({ where: { sku } })) {
    sequence += 1;
    sku = formatSkuSequence(prefix, sequence);
  }

  return sku;
}
