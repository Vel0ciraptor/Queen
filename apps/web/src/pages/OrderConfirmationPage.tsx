import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import {
  CheckCircle2,
  Package,
  MessageCircle,
  ArrowLeft,
  MapPin,
  Phone,
  Copy,
} from 'lucide-react';
import api from '../lib/api';
import { PageLoader } from '../components/ui/Feedback';
import { toast } from '../components/ui/Toast';
import { currency, shortDate } from '../lib/format';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente de confirmación',
  CONFIRMED: 'Confirmado',
  PREPARING: 'En preparación',
  READY: 'Listo para entrega',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'badge-warning',
  CONFIRMED: 'badge-info',
  PREPARING: 'badge-info',
  READY: 'badge-info',
  DELIVERED: 'badge-success',
  CANCELLED: 'badge-danger',
};

export const OrderConfirmationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/orders/${id}`);
        setOrder(res.data);
      } catch {
        setError('No encontramos ese pedido. Verifica el enlace o contáctanos por WhatsApp.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  if (loading) return <PageLoader label="Cargando tu pedido…" />;

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#0A0A0F]">
        <Navbar onOpenCart={() => navigate('/')} />
        <div className="max-w-xl mx-auto px-4 py-28 text-center space-y-4">
          <Package className="w-12 h-12 text-slate-600 mx-auto" />
          <h1 className="font-serif text-2xl font-bold text-white">Pedido no encontrado</h1>
          <p className="text-sm text-slate-400">{error}</p>
          <Link to="/" className="btn-gold inline-flex px-6 py-3 text-sm">
            <ArrowLeft className="w-4 h-4" /> Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  const customer = order.customer ?? {};
  const items: any[] = order.items ?? [];
  const subtotal = Number(order.subtotal ?? 0);
  const deliveryFee = Number(order.deliveryFee ?? 0);
  const total = Number(order.total ?? 0);
  const customerName = customer.name || order.customerName || 'Cliente';
  const customerPhone = customer.phone || order.customerPhone;
  const address = order.address || order.deliveryAddress;

  const copyId = () => {
    void navigator.clipboard?.writeText(String(order.id));
    toast.success('ID del pedido copiado');
  };

  const orderMsg = encodeURIComponent(
    `¡Hola Queen Style! Escribo por mi pedido #${String(order.id).slice(0, 8)} (${STATUS_LABEL[order.status] || order.status}) por ${currency(total)}. ¿Me dan más detalles?`,
  );

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F8FAFC]">
      <Navbar onOpenCart={() => navigate('/')} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-6">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-white">¡Gracias por tu pedido!</h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Recibimos tu solicitud correctamente. Nuestras asesoras te contactarán para coordinar
            el pago y la entrega.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-xs text-slate-300">
            <span className="font-mono">#{String(order.id).slice(0, 8).toUpperCase()}</span>
            <button onClick={copyId} className="text-slate-500 hover:text-[#E0A96D]" title="Copiar ID">
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className={`badge ${STATUS_BADGE[order.status] || 'badge-neutral'} block w-fit mx-auto`}>
            {STATUS_LABEL[order.status] || order.status}
          </span>
        </div>

        {/* Resumen */}
        <div className="glass-card rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="text-sm font-serif font-bold text-white">Detalle del pedido</h3>
            <span className="text-xs text-slate-500">{shortDate(order.createdAt)}</span>
          </div>

          <div className="divide-y divide-white/[0.05]">
            {items.map((it, i) => {
              const name = it.product?.name ?? it.productName ?? 'Producto';
              const sku = it.product?.sku ?? '';
              const img = it.product?.images?.[0]?.url;
              const price = Number(it.unitPrice ?? it.price ?? 0);
              return (
                <div key={it.id ?? i} className="px-5 py-4 flex items-center gap-4">
                  <div className="w-12 h-14 rounded-lg bg-slate-900 border border-white/10 overflow-hidden shrink-0">
                    {img && <img src={img} alt={name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {sku} · {it.quantity} uds × {currency(price)}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-white shrink-0">
                    {currency(price * (it.quantity ?? 1))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-5 py-4 border-t border-white/[0.06] bg-white/[0.02] space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Subtotal</span>
              <span className="text-white">{currency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Envío</span>
              <span className="text-slate-400">
                {deliveryFee > 0 ? currency(deliveryFee) : 'A coordinar'}
              </span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-white/10">
              <span className="text-sm font-semibold text-white">Total</span>
              <span className="text-2xl font-bold font-serif text-[#E0A96D]">{currency(total)}</span>
            </div>
          </div>
        </div>

        {/* Datos del cliente */}
        <div className="glass-card rounded-2xl border border-white/[0.06] p-5 grid sm:grid-cols-2 gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
              Cliente
            </div>
            <div className="text-sm text-white">{customerName}</div>
            {customerPhone && (
              <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                <Phone className="w-3.5 h-3.5" /> {customerPhone}
              </div>
            )}
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
              Entrega
            </div>
            <div className="text-xs text-slate-400 flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{address || 'Retiro en boutique / a coordinar'}</span>
            </div>
            {order.notes && (
              <div className="text-xs text-slate-500 mt-1.5">Nota: {order.notes}</div>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link to="/" className="btn-secondary flex-1 text-sm py-3 justify-center">
            <ArrowLeft className="w-4 h-4" /> Seguir comprando
          </Link>
          <a
            href={`https://wa.me/584120000000?text=${orderMsg}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/40 text-sm font-semibold flex items-center justify-center gap-2 py-3 transition-colors"
          >
            <MessageCircle className="w-4 h-4" /> Consultar por WhatsApp
          </a>
        </div>
      </div>

      <footer className="border-t border-white/[0.06] bg-[#0E0E17] py-8 px-4 text-center text-slate-500 text-xs">
        <div className="font-serif text-lg font-bold text-white tracking-wider gold-text mb-1">
          QUEEN STYLE
        </div>
        © 2026 Queen Style ERP & Boutique
      </footer>
    </div>
  );
};
