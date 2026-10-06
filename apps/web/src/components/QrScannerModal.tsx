import React, { useState } from 'react';
import { X, QrCode, Search, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../lib/api';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductFound: (product: any) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onProductFound,
}) => {
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foundProduct, setFoundProduct] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    setLoading(true);
    setError(null);
    setFoundProduct(null);

    try {
      const res = await api.get(`/qr/scan/${encodeURIComponent(manualCode.trim())}`);
      setFoundProduct(res.data.product);
    } catch (err: any) {
      setError('No se encontró ningún producto con este código QR o SKU');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = () => {
    if (foundProduct) {
      onProductFound(foundProduct);
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content p-6 max-w-md">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#E0A96D]" />
            <h3 className="font-serif text-lg font-bold text-white">
              Escanear Código QR / SKU
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visual Scanner Simulation Frame */}
        <div className="relative aspect-video rounded-2xl bg-black/60 border border-white/10 overflow-hidden flex flex-col items-center justify-center p-6 mb-4">
          <div className="w-36 h-36 border-2 border-dashed border-[#E0A96D]/80 rounded-xl relative flex items-center justify-center">
            {/* Corner Markers */}
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-[#E0A96D]" />
            <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-[#E0A96D]" />
            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-[#E0A96D]" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[#E0A96D]" />

            {/* Laser scanning beam animation */}
            <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#E0A96D] to-transparent shadow-[0_0_8px_#E0A96D] animate-bounce" />

            <QrCode className="w-16 h-16 text-white/20" />
          </div>
          <p className="text-[11px] text-slate-400 mt-3 text-center">
            Apunta la cámara o ingresa el código/SKU manualmente
          </p>
        </div>

        {/* Manual SKU input */}
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ej. QS-DRS-001 o código de barras"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="input-luxury text-sm font-mono flex-1"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading}
              className="btn-gold px-4 py-2 text-sm"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Error message */}
        {error && (
          <div className="mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Product found card */}
        {foundProduct && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
            <div className="flex items-center gap-3">
              <img
                src={
                  foundProduct.images?.[0]?.url ||
                  'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=200'
                }
                alt={foundProduct.name}
                className="w-14 h-18 object-cover rounded-lg bg-black"
              />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                  {foundProduct.sku}
                </span>
                <h4 className="text-sm font-bold text-white truncate mt-0.5">
                  {foundProduct.name}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-bold text-[#E0A96D]">
                    ${Number(foundProduct.salePrice).toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400">
                    • Stock: {foundProduct.inventory?.stock ?? '0'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSelectProduct}
              className="w-full btn-gold py-2 text-xs flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Seleccionar / Cargar en Venta</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
