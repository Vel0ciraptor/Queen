import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Award,
  CreditCard,
  Users,
  Boxes,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import api from '../../lib/api';
import { PageLoader } from '../../components/ui/Feedback';
import { toast } from '../../components/ui/Toast';
import { getApiErrorMessage } from '../../lib/errors';
import { currency, initials } from '../../lib/format';

const PIE_COLORS = ['#E0A96D', '#10B981', '#F43F5E', '#38BDF8', '#A78BFA', '#FBBF24'];

const PAYMENT_LABEL: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  QR: 'QR',
  TRANSFERENCIA: 'Transferencia',
  TARJETA: 'Tarjeta',
  OTRO: 'Otro',
};

export const ReportsPage: React.FC = () => {
  const [kpis, setKpis] = useState<any>(null);
  const [top, setTop] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [promoters, setPromoters] = useState<any[]>([]);
  const [valuation, setValuation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [k, t, p, u, v] = await Promise.all([
        api.get('/reports/kpis'),
        api.get('/reports/top-products', { params: { limit: 10 } }),
        api.get('/reports/payment-methods'),
        api.get('/reports/promoters'),
        api.get('/reports/inventory-valuation'),
      ]);
      setKpis(k.data);
      setTop(t.data ?? []);
      setPayments(p.data ?? []);
      setPromoters(u.data ?? []);
      setValuation(v.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudieron cargar los reportes'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) return <PageLoader label="Generando reportes…" />;

  const topData = top.map((t) => ({
    name: t.product?.name?.length > 18 ? `${t.product.name.slice(0, 18)}…` : t.product?.name || '—',
    unidades: t.totalQuantitySold,
    ingresos: t.totalRevenue,
  }));

  const pieData = payments.map((p) => ({
    name: PAYMENT_LABEL[p.method] || p.method,
    value: p.totalAmount,
  }));

  const stats = [
    {
      label: 'Ventas de hoy',
      value: currency(kpis?.todaySalesAmount ?? 0),
      sub: `${kpis?.todaySalesCount ?? 0} transacciones`,
      icon: TrendingUp,
      tone: 'text-emerald-400',
    },
    {
      label: 'Ventas del mes',
      value: currency(kpis?.monthSalesAmount ?? 0),
      sub: `${kpis?.monthSalesCount ?? 0} transacciones`,
      icon: BarChart3,
      tone: 'text-[#E0A96D]',
    },
    {
      label: 'Stock bajo / agotado',
      value: `${kpis?.lowStockCount ?? 0} / ${kpis?.outOfStockCount ?? 0}`,
      sub: 'productos con alerta',
      icon: Boxes,
      tone: 'text-amber-400',
    },
    {
      label: 'Clientes registrados',
      value: String(kpis?.totalCustomers ?? 0),
      sub: `${kpis?.pendingOrdersCount ?? 0} pedidos pendientes`,
      icon: Users,
      tone: 'text-sky-400',
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-xl font-bold text-white">Reportes & Analíticas</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Inteligencia de ventas, métodos de pago, equipo e inventario.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="glass-card rounded-2xl p-4 border border-white/[0.06] flex items-start justify-between gap-2"
          >
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                {s.label}
              </div>
              <div className={`text-xl sm:text-2xl font-bold font-serif mt-1 truncate ${s.tone}`}>
                {s.value}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">{s.sub}</div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0">
              <s.icon className={`w-4 h-4 ${s.tone}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Top products */}
      <div className="glass-card rounded-2xl border border-white/[0.06] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-4 h-4 text-[#E0A96D]" />
          <h3 className="text-sm font-serif font-bold text-white">Productos más vendidos</h3>
        </div>
        {topData.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">Aún no hay ventas registradas.</div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topData} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{
                    background: '#14141F',
                    border: '1px solid rgba(224,169,109,0.3)',
                    borderRadius: 12,
                    color: '#F8FAFC',
                    fontSize: 12,
                  }}
                  formatter={(value: any, name: any) =>
                    name === 'ingresos' ? [currency(value), 'Ingresos'] : [value, 'Unidades']
                  }
                />
                <Bar dataKey="unidades" fill="#38BDF8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Payment methods */}
        <div className="glass-card rounded-2xl border border-white/[0.06] p-5">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-4 h-4 text-[#E0A96D]" />
            <h3 className="text-sm font-serif font-bold text-white">Ventas por método de pago</h3>
          </div>
          {pieData.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">Sin datos.</div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#14141F',
                      border: '1px solid rgba(224,169,109,0.3)',
                      borderRadius: 12,
                      color: '#F8FAFC',
                      fontSize: 12,
                    }}
                    formatter={(value: any) => currency(value)}
                  />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: '#94A3B8', fontSize: 12 }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="mt-3 space-y-1.5">
            {payments.map((p) => (
              <div key={p.method} className="flex justify-between text-xs">
                <span className="text-slate-400">
                  {PAYMENT_LABEL[p.method] || p.method} · {p.transactionCount} ventas
                </span>
                <span className="text-white font-semibold">{currency(p.totalAmount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Promoters */}
        <div className="glass-card rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#E0A96D]" />
            <h3 className="text-sm font-serif font-bold text-white">Desempeño por promotora</h3>
          </div>
          <div className="divide-y divide-white/[0.05] max-h-96 overflow-y-auto">
            {promoters.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">Sin usuarios activos.</div>
            ) : (
              promoters.map((p) => (
                <div key={p.userId} className="px-5 py-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#E0A96D]/15 border border-[#E0A96D]/30 text-[#E0A96D] flex items-center justify-center text-xs font-bold shrink-0">
                    {initials(p.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{p.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {p.salesCount} ventas · {p.role === 'ADMIN' ? 'Admin' : 'Promotora'}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-[#E0A96D] shrink-0">
                    {currency(p.totalSalesAmount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Inventory valuation */}
      <div className="glass-card rounded-2xl border border-white/[0.06] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Boxes className="w-4 h-4 text-[#E0A96D]" />
          <h3 className="text-sm font-serif font-bold text-white">Valoración de inventario</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Productos activos', value: valuation?.totalActiveProducts ?? 0, money: false },
            { label: 'Unidades en stock', value: valuation?.totalUnitsInStock ?? 0, money: false },
            { label: 'Valor a costo', value: currency(valuation?.totalCostValuation ?? 0), money: true },
            { label: 'Valor a venta', value: currency(valuation?.totalSaleValuation ?? 0), money: true },
            {
              label: 'Potencial de ganancia',
              value: currency(valuation?.estimatedPotentialProfit ?? 0),
              money: true,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.07] text-center"
            >
              <div className="text-lg sm:text-xl font-bold text-white font-serif">
                {item.value}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-1">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
