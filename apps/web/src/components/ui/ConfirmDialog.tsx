import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) => (
  <Modal isOpen={isOpen} onClose={onCancel} maxWidth="max-w-md">
    <div className="text-center space-y-4 py-2">
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto border ${
          danger
            ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
            : 'bg-[#E0A96D]/15 border-[#E0A96D]/30 text-[#E0A96D]'
        }`}
      >
        <AlertTriangle className="w-6 h-6" />
      </div>
      <div>
        <h3 className="font-serif text-lg font-bold text-white">{title}</h3>
        <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{message}</p>
      </div>
      <div className="flex gap-3 pt-1">
        <button onClick={onCancel} className="btn-secondary flex-1 text-sm py-2.5" disabled={loading}>
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`flex-1 text-sm py-2.5 font-semibold rounded-lg border cursor-pointer transition-all disabled:opacity-60 ${
            danger
              ? 'bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/40 text-rose-300'
              : 'bg-[#E0A96D] hover:bg-[#F7D794] border-transparent text-[#12121C]'
          }`}
        >
          {loading ? 'Procesando…' : confirmLabel}
        </button>
      </div>
    </div>
  </Modal>
);
