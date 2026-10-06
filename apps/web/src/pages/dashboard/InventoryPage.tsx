import React, { useEffect, useState } from 'react';
import {
  Package,
  AlertTriangle,
  PackageX,
  SlidersHorizontal,
  Plus,
  History,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import api from '../../lib/api';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, PageLoader } from '../../components/ui/Feedback';
import { toast } from '../../components/ui/Toast';
import { getApiErrorMessage } from '../../lib/errors';
import { dateTime } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';

interface AlertItem {
  id: string;
  stock: number;
  product: {
    id: string;
    name: string;
    sku: string;
    stockMin?: number;
    salePrice?: string | number;
    category?: { name: string };
    images?: { url: string }[];
  };
}

interface Movement {
  id: string;
  type: string;
  quantity: number;
  reference?: string;
  notes?: string;
  createdAt: string;
  inventory?: {
    product?: { id?: string; name?: string; sku?: string };
  };
}

const MOVEMENT_TYPES = [
  { value: 'PURCHASE', label: 'Compra / Reposición', sign: '+' },
  { value: 'RETURN', label: 'Devolución', sign: '+' },
  { value: 'SALE', label: 'Venta', sign: '-' },
  { value: 'LOSS', label: 'Pérdida', sign: '-' },
  { value: 'DAMAGE', label: 'Daño', sign: '-' },
  { value: 'ADJUSTMENT', label: 'Ajuste (sin cambio)', sign: '=' },
];

const TYPE_BADGES: Record<string, string> = {
  PURCHASE: 'badge-success',
  RETURN: 'badge-success',
  SALE: 'badge-gold',
  LOSS: 'badge-danger',
  DAMAGE: 'badge-danger',
  ADJUSTMENT: 'badge-neutral',
};

