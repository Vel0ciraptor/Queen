import React, { useEffect, useState } from 'react';
import { QrCode, Search, Printer, RefreshCw, Package, Download } from 'lucide-react';
import api from '../../lib/api';
import { EmptyState, PageLoader, Spinner } from '../../components/ui/Feedback';
import { toast } from '../../components/ui/Toast';
import { getApiErrorMessage } from '../../lib/errors';
import { currency } from '../../lib/format';

interface QrProduct {
  id: string;
  sku: string;
  name: string;
  salePrice: string | number;
  category?: { name: string };
  inventory?: { stock: number };
  qrCode?: { code: string; imageUrl?: string };
}

export const QrPage: React.FC = () => {
  const [products, setProducts] = useState<QrProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [generating, setGenerating] = useState<string | null>(null);
  const [batch, setBatch] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/products', { params: { limit: 100, status: 'ACTIVE' } });
      const items: QrProduct[] = res.data.items ?? [];
      // precarga los QR ya generados
      await Promise.all(
        items.map(async (p) => {
          if (p.qrCode?.imageUrl) return;
          try {
            const qr = await api.post(`/qr/generate/${p.id}`);
            p.qrCode = { code: qr.data.code, imageUrl: qr.data.qrDataUrl };
          } catch {
            /* se generan bajo demanda */
          }
        }),
      );
      setProducts(items);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudieron cargar los productos'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProducts();
  }, []);

  const generateOne = async (product: QrProduct) => {
    setGenerating(product.id);
    try {
      const res = await api.post(`/qr/generate/${product.id}`);
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id
            ? { ...p, qrCode: { code: res.data.code, imageUrl: res.data.qrDataUrl } }
            : p,
        ),
      );
      toast.success('QR generado correctamente');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo generar el QR'));
    } finally {
      setGenerating(null);
    }
  };

  const generateAll = async () => {
    setBatch(true);
    try {
      const res = await api.post('/qr/batch-generate');
      const map = new Map<string, { code: string; imageUrl: string }>(
        (res.data ?? []).map((r: any) => [r.productId, { code: r.code, imageUrl: r.qrDataUrl }]),
      );
      setProducts((prev) =>
        prev.map((p) => (map.has(p.id) ? { ...p, qrCode: map.get(p.id)! } : p)),
      );
      toast.success(`Se generaron ${res.data?.length ?? 0} códigos QR`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudieron generar los QR'));
    } finally {
      setBatch(false);
    }
  };

  const printLabel = (product: QrProduct) => {
    if (!product.qrCode?.imageUrl) return;
    const win = window.open('', '_blank', 'width=420,height=620');
    if (!win) {
      toast.error('Permite las ventanas emergentes para imprimir');
      return;
    }
    win.document.write(`
      <html>
        <head>
          <title>Etiqueta ${product.sku}</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 24px; }
            .label { border: 1px dashed #999; border-radius: 12px; padding: 18px; display: inline-block; width: 260px; }
            .brand { font-weight: bold; letter-spacing: 2px; font-size: 13px; margin-bottom: 6px; }
            .name { font-size: 14px; margin: 8px 0 2px; }
            .sku { font-size: 12px; color: #555; }
            .price { font-size: 18px; font-weight: bold; margin-top: 8px; }
            img { width: 170px; height: 170px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="label">
            <div class="brand">QUEEN STYLE</div>
            <img src="${product.qrCode!.imageUrl}" alt="QR" />
            <div class="name">${product.name}</div>
            <div class="sku">${product.sku}</div>
            <div class="price">$${Number(product.salePrice).toFixed(2)}</div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
  };

  const downloadQr = (product: QrProduct) => {
    if (!product.qrCode?.imageUrl) return;
    const a = document.createElement('a');
    a.href = product.qrCode.imageUrl;
    a.download = `QR-${product.sku}.png`;
    a.click();
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-bold text-white">Etiquetas & Códigos QR</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            El código QR contiene el SKU: escanéalo con la cámara para abrir el producto al instante.
          </p>
        </div>
        <button onClick={generateAll} disabled={batch} className="btn-gold text-sm px-4 py-2.5">
          {batch ? <Spinner className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
          {batch ? 'Generando…' : 'Generar todos'}
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto…"
          className="input-luxury text-sm pl-9"
        />
      </div>

      {loading ? (
        <PageLoader label="Generando códigos QR…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<QrCode className="w-6 h-6" />}
          title="Sin productos"
          description="Crea productos para poder generar sus etiquetas QR."
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
                {product.qrCode?.imageUrl ? (
                  <img
                    src={product.qrCode.imageUrl}
                    alt={`QR ${product.sku}`}
                    className="w-32 h-32 rounded-lg bg-white p-1"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-lg border-2 border-dashed border-white/15 flex flex-col items-center justify-center gap-2 text-slate-500">
                    <QrCode className="w-8 h-8" />
                    <span className="text-[10px]">Sin generar</span>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-[11px] text-slate-500">{product.category?.name || ''}</div>
                  <div className="text-sm font-bold text-white">{currency(product.salePrice)}</div>
                </div>
              </div>

              <div className="p-3 border-t border-white/[0.06] grid grid-cols-2 gap-2">
                <button
                  onClick={() => generateOne(product)}
                  disabled={generating === product.id}
                  className="btn-secondary text-[11px] px-2 py-1.5 justify-center"
                >
                  {generating === product.id ? (
                    <Spinner className="w-3.5 h-3.5" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  Regenerar
                </button>
                <button
                  onClick={() => printLabel(product)}
                  disabled={!product.qrCode?.imageUrl}
                  className="btn-gold text-[11px] px-2 py-1.5 justify-center disabled:opacity-40"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir
                </button>
                <button
                  onClick={() => downloadQr(product)}
                  disabled={!product.qrCode?.imageUrl}
                  className="btn-secondary text-[11px] px-2 py-1.5 justify-center col-span-2 disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5" /> Descargar PNG
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="glass-card rounded-2xl border border-white/[0.06] p-5 flex items-start gap-3">
        <Package className="w-5 h-5 text-[#E0A96D] shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400 leading-relaxed">
          <strong className="text-slate-200">Cómo usarlo:</strong> imprime la etiqueta y pégala en la
          prenda o en su perchero. Desde el POS, pulsa <em>Escanear QR</em> y apunta la cámara del
          celular (o escribe el SKU manualmente): el producto se carga directamente en la venta.
        </div>
      </div>
    </div>
  );
};
