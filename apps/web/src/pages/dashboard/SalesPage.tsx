import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShoppingCart, ListOrdered } from 'lucide-react';
import { PosPage } from './PosPage';
import { OrdersPage } from './OrdersPage';
import { useAuthStore } from '../../store/authStore';

type SalesTab = 'pos' | 'orders';

/**
 * Pestaña única de Ventas: venta directa (POS) + pedidos web.
 * La promotora (tienda física) solo ve la venta directa;
 * el rol ADMIN gestiona también los pedidos web.
 */
export const SalesPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<SalesTab>(
    isAdmin && searchParams.get('tab') === 'orders' ? 'orders' : 'pos',
  );

  const changeTab = (next: SalesTab) => {
    setTab(next);
    if (next === 'orders') {
      setSearchParams({ tab: 'orders' }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const effectiveTab: SalesTab = isAdmin ? tab : 'pos';

  return (
    <div className="space-y-5">
      {isAdmin ? (
        <div className="inline-flex p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] self-start">
          {(
            [
              { key: 'pos', label: 'Venta directa (POS)', icon: ShoppingCart },
              { key: 'orders', label: 'Pedidos web', icon: ListOrdered },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => changeTab(t.key)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                effectiveTab === t.key
                  ? 'bg-[#E0A96D] text-[#12121C]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>
      ) : (
        <div>
          <h1 className="font-serif text-xl font-bold text-white">Venta directa (POS)</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registra aquí las ventas de la tienda física.
          </p>
        </div>
      )}

      {effectiveTab === 'orders' ? <OrdersPage embedded /> : <PosPage />}
    </div>
  );
};
