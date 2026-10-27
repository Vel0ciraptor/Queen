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
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)] transition-colors duration-200">
      <Navbar onOpenCart={() => setIsCartOpen(true)} />

      {/* Main Catalog Storefront — Conversion Focused (Zero Hero, 100% Products) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* iOS Dynamic Glass Control Island: Title + Search + Filter */}
        <div className="ios-glass-card p-4 sm:p-5 rounded-3xl flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[var(--pink-strong)] via-[#e0007b] to-[var(--gold)] p-[1.5px] shadow-sm">
              <div className="w-full h-full bg-[var(--surface)] rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[var(--pink-strong)]" />
              </div>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-serif font-extrabold text-[var(--text-main)] tracking-tight">
                Catálogo Boutique
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--pink-pastel)] text-[var(--magenta-deep)] dark:bg-[var(--pink-strong)]/20 dark:text-[var(--pink-strong)]">
                  {products.length} {products.length === 1 ? 'joya disponible' : 'joyas disponibles'}
                </span>
                <span className="text-[11px] text-[var(--text-dim)] font-medium hidden sm:inline">
                  • Envíos a todo el país
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            {/* iOS Spotlight Search Pill */}
            <div className="relative flex-1 md:w-80">
              <Search className="w-4 h-4 text-[var(--pink-strong)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por joya o código SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 rounded-full text-xs font-semibold bg-white/70 dark:bg-black/40 border border-white/70 dark:border-white/10 text-[var(--text-main)] placeholder-[var(--text-dim)] backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-[var(--pink-strong)]/40 shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] hover:text-[var(--text-main)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* iOS Filter Button */}
            <button
              onClick={() => setIsFilterOpen((o) => !o)}
              className={`ios-pill-btn flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold whitespace-nowrap border shadow-sm shrink-0 ${
                isFilterOpen || activeFilterCount > 0
                  ? 'bg-gradient-to-r from-[var(--pink-strong)] to-[#e0007b] text-white border-transparent'
                  : 'bg-white/80 dark:bg-white/10 text-[var(--text-secondary)] border-white/80 dark:border-white/10 hover:border-[var(--pink-strong)]'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filtros</span>
              {activeFilterCount > 0 && (
                <span className="ml-0.5 w-4.5 h-4.5 rounded-full bg-white text-[var(--magenta-deep)] text-[10px] font-extrabold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Quick Category Segmented Pills (Horizontal iOS Scroll) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFilter('categoryId', '')}
            className={`ios-pill-btn px-4 py-2 text-xs font-bold whitespace-nowrap border transition-all ${
              !filters.categoryId
                ? 'bg-gradient-to-r from-[var(--pink-strong)] to-[#e0007b] text-white border-transparent shadow-sm'
                : 'bg-white/70 dark:bg-black/30 border-white/80 dark:border-white/10 text-[var(--text-secondary)] hover:bg-white hover:text-[var(--pink-strong)]'
            }`}
          >
            Todas las joyas
          </button>
          {byDim('TYPE').map((cat) => {
            const isActive = filters.categoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setFilter('categoryId', cat.id)}
                className={`ios-pill-btn px-4 py-2 text-xs font-bold whitespace-nowrap border transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-[var(--pink-strong)] to-[#e0007b] text-white border-transparent shadow-sm'
                    : 'bg-white/70 dark:bg-black/30 border-white/80 dark:border-white/10 text-[var(--text-secondary)] hover:bg-white hover:text-[var(--pink-strong)]'
                }`}
              >
                {cat.name}
                {cat.productCount != null && (
                  <span className={`ml-1.5 text-[10px] ${isActive ? 'text-white/80' : 'text-[var(--text-dim)]'}`}>
                    {cat.productCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active filter chips (when panel is closed) */}
        {!isFilterOpen && activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {DIMENSIONS.filter((d) => filters[d.key]).map((d) => {
              const cat = categories.find((c) => c.id === filters[d.key]);
              return (
                <button
                  key={d.key}
                  onClick={() => setFilter(d.key, filters[d.key])}
                  className="ios-pill-btn group flex items-center gap-1.5 pl-3.5 pr-2.5 py-1 rounded-full bg-[var(--pink-pastel)] border border-[var(--border)] text-[11px] font-bold text-[var(--magenta-deep)] dark:bg-[var(--pink-strong)]/20 dark:text-[var(--pink-strong)]"
                >
                  <span className="opacity-70 font-medium">{d.label}:</span>
                  {cat?.name ?? '—'}
                  <X className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                </button>
              );
            })}
            <button
              onClick={() => setFilters({ categoryId: '', materialId: '', colorId: '', shapeId: '' })}
              className="text-[11px] font-bold text-[var(--pink-strong)] hover:underline px-2"
            >
              Limpiar todo
            </button>
          </div>
        )}

        {/* Dimension Filter Panel (iPhone Glass Dropdown) */}
        {isFilterOpen && (
          <div className="ios-glass-card rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)]/60 pb-3">
              <span className="text-sm font-extrabold text-[var(--text-main)] font-serif">
                Filtrar Colección
              </span>
              <div className="flex items-center gap-3">
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => setFilters({ categoryId: '', materialId: '', colorId: '', shapeId: '' })}
                    className="text-xs font-bold text-[var(--pink-strong)] hover:underline"
                  >
                    Limpiar filtros
                  </button>
                )}
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="p-1.5 rounded-full bg-black/5 dark:bg-white/10 text-[var(--text-dim)] hover:text-[var(--text-main)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3.5 pt-1">
              {DIMENSIONS.map((dim) => {
                const options = byDim(
                  dim.key === 'categoryId' ? 'TYPE' : dim.key === 'materialId' ? 'MATERIAL' : dim.key === 'colorId' ? 'COLOR' : 'SHAPE',
                );
                if (options.length === 0) return null;
                const active = filters[dim.key];
                return (
                  <div key={dim.key} className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-[11px] uppercase tracking-wider text-[var(--text-dim)] font-bold w-20 shrink-0">
                      {dim.label}
                    </span>
                    <div className="flex items-center gap-2 overflow-x-auto w-full pb-1 scrollbar-none">
                      {options.map((cat) => {
                        const isActive = active === cat.id;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => setFilter(dim.key, cat.id)}
                            className={`ios-pill-btn px-3.5 py-1.5 text-xs font-bold whitespace-nowrap border transition-all ${
                              isActive
                                ? 'bg-gradient-to-r from-[var(--pink-strong)] to-[#e0007b] text-white border-transparent shadow-xs'
                                : 'bg-white/60 dark:bg-black/30 border-white/70 dark:border-white/10 text-[var(--text-secondary)] hover:bg-white hover:text-[var(--pink-strong)]'
                            }`}
                          >
                            {cat.name}
                            {cat.productCount != null && (
                              <span className={`ml-1.5 text-[10px] ${isActive ? 'text-white/80' : 'text-[var(--text-dim)]'}`}>
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

        {/* Product Grid — 100% Focus on Sales */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="aspect-[3/4] ios-glass-card rounded-3xl" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="ios-glass-card rounded-3xl text-center py-20 px-4 text-[var(--text-dim)] space-y-3">
            <ShoppingBag className="w-12 h-12 text-[var(--pink-strong)]/60 mx-auto" />
            <h3 className="font-serif text-xl font-bold text-[var(--text-main)]">No se encontraron joyas</h3>
            <p className="text-xs text-[var(--text-dim)]">Prueba cambiando los filtros o el término de búsqueda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onQuickView={(p) => setQuickViewProduct(p)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Quick View Product Modal — iOS Frosted Glass Sheet */}
      {quickViewProduct && (
        <div className="modal-overlay">
          <div className="ios-glass-card max-w-2xl w-full p-6 sm:p-8 rounded-3xl border border-white/80 dark:border-white/15 animate-slideUp shadow-2xl">
            <div className="flex justify-end pb-2">
              <button
                onClick={() => setQuickViewProduct(null)}
                className="p-2 rounded-full bg-black/5 dark:bg-white/10 text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-inner">
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
                  <span className="text-[10px] font-mono font-bold tracking-wider text-[var(--pink-strong)] bg-[var(--pink-pastel)] dark:bg-[var(--pink-strong)]/20 px-2.5 py-1 rounded-full">
                    {quickViewProduct.sku}
                  </span>
                  <h2 className="font-serif text-2xl font-extrabold text-[var(--text-main)] mt-2">
                    {quickViewProduct.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
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
                          className="text-[11px] font-semibold text-[var(--text-secondary)] bg-white/70 dark:bg-white/10 border border-white/60 dark:border-white/10 px-2.5 py-0.5 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                  </div>
                </div>

                <div className="text-3xl font-extrabold text-[var(--text-main)] font-serif tracking-tight">
                  <span className="text-sm font-bold text-[var(--pink-strong)] align-top mr-0.5">$</span>
                  {Number(quickViewProduct.salePrice).toFixed(2)}
                </div>

                <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                  {quickViewProduct.description || 'Pieza exclusiva elaborada con los más altos estándares de joyería fina.'}
                </p>

                <div className="pt-4 border-t border-[var(--border-subtle)]/70 space-y-2.5">
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
                    className="w-full py-3.5 ios-pill-btn bg-gradient-to-r from-[var(--pink-strong)] via-[#e0007b] to-[var(--magenta-deep)] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg"
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
                    className="w-full py-3.5 ios-pill-btn bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
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

      {/* Footer — Frosted Glass Aesthetic */}
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--surface)]/85 backdrop-blur-xl py-10 px-4 text-center text-[var(--text-dim)] text-xs space-y-1.5 transition-colors duration-200">
        <div className="font-serif text-lg font-extrabold text-[var(--text-main)] tracking-wider">
          QUEEN STYLE
        </div>
        <p className="font-medium">© 2026 Queen Style Boutique. Todos los derechos reservados.</p>
        <p className="text-[11px] text-[var(--pink-strong)] font-semibold">Joyería Fina y Accesorios de Lujo</p>
      </footer>
    </div>
  );
};
