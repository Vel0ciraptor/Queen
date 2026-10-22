import React, { useEffect, useMemo, useState } from 'react';
import { FolderTree, Plus, Pencil, Trash2, Search } from 'lucide-react';
import api from '../../lib/api';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, PageLoader } from '../../components/ui/Feedback';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/Toast';
import { getApiErrorMessage } from '../../lib/errors';
import { shortDate } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';

type Dimension = 'TYPE' | 'MATERIAL' | 'COLOR' | 'SHAPE';

interface Category {
  id: string;
  name: string;
  dimension: Dimension;
  parentId?: string | null;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  _count?: {
    products?: number;
    materialProducts?: number;
    colorProducts?: number;
    shapeProducts?: number;
  };
}

const DIMENSIONS: Array<{ key: Dimension; label: string; hint: string }> = [
  { key: 'TYPE', label: 'Tipo de joya', hint: 'Anillo, collar, pulsera, arete…' },
  { key: 'MATERIAL', label: 'Material', hint: 'Oro, plata, acero…' },
  { key: 'COLOR', label: 'Color', hint: 'Dorado, plateado, rosa…' },
  { key: 'SHAPE', label: 'Forma (opcional)', hint: 'Redondo, corazón, estrella…' },
];

const DIM_LABEL: Record<Dimension, string> = {
  TYPE: 'Tipo',
  MATERIAL: 'Material',
  COLOR: 'Color',
  SHAPE: 'Forma',
};

// Uso total de una categoría en cualquier dimensión de producto.
const usage = (c: Category) =>
  (c._count?.products ?? 0) +
  (c._count?.materialProducts ?? 0) +
  (c._count?.colorProducts ?? 0) +
  (c._count?.shapeProducts ?? 0);

// Construye un bosque (raíces a depth 0) ordenado por nombre, con profundidad.
function buildTree(rows: Category[]): Array<{ node: Category; depth: number }> {
  const byParent = new Map<string | null, Category[]>();
  for (const r of rows) {
    const pid = r.parentId ?? null;
    const arr = byParent.get(pid) ?? [];
    arr.push(r);
    byParent.set(pid, arr);
  }
  const out: Array<{ node: Category; depth: number }> = [];
  const visit = (pid: string | null, depth: number) => {
    const children = (byParent.get(pid) ?? []).sort((a, b) =>
      a.name.localeCompare(b.name, 'es'),
    );
    for (const c of children) {
      out.push({ node: c, depth });
      visit(c.id, depth + 1);
    }
  };
  visit(null, 0);
  return out;
}

// IDs de la rama de `id` (nodo + descendientes), para excluirlos de opciones de padre.
function branchIds(rows: Category[], id: string): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const r of rows) {
    if (!r.parentId) continue;
    const arr = childrenByParent.get(r.parentId) ?? [];
    arr.push(r.id);
    childrenByParent.set(r.parentId, arr);
  }
  const res = new Set<string>([id]);
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const child of childrenByParent.get(cur) ?? []) {
      if (!res.has(child)) {
        res.add(child);
        stack.push(child);
      }
    }
  }
  return res;
}

const emptyForm = {
  name: '',
  description: '',
  dimension: 'TYPE' as Dimension,
  parentId: '',
  isActive: true,
};

