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
      `¡Hola Queen Style! Me encanta esta prenda de su catálogo: "${product.name}" (SKU: ${product.sku}) por $${product.salePrice.toFixed(2)}. ¿Tienen disponibilidad en tienda?`
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
      className="group glass-card overflow-hidden flex flex-col cursor-pointer border border-[rgba(255,255,255,0.06)] hover:border-[#E0A96D]/50 transition-all duration-500 rounded-2xl bg-[#12121C]/80"
    >
      {/* Image Container with Luxury Overlay */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#181824]">
        <img
          src={primaryImage}
          alt={product.name}
          className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
          loading="lazy"
        />

        {/* Gradient Shadow at bottom of image */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#12121C] via-transparent to-black/20 opacity-80" />

        {/* Category & Stock Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-[#12121C]/80 backdrop-blur-md text-[#E0A96D] border border-[#E0A96D]/30">
            {product.category}
          </span>
          {isAvailable ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md flex items-center gap-1 w-fit">
              <CheckCircle2 className="w-3 h-3" />
              {product.stock ? `${product.stock} disp.` : 'Disponible'}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30 backdrop-blur-md flex items-center gap-1 w-fit">
              <AlertCircle className="w-3 h-3" /> Agotado
            </span>
          )}
        </div>

        {/* Floating Quick Action Overlay */}
        <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 z-10">
          <button
            onClick={handleAddToCart}
            disabled={!isAvailable}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg transition-all ${
              isAvailable
                ? 'bg-[#E0A96D] hover:bg-[#F7D794] text-[#12121C]'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            {isAvailable ? 'Añadir a Bolsa' : 'Sin Stock'}
          </button>

          <button
            onClick={handleWhatsAppBuy}
            className="p-2.5 rounded-xl bg-[#25D366]/90 hover:bg-[#25D366] text-white shadow-lg transition-all"
            title="Consultar por WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Product Details */}
      <div className="p-4 flex flex-col flex-grow justify-between">
        <div>
          <div className="text-[11px] text-[#94A3B8] font-mono mb-1">{product.sku}</div>
          <h3 className="font-serif text-lg text-[#F8FAFC] font-semibold line-clamp-1 group-hover:text-[#E0A96D] transition-colors">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-xs text-[#94A3B8] line-clamp-2 mt-1 font-light">
              {product.description}
            </p>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.06)] flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-xs text-[#E0A96D] font-medium">$</span>
            <span className="text-xl font-bold text-white tracking-tight">
              {Number(product.salePrice).toFixed(2)}
            </span>
          </div>
          <span className="text-xs text-[#94A3B8] group-hover:text-[#E0A96D] flex items-center gap-1 transition-colors">
            Ver detalle <Eye className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  );
};
