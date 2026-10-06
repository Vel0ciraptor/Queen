import React from 'react';

export const Spinner: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <span
    className={`${className} inline-block rounded-full border-2 border-white/20 border-t-[#E0A96D] animate-spin`}
    role="status"
    aria-label="Cargando"
  />
);

export const PageLoader: React.FC<{ label?: string }> = ({ label = 'Cargando…' }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500 text-sm">
    <Spinner className="w-7 h-7" />
    <span>{label}</span>
  </div>
);

export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-14 px-4">
    <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-4 text-slate-500">
      {icon}
    </div>
    <h3 className="font-serif text-lg text-slate-200 font-semibold mb-1">{title}</h3>
    {description && <p className="text-xs text-slate-500 max-w-sm">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
