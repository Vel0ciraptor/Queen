import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { ProductCard, ProductItem } from '../components/ProductCard';
import { CartDrawer } from '../components/CartDrawer';
import {
  Sparkles,
  Search,
  X,
  ShoppingBag,
  MessageCircle,
  ShieldCheck,
  Truck,
  SlidersHorizontal,
} from 'lucide-react';
import api from '../lib/api';
import { useCartStore } from '../store/cartStore';

export const CatalogPage: React.FC = () => {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    categoryId: '',
    materialId: '',
    colorId: '',
    shapeId: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<ProductItem | null>(null);

  const addItem = useCartStore((s) => s.addItem);

  const DIMENSIONS: Array<{ key: keyof typeof filters; label: string }> = [
    { key: 'categoryId', label: 'Tipo' },
    { key: 'materialId', label: 'Material' },
    { key: 'colorId', label: 'Color' },
    { key: 'shapeId', label: 'Forma' },
  ];

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, searchQuery]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catsRes, prodsRes] = await Promise.all([
        api.get('/catalog/categories'),
        api.get('/catalog/products', {
          params: {
            categoryId: filters.categoryId || undefined,
            materialId: filters.materialId || undefined,
            colorId: filters.colorId || undefined,
            shapeId: filters.shapeId || undefined,
            search: searchQuery || undefined,
          },
        }),
      ]);

      setCategories(Array.isArray(catsRes.data) ? catsRes.data : []);
      setProducts(prodsRes.data ?? []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const setFilter = (key: keyof typeof filters, id: string) =>
    setFilters((f) => ({ ...f, [key]: f[key] === id ? '' : id }));

  // Categorías por dimensión, ordenadas por uso.
  const byDim = (dim: string) =>
    categories
      .filter((c) => c.dimension === dim)
      .sort((a, b) => (b.productCount ?? 0) - (a.productCount ?? 0));

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F8FAFC]">
      <Navbar onOpenCart={() => setIsCartOpen(true)} />

      {/* Hero Boutique Banner */}
      <section className="relative overflow-hidden py-20 lg:py-28 px-4 sm:px-6 lg:px-8 border-b border-[rgba(255,255,255,0.06)] bg-gradient-to-b from-[#12121C] to-[#0A0A0F]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-center lg:text-left z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E0A96D]/15 border border-[#E0A96D]/30 text-[#F7D794] text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Nueva Colección 2026
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-white tracking-tight leading-tight">
              Joyas que definen tu <span className="gold-text">Corona</span>.
            </h1>

            <p className="text-base sm:text-lg text-slate-400 font-light max-w-xl mx-auto lg:mx-0">
              Anillos, collares, pulseras y aretes en oro, plata y acero. Encuentra la pieza perfecta filtrando por tipo, material, color y forma.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
              <a
                href="#catalog-section"
                className="btn-gold px-8 py-3.5 text-sm uppercase tracking-wider font-bold rounded-xl"
              >
                Explorar Catálogo
              </a>
              <button
                onClick={() => {
                  const msg = encodeURIComponent('¡Hola Queen Style! Me gustaría recibir asesoría personalizada sobre su colección.');
                  window.open(`https://wa.me/584120000000?text=${msg}`, '_blank');
                }}
                className="btn-secondary px-6 py-3.5 text-sm rounded-xl flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4 text-[#25D366]" />
                Asesoría WhatsApp
              </button>
            </div>
          </div>

          {/* Hero Visual Imagery */}
          <div className="relative lg:h-[480px] flex items-center justify-center">
            <div className="w-72 sm:w-80 h-96 sm:h-[440px] rounded-3xl overflow-hidden shadow-2xl border border-[#E0A96D]/30 relative z-10 transform -rotate-2 hover:rotate-0 transition-transform duration-500">
              <img
                src="https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&auto=format&fit=crop"
                alt="Queen Style Hero"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-transparent to-transparent opacity-80" />
              <div className="absolute bottom-6 left-6 right-6">
                <span className="text-xs text-[#E0A96D] uppercase tracking-widest font-mono">
                  Edición Limitada
                </span>
                <h4 className="font-serif text-xl font-bold text-white">Anillo Solitario</h4>
              </div>
            </div>

            {/* Ambient Background Blur Rings */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#E0A96D]/15 rounded-full blur-3xl pointer-events-none" />
          </div>
        </div>
      </section>

      {/* Boutique Value Badges */}
      <section className="border-b border-white/[0.06] bg-black/30 py-6 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#E0A96D]/10 border border-[#E0A96D]/25 flex items-center justify-center text-[#E0A96D]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-sm font-bold text-white">Joyas Certificadas</h5>
              <p className="text-xs text-slate-400">Oro, plata y acero de calidad garantizada</p>
            </div>
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#E0A96D]/10 border border-[#E0A96D]/25 flex items-center justify-center text-[#E0A96D]">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-sm font-bold text-white">Envíos Nacionales</h5>
              <p className="text-xs text-slate-400">Entregas seguras y retiro en tienda</p>
            </div>
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#E0A96D]/10 border border-[#E0A96D]/25 flex items-center justify-center text-[#E0A96D]">
              <MessageCircle className="w-5 h-5 text-[#25D366]" />
            </div>
            <div>
              <h5 className="text-sm font-bold text-white">Atención Inmediata</h5>
              <p className="text-xs text-slate-400">Respuesta rápida por WhatsApp</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog Section */}
      <section id="catalog-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
        {/* Controls: count + Filters toggle + Search */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <Sparkles className="w-4 h-4 text-[#E0A96D]" />
            <span>
              {products.length} {products.length === 1 ? 'joya disponible' : 'joyas disponibles'}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Filters toggle */}
            <button
              onClick={() => setIsFilterOpen((o) => !o)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                isFilterOpen || activeFilterCount > 0
                  ? 'bg-[#E0A96D] text-[#12121C] shadow-lg shadow-[#E0A96D]/20'
                  : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/[0.06]'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtros
              {activeFilterCount > 0 && (
                <span className="ml-0.5 w-5 h-5 rounded-full bg-[#12121C] text-[#E0A96D] text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Search Box */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre o SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-luxury text-xs pl-10 pr-4 py-2.5 rounded-xl w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Active filter chips (visible cuando el panel está cerrado) */}
        {!isFilterOpen && activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {DIMENSIONS.filter((d) => filters[d.key]).map((d) => {
              const cat = categories.find((c) => c.id === filters[d.key]);
              return (
                <button
                  key={d.key}
                  onClick={() => setFilter(d.key, filters[d.key])}
                  className="group flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-lg bg-[#E0A96D]/10 border border-[#E0A96D]/30 text-[11px] font-semibold text-[#F7D794] hover:bg-[#E0A96D]/20 transition-colors"
                >
                  <span className="text-slate-400 font-normal">{d.label}:</span>
                  {cat?.name ?? '—'}
                  <X className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                </button>
              );
            })}
            <button
              onClick={() => setFilters({ categoryId: '', materialId: '', colorId: '', shapeId: '' })}
              className="text-[11px] font-semibold text-slate-400 hover:text-white px-1 transition-colors"
            >
              Limpiar todo
            </button>
          </div>
        )}

        {/* Per-dimension filter pill groups (solo cuando se abre el panel) */}
        {isFilterOpen && (
          <div className="glass-card rounded-2xl border border-white/[0.06] p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Filtrar joyas</span>
              <div className="flex items-center gap-3">
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => setFilters({ categoryId: '', materialId: '', colorId: '', shapeId: '' })}
                    className="text-[11px] font-semibold text-slate-400 hover:text-white transition-colors"
                  >
                    Limpiar filtros
                  </button>
                )}
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {DIMENSIONS.map((dim) => {
                const options = byDim(
                  dim.key === 'categoryId' ? 'TYPE' : dim.key === 'materialId' ? 'MATERIAL' : dim.key === 'colorId' ? 'COLOR' : 'SHAPE',
                );
                if (options.length === 0) return null;
                const active = filters[dim.key];
                return (
                  <div key={dim.key} className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold w-20 shrink-0">
                      {dim.label}
                    </span>
                    <div className="flex items-center gap-2 overflow-x-auto w-full pb-1 scrollbar-none">
                      {options.map((cat) => {
                        const isActive = active === cat.id;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => setFilter(dim.key, cat.id)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                              isActive
                                ? 'bg-[#E0A96D] text-[#12121C] shadow-lg shadow-[#E0A96D]/20'
                                : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/[0.06]'
                            }`}
                          >
                            {cat.name}
                            {cat.productCount != null && (
                              <span className={`ml-1.5 text-[10px] ${isActive ? 'text-[#12121C]/60' : 'text-slate-500'}`}>
                                {cat.productCount}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="aspect-[3/4] bg-white/[0.03] rounded-2xl border border-white/5" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-slate-400 space-y-3">
            <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="font-serif text-xl font-semibold text-white">No se encontraron joyas</h3>
            <p className="text-xs text-slate-500">Prueba cambiando los filtros o el término de búsqueda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onQuickView={(p) => setQuickViewProduct(p)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Quick View Product Modal */}
      {quickViewProduct && (
        <div className="modal-overlay">
          <div className="modal-content max-w-2xl p-6 sm:p-8">
            <div className="flex justify-end pb-2">
              <button
                onClick={() => setQuickViewProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 border border-white/10">
                <img
                  src={
                    quickViewProduct.images?.[0]?.url ||
                    'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800'
                  }
                  alt={quickViewProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-xs font-mono text-[#E0A96D] bg-[#E0A96D]/10 px-2 py-0.5 rounded">
                    {quickViewProduct.sku}
                  </span>
                  <h2 className="font-serif text-2xl font-bold text-white mt-2">
                    {quickViewProduct.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    {[
                      quickViewProduct.category,
                      quickViewProduct.material,
                      quickViewProduct.color,
                      quickViewProduct.shape,
                    ]
                      .filter(Boolean)
                      .map((tag, i) => (
                        <span
                          key={i}
                          className="text-[11px] text-slate-300 bg-white/[0.05] border border-white/[0.06] px-2 py-0.5 rounded-md"
                        >
                          {tag}
                        </span>
                      ))}
                  </div>
                </div>

                <div className="text-2xl font-bold text-white font-serif">
                  ${Number(quickViewProduct.salePrice).toFixed(2)}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-light">
                  {quickViewProduct.description || 'Pieza exclusiva elaborada con los más altos estándares de joyería.'}
                </p>

                <div className="pt-4 border-t border-white/10 space-y-3">
                  <button
                    onClick={() => {
                      addItem({
                        id: quickViewProduct.id,
                        sku: quickViewProduct.sku,
                        name: quickViewProduct.name,
                        salePrice: quickViewProduct.salePrice,
                        imageUrl: quickViewProduct.images?.[0]?.url,
                        maxStock: quickViewProduct.stock ?? 99,
                      });
                      setQuickViewProduct(null);
                      setIsCartOpen(true);
                    }}
                    className="btn-gold w-full py-3 text-sm flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Añadir a Bolsa de Compras</span>
                  </button>

                  <button
                    onClick={() => {
                      const msg = encodeURIComponent(
                        `¡Hola Queen Style! Deseo comprar "${quickViewProduct.name}" (${quickViewProduct.sku}) por $${quickViewProduct.salePrice.toFixed(2)}.`
                      );
                      window.open(`https://wa.me/584120000000?text=${msg}`, '_blank');
                    }}
                    className="w-full py-3 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/40 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Comprar directo por WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {/* Footer */}
      <footer className="border-t border-white/[0.06] bg-[#0E0E17] py-12 px-4 text-center text-slate-500 text-xs space-y-2">
        <div className="font-serif text-lg font-bold text-white tracking-wider gold-text">
          QUEEN STYLE
        </div>
        <p>© 2026 Queen Style ERP & Boutique. Todos los derechos reservados.</p>
        <p className="text-[11px] text-slate-600">Sistema Integral de Inventario, POS y Tienda Digital</p>
      </footer>
    </div>
  );
};