export const InventoryPage: React.FC = () => {
  const role = useAuthStore((s) => s.user?.role);
  const canAdjust = role === 'ADMIN';

  const [tab, setTab] = useState<'overview' | 'history'>('overview');
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [movements, setMovements] = useState<Movement[]>([]);
  const [movementsMeta, setMovementsMeta] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });
  const [movementPage, setMovementPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [loadingMovements, setLoadingMovements] = useState(false);

  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [target, setTarget] = useState<AlertItem | null>(null);

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const [form, setForm] = useState({ type: 'PURCHASE', quantity: '1', reference: '', notes: '' });
  const [adjustForm, setAdjustForm] = useState({ newStock: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await api.get('/inventory/overview');
      setOverview(res.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo cargar el inventario'));
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    setLoadingMovements(true);
    try {
      const res = await api.get('/inventory/movements', {
        params: { page: movementPage, limit: 20, type: typeFilter || undefined },
      });
      setMovements(res.data.items ?? []);
      setMovementsMeta(res.data.meta ?? { page: 1, totalPages: 1, total: 0, limit: 20 });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo cargar el historial'));
    } finally {
      setLoadingMovements(false);
    }
  };

  useEffect(() => {
    void fetchOverview();
  }, []);

  useEffect(() => {
    if (tab === 'history') void fetchMovements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, movementPage, typeFilter]);

  useEffect(() => {
    if (search.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get('/products', { params: { search: search.trim(), limit: 8 } });
        setResults(res.data.items ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const openMovement = (product?: any) => {
    setSelectedProduct(product || null);
    setForm({ type: 'PURCHASE', quantity: '1', reference: '', notes: '' });
    setSearch('');
    setResults([]);
    setIsMovementOpen(true);
  };

  const openAdjust = (item: AlertItem) => {
    setTarget(item);
    setAdjustForm({ newStock: String(item.stock), reason: '' });
    setIsAdjustOpen(true);
  };

  const submitMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      toast.error('Selecciona un producto');
      return;
    }
    setSaving(true);
    try {
      await api.post('/inventory/movement', {
        productId: selectedProduct.id,
        type: form.type,
        quantity: Number(form.quantity),
        reference: form.reference || undefined,
        notes: form.notes || undefined,
      });
      toast.success('Movimiento registrado');
      setIsMovementOpen(false);
      await fetchOverview();
      if (tab === 'history') await fetchMovements();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo registrar el movimiento'));
    } finally {
      setSaving(false);
    }
  };

  const submitAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setSaving(true);
    try {
      await api.post(`/inventory/${target.product.id}/adjust`, {
        newStock: Number(adjustForm.newStock),
        reason: adjustForm.reason,
      });
      toast.success('Stock ajustado correctamente');
      setIsAdjustOpen(false);
      await fetchOverview();
      if (tab === 'history') await fetchMovements();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo ajustar el stock'));
    } finally {
      setSaving(false);
    }
  };

  const lowStock: AlertItem[] = overview?.lowStockProducts ?? [];
  const outOfStock: AlertItem[] = overview?.outOfStockProducts ?? [];
  const recent: Movement[] = overview?.recentMovements ?? [];

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Productos en stock', value: overview?.totalProducts ?? '—', icon: Package, tone: 'text-white' },
          { label: 'Stock bajo', value: overview?.lowStockCount ?? '—', icon: AlertTriangle, tone: 'text-amber-400' },
          { label: 'Agotados', value: overview?.outOfStockCount ?? '—', icon: PackageX, tone: 'text-rose-400' },
          {
            label: 'Últimos movimientos',
            value: recent.length || '—',
            icon: History,
            tone: 'text-[#E0A96D]',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="glass-card rounded-2xl p-4 border border-white/[0.06] flex items-start justify-between gap-2"
          >
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                {stat.label}
              </div>
              <div className={`text-2xl font-bold font-serif mt-1 ${stat.tone}`}>{stat.value}</div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0">
              <stat.icon className={`w-4 h-4 ${stat.tone}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Tabs + actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] self-start">
          {(
            [
              { key: 'overview', label: 'Resumen & alertas' },
              { key: 'history', label: 'Historial de movimientos' },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                tab === t.key
                  ? 'bg-[#E0A96D] text-[#12121C]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button onClick={() => openMovement()} className="btn-gold text-sm px-4 py-2.5">
          <Plus className="w-4 h-4" /> Registrar movimiento
        </button>
      </div>

      {tab === 'overview' ? (
        loading ? (
          <PageLoader label="Cargando inventario…" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Low / out of stock */}
            <div className="glass-card rounded-2xl border border-white/[0.06] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-serif font-bold text-white">Alertas de stock</h3>
              </div>

              {lowStock.length === 0 && outOfStock.length === 0 ? (
                <EmptyState
                  icon={<Package className="w-6 h-6" />}
                  title="Sin alertas"
                  description="Todos los productos activos tienen stock saludable."
                />
              ) : (
                <div className="divide-y divide-white/[0.05] max-h-[480px] overflow-y-auto">
                  {[...outOfStock, ...lowStock].map((item) => (
                    <div key={item.id} className="px-5 py-3.5 flex items-center gap-3">
                      <img
                        src={item.product.images?.[0]?.url || '/placeholder-product.png'}
                        alt=""
                        className="w-10 h-12 rounded-lg object-cover bg-white/5 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white truncate">
                          {item.product.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">{item.product.sku}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`badge ${item.stock === 0 ? 'badge-danger' : 'badge-warning'}`}>
                          {item.stock} uds
                        </span>
                        <div className="text-[10px] text-slate-500 mt-1">
                          mín. {item.product.stockMin ?? 5}
                        </div>
                      </div>
                      {canAdjust && (
                        <button
                          onClick={() => openAdjust(item)}
                          className="btn-secondary text-xs px-3 py-1.5 shrink-0"
                          title="Ajuste manual"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Ajustar</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent movements */}
            <div className="glass-card rounded-2xl border border-white/[0.06] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
                <History className="w-4 h-4 text-[#E0A96D]" />
                <h3 className="text-sm font-serif font-bold text-white">Últimos movimientos</h3>
              </div>

              {recent.length === 0 ? (
                <EmptyState
                  icon={<History className="w-6 h-6" />}
                  title="Sin movimientos"
                  description="Las entradas y salidas de stock aparecerán aquí."
                />
              ) : (
                <div className="divide-y divide-white/[0.05] max-h-[480px] overflow-y-auto">
                  {recent.map((m) => (
                    <div key={m.id} className="px-5 py-3.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">
                          {m.inventory?.product?.name || 'Producto'}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {m.reference || MOVEMENT_TYPES.find((t) => t.value === m.type)?.label}
                          {m.notes ? ` · ${m.notes}` : ''}
                        </div>
                      </div>
                      <span className={`badge ${TYPE_BADGES[m.type] || 'badge-neutral'}`}>{m.type}</span>
                      <span className="text-sm font-bold text-white w-10 text-right">{m.quantity}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        <div className="glass-card rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center gap-3">
            <select
              value={typeFilter}
              onChange={(e) => {
                setMovementPage(1);
                setTypeFilter(e.target.value);
              }}
              className="input-luxury text-sm sm:max-w-[240px]"
            >
              <option value="">Todos los tipos</option>
              {MOVEMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500 sm:ml-auto">
              {movementsMeta.total} movimientos registrados
            </span>
          </div>

          {loadingMovements ? (
            <PageLoader label="Cargando historial…" />
          ) : movements.length === 0 ? (
            <EmptyState
              icon={<History className="w-6 h-6" />}
              title="Sin movimientos"
              description="No hay movimientos para los filtros seleccionados."
            />
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="table-luxury">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Producto</th>
                      <th>Tipo</th>
                      <th>Cantidad</th>
                      <th>Referencia / Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => (
                      <tr key={m.id}>
                        <td className="text-xs text-slate-400 whitespace-nowrap">
                          {dateTime(m.createdAt)}
                        </td>
                        <td>
                          <div className="text-sm text-white">{m.inventory?.product?.name || '—'}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {m.inventory?.product?.sku}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${TYPE_BADGES[m.type] || 'badge-neutral'}`}>
                            {m.type}
                          </span>
                        </td>
                        <td className="text-sm font-bold text-white">{m.quantity}</td>
                        <td className="text-xs text-slate-400">
                          {m.reference || '—'}
                          {m.notes ? <div className="text-slate-500">{m.notes}</div> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-white/[0.05]">
                {movements.map((m) => (
                  <div key={m.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-white">
                        {m.inventory?.product?.name || '—'}
                      </span>
                      <span className={`badge ${TYPE_BADGES[m.type] || 'badge-neutral'}`}>{m.type}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{dateTime(m.createdAt)}</span>
                      <span className="font-bold text-white text-sm">{m.quantity} uds</span>
                    </div>
                    {m.notes && <div className="text-[11px] text-slate-500">{m.notes}</div>}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
                <span className="text-xs text-slate-500">
                  Página {movementsMeta.page} de {Math.max(movementsMeta.totalPages, 1)}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMovementPage((p) => Math.max(1, p - 1))}
                    disabled={movementPage <= 1}
                    className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" /> Anterior
                  </button>
                  <button
                    onClick={() => setMovementPage((p) => Math.min(movementsMeta.totalPages, p + 1))}
                    disabled={movementPage >= movementsMeta.totalPages}
                    className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
                  >
                    Siguiente <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Movement modal */}
      <Modal
        isOpen={isMovementOpen}
        onClose={() => setIsMovementOpen(false)}
        title="Registrar movimiento de stock"
        icon={<History className="w-5 h-5 text-[#E0A96D]" />}
      >
        <form onSubmit={submitMovement} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Producto *</label>
            <input
              value={selectedProduct ? `${selectedProduct.name} (${selectedProduct.sku})` : search}
              onChange={(e) => {
                setSelectedProduct(null);
                setSearch(e.target.value);
              }}
              placeholder="Busca por nombre o SKU…"
              className="input-luxury text-sm"
              disabled={!!selectedProduct}
            />
            {selectedProduct && (
              <button
                type="button"
                onClick={() => {
                  setSelectedProduct(null);
                  setSearch('');
                }}
                className="text-[11px] text-[#E0A96D] hover:underline mt-1"
              >
                Cambiar producto
              </button>
            )}

            {!selectedProduct && search.trim().length >= 2 && (
              <div className="mt-2 rounded-xl border border-white/10 bg-[#14141F] max-h-48 overflow-y-auto">
                {searching && <div className="px-3 py-2 text-xs text-slate-500">Buscando…</div>}
                {!searching && results.length === 0 && (
                  <div className="px-3 py-2 text-xs text-slate-500">Sin resultados</div>
                )}
                {results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedProduct(p);
                      setResults([]);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-white/5 flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="text-[11px] text-slate-500 font-mono shrink-0">{p.sku}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Tipo de movimiento *</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="input-luxury text-sm"
            >
              {MOVEMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.sign} {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Cantidad *</label>
            <input
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              required
              className="input-luxury text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Referencia</label>
            <input
              value={form.reference}
              onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
              placeholder="Ej. FAC-2026-001"
              className="input-luxury text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Notas</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Motivo o detalle del movimiento"
              className="input-luxury text-sm resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setIsMovementOpen(false)}
              className="btn-secondary flex-1 text-sm py-2.5"
              disabled={saving}
            >
              Cancelar
            </button>
            <button type="submit" disabled={saving || !selectedProduct} className="btn-gold flex-1 text-sm py-2.5">
              {saving ? 'Registrando…' : 'Registrar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Adjust modal (ADMIN) */}
      <Modal
        isOpen={isAdjustOpen}
        onClose={() => setIsAdjustOpen(false)}
        title="Ajuste manual de stock"
        icon={<SlidersHorizontal className="w-5 h-5 text-[#E0A96D]" />}
        maxWidth="max-w-md"
      >
        {target && (
          <form onSubmit={submitAdjust} className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.07]">
              <img
                src={target.product.images?.[0]?.url || '/placeholder-product.png'}
                alt=""
                className="w-12 h-14 rounded-lg object-cover bg-white/5"
              />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">{target.product.name}</div>
                <div className="text-[11px] text-slate-500 font-mono">{target.product.sku}</div>
                <div className="text-xs text-amber-400 mt-0.5">Stock actual: {target.stock}</div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Nuevo stock (conteo físico) *
              </label>
              <input
                type="number"
                min="0"
                value={adjustForm.newStock}
                onChange={(e) => setAdjustForm((f) => ({ ...f, newStock: e.target.value }))}
                required
                className="input-luxury text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Motivo del ajuste *</label>
              <textarea
                rows={2}
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Ej. Conteo físico de fin de mes"
                required
                className="input-luxury text-sm resize-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setIsAdjustOpen(false)}
                className="btn-secondary flex-1 text-sm py-2.5"
                disabled={saving}
              >
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="btn-gold flex-1 text-sm py-2.5">
                {saving ? 'Aplicando…' : 'Aplicar ajuste'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