export const CategoriesPage: React.FC = () => {
  const role = useAuthStore((s) => s.user?.role);
  const canWrite = role === 'ADMIN';

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dimFilter, setDimFilter] = useState<Dimension | 'ALL'>('ALL');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/categories', { params: { includeInactive: 'true' } });
      setCategories(Array.isArray(res.data) ? res.data : res.data.items ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudieron cargar las categorías'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCategories();
  }, []);

  const matchesSearch = (c: Category) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(search.toLowerCase());

  // Secciones por dimensión, como árbol filtrado.
  const sections = useMemo(() => {
    return DIMENSIONS.filter((d) => dimFilter === 'ALL' || d.key === dimFilter).map((d) => {
      const inDim = categories.filter((c) => c.dimension === d.key);
      const tree = buildTree(inDim);
      // Mantiene un nodo si coincide la búsqueda o tiene un descendiente que coincide.
      const keep = new Set<string>();
      for (const t of tree) {
        if (matchesSearch(t.node)) {
          keep.add(t.node.id);
          let p = t.node.parentId;
          while (p) {
            keep.add(p);
            p = categories.find((c) => c.id === p)?.parentId ?? null;
          }
        }
      }
      const visible = tree.filter((t) => keep.has(t.node.id));
      return { dim: d, visible, total: inDim.length };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, search, dimFilter]);

  const openCreate = (dimension: Dimension, parentId: string = '') => {
    setEditing(null);
    setForm({ ...emptyForm, dimension, parentId });
    setIsFormOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setForm({
      name: category.name,
      description: category.description || '',
      dimension: category.dimension,
      parentId: category.parentId || '',
      isActive: category.isActive,
    });
    setIsFormOpen(true);
  };

  // Opciones de padre válidas: misma dimensión, excluyendo self + descendientes.
  const parentOptions = useMemo(() => {
    const excluded = editing ? branchIds(categories, editing.id) : new Set<string>();
    return categories
      .filter(
        (c) =>
          c.dimension === form.dimension &&
          c.isActive &&
          !excluded.has(c.id),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [categories, form.dimension, editing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/categories/${editing.id}`, {
          name: form.name,
          description: form.description,
          dimension: form.dimension,
          parentId: form.parentId || null,
          isActive: form.isActive,
        });
        toast.success('Categoría actualizada');
      } else {
        await api.post('/categories', {
          name: form.name,
          description: form.description,
          dimension: form.dimension,
          parentId: form.parentId || undefined,
        });
        toast.success('Categoría creada');
      }
      setIsFormOpen(false);
      await fetchCategories();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo guardar la categoría'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/categories/${toDelete.id}`);
      toast.success('Categoría desactivada');
      setToDelete(null);
      await fetchCategories();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo desactivar la categoría'));
    } finally {
      setDeleting(false);
    }
  };

  const totalCount = categories.length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-bold text-white">Categorías</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {totalCount} categorías en 4 dimensiones (Tipo, Material, Color, Forma)
          </p>
        </div>
        {canWrite && (
          <button onClick={() => openCreate('TYPE')} className="btn-gold text-sm px-4 py-2.5">
            <Plus className="w-4 h-4" /> Nueva categoría
          </button>
        )}
      </div>

      {/* Search + dimension tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar categoría…"
            className="input-luxury text-sm pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['ALL', ...DIMENSIONS.map((d) => d.key)] as Array<Dimension | 'ALL'>).map((k) => (
            <button
              key={k}
              onClick={() => setDimFilter(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                dimFilter === k
                  ? 'bg-[#E0A96D] text-black'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {k === 'ALL' ? 'Todas' : DIM_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      {/* Sections grouped by dimension */}
      {loading ? (
        <div className="glass-card rounded-2xl border border-white/[0.06]">
          <PageLoader label="Cargando categorías…" />
        </div>
      ) : sections.every((s) => s.visible.length === 0) ? (
        <div className="glass-card rounded-2xl border border-white/[0.06]">
          <EmptyState
            icon={<FolderTree className="w-6 h-6" />}
            title="Sin categorías"
            description="Crea categorías por dimensión para organizar tu joyería."
            action={
              canWrite ? (
                <button onClick={() => openCreate('TYPE')} className="btn-gold text-sm px-4 py-2">
                  <Plus className="w-4 h-4" /> Crear categoría
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map(
            (s) =>
              s.visible.length > 0 && (
                <div
                  key={s.dim.key}
                  className="glass-card rounded-2xl overflow-hidden border border-white/[0.06]"
                >
                  {/* Dimension header */}
                  <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-white/[0.02] border-b border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{s.dim.label}</span>
                      <span className="text-[10px] text-slate-500">{s.dim.hint}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">{s.total}</span>
                      {canWrite && (
                        <button
                          onClick={() => openCreate(s.dim.key)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#E0A96D] hover:bg-white/5 transition-colors"
                          title={`Nueva categoría en ${s.dim.label}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tree rows */}
                  <div className="divide-y divide-white/[0.05]">
                    {s.visible.map(({ node, depth }) => (
                      <div
                        key={node.id}
                        style={{ paddingLeft: `${16 + depth * 20}px` }}
                        className="flex items-center gap-3 pr-4 py-3 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {depth > 0 && (
                              <span className="text-slate-600 text-xs">└─</span>
                            )}
                            <span className="text-sm font-semibold text-white truncate">
                              {node.name}
                            </span>
                            <span
                              className={`badge ${node.isActive ? 'badge-success' : 'badge-danger'}`}
                            >
                              {node.isActive ? 'Activa' : 'Inactiva'}
                            </span>
                          </div>
                          {node.description && (
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {node.description}
                            </p>
                          )}
                        </div>

                        <div className="hidden sm:block text-right shrink-0">
                          <div className="text-sm font-semibold text-[#E0A96D]">
                            {usage(node)}
                          </div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                            productos
                          </div>
                        </div>

                        <div className="text-right hidden md:block shrink-0 w-24">
                          <div className="text-[11px] text-slate-500">
                            {shortDate(node.createdAt)}
                          </div>
                        </div>

                        {canWrite && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => openEdit(node)}
                              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setToDelete(node)}
                              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
                              title="Desactivar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ),
          )}
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editing ? 'Editar categoría' : 'Nueva categoría'}
        icon={<FolderTree className="w-5 h-5 text-[#E0A96D]" />}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Dimensión *</label>
            <select
              value={form.dimension}
              onChange={(e) =>
                setForm((f) => ({ ...f, dimension: e.target.value as Dimension, parentId: '' }))
              }
              disabled={!!editing}
              className="input-luxury text-sm"
            >
              {DIMENSIONS.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
            {editing && (
              <p className="text-[11px] text-slate-500 mt-1">
                La dimensión no se puede cambiar al editar.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Nombre *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              maxLength={80}
              placeholder="Ej. Anillos de compromiso"
              className="input-luxury text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Subcategoría de
            </label>
            <select
              value={form.parentId}
              onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
              className="input-luxury text-sm"
            >
              <option value="">— Sin padre (raíz) —</option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Descripción</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Opcional: describe estas joyas"
              className="input-luxury text-sm resize-none"
            />
          </div>

          {editing && (
            <label className="flex items-center gap-2.5 text-sm text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="w-4 h-4 accent-[#E0A96D]"
              />
              Categoría activa (visible en el catálogo)
            </label>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="btn-secondary flex-1 text-sm py-2.5"
              disabled={saving}
            >
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-gold flex-1 text-sm py-2.5">
              {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear categoría'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!toDelete}
        title="Desactivar categoría"
        message={`La categoría "${toDelete?.name}" dejará de mostrarse en el catálogo. ¿Continuar?`}
        confirmLabel="Desactivar"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};
