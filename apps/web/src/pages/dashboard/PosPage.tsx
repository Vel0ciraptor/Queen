import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  QrCode,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  CreditCard,
  User,
  CheckCircle2,
  XCircle,
  TrendingUp,
} from 'lucide-react';
import api from '../../lib/api';
import { QrScannerModal } from '../../components/QrScannerModal';
import { Modal } from '../../components/ui/Modal';
import { PageLoader, Spinner } from '../../components/ui/Feedback';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/Toast';
import { getApiErrorMessage } from '../../lib/errors';
import { currency, timeOnly } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';

interface PosItem {
  productId: string;
  sku: string;
  name: string;
  unitPrice: number;
  quantity: number;
  maxStock: number;
  imageUrl?: string;
}

const PAYMENT_METHODS = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'QR', label: 'QR / Nequi' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'TARJETA', label: 'Tarjeta' },
  { value: 'OTRO', label: 'Otro' },
];

export const PosPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const canCancel = user?.role === 'ADMIN';

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState<PosItem[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const [customerQuery, setCustomerQuery] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [summary, setSummary] = useState<{ totalSales: number; totalTransactions: number; totalItemsSold: number } | null>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const [toCancel, setToCancel] = useState<any | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [lastSale, setLastSale] = useState<any | null>(null);

  const fetchSummary = async () => {
    try {
      const res = await api.get('/sales/today-summary');
      setSummary(res.data);
    } catch {
      /* resumen opcional */
    }
  };

  const fetchSales = async () => {
    setLoadingSales(true);
    try {
      const res = await api.get('/sales', { params: { limit: 10 } });
      setSales(res.data.items ?? []);
    } catch {
      setSales([]);
    } finally {
      setLoadingSales(false);
    }
  };

  useEffect(() => {
    void fetchSummary();
    void fetchSales();
  }, []);

  // Product search
  useEffect(() => {
    if (search.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get('/products', {
          params: { search: search.trim(), status: 'ACTIVE', limit: 8 },
        });
        setResults(res.data.items ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  // Customer search
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const res = await api.get('/customers', {
          params: { search: customerQuery || undefined, limit: 6 },
        });
        setCustomers(res.data.items ?? res.data ?? []);
      } catch {
        setCustomers([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [customerQuery]);

  const addToCart = (product: any, stockOverride?: number) => {
    const stock = stockOverride ?? product.inventory?.stock ?? 0;
    if (stock <= 0) {
      toast.error(`"${product.name}" no tiene stock disponible`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= stock) {
          toast.error(`Solo hay ${stock} unidades disponibles`);
          return prev;
        }
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          unitPrice: Number(product.salePrice),
          quantity: 1,
          maxStock: stock,
          imageUrl: product.images?.[0]?.url,
        },
      ];
    });
    setResults([]);
    setSearch('');
    toast.success(`${product.name} agregado`);
  };

  const changeQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.productId !== productId) return i;
          const next = i.quantity + delta;
          if (next > i.maxStock) {
            toast.error(`Solo hay ${i.maxStock} unidades disponibles`);
            return i;
          }
          return { ...i, quantity: next };
        })
        .filter((i) => i.quantity > 0),
    );
  };

  const removeItem = (productId: string) => setCart((prev) => prev.filter((i) => i.productId !== productId));

  const subtotal = useMemo(() => cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0), [cart]);
  const discountValue = Math.min(Number(discount) || 0, subtotal);
  const total = Math.max(0, subtotal - discountValue);

  const handleConfirm = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    try {
      const payload: Record<string, unknown> = {
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
        paymentMethod,
        discount: discountValue,
        notes: notes || undefined,
      };
      if (selectedCustomer?.id) payload.customerId = selectedCustomer.id;

      const res = await api.post('/sales', payload);
      setLastSale(res.data);
      setCart([]);
      setDiscount('0');
      setNotes('');
      setSelectedCustomer(null);
      setCustomerQuery('');
      setConfirming(false);
      toast.success('Venta registrada y stock actualizado');
      await Promise.all([fetchSummary(), fetchSales()]);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo registrar la venta'));
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelSale = async () => {
    if (!toCancel) return;
    setCancelling(true);
    try {
      await api.post(`/sales/${toCancel.id}/cancel`, { reason: 'Anulación desde POS' });
      toast.success('Venta anulada y stock devuelto');
      setToCancel(null);
      await Promise.all([fetchSummary(), fetchSales()]);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo anular la venta'));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      {/* LEFT: search + cart */}
      <div className="xl:col-span-2 space-y-5">
        {/* Search bar */}
        <div className="glass-card rounded-2xl border border-white/[0.06] p-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar producto por nombre o SKU…"
                className="input-luxury text-sm pl-9"
              />
            </div>
            <button
              onClick={() => setIsScannerOpen(true)}
              className="btn-secondary px-4 text-sm shrink-0"
              title="Escanear QR"
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">Escanear QR</span>
            </button>
          </div>

          {(searching || results.length > 0) && (
            <div className="rounded-xl border border-white/10 bg-[#14141F] max-h-72 overflow-y-auto divide-y divide-white/[0.05]">
              {searching && (
                <div className="px-3 py-3 text-xs text-slate-500 flex items-center gap-2">
                  <Spinner className="w-4 h-4" /> Buscando productos…
                </div>
              )}
              {!searching &&
                results.map((p) => {
                  const stock = p.inventory?.stock ?? 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      disabled={stock <= 0}
                      className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <img
                        src={p.images?.[0]?.url || '/placeholder-product.png'}
                        alt=""
                        className="w-9 h-11 rounded object-cover bg-white/5 shrink-0"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm text-white truncate">{p.name}</span>
                        <span className="block text-[11px] text-slate-500 font-mono">{p.sku}</span>
                      </span>
                      <span className="text-sm font-bold text-white shrink-0">
                        {currency(p.salePrice)}
                      </span>
                      <span className={`badge shrink-0 ${stock > 0 ? 'badge-success' : 'badge-danger'}`}>
                        {stock} uds
                      </span>
                    </button>
                  );
                })}
              {!searching && results.length === 0 && search.trim().length >= 2 && (
                <div className="px-3 py-3 text-xs text-slate-500">Sin resultados para “{search}”</div>
              )}
            </div>
          )}
        </div>

        {/* Cart items */}
        <div className="glass-card rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#E0A96D]" />
              <h3 className="text-sm font-serif font-bold text-white">Venta actual</h3>
            </div>
            <span className="text-xs text-slate-500">{cart.length} artículos</span>
          </div>

          {cart.length === 0 ? (
            <div className="py-12 text-center">
              <ShoppingBag className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Busca un producto o escanea su QR para comenzar.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {cart.map((item) => (
                <div key={item.productId} className="px-4 py-3 flex items-center gap-3">
                  <img
                    src={item.imageUrl || '/placeholder-product.png'}
                    alt=""
                    className="w-11 h-14 rounded-lg object-cover bg-white/5 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{item.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{item.sku}</div>
                    <div className="text-xs text-[#E0A96D] font-semibold mt-0.5">
                      {currency(item.unitPrice)}
                    </div>
                  </div>

                  <div className="flex items-center bg-black/40 rounded-lg border border-white/10 px-1 py-1 shrink-0">
                    <button
                      onClick={() => changeQty(item.productId, -1)}
                      className="p-1.5 text-slate-400 hover:text-white"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-semibold px-2 text-white w-6 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => changeQty(item.productId, 1)}
                      className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30"
                      disabled={item.quantity >= item.maxStock}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-sm font-bold text-white w-20 text-right shrink-0">
                    {currency(item.unitPrice * item.quantity)}
                  </div>

                  <button
                    onClick={() => removeItem(item.productId)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's sales */}
        <div className="glass-card rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-serif font-bold text-white">Ventas recientes</h3>
            </div>
            {summary && (
              <span className="text-xs text-slate-400">
                Hoy: <span className="font-bold text-[#E0A96D]">{currency(summary.totalSales)}</span> ·{' '}
                {summary.totalTransactions} ventas
              </span>
            )}
          </div>

          {loadingSales ? (
            <PageLoader label="Cargando ventas…" />
          ) : sales.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">Aún no hay ventas registradas.</div>
          ) : (
            <div className="divide-y divide-white/[0.05] max-h-80 overflow-y-auto">
              {sales.map((sale) => (
                <div key={sale.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">
                      {sale.customer?.name || 'Cliente mostrador'}
                      <span className="text-slate-500"> · {sale.items?.length ?? 0} art.</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {timeOnly(sale.createdAt)} · {sale.paymentMethod}
                      {sale.user?.name ? ` · ${sale.user.name}` : ''}
                    </div>
                  </div>
                  <span
                    className={`badge ${
                      sale.status === 'COMPLETED' ? 'badge-success' : 'badge-danger'
                    }`}
                  >
                    {sale.status === 'COMPLETED' ? 'OK' : 'Anulada'}
                  </span>
                  <span className="text-sm font-bold text-white w-20 text-right">
                    {currency(sale.total)}
                  </span>
                  {canCancel && sale.status === 'COMPLETED' && (
                    <button
                      onClick={() => setToCancel(sale)}
                      className="p-1.5 text-slate-500 hover:text-rose-400"
                      title="Anular venta"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: checkout */}
      <div className="space-y-5">
        <div className="glass-card rounded-2xl border border-white/[0.06] p-5 space-y-4 xl:sticky xl:top-24">
          <h3 className="text-sm font-serif font-bold text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#E0A96D]" /> Cobrar
          </h3>

          {/* Customer */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Cliente (opcional)
            </label>
            {selectedCustomer ? (
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#E0A96D]/10 border border-[#E0A96D]/30">
                <div className="min-w-0">
                  <div className="text-sm text-white truncate">{selectedCustomer.name}</div>
                  <div className="text-[11px] text-slate-400">{selectedCustomer.phone || selectedCustomer.email}</div>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-xs text-[#E0A96D] hover:underline shrink-0"
                >
                  Quitar
                </button>
              </div>
            ) : (
              <>
                <input
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  placeholder="Nombre o teléfono…"
                  className="input-luxury text-sm"
                />
                {customers.length > 0 && customerQuery.trim() !== '' && (
                  <div className="mt-1.5 rounded-xl border border-white/10 bg-[#14141F] max-h-40 overflow-y-auto">
                    {customers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setCustomerQuery('');
                          setCustomers([]);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
                      >
                        {c.name} <span className="text-xs text-slate-500">· {c.phone || 'sin teléfono'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Método de pago *</label>
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

          {/* Discount */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Descuento</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="input-luxury text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Notas</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Entrega en tienda"
              className="input-luxury text-sm"
            />
          </div>

          {/* Totals */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex justify-between text-sm text-slate-400">
              <span>Subtotal</span>
              <span>{currency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-400">
              <span>Descuento</span>
              <span className="text-rose-400">-{currency(discountValue)}</span>
            </div>
            <div className="flex justify-between items-baseline pt-1">
              <span className="text-sm text-white font-semibold">Total</span>
              <span className="text-3xl font-serif font-bold text-white">{currency(total)}</span>
            </div>
          </div>

          <button
            onClick={() => setConfirming(true)}
            disabled={cart.length === 0}
            className="btn-gold w-full py-3.5 text-sm uppercase tracking-wider font-bold rounded-xl disabled:opacity-40"
          >
            <CheckCircle2 className="w-4 h-4" /> Confirmar venta
          </button>

          {summary && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-center">
                <div className="text-lg font-bold text-white">{summary.totalTransactions}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Ventas hoy</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-center">
                <div className="text-lg font-bold text-white">{summary.totalItemsSold}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Prendas hoy</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QR Scanner */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onProductFound={(product) => addToCart(product, product.inventory?.stock)}
      />

      {/* Confirm sale modal */}
      <Modal
        isOpen={confirming}
        onClose={() => !processing && setConfirming(false)}
        title="Confirmar venta"
        icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="max-h-56 overflow-y-auto space-y-2">
            {cart.map((i) => (
              <div key={i.productId} className="flex justify-between text-sm gap-2">
                <span className="text-slate-300 truncate">
                  {i.quantity}× {i.name}
                </span>
                <span className="text-white font-semibold shrink-0">
                  {currency(i.unitPrice * i.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-white/10 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Cliente</span>
              <span>{selectedCustomer?.name || 'Mostrador'}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Método de pago</span>
              <span>{PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.label}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Descuento</span>
              <span>-{currency(discountValue)}</span>
            </div>
            <div className="flex justify-between text-white font-bold text-lg pt-1">
              <span>Total</span>
              <span className="font-serif">{currency(total)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setConfirming(false)}
              className="btn-secondary flex-1 text-sm py-2.5"
              disabled={processing}
            >
              Volver
            </button>
            <button onClick={handleConfirm} disabled={processing} className="btn-gold flex-1 text-sm py-2.5">
              {processing ? 'Procesando…' : 'Confirmar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Last sale modal */}
      <Modal
        isOpen={!!lastSale}
        onClose={() => setLastSale(null)}
        maxWidth="max-w-sm"
        title="Venta registrada"
        icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
      >
        <div className="text-center space-y-3 py-2">
          {lastSale && (
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          )}
          {lastSale && (
            <p className="text-sm text-slate-300">
              Factura <span className="font-mono text-white">#{String(lastSale.id).slice(0, 8)}</span> por{' '}
              <span className="font-bold text-white">{currency(lastSale.total)}</span>
            </p>
          )}
          <p className="text-xs text-slate-500">
            El inventario y el registro financiero se actualizaron automáticamente.
          </p>
          <button onClick={() => setLastSale(null)} className="btn-gold w-full py-2.5 text-sm">
            Nueva venta
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!toCancel}
        title="Anular venta"
        message="Se devolverá el stock de cada producto y se registrará el movimiento de reverso. Esta acción solo puede hacerla un administrador."
        confirmLabel="Anular venta"
        danger
        loading={cancelling}
        onConfirm={handleCancelSale}
        onCancel={() => setToCancel(null)}
      />
    </div>
  );
};
