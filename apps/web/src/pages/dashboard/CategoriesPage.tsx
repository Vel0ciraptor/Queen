import React, { useEffect, useState } from 'react';
import { FolderTree, Plus, Pencil, Trash2, Search } from 'lucide-react';
import api from '../../lib/api';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, PageLoader } from '../../components/ui/Feedback';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/Toast';
import { getApiErrorMessage } from '../../lib/errors';
import { shortDate } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';

interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  _count?: { products: number };
}

const emptyForm = { name: '', description: '' };

export const CategoriesPage: React.FC = () => {
  const role = useAuthStore((s) => s.user?.role);
  const canWrite = role === 'ADMIN';

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ ...emptyForm, isActive: true });
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

  const filtered = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(search.toLowerCase()),
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, isActive: true });
    setIsFormOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setForm({
      name: category.name,
      description: category.description || '',
      isActive: category.isActive,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/categories/${editing.id}`, {
          name: form.name,
          description: form.description,
          isActive: form.isActive,
        });
        toast.success('Categoría actualizada');
      } else {
        await api.post('/categories', { name: form.name, description: form.description });
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-bold text-white">Categorías</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {categories.length} categorías registradas
          </p>
        </div>
        {canWrite && (
          <button onClick={openCreate} className="btn-gold text-sm px-4 py-2.5">
            <Plus className="w-4 h-4" /> Nueva categoría
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar categoría…"
          className="input-luxury text-sm pl-9"
        />
      </div>

      {/* List */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/[0.06]">
        {loading ? (
          <PageLoader label="Cargando categorías…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<FolderTree className="w-6 h-6" />}
            title="Sin categorías"
            description="Crea tu primera categoría para organizar el catálogo."
            action={
              canWrite ? (
                <button onClick={openCreate} className="btn-gold text-sm px-4 py-2">
                  <Plus className="w-4 h-4" /> Crear categoría
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {filtered.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-4 px-4 sm:px-5 py-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-[#E0A96D]/10 border border-[#E0A96D]/25 flex items-center justify-center text-[#E0A96D] shrink-0">
                  <FolderTree className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white truncate">
                      {category.name}
                    </span>
                    <span className={`badge ${category.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {category.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {category.description || 'Sin descripción'}
                  </p>
                </div>

                <div className="hidden sm:block text-right shrink-0">
                  <div className="text-sm font-semibold text-[#E0A96D]">
                    {category._count?.products ?? 0}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">productos</div>
                </div>

                <div className="text-right hidden md:block shrink-0 w-24">
                  <div className="text-[11px] text-slate-500">
                    {shortDate(category.createdAt)}
                  </div>
                </div>

                {canWrite && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => openEdit(category)}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setToDelete(category)}
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
        )}
      </div>

      {/* Create / Edit modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editing ? 'Editar categoría' : 'Nueva categoría'}
        icon={<FolderTree className="w-5 h-5 text-[#E0A96D]" />}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Nombre *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              maxLength={80}
              placeholder="Ej. Vestidos de Gala"
              className="input-luxury text-sm"
            />
          </div>
                    <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Descripción</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Opcional: describe el tipo de prendas de esta categoría"
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
