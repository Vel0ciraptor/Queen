import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Crown, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#E0A96D]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#FF6B81]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="text-center relative z-10 max-w-md">
        <Link to="/" className="inline-flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#E0A96D] to-[#C48B4B] p-[1.5px] shadow-xl shadow-[#E0A96D]/20">
            <div className="w-full h-full bg-[#12121C] rounded-[14px] flex items-center justify-center">
              <Crown className="w-6 h-6 text-[#E0A96D]" />
            </div>
          </div>
          <span className="font-serif text-2xl font-bold tracking-wider gold-text uppercase">
            Queen Style
          </span>
        </Link>

        <h1 className="text-7xl font-serif font-bold text-white mb-3">404</h1>
        <p className="text-slate-400 mb-8">
          La página que buscas no existe o fue movida de lugar.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="btn-gold px-6 py-3 text-sm">
            Ir al Catálogo
          </Link>
          <button onClick={() => navigate(-1)} className="btn-secondary px-6 py-3 text-sm">
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
        </div>
      </div>
    </div>
  );
};
