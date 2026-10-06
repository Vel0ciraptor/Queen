import React, { useEffect, useState } from 'react';
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Search,
  ImagePlus,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import api from '../../lib/api';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, PageLoader, Spinner } from '../../components/ui/Feedback';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/Toast';
import { getApiErrorMessage } from '../../lib/errors';
import { currency } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  costPrice: string | number;
  salePrice: string | number;
  stockMin?: number;
  stockMax?: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  category?: { id: string; name: string };
  inventory?: { stock: number };
  images?: { id: string; url: string; isPrimary: boolean; order: number }[];
}

interface CategoryOption {
  id: string;
  name: string;
}

const emptyForm = {
  sku: '',
  name: '',
  description: '',
  categoryId: '',
  costPrice: '',
  salePrice: '',
  stockMin: '0',
  stockMax: '',
  initialStock: '0',
  status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
};

export const ProductsPage: React.FC = () => {
  const role = useAuthStore((s) => s.user?.role);
  const canWrite = role === 'ADMIN';

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [imagesProduct, setImagesProduct] = useState<ProductRow | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState<ProductRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/products', {
        params: {
          search: search || undefined,
          categoryId: categoryFilter || undefined,
          status: statusFilter || undefined,
          page,
          limit: 20,
        },
      });
      setProducts(res.data.items ?? []);
      setMeta(res.data.meta ?? { page: 1, totalPages: 1, total: 0, limit: 20 });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudieron cargar los productos'));
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data ?? []);
    } catch {
      /* el select queda vacío si falla */
    }
  };

  useEffect(() => {
    void fetchCategories();
  }, []);

  useEffect(() => {
    void fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryFilter, statusFilter, page]);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (product: ProductRow) => {
    setEditing(product);
    setForm({
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      categoryId: product.categoryId,
      costPrice: String(product.costPrice),
      salePrice: String(product.salePrice),
      stockMin: String(product.stockMin ?? 0),
      stockMax: product.stockMax != null ? String(product.stockMax) : '',
      initialStock: '',
      status: product.status,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        sku: form.sku.trim(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        categoryId: form.categoryId,
        costPrice: Number(form.costPrice),
        salePrice: Number(form.salePrice),
        stockMin: Number(form.stockMin || 0),
        status: form.status,
      };
      if (form.stockMax !== '') payload.stockMax = Number(form.stockMax);

      if (editing) {
        await api.patch(`/products/${editing.id}`, payload);
        toast.success('Producto actualizado');
      } else {
        payload.initialStock = Number(form.initialStock || 0);
        await api.post('/products', payload);
        toast.success('Producto creado con su inventario');
      }
      setIsFormOpen(false);
      await fetchProducts();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo guardar el producto'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/products/${toDelete.id}`);
      toast.success('Producto desactivado (soft delete)');
      setToDelete(null);
      await fetchProducts();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo desactivar el producto'));
    } finally {
      setDeleting(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!imagesProduct) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no puede superar 5 MB');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post(`/products/${imagesProduct.id}/images`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Imagen subida y convertida a WebP');
      const detail = await api.get(`/products/${imagesProduct.id}`);
      setImagesProduct(detail.data);
      await fetchProducts();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo subir la imagen'));
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (imageId: string) => {
    if (!imagesProduct) return;
    try {
      await api.delete(`/products/images/${imageId}`);
      toast.success('Imagen eliminada');
      const detail = await api.get(`/products/${imagesProduct.id}`);
      setImagesProduct(detail.data);
      await fetchProducts();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo eliminar la imagen'));
    }
  };

  const setPrimaryImage = async (imageId: string) => {
    if (!imagesProduct) return;
    try {
      await api.patch(`/products/${imagesProduct.id}/images/${imageId}/primary`);
      const detail = await api.get(`/products/${imagesProduct.id}`);
      setImagesProduct(detail.data);
      toast.success('Imagen principal actualizada');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo cambiar la imagen principal'));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-bold text-white">Productos</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {meta.total} productos en el catálogo
          </p>
        </div>
        {canWrite && (
          <button onClick={openCreate} className="btn-gold text-sm px-4 py-2.5">
            <Plus className="w-4 h-4" /> Nuevo producto
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o SKU…"
            className="input-luxury text-sm pl-9"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input-luxury text-sm"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-luxury text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVE">Activos</option>
          <option value="INACTIVE">Inactivos</option>
        </select>
      </div>

      {/* List */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/[0.06]">
        {loading ? (
          <PageLoader label="Cargando productos…" />
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Package className="w-6 h-6" />}
            title="No hay productos"
            description="Crea tu primer producto para comenzar a vender."
            action={
              canWrite ? (
                <button onClick={openCreate} className="btn-gold text-sm px-4 py-2">
                  <Plus className="w-4 h-4" /> Crear producto
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="table-luxury">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Precio</th>
                    <th>Stock</th>
                    <th>Estado</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              product.images?.find((i) => i.isPrimary)?.url ||
                              product.images?.[0]?.url ||
                              '/placeholder-product.png'
                            }
                            alt={product.name}
                            className="w-10 h-12 rounded-lg object-cover bg-white/5 shrink-0"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
                            }}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-white truncate">{product.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{product.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-xs text-slate-300">{product.category?.name || '—'}</td>
                      <td className="text-sm font-semibold text-white">
                        {currency(product.salePrice)}
                        <div className="text-[11px] text-slate-500 font-normal">
                          costo {currency(product.costPrice)}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            (product.inventory?.stock ?? 0) === 0
                              ? 'badge-danger'
                              : (product.inventory?.stock ?? 0) <= (product.stockMin ?? 5)
                              ? 'badge-warning'
                              : 'badge-success'
                          }`}
                        >
                          {product.inventory?.stock ?? 0} uds
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${product.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                          {product.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setImagesProduct(product)}
                            className="p-2 rounded-lg text-slate-400 hover:text-[#E0A96D] hover:bg-white/5 transition-colors"
                            title="Imágenes"
                          >
                            <ImagePlus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEdit(product)}
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setToDelete(product)}
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
                            title="Desactivar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-white/[0.05]">
              {products.map((product) => (
                <div key={product.id} className="p-4 flex gap-3">
                  <img
                    src={
                      product.images?.find((i) => i.isPrimary)?.url ||
                      product.images?.[0]?.url ||
                      '/placeholder-product.png'
                    }
                    alt={product.name}
                    className="w-16 h-20 rounded-lg object-cover bg-white/5 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{product.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{product.sku}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {product.category?.name || '—'}
                        </div>
                      </div>
                      <span
                        className={`badge ${
                          product.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'
                        }`}
                      >
                        {product.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2.5 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{currency(product.salePrice)}</span>
                        <span className="badge badge-neutral">{product.inventory?.stock ?? 0} uds</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setImagesProduct(product)}
                          className="p-2 rounded-lg bg-white/[0.04] text-slate-300"
                          title="Imágenes"
                        >
                          <ImagePlus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(product)}
                          className="p-2 rounded-lg bg-white/[0.04] text-slate-300"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setToDelete(product)}
                          className="p-2 rounded-lg bg-white/[0.04] text-slate-400"
                          title="Desactivar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
              <span className="text-xs text-slate-500">
                Página {meta.page} de {Math.max(meta.totalPages, 1)} · {meta.total} resultados
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page >= meta.totalPages}
                  className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
                >
                  Siguiente <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create / Edit modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editing ? 'Editar producto' : 'Nuevo producto'}
        icon={<Package className="w-5 h-5 text-[#E0A96D]" />}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Nombre *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              placeholder="Ej. Vestido Imperial Escarlata"
              className="input-luxury text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">SKU *</label>
            <input
              value={form.sku}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
              required
              placeholder="QS-DRS-001"
              className="input-luxury text-sm font-mono uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Categoría *</label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              required
              className="input-luxury text-sm"
            >
              <option value="">Selecciona…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Precio de costo *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={form.costPrice}
              onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))}
              required
              className="input-luxury text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Precio de venta *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={form.salePrice}
              onChange={(e) => setForm((f) => ({ ...f, salePrice: e.target.value }))}
              required
              className="input-luxury text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Stock mínimo (alerta)</label>
            <input
              type="number"
              min="0"
              value={form.stockMin}
              onChange={(e) => setForm((f) => ({ ...f, stockMin: e.target.value }))}
              className="input-luxury text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Stock máximo</label>
            <input
              type="number"
              min="0"
              value={form.stockMax}
              onChange={(e) => setForm((f) => ({ ...f, stockMax: e.target.value }))}
              placeholder="Opcional"
              className="input-luxury text-sm"
            />
          </div>

          {!editing && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Stock inicial</label>
              <input
                type="number"
                min="0"
                value={form.initialStock}
                onChange={(e) => setForm((f) => ({ ...f, initialStock: e.target.value }))}
                className="input-luxury text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Estado</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'ACTIVE' | 'INACTIVE' }))}
              className="input-luxury text-sm"
            >
              <option value="ACTIVE">Activo (visible en catálogo)</option>
              <option value="INACTIVE">Inactivo (oculto)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Descripción</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Tejido, talla, caída, detalles de confección…"
              className="input-luxury text-sm resize-none"
            />
          </div>

          <div className="sm:col-span-2 flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="btn-secondary flex-1 text-sm py-2.5"
              disabled={saving}
            >
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-gold flex-1 text-sm py-2.5">
              {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Images modal */}
      <Modal
        isOpen={!!imagesProduct}
        onClose={() => setImagesProduct(null)}
        title={imagesProduct ? `Imágenes · ${imagesProduct.name}` : 'Imágenes'}
        icon={<ImagePlus className="w-5 h-5 text-[#E0A96D]" />}
        maxWidth="max-w-xl"
      >
        {imagesProduct && (
          <div className="space-y-4">
            <label
              className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-8 px-4 cursor-pointer transition-colors ${
                uploading
                  ? 'border-[#E0A96D]/30 bg-white/[0.02] cursor-wait'
                  : 'border-white/15 hover:border-[#E0A96D]/50 hover:bg-white/[0.03]'
              }`}
            >
              {uploading ? <Spinner className="w-6 h-6" /> : <ImagePlus className="w-6 h-6 text-[#E0A96D]" />}
              <span className="text-xs text-slate-400 text-center">
                {uploading
                  ? 'Procesando imagen (WebP)…'
                  : 'Arrastra o selecciona una imagen — JPG/PNG, máx. 5 MB, se convierte a WebP'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload(file);
                  e.target.value = '';
                }}
              />
            </label>

            <div className="text-[11px] text-slate-500">
              Máximo 5 imágenes por producto · una sola imagen principal.
            </div>

            {imagesProduct.images && imagesProduct.images.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {imagesProduct.images.map((image) => (
                  <div
                    key={image.id}
                    className={`relative rounded-xl overflow-hidden border ${
                      image.isPrimary ? 'border-[#E0A96D]' : 'border-white/10'
                    }`}
                  >
                    <img src={image.url} alt="" className="w-full h-28 object-cover bg-white/5" />
                    {image.isPrimary && (
                      <span className="absolute top-1.5 left-1.5 badge badge-gold text-[9px] px-1.5 py-0.5">
                        Principal
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex bg-black/70 backdrop-blur-sm">
                      {!image.isPrimary && (
                        <button
                          onClick={() => setPrimaryImage(image.id)}
                          className="flex-1 py-1.5 text-[10px] text-[#F7D794] hover:bg-white/10 flex items-center justify-center gap-1"
                        >
                          <Eye className="w-3 h-3" /> Principal
                        </button>
                      )}
                      <button
                        onClick={() => removeImage(image.id)}
                        className={`flex-1 py-1.5 text-[10px] text-rose-300 hover:bg-white/10 flex items-center justify-center gap-1 ${
                          image.isPrimary ? '' : 'border-l border-white/10'
                        }`}
                      >
                        <Trash2 className="w-3 h-3" /> Quitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-500 border border-dashed border-white/10 rounded-xl">
                Este producto todavía no tiene imágenes.
              </div>
            )}

            <button onClick={() => setImagesProduct(null)} className="btn-secondary w-full text-sm py-2.5">
              Listo
            </button>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!toDelete}
        title="Desactivar producto"
        message={`"${toDelete?.name}" dejará de mostrarse en el catálogo (soft delete: su historial de ventas se conserva).`}
        confirmLabel="Desactivar"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};
