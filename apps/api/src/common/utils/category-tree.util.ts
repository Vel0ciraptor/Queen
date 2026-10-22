import { PrismaService } from '../../database/prisma.service';

// Etiquetas legibles por dimensión (para UI y mensajes)
export const DIMENSION_LABELS: Record<string, string> = {
  TYPE: 'Tipo de joya',
  MATERIAL: 'Material',
  COLOR: 'Color',
  SHAPE: 'Forma',
};

export const DIMENSION_ORDER: Array<'TYPE' | 'MATERIAL' | 'COLOR' | 'SHAPE'> = [
  'TYPE',
  'MATERIAL',
  'COLOR',
  'SHAPE',
];

/**
 * Dado un conjunto plano de categorías (con parentId), devuelve los IDs de la
 * rama que arranca en `rootId`: el propio nodo + todos sus descendientes.
 * Usado para que al filtrar por una categoría se incluyan sus subcategorías.
 */
export function collectBranchIds(
  rows: Array<{ id: string; parentId?: string | null }>,
  rootId: string,
): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const r of rows) {
    const pid = r.parentId ?? null;
    if (pid === null) continue;
    const arr = childrenByParent.get(pid) ?? [];
    arr.push(r.id);
    childrenByParent.set(pid, arr);
  }

  const result: string[] = [];
  const stack = [rootId];
  const seen = new Set<string>();
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue; // protege contra ciclos
    seen.add(id);
    result.push(id);
    for (const childId of childrenByParent.get(id) ?? []) stack.push(childId);
  }
  return result;
}

/**
 * Expande varios IDs raíz a sus ramas completas, devolviendo un conjunto único.
 */
export function expandBranchIds(
  rows: Array<{ id: string; parentId?: string | null }>,
  rootIds: string[],
): string[] {
  const all = new Set<string>();
  for (const id of rootIds) {
    for (const branchId of collectBranchIds(rows, id)) all.add(branchId);
  }
  return [...all];
}

/**
 * Carga todas las categorías (id + parentId) y expande los IDs dados a sus
 * ramas. Si `ids` está vacío devuelve undefined (sin filtro).
 */
export async function branchFilter(
  prisma: PrismaService,
  ids: string[] | undefined,
): Promise<string[] | undefined> {
  if (!ids || ids.length === 0) return undefined;
  const rows = await prisma.category.findMany({
    select: { id: true, parentId: true },
  });
  return expandBranchIds(rows, ids);
}
