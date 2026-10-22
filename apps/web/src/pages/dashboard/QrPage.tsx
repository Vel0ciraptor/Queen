import React, { useEffect, useState } from 'react';
import { ScanBarcode, Search, Printer, Package, Settings2 } from 'lucide-react';
import api from '../../lib/api';
import { EmptyState, PageLoader } from '../../components/ui/Feedback';
import { toast } from '../../components/ui/Toast';
import { getApiErrorMessage } from '../../lib/errors';
import { currency } from '../../lib/format';
import { ProductLabel } from '../../components/ProductLabel';
import { useLabelPrefs, MediaType } from '../../store/labelPrefsStore';
import { printLabels } from '../../lib/printLabels';

interface LabelProduct {
  id: string;
  sku: string;
  name: string;
  salePrice: string | number;
  category?: { name: string };
  material?: { name: string } | null;
  color?: { name: string } | null;
  inventory?: { stock: number };
}

const MEDIA_OPTIONS: { value: MediaType; label: string; hint: string }[] = [
  { value: 'continuous', label: 'Rollo continuo', hint: 'Con margen para cortar a mano' },
  { value: 'linerless', label: 'Linerless', hint: 'Pegable directo, medida exacta' },
];

export const QrPage: React.FC = () => {
  const [products, setProducts] = useState<LabelProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const {
    mediaType,
    labelWidthMm,
    labelHeightMm,
    setMediaType,
    setLabelWidthMm,
    setLabelHeightMm,
  } = useLabelPrefs();

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/products', { params: { limit: 200, status: 'ACTIVE' } });
      setProducts(res.data.items ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudieron cargar los productos'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProducts();
  }, []);

  const printOne = (product: LabelProduct) => {
    printLabels({
      items: [product],
      mediaType,
      widthMm: labelWidthMm,
      heightMm: heightValid ? heightNum : 50,
    });
  };

  const printAll = () => {
    if (filtered.length === 0) return;
    printLabels({
      items: filtered,
      mediaType,
      widthMm: labelWidthMm,
      heightMm: heightValid ? heightNum : 50,
    });
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()),
  );

  const heightNum = Number(labelHeightMm);
  const heightValid = !Number.isNaN(heightNum) && heightNum >= 20 && heightNum <= 200;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-bold text-white">Etiquetas de Productos</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Código de barras (Code128) generado desde el SKU. Escanéalo con la cámara para abrir el producto.
          </p>
        </div>
        <button onClick={printAll} disabled={filtered.length === 0} className="btn-gold text-sm px-4 py-2.5">
          <Printer className="w-4 h-4" />
          Imprimir listado ({filtered.length})
        </button>
      </div>

      {/* Panel de ajustes de etiqueta */}
      <div className="glass-card rounded-2xl border border-white/[0.06] p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-[#E0A96D]" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Ajustes de etiqueta
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Tipo de medio */}
          <div className="sm:col-span-1">
            <label className="block text-[11px] text-slate-400 mb-1.5">Tipo de medio</label>
            <div className="flex flex-col gap-1.5">
              {MEDIA_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMediaType(opt.value)}
                  className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                    mediaType === opt.value
                      ? 'border-[#E0A96D] bg-[#E0A96D]/10 text-white'
                      : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20'
                  }`}
                >
                  <span className="block font-semibold">{opt.label}</span>
                  <span className="block text-[10px] opacity-70 mt-0.5">{opt.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dimensiones */}
          <div className="sm:col-span-2 grid grid-cols-2 gap-3 items-start">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1.5">Ancho (mm)</label>
              <input
                type="number"
                min={20}
                max={80}
                value={labelWidthMm}
                onChange={(e) => setLabelWidthMm(Number(e.target.value))}
                className="input-luxury text-sm font-mono"
              />
              <p className="text-[10px] text-slate-500 mt-1">Máx. 80 mm (SPP-R310)</p>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1.5">Alto (mm)</label>
              <input
                type="number"
                min={20}
                max={200}
                value={labelHeightMm}
                onChange={(e) => setLabelHeightMm(Number(e.target.value))}
                className="input-luxury text-sm font-mono"
              />
              <p className="text-[10px] text-slate-500 mt-1">Entre 20 y 200 mm</p>
            </div>
            <div className="col-span-2 text-[11px] text-slate-500">
              Medio actual: <span className="text-[#E0A96D] font-semibold">
                {mediaType === 'linerless' ? 'Linerless' : 'Rollo continuo'}
              </span>{' '}
              · {labelWidthMm}×{labelHeightMm} mm
            </div>
          </div>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto por nombre o SKU…"
          className="input-luxury text-sm pl-9"
        />
      </div>

      {loading ? (
        <PageLoader label="Cargando productos…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ScanBarcode className="w-6 h-6" />}
          title="Sin productos"
          description="Crea productos para poder generar sus etiquetas de código de barras."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((product) => (
            <div
              key={product.id}
              className="glass-card rounded-2xl border border-white/[0.06] overflow-hidden flex flex-col"
            >
              <div className="p-4 flex items-start justify-between gap-2 border-b border-white/[0.06]">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{product.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{product.sku}</div>
                </div>
                <span className="badge badge-neutral shrink-0">
                  {product.inventory?.stock ?? 0} uds
                </span>
              </div>

              <div className="p-4 flex-1 flex flex-col items-center justify-center gap-2 bg-white/[0.02]">
                {/* Vista previa escalada de la etiqueta */}
                <div className="w-full flex justify-center overflow-hidden">
                  <div className="scale-[0.55] origin-center">
                    <ProductLabel
                      data={product}
                      mediaType={mediaType}
                      widthMm={labelWidthMm}
                      heightMm={heightValid ? heightNum : 50}
                    />
                  </div>
                </div>
                <div className="text-center mt-1">
                  <div className="text-[11px] text-slate-500">
                    {[product.category?.name, product.material?.name, product.color?.name]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                  <div className="text-sm font-bold text-white">{currency(product.salePrice)}</div>
                </div>
              </div>

              <div className="p-3 border-t border-white/[0.06]">
                <button
                  onClick={() => printOne(product)}
                  disabled={!heightValid}
                  className="btn-gold w-full text-[11px] px-2 py-1.5 justify-center disabled:opacity-40"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="glass-card rounded-2xl border border-white/[0.06] p-5 flex items-start gap-3">
        <Package className="w-5 h-5 text-[#E0A96D] shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400 leading-relaxed">
          <strong className="text-slate-200">Cómo usarlo:</strong> elige el tipo de medio (rollo continuo o
          linerless) y el tamaño, ajusta la etiqueta y pulsa <em>Imprimir</em>. En el celular, selecciona la
          app <strong>mPrint</strong> → impresora <strong>Bixolon SPP-R310</strong> por Bluetooth. Desde el
          POS, pulsa <em>Escanear código</em> y apunta la cámara al código de barras: el producto se carga
          directo en la venta.
        </div>
      </div>
    </div>
  );
};
