import React, { useEffect, useState } from 'react';
import {
  ListOrdered,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageCircle,
  RefreshCw,
  CheckCircle2,
  Ban,
  Truck,
  Store,
  CreditCard,
  ClipboardCheck,
} from 'lucide-react';
import api from '../../lib/api';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState, PageLoader } from '../../components/ui/Feedback';
import { toast } from '../../components/ui/Toast';
import { getApiErrorMessage } from '../../lib/errors';
import { currency, dateTime } from '../../lib/format';

const STATUSES = ['PENDING', 'CONFIRMED', 'DELIVERED', 'CANCELLED'] as const;

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Recibido',
  CONFIRMED: 'Aceptado',
  PREPARING: 'En preparación',
  READY: 'Listo',
  DELIVERED: 'Venta realizada',
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

const PAYMENT_METHODS = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'QR', label: 'QR / Nequi' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'TARJETA', label: 'Tarjeta' },
  { value: 'OTRO', label: 'Otro' },
];

const checkedCount = (order: any) =>
  (order?.items ?? []).filter((i: any) => i.checkedAt).length;

const allChecked = (order: any) =>
  (order?.items ?? []).length > 0 && checkedCount(order) === order.items.length;

interface OrdersPageProps {
  /** true cuando se muestra dentro de la pestaña Ventas (oculta el título propio). */
  embedded?: boolean;
}

