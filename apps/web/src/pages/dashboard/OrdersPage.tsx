import React, { useEffect, useState } from 'react';
import {
  ListOrdered,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageCircle,
  RefreshCw,
} from 'lucide-react';
import api from '../../lib/api';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, PageLoader } from '../../components/ui/Feedback';
import { toast } from '../../components/ui/Toast';
import { getApiErrorMessage } from '../../lib/errors';
import { currency, dateTime } from '../../lib/format';

const STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'] as const;

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  PREPARING: 'En preparación',
  READY: 'Listo',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'badge-warning',
  CONFIRMED: 'badge-gold',
  PREPARING: 'badge-neutral',
  READY: 'badge-success',
  DELIVERED: 'badge-success',
  CANCELLED: 'badge-danger',
};

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/orders', {
        params: { page, limit: 20, status: statusFilter || undefined },
      });
      setOrders(res.data.items ?? []);
      setMeta(res.data.meta ?? { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudieron cargar los pedidos'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const filtered = orders.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (o.customer?.name || '').toLowerCase().includes(q) ||
      (o.customer?.phone || '').includes(q) ||
      String(o.id).toLowerCase().includes(q)
    );
  });

  const changeStatus = async (orderId: string, status: string) => {
    setSaving(true);
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      toast.success(`Pedido actualizado a “${STATUS_LABEL[status]}”`);
      await fetchOrders();
      if (selected?.id === orderId) {
        const detail = await api.get(`/orders/${orderId}`);
        setSelected(detail.data);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo actualizar el pedido'));
    } finally {
      setSaving(false);
    }
  };

  const openWhatsApp = async (orderId: string) => {
    try {
      const res = await api.get(`/orders/${orderId}/whatsapp`);
      window.open(res.data.whatsappUrl, '_blank');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo generar el enlace de WhatsApp'));
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-bold text-white">Pedidos Web</h1>
          <p className="text-xs text-slate-500 mt-0.5">{meta.total} pedidos registrados</p>
        </div>
        <button onClick={refresh} className="btn-secondary text-sm px-4 py-2.5" disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, teléfono o ID…"
            className="input-luxury text-sm pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
          className="input-luxury text-sm"
        >
          <option value="">Todos los estados</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="glass-card rounded-2xl border border-white/[0.06] overflow-hidden">
        {loading ? (
          <PageLoader label="Cargando pedidos…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ListOrdered className="w-6 h-6" />}
            title="Sin pedidos"
            description="Los pedidos creados desde el catálogo online aparecerán aquí."
          />
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="table-luxury">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Fecha</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((order) => (
                    <tr key={order.id}>
                      <td className="font-mono text-xs text-slate-400">
                        #{String(order.id).slice(0, 8)}
                        <div className="text-[10px] text-slate-600">
                          {order.items?.length ?? 0} artículos
                        </div>
                      </td>
                      <td>
                        <div className="text-sm text-white">{order.customer?.name || '—'}</div>
                        <div className="text-[11px] text-slate-500">{order.customer?.phone || ''}</div>
                      </td>
                      <td className="text-xs text-slate-400 whitespace-nowrap">
                        {dateTime(order.createdAt)}
                      </td>
                      <td className="text-sm font-bold text-white">{currency(order.total)}</td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[order.status]}`}>
                          {STATUS_LABEL[order.status]}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelected(order)}
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openWhatsApp(order.id)}
                            className="p-2 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-white/5"
                            title="Abrir en WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden divide-y divide-white/[0.05]">
              {filtered.map((order) => (
                <div key={order.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">
                        {order.customer?.name || 'Cliente'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        #{String(order.id).slice(0, 8)} · {dateTime(order.createdAt)}
                      </div>
                    </div>
                    <span className={`badge ${STATUS_BADGE[order.status]}`}>
                      {STATUS_LABEL[order.status]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-white">{currency(order.total)}</span>
                    <div className="flex gap-1.5">
                      <button onClick={() => setSelected(order)} className="btn-secondary text-xs px-3 py-1.5">
                        <Eye className="w-3.5 h-3.5" /> Detalle
                      </button>
                      <button
                        onClick={() => openWhatsApp(order.id)}
                        className="btn-secondary text-xs px-3 py-1.5"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
              <span className="text-xs text-slate-500">
                Página {meta.page} de {Math.max(meta.totalPages, 1)}
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

      {/* Detail modal */}
      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Pedido #${String(selected.id).slice(0, 8)}` : 'Pedido'}
        icon={<ListOrdered className="w-5 h-5 text-[#E0A96D]" />}
        maxWidth="max-w-2xl"
      >
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Cliente</div>
                <div className="text-white font-semibold mt-0.5 truncate">
                  {selected.customer?.name || '—'}
                </div>
                <div className="text-[11px] text-slate-500">{selected.customer?.phone || ''}</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Fecha</div>
                <div className="text-white font-semibold mt-0.5 text-xs">
                  {dateTime(selected.createdAt)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Estado</div>
                <div className="mt-1">
                  <span className={`badge ${STATUS_BADGE[selected.status]}`}>
                    {STATUS_LABEL[selected.status]}
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Total</div>
                <div className="text-white font-bold mt-0.5">{currency(selected.total)}</div>
              </div>
            </div>

            {(selected.address || selected.notes) && (
              <div className="text-xs text-slate-400 space-y-1">
                {selected.address && (
                  <div>
                    <span className="text-slate-500">Dirección:</span> {selected.address}
                  </div>
                )}
                {selected.notes && (
                  <div>
                    <span className="text-slate-500">Notas:</span> {selected.notes}
                  </div>
                )}
              </div>
            )}

            <div>
              <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-2">Artículos</h4>
              <div className="divide-y divide-white/[0.05] rounded-xl border border-white/[0.07]">
                {(selected.items ?? []).map((item: any) => (
                  <div key={item.id} className="px-3 py-2.5 flex items-center gap-3">
                    <img
                      src={item.product?.images?.[0]?.url || '/placeholder-product.png'}
                      alt=""
                      className="w-9 h-11 rounded object-cover bg-white/5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{item.product?.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {item.quantity} × {currency(item.unitPrice)}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-white">{currency(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 text-sm border-t border-white/10 pt-3">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span>{currency(selected.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Envío</span>
                <span>{currency(selected.deliveryFee)}</span>
              </div>
              <div className="flex justify-between text-white font-bold text-lg">
                <span>Total</span>
                <span className="font-serif">{currency(selected.total)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate-500">
                Cambiar estado
              </label>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => changeStatus(selected.id, s)}
                    disabled={saving || selected.status === s}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all disabled:opacity-40 ${
                      selected.status === s
                        ? 'bg-[#E0A96D] text-[#12121C] border-[#E0A96D]'
                        : 'border-white/10 text-slate-300 hover:border-[#E0A96D]/50 hover:text-white'
                    }`}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setSelected(null)} className="btn-secondary flex-1 text-sm py-2.5">
                Cerrar
              </button>
              <button onClick={() => openWhatsApp(selected.id)} className="btn-gold flex-1 text-sm py-2.5">
                <MessageCircle className="w-4 h-4" /> Enviar por WhatsApp
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
