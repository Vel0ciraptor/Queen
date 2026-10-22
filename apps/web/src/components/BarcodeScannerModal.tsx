import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, ScanBarcode, Search, CheckCircle, AlertCircle, CameraOff } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import api from '../lib/api';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductFound: (product: any) => void;
}

const READER_ID = 'qs-barcode-reader';

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onProductFound,
}) => {
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foundProduct, setFoundProduct] = useState<any | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handlingRef = useRef(false);

  const handleCode = useCallback(async (code: string) => {
    if (handlingRef.current) return;
    handlingRef.current = true;
    setLoading(true);
    setError(null);
    setFoundProduct(null);
    try {
      const res = await api.get(`/qr/scan/${encodeURIComponent(code.trim())}`);
      setFoundProduct(res.data.product);
    } catch {
      setError('No se encontró ningún producto con este código');
      handlingRef.current = false;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectProduct = () => {
    if (foundProduct) {
      onProductFound(foundProduct);
      onClose();
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    void handleCode(manualCode.trim());
  };

  // Ciclo de vida de la cámara: arranca al abrir, detiene al cerrar.
  useEffect(() => {
    if (!isOpen) {
      scannerRef.current = null;
      handlingRef.current = false;
      setFoundProduct(null);
      setError(null);
      setCameraError(null);
      return;
    }

    let cancelled = false;

    const start = async () => {
      try {
        const scanner = new Html5Qrcode(READER_ID, {
          verbose: false,
          formatsToSupport: [Html5QrcodeSupportedFormats.CODE_128],
        });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 160 } },
          (decodedText) => {
            if (!cancelled) void handleCode(decodedText);
          },
          () => {
            /* errores de frame se ignoran */
          },
        );
        if (cancelled) {
          await scanner.stop().catch(() => undefined);
          scanner.clear();
          scannerRef.current = null;
        }
      } catch {
        if (!cancelled) {
          setCameraError('No se pudo acceder a la cámara. Usa el código de barras o el SKU manualmente.');
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        s.stop()
          .catch(() => undefined)
          .finally(() => s.clear());
      }
    };
  }, [isOpen, handleCode]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content p-6 max-w-md">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <ScanBarcode className="w-5 h-5 text-[#E0A96D]" />
            <h3 className="font-serif text-lg font-bold text-white">Escanear Código de Barras</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visor de cámara */}
        <div className="relative rounded-2xl bg-black/60 border border-white/10 overflow-hidden mb-4">
          {cameraError ? (
            <div className="aspect-video flex flex-col items-center justify-center gap-2 p-6 text-center">
              <CameraOff className="w-10 h-10 text-slate-500" />
              <p className="text-xs text-slate-400 max-w-[16rem]">{cameraError}</p>
            </div>
          ) : (
            <div id={READER_ID} className="aspect-video [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />
          )}
        </div>

        {/* Entrada manual (respaldo) */}
        <form onSubmit={handleManualSearch} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Escribe el código de barras o SKU"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="input-luxury text-sm font-mono flex-1"
              autoFocus
            />
            <button type="submit" disabled={loading} className="btn-gold px-4 py-2 text-sm">
              <Search className="w-4 h-4" />
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {foundProduct && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
            <div className="flex items-center gap-3">
              <img
                src={foundProduct.images?.[0]?.url || 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=200'}
                alt={foundProduct.name}
                className="w-14 h-18 object-cover rounded-lg bg-black"
              />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                  {foundProduct.sku}
                </span>
                <h4 className="text-sm font-bold text-white truncate mt-0.5">{foundProduct.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-bold text-[#E0A96D]">
                    ${Number(foundProduct.salePrice).toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400">• Stock: {foundProduct.inventory?.stock ?? '0'}</span>
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