export const OrdersPage: React.FC<OrdersPageProps> = ({ embedded = false }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal de aceptar pedido
  const [acceptTarget, setAcceptTarget] = useState<any | null>(null);
  const [acceptForm, setAcceptForm] = useState({
    fulfillmentType: 'PICKUP',
    address: '',
    notes: '',
  });

  // Modal de cobro / realización de venta
  const [completeTarget, setCompleteTarget] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');

  // Cancelación
  const [toCancel, setToCancel] = useState<any | null>(null);

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

  const refreshSelected = async (orderId: string) => {
    try {
      const detail = await api.get(`/orders/${orderId}`);
      setSelected(detail.data);
    } catch {
      /* el detalle puede haber cambiado */
    }
  };

  const filtered = orders.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (o.customer?.name || '').toLowerCase().includes(q) ||
      (o.customer?.phone || '').includes(q) ||
      String(o.id).toLowerCase().includes(q)
    );
  });

  // ── Aceptar pedido (reserva de stock) ──────────────────────────────────────
  const openAccept = (order: any) => {
    setAcceptForm({
      fulfillmentType: order.fulfillmentType || 'PICKUP',
      address: order.address || '',
      notes: '',
    });
    setAcceptTarget(order);
  };

  const submitAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptTarget) return;
    setSaving(true);
    try {
      await api.post(`/orders/${acceptTarget.id}/accept`, {
        fulfillmentType: acceptForm.fulfillmentType,
        address: acceptForm.address || undefined,
        notes: acceptForm.notes || undefined,
      });
      toast.success('Pedido aceptado · stock reservado en Venta Online');
      setAcceptTarget(null);
      await fetchOrders();
      if (selected?.id === acceptTarget.id) await refreshSelected(acceptTarget.id);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo aceptar el pedido'));
    } finally {
      setSaving(false);
    }
  };

  // ── Checklist ──────────────────────────────────────────────────────────────
  const toggleCheck = async (order: any, item: any, checked: boolean) => {
    setSaving(true);
    try {
      const res = await api.patch(
        `/orders/${order.id}/items/${item.id}/check`,
        { checked },
      );
      setSelected(res.data);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, items: res.data.items } : o)));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo actualizar el checklist'));
    } finally {
      setSaving(false);
    }
  };

  // ── Realizar venta (cobra el total y descuenta inventario) ─────────────────
  const openComplete = (order: any) => {
    if (!allChecked(order)) {
      toast.error('Primero completa el checklist de todos los productos');
      return;
    }
    setPaymentMethod('EFECTIVO');
    setCompleteTarget(order);
  };

  const submitComplete = async () => {
    if (!completeTarget) return;
    setSaving(true);
    try {
      const res = await api.post(`/orders/${completeTarget.id}/complete`, { paymentMethod });
      const saleId = res.data?.sale?.id;
      toast.success(
        saleId
          ? `Venta #${String(saleId).slice(0, 8)} realizada · inventario descontado`
          : 'Venta realizada · inventario descontado',
      );
      setCompleteTarget(null);
      await fetchOrders();
      if (selected?.id === completeTarget.id) await refreshSelected(completeTarget.id);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo realizar la venta'));
    } finally {
      setSaving(false);
    }
  };

  // ── Cancelar (libera reserva) ──────────────────────────────────────────────
  const submitCancel = async () => {
    if (!toCancel) return;
    setSaving(true);
    try {
      await api.patch(`/orders/${toCancel.id}/status`, { status: 'CANCELLED' });
      toast.success(
        toCancel.status === 'CONFIRMED'
          ? 'Pedido cancelado · reserva de stock liberada'
          : 'Pedido cancelado',
      );
      setToCancel(null);
      await fetchOrders();
      if (selected?.id === toCancel.id) await refreshSelected(toCancel.id);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo cancelar el pedido'));
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
    if (selected) await refreshSelected(selected.id);
    setRefreshing(false);
  };

  const fulfillmentBadge = (order: any) =>
    order.fulfillmentType === 'DELIVERY' ? (
      <span className="badge badge-info inline-flex items-center gap-1">
        <Truck className="w-3 h-3" /> Delivery
      </span>
    ) : (
      <span className="badge badge-neutral inline-flex items-center gap-1">
        <Store className="w-3 h-3" /> Retiro
      </span>
    );

  return (
    <div className="space-y-5">
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-xl font-bold text-white">Pedidos Web</h1>
            <p className="text-xs text-slate-500 mt-0.5">{meta.total} pedidos registrados</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
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
            className="input-luxury text-sm sm:max-w-[200px]"
          >
            <option value="">Todos los estados</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <button onClick={refresh} className="btn-secondary text-sm px-4 py-2.5" disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Actualizar
        </button>
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
                    <th>Entrega</th>
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
                          {order.status === 'CONFIRMED' && (
                            <span className="text-[#E0A96D]">
                              {' '}
                              · checklist {checkedCount(order)}/{order.items?.length ?? 0}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="text-sm text-white">{order.customer?.name || '—'}</div>
                        <div className="text-[11px] text-slate-500">{order.customer?.phone || ''}</div>
                      </td>
                      <td>{fulfillmentBadge(order)}</td>
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
                          {order.status === 'PENDING' && (
                            <button
                              onClick={() => openAccept(order)}
                              className="btn-gold text-xs px-3 py-1.5"
                            >
                              Aceptar
                            </button>
                          )}
                          {order.status === 'CONFIRMED' && (
                            <button
                              onClick={() => setSelected(order)}
                              className="btn-gold text-xs px-3 py-1.5 inline-flex items-center gap-1"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5" /> Gestionar
                            </button>
                          )}
                          {order.status === 'DELIVERED' && order.sale && (
                            <span className="text-[11px] font-mono text-emerald-400">
                              Venta #{String(order.sale.id).slice(0, 8)}
                            </span>
                          )}
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
                          {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
                            <button
                              onClick={() => setToCancel(order)}
                              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5"
                              title="Cancelar pedido"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
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
                      {order.status === 'PENDING' && (
                        <button onClick={() => openAccept(order)} className="btn-gold text-xs px-3 py-1.5">
                          Aceptar
                        </button>
                      )}
                      {order.status === 'CONFIRMED' && (
                        <button
                          onClick={() => setSelected(order)}
                          className="btn-gold text-xs px-3 py-1.5 inline-flex items-center gap-1"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" /> Gestionar
                        </button>
                      )}
                      <button onClick={() => setSelected(order)} className="btn-secondary text-xs px-3 py-1.5">
                        <Eye className="w-3.5 h-3.5" /> Detalle
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
                  <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page >= meta.totalPages}
                  className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
                >
                  Siguiente <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Modal detalle / checklist ─────────────────────────────────────── */}
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
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className={`badge ${STATUS_BADGE[selected.status]}`}>
                    {STATUS_LABEL[selected.status]}
                  </span>
                  {fulfillmentBadge(selected)}
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

            {/* Checklist de productos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs uppercase tracking-wider text-slate-500">
                  {selected.status === 'CONFIRMED'
                    ? 'Checklist de productos'
                    : 'Artículos'}
                </h4>
                {selected.status === 'CONFIRMED' && (
                  <span
                    className={`text-[11px] font-semibold ${
                      allChecked(selected) ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {checkedCount(selected)}/{selected.items?.length ?? 0} verificados
                  </span>
                )}
              </div>
              <div className="divide-y divide-white/[0.05] rounded-xl border border-white/[0.07]">
                {(selected.items ?? []).map((item: any) => {
                  const stock: number | null = item.product?.inventory?.stock ?? null;
                  const stockWarn = stock !== null && stock < item.quantity;
                  const isChecked = !!item.checkedAt;
                  return (
                    <div
                      key={item.id}
                      className={`px-3 py-2.5 flex items-center gap-3 ${
                        isChecked && selected.status === 'CONFIRMED' ? 'bg-emerald-500/[0.05]' : ''
                      }`}
                    >
                      {selected.status === 'CONFIRMED' ? (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={saving}
                          onChange={(e) => toggleCheck(selected, item, e.target.checked)}
                          className="w-4 h-4 accent-[#E0A96D] shrink-0 cursor-pointer"
                          title={isChecked ? 'Verificado — click para desmarcar' : 'Marcar como verificado'}
                        />
                      ) : (
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 ${isChecked ? 'text-emerald-400' : 'text-slate-600'}`}
                        />
                      )}
                      <img
                        src={item.product?.images?.[0]?.url || '/placeholder-product.png'}
                        alt=""
                        className="w-9 h-11 rounded object-cover bg-white/5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">{item.product?.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {item.quantity} × {currency(item.unitPrice)}
                          {stock !== null && (
                            <span className={stockWarn ? ' text-rose-400' : ''}>
                              {' '}
                              · stock actual: {stock}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-white">{currency(item.subtotal)}</span>
                    </div>
                  );
                })}
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

            {selected.status === 'DELIVERED' && selected.sale && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
                Venta registrada <span className="font-mono">#{String(selected.sale.id).slice(0, 8)}</span>{' '}
                con cobro completo · inventario descontado.
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                onClick={() => setSelected(null)}
                className="btn-secondary flex-1 text-sm py-2.5"
                disabled={saving}
              >
                Cerrar
              </button>

              {selected.status === 'PENDING' && (
                <button
                  onClick={() => {
                    const order = selected;
                    setSelected(null);
                    openAccept(order);
                  }}
                  className="btn-gold flex-1 text-sm py-2.5"
                  disabled={saving}
                >
                  Aceptar pedido
                </button>
              )}

              {selected.status === 'CONFIRMED' && (
                <button
                  onClick={() => {
                    const order = selected;
                    setSelected(null);
                    openComplete(order);
                  }}
                  className="btn-gold flex-1 text-sm py-2.5 inline-flex items-center justify-center gap-2"
                  disabled={saving || !allChecked(selected)}
                  title={
                    allChecked(selected)
                      ? 'Cobrar el total y descontar inventario'
                      : 'Completa el checklist de todos los productos'
                  }
                >
                  <CreditCard className="w-4 h-4" /> Cobrar y realizar venta
                </button>
              )}

              {selected.status !== 'DELIVERED' && selected.status !== 'CANCELLED' && (
                <button
                  onClick={() => {
                    const order = selected;
                    setSelected(null);
                    setToCancel(order);
                  }}
                  className="btn-secondary text-sm py-2.5 px-4 text-rose-300"
                  disabled={saving}
                >
                  <Ban className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              onClick={() => openWhatsApp(selected.id)}
              className="btn-secondary w-full text-sm py-2.5 inline-flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" /> Enviar por WhatsApp
            </button>
          </div>
        )}
      </Modal>

      {/* ── Modal aceptar pedido ──────────────────────────────────────────── */}
      <Modal
        isOpen={!!acceptTarget}
        onClose={() => !saving && setAcceptTarget(null)}
        title={acceptTarget ? `Aceptar pedido #${String(acceptTarget.id).slice(0, 8)}` : 'Aceptar pedido'}
        icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
        maxWidth="max-w-md"
      >
        {acceptTarget && (
          <form onSubmit={submitAccept} className="space-y-4">
            <p className="text-xs text-slate-400">
              Al aceptar, el stock se reserva moviéndolo al canal{' '}
              <span className="text-[#E0A96D] font-semibold">Venta Online</span>. El inventario
              solo se descuenta cuando el cliente pague el total.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                ¿Cómo recoge el cliente? *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'PICKUP', label: 'Retiro en tienda', icon: Store },
                  { value: 'DELIVERY', label: 'Delivery', icon: Truck },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAcceptForm((f) => ({ ...f, fulfillmentType: opt.value }))}
                    className={`p-3 rounded-xl border text-sm font-semibold flex flex-col items-center gap-1.5 transition-all ${
                      acceptForm.fulfillmentType === opt.value
                        ? 'bg-[#E0A96D]/15 border-[#E0A96D]/50 text-[#F7D794]'
                        : 'bg-white/[0.03] border-white/10 text-slate-400 hover:border-white/25'
                    }`}
                  >
                    <opt.icon className="w-4 h-4" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {acceptForm.fulfillmentType === 'DELIVERY' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Dirección de entrega *
                </label>
                <textarea
                  rows={2}
                  value={acceptForm.address}
                  onChange={(e) => setAcceptForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Calle, edificio, apartamento, ciudad…"
                  required
                  className="input-luxury text-sm resize-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Nota (opcional)
              </label>
              <input
                value={acceptForm.notes}
                onChange={(e) => setAcceptForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Ej. Coordinar entrega por la tarde"
                className="input-luxury text-sm"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setAcceptTarget(null)}
                className="btn-secondary flex-1 text-sm py-2.5"
                disabled={saving}
              >
                Volver
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-gold flex-1 text-sm py-2.5"
              >
                {saving ? 'Aceptando…' : 'Aceptar y reservar'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Modal cobrar / realizar venta ─────────────────────────────────── */}
      <Modal
        isOpen={!!completeTarget}
        onClose={() => !saving && setCompleteTarget(null)}
        title={completeTarget ? `Cobrar pedido #${String(completeTarget.id).slice(0, 8)}` : 'Cobrar'}
        icon={<CreditCard className="w-5 h-5 text-[#E0A96D]" />}
        maxWidth="max-w-md"
      >
        {completeTarget && (
          <div className="space-y-4">
            <div className="max-h-56 overflow-y-auto space-y-2">
              {(completeTarget.items ?? []).map((i: any) => (
                <div key={i.id} className="flex justify-between text-sm gap-2">
                  <span className="text-slate-300 truncate">
                    {i.quantity}× {i.product?.name}
                  </span>
                  <span className="text-white font-semibold shrink-0">
                    {currency(i.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.07] flex justify-between items-center text-sm">
              <span className="text-slate-400 inline-flex items-center gap-1.5">
                {completeTarget.fulfillmentType === 'DELIVERY' ? (
                  <>
                    <Truck className="w-3.5 h-3.5" /> Delivery
                  </>
                ) : (
                  <>
                    <Store className="w-3.5 h-3.5" /> Retiro en tienda
                  </>
                )}
                · Total a pagar
              </span>
              <span className="text-xl font-bold text-[#E0A96D] font-serif">
                {currency(completeTarget.total)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Método de pago (pago único del total) *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="input-luxury text-sm"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-[11px] text-slate-500">
              Checklist completo ✓ · Al confirmar se genera la venta, se registra el pago y se
              descuenta el inventario (primero del canal Venta Online reservado).
            </p>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setCompleteTarget(null)}
                className="btn-secondary flex-1 text-sm py-2.5"
                disabled={saving}
              >
                Volver
              </button>
              <button
                onClick={submitComplete}
                disabled={saving || !allChecked(completeTarget)}
                className="btn-gold flex-1 text-sm py-2.5"
              >
                {saving ? 'Procesando…' : 'Cobrar y realizar venta'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Confirmar cancelación ─────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!toCancel}
        title="Cancelar pedido"
        message={
          toCancel?.status === 'CONFIRMED'
            ? 'Se cancelará el pedido y se liberará la reserva de stock (Venta Online → Bodega). Esta acción no se puede deshacer.'
            : 'Se cancelará el pedido. Esta acción no se puede deshacer.'
        }
        confirmLabel="Cancelar pedido"
        danger
        loading={saving}
        onConfirm={submitCancel}
        onCancel={() => setToCancel(null)}
      />
    </div>
  );
};
