import React from 'react';
import { ShoppingBag, MessageCircle, Eye, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCartStore } from '../store/cartStore';

export interface ProductItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  salePrice: number;
  category: string;
  material?: string | null;
  color?: string | null;
  shape?: string | null;
  images?: { url: string; isPrimary?: boolean }[];
  inStock?: boolean;
  stock?: number;
}

interface ProductCardProps {
  product: ProductItem;
  onQuickView: (product: ProductItem) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onQuickView }) => {
  const addItem = useCartStore((s) => s.addItem);
  const primaryImage = product.images?.[0]?.url || 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&auto=format&fit=crop';
  const isAvailable = (product.stock ?? 1) > 0;

  const handleWhatsAppBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const message = encodeURIComponent(
      `¡Hola Queen Style! Me interesa esta joya de su catálogo: "${product.name}" (SKU: ${product.sku}) por $${product.salePrice.toFixed(2)}. ¿Tienen disponibilidad en tienda?`
    );
    window.open(`https://wa.me/584120000000?text=${message}`, '_blank');
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAvailable) return;
    addItem({
      id: product.id,
      sku: product.sku,
      name: product.name,
      salePrice: product.salePrice,
      imageUrl: primaryImage,
      maxStock: product.stock ?? 99,
    });
  };

  return (
    <div
      onClick={() => onQuickView(product)}
      className="group ios-glass-card overflow-hidden flex flex-col cursor-pointer p-2.5 sm:p-3"
    >
      {/* Image Container with Luxury Overlay */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-black/5 dark:bg-white/5">
        <img
          src={primaryImage}
          alt={product.name}
          className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
          loading="lazy"
        />

        {/* Soft bottom vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />

        {/* Category & Stock Floating iOS Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
          <span className="px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-white/90 dark:bg-black/75 backdrop-blur-md text-[var(--pink-strong)] border border-white/80 dark:border-white/15 shadow-xs">
            {product.category}
          </span>
          {isAvailable ? (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 backdrop-blur-md flex items-center gap-1 w-fit shadow-xs">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              {product.stock ? `${product.stock} disp.` : 'Disponible'}
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-500/30 backdrop-blur-md flex items-center gap-1 w-fit shadow-xs">
              <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" /> Agotado
            </span>
          )}
        </div>

        {/* Floating Quick Action Overlay (iOS Pill Actions) */}
        <div className="absolute inset-x-2.5 bottom-2.5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 z-10">
          <button
            onClick={handleAddToCart}
            disabled={!isAvailable}
            className={`flex-1 py-2.5 px-3 ios-pill-btn text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-lg ${
              isAvailable
                ? 'bg-gradient-to-r from-[var(--pink-strong)] via-[#e0007b] to-[var(--magenta-deep)] text-white hover:brightness-110'
                : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            {isAvailable ? 'Añadir' : 'Sin Stock'}
          </button>

          <button
            onClick={handleWhatsAppBuy}
            className="p-2.5 ios-pill-btn bg-[#25D366] hover:bg-[#20ba5a] text-white shadow-lg"
            title="Pedir por WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Product Details */}
      <div className="p-2 sm:p-2.5 pt-3 flex flex-col flex-grow justify-between">
        <div>
          <div className="text-[10px] text-[var(--pink-strong)] font-mono font-bold tracking-wider mb-0.5">
            {product.sku}
          </div>
          <h3 className="font-serif text-base sm:text-lg text-[var(--text-main)] font-bold line-clamp-1 group-hover:text-[var(--pink-strong)] transition-colors">
            {product.name}
          </h3>
          {(product.material || product.color) && (
            <div className="text-[11px] text-[var(--text-secondary)] font-medium mt-0.5 line-clamp-1">
              {[product.material, product.color].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>

        <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)]/70 flex items-center justify-between">
          <div className="flex items-baseline gap-0.5">
            <span className="text-xs text-[var(--pink-strong)] font-bold">$</span>
            <span className="text-xl sm:text-2xl font-extrabold text-[var(--text-main)] tracking-tight">
              {Number(product.salePrice).toFixed(2)}
            </span>
          </div>
          <span className="text-xs font-bold text-[var(--pink-strong)] group-hover:underline flex items-center gap-1">
            Ver detalle <Eye className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
};
