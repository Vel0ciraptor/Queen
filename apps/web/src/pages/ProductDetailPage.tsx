import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import {
  ArrowLeft,
  ShoppingBag,
  Check,
  MessageCircle,
  Package,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import api from '../lib/api';
import { useCartStore } from '../store/cartStore';
import { currency } from '../lib/format';

interface DetailProduct {
  id: string;
  sku: string;
  name: string;
  description?: string;
  salePrice: string | number;
  compareAtPrice?: string | number;
  stock?: number;
  inventory?: { stock: number; lowStockThreshold?: number };
  category?: { id: string; name: string };
  images?: { id?: string; url: string; isPrimary?: boolean }[];
}

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<DetailProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [added, setAdded] = useState(false);

  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.getItemCount);

  useEffect(() => {
    window.scrollTo(0, 0);
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/catalog/products/${id}`);
        setProduct(res.data);
      } catch {
        setError('No se pudo cargar el producto. Puede que ya no esté disponible.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F]">
        <Navbar onOpenCart={() => navigate('/')} />
        <div className="max-w-6xl mx-auto px-4 py-20 grid grid-cols-1 lg:grid-cols-2 gap-10 animate-pulse">
          <div className="aspect-[3/4] rounded-2xl bg-white/[0.04] border border-white/10" />
          <div className="space-y-4">
            <div className="h-6 w-1/3 bg-white/[0.06] rounded" />
            <div className="h-10 w-2/3 bg-white/[0.06] rounded" />
            <div className="h-8 w-1/4 bg-white/[0.06] rounded" />
            <div className="space-y-2">
              <div className="h-3 w-full bg-white/[0.04] rounded" />
              <div className="h-3 w-5/6 bg-white/[0.04] rounded" />
              <div className="h-3 w-2/3 bg-white/[0.04] rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#0A0A0F]">
        <Navbar onOpenCart={() => navigate('/')} />
        <div className="max-w-xl mx-auto px-4 py-28 text-center space-y-4">
          <Package className="w-12 h-12 text-slate-600 mx-auto" />
          <h1 className="font-serif text-2xl font-bold text-white">Producto no encontrado</h1>
          <p className="text-sm text-slate-400">{error}</p>
          <Link to="/" className="btn-gold inline-flex px-6 py-3 text-sm">
            <ArrowLeft className="w-4 h-4" /> Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  const images = (product.images ?? []).filter((img) => img.url);
  const stock = product.inventory?.stock ?? product.stock ?? 0;
  const price = Number(product.salePrice);

  const handleAdd = () => {
    addItem({
      id: product.id,
      sku: product.sku,
      name: product.name,
      salePrice: price,
      imageUrl: images[activeImage]?.url,
      maxStock: stock > 0 ? stock : 99,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const whatsappMsg = encodeURIComponent(
    `¡Hola Queen Style! Me interesa el producto "${product.name}" (${product.sku}) por ${currency(price)}. ¿Está disponible?`,
  );

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F8FAFC]">
      <Navbar onOpenCart={() => navigate('/')} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <button
          onClick={() => navigate(-1)}
          className="text-xs text-slate-400 hover:text-[#E0A96D] flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Galería */}
          <div className="space-y-3">
            <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 border border-white/10">
              <img
                src={
                  images[activeImage]?.url ||
                  '/catalog/placeholder/' + product.sku
                }
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`w-16 h-20 rounded-lg overflow-hidden border-2 shrink-0 transition-colors ${
                      i === activeImage ? 'border-[#E0A96D]' : 'border-white/10'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detalle */}
          <div className="space-y-5">
            <div>
              <span className="text-xs font-mono text-[#E0A96D] bg-[#E0A96D]/10 px-2 py-0.5 rounded">
                {product.sku}
              </span>
              <h1 className="font-serif text-3xl font-bold text-white mt-3">{product.name}</h1>
              {product.category && (
                <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">
                  {product.category.name}
                </div>
              )}
            </div>

            <div className="flex items-end gap-3">
              <div className="text-4xl font-bold text-white font-serif">{currency(price)}</div>
              {product.compareAtPrice && Number(product.compareAtPrice) > price && (
                <div className="text-lg text-slate-500 line-through">
                  {currency(product.compareAtPrice)}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm">
              {stock > 0 ? (
                <span className="badge badge-success">✓ En stock ({stock} disponibles)</span>
              ) : (
                <span className="badge badge-danger">Agotado</span>
              )}
            </div>

            {product.description && (
              <p className="text-sm text-slate-300 leading-relaxed font-light">
                {product.description}
              </p>
            )}

            <div className="pt-2 space-y-3">
              <button
                onClick={handleAdd}
                disabled={stock <= 0}
                className="btn-gold w-full py-3.5 text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {added ? (
                  <>
                    <Check className="w-4 h-4" /> Añadido a la bolsa
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" /> Añadir a la bolsa ({openCart()} en carrito)
                  </>
                )}
              </button>

              <a
                href={`https://wa.me/584120000000?text=${whatsappMsg}`}
                target="_blank"
                rel="noreferrer"
                className="w-full rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/40 text-xs font-semibold flex items-center justify-center gap-2 py-3 transition-colors"
              >
                <MessageCircle className="w-4 h-4" /> Consultar por WhatsApp
              </a>
            </div>

            <div className="pt-4 border-t border-white/10 grid grid-cols-3 gap-3 text-center">
              {[
                { icon: ShieldCheck, label: 'Calidad premium' },
                { icon: Truck, label: 'Envío nacional' },
                { icon: Package, label: 'Retiro en tienda' },
              ].map((f) => (
                <div key={f.label} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.07]">
                  <f.icon className="w-4 h-4 text-[#E0A96D] mx-auto" />
                  <div className="text-[10px] text-slate-400 mt-1.5">{f.label}</div>
                </div>
              ))}
            </div>
          </div>
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
