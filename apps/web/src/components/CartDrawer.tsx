import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, Send, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import api from '../lib/api';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
  const { items, removeItem, updateQuantity, clearCart, getTotal } = useCartStore();
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState<any>(null);

  if (!isOpen) return null;

  const total = getTotal();

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || items.length === 0) return;

    setIsSubmitting(true);
    try {
      const orderPayload = {
        customerName,
        customerPhone,
        deliveryAddress: address,
        notes,
        items: items.map((i) => ({
          productId: i.id,
          quantity: i.quantity,
        })),
      };

      const res = await api.post('/orders', orderPayload);
      const createdOrder = res.data;
      setOrderCompleted(createdOrder);

      // Generate WhatsApp redirection URL
      const itemsListText = items
        .map((i) => `• ${i.quantity}x ${i.name} ($${(i.salePrice * i.quantity).toFixed(2)})`)
        .join('\n');

      const msg = encodeURIComponent(
        `👑 *NUEVO PEDIDO — QUEEN STYLE* 👑\n\n` +
        `*Pedido:* #${createdOrder.id?.slice(0, 8) || 'NUEVO'}\n` +
        `*Cliente:* ${customerName}\n` +
        `*Teléfono:* ${customerPhone || 'N/A'}\n` +
        `*Dirección:* ${address || 'Retiro en Boutique'}\n\n` +
        `*Detalle de Productos:*\n${itemsListText}\n\n` +
        `*Total a Pagar:* *$${total.toFixed(2)}*\n` +
        (notes ? `*Notas:* ${notes}\n\n` : '\n') +
        `¡Hola! Acabo de registrar este pedido en la web. Deseo coordinar el pago y la entrega.`
      );

      clearCart();
      setTimeout(() => {
        window.open(`https://wa.me/584120000000?text=${msg}`, '_blank');
      }, 500);
    } catch (err) {
      console.error('Error al procesar el pedido:', err);
      // Fallback direct WhatsApp checkout without backend failure blocking
      const itemsListText = items
        .map((i) => `• ${i.quantity}x ${i.name} ($${(i.salePrice * i.quantity).toFixed(2)})`)
        .join('\n');

      const msg = encodeURIComponent(
        `👑 *NUEVO PEDIDO — QUEEN STYLE* 👑\n\n` +
        `*Cliente:* ${customerName}\n` +
        `*Teléfono:* ${customerPhone || 'N/A'}\n` +
        `*Dirección:* ${address || 'Retiro en Boutique'}\n\n` +
        `*Detalle:*\n${itemsListText}\n\n` +
        `*Total:* *$${total.toFixed(2)}*\n\n` +
        `¡Hola! Deseo ordenar estas prendas de su catálogo.`
      );
      window.open(`https://wa.me/584120000000?text=${msg}`, '_blank');
      clearCart();
      setOrderCompleted({ id: 'DIRECT-WHATSAPP', total });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#12121C] border-l border-[rgba(255,255,255,0.08)] shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-6 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#E0A96D]" />
              <h2 className="font-serif text-xl font-bold text-white tracking-wide">
                Bolsa de Compras
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#E0A96D]/15 text-[#E0A96D] border border-[#E0A96D]/30">
                {items.length} prendas
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <ShoppingBag className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="font-serif text-lg text-slate-300 font-semibold mb-1">
                  Tu bolsa está vacía
                </h3>
                <p className="text-xs text-slate-500 max-w-xs">
                  Explora nuestra exclusiva colección de alta costura y añade tus prendas favoritas.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] items-center"
                >
                  <img
                    src={item.imageUrl || 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=200'}
                    alt={item.name}
                    className="w-16 h-20 object-cover rounded-lg bg-slate-900"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-slate-400 font-mono">{item.sku}</div>
                    <h4 className="text-sm font-semibold text-white truncate">{item.name}</h4>
                    <div className="text-sm font-bold text-[#E0A96D] mt-0.5">
                      ${Number(item.salePrice).toFixed(2)}
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center bg-black/40 rounded-lg border border-white/10 px-1 py-0.5">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 text-slate-400 hover:text-white"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-semibold px-2 text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.maxStock}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout Action */}
          {items.length > 0 && (
            <div className="p-6 border-t border-[rgba(255,255,255,0.08)] bg-black/40 space-y-4">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-slate-400">Total a Pagar:</span>
                <span className="text-2xl font-bold text-white font-serif">
                  ${total.toFixed(2)}
                </span>
              </div>

              <button
                onClick={() => setShowCheckoutModal(true)}
                className="w-full btn-gold py-3.5 flex items-center justify-center gap-2 text-sm uppercase tracking-wider font-bold rounded-xl"
              >
                <span>Finalizar Pedido vía WhatsApp</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Complete Checkout Modal */}
      {showCheckoutModal && (
        <div className="modal-overlay">
          <div className="modal-content p-6 max-w-lg">
            {!orderCompleted ? (
              <form onSubmit={handleCheckout} className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="font-serif text-xl font-bold text-white">
                    Datos para tu Pedido
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowCheckoutModal(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Valeria Rivas"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="input-luxury text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Teléfono / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej. +58 412 1234567"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="input-luxury text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Dirección de entrega (o retiro en tienda)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Calle, edificio, apartamento, ciudad..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="input-luxury text-sm resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Notas o tallas especiales
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Talla M, entrega en la mañana"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="input-luxury text-sm"
                  />
                </div>

                <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] flex justify-between items-center text-sm">
                  <span className="text-slate-400">Total a transferir/pagar:</span>
                  <span className="text-lg font-bold text-[#E0A96D] font-serif">
                    ${total.toFixed(2)}
                  </span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCheckoutModal(false)}
                    className="btn-secondary flex-1 text-sm py-2.5"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-gold flex-1 text-sm py-2.5 flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {isSubmitting ? 'Generando...' : 'Confirmar en WhatsApp'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-white">
                  ¡Pedido Registrado con Éxito!
                </h3>
                <p className="text-sm text-slate-400 max-w-sm mx-auto">
                  Hemos abierto WhatsApp para que confirmes tu pedido directamente con una de nuestras asesoras de moda.
                </p>
                <button
                  onClick={() => {
                    setShowCheckoutModal(false);
                    setOrderCompleted(null);
                    onClose();
                  }}
                  className="btn-gold w-full py-3 mt-4"
                >
                  Continuar Explorando
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
