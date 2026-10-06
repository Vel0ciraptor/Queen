import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  ShoppingCart,
  Package,
  ListOrdered,
  Users,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import api from '../../lib/api';
import { PageLoader } from '../../components/ui/Feedback';
import { getApiErrorMessage } from '../../lib/errors';
import { currency, dateTime } from '../../lib/format';
import { toast } from '../../components/ui/Toast';

export const DashboardHomePage: React.FC = () => {
  const [kpis, setKpis] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [k, a, o, t, m] = await Promise.allSettled([
          api.get('/reports/kpis'),
          api.get('/inventory/alerts'),
          api.get('/orders', { params: { status: 'PENDING', limit: 5 } }),
          api.get('/reports/top-products', { params: { limit: 5 } }),
          api.get('/finance/monthly-trend'),
        ]);

        if (k.status === 'fulfilled') setKpis(k.value.data);
        if (a.status === 'fulfilled') setAlerts(a.value.data ?? []);
        if (o.status === 'fulfilled') setPendingOrders(o.value.data.items ?? []);
        if (t.status === 'fulfilled') setTopProducts(t.value.data ?? []);
        if (m.status === 'fulfilled') setTrend(m.value.data.months ?? []);

        if (k.status === 'rejected') {
          toast.error(getApiErrorMessage(k.reason, 'No se pudieron cargar los KPIs'));
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) return <PageLoader label="Cargando resumen del negocio…" />;

  const stats = [
    {
      label: 'Ventas de hoy',
      value: currency(kpis?.todaySalesAmount ?? 0),
      sub: `${kpis?.todaySalesCount ?? 0} transacciones`,
      icon: TrendingUp,
      tone: 'text-emerald-400',
      to: '/dashboard/reports',
    },
    {
      label: 'Ventas del mes',
      value: currency(kpis?.monthSalesAmount ?? 0),
      sub: `${kpis?.monthSalesCount ?? 0} transacciones`,
      icon: ShoppingCart,
      tone: 'text-[#E0A96D]',
      to: '/dashboard/reports',
    },
    {
      label: 'Stock bajo',
      value: String(kpis?.lowStockCount ?? 0),
      sub: `${kpis?.outOfStockCount ?? 0} agotados`,
      icon: Package,
      tone: 'text-amber-400',
      to: '/dashboard/inventory',
    },
    {
      label: 'Pedidos pendientes',
      value: String(kpis?.pendingOrdersCount ?? 0),
      sub: `${kpis?.totalCustomers ?? 0} clientes`,
      icon: ListOrdered,
      tone: 'text-sky-400',
      to: '/dashboard/orders',
    },
  ];

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Link
            key={s.label}
            to={s.to}
            className="glass-card rounded-2xl p-4 border border-white/[0.06] hover:border-[#E0A96D]/40 transition-all group"
          >
            <div className="flex items-start justify-between gap-2">
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
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Trend chart */}
        <div className="lg:col-span-2 glass-card rounded-2xl border border-white/[0.06] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-serif font-bold text-white">Tendencia financiera</h3>
              <p className="text-[11px] text-slate-500">Ingresos vs. egresos del año en curso</p>
            </div>
            <Link to="/dashboard/finance" className="text-xs text-[#E0A96D] hover:underline flex items-center gap-1">
              Ver finanzas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#F43F5E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="monthName"
                  tick={{ fill: '#64748B', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#14141F',
                    border: '1px solid rgba(224,169,109,0.3)',
                    borderRadius: 12,
                    color: '#F8FAFC',
                    fontSize: 12,
                  }}
                  formatter={(value: any, name: any) => [
                    currency(value as number),
                    name === 'income' ? 'Ingresos' : 'Egresos',
                  ]}
                />
                <Area type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} fill="url(#income)" />
                <Area type="monotone" dataKey="expense" stroke="#F43F5E" strokeWidth={2} fill="url(#expense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top products */}
        <div className="glass-card rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h3 className="text-sm font-serif font-bold text-white">Top 5 productos</h3>
            <p className="text-[11px] text-slate-500">Más vendidos históricamente</p>
          </div>
          {topProducts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">Sin ventas registradas aún.</div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {topProducts.map((t, idx) => (
                <div key={t.product?.id ?? idx} className="px-5 py-3 flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-[#E0A96D]/15 text-[#E0A96D] text-[11px] font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{t.product?.name}</div>
                    <div className="text-[11px] text-slate-500">{t.totalQuantitySold} unidades</div>
                  </div>
                  <span className="text-sm font-bold text-[#E0A96D] shrink-0">
                    {currency(t.totalRevenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Low stock alerts */}
        <div className="glass-card rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-serif font-bold text-white">Alertas de stock</h3>
            </div>
            <Link to="/dashboard/inventory" className="text-xs text-[#E0A96D] hover:underline">
              Ver inventario
            </Link>
          </div>
          {alerts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Ningún producto con stock crítico.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05] max-h-72 overflow-y-auto">
              {alerts.slice(0, 8).map((a) => (
                <div key={a.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{a.product?.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{a.product?.sku}</div>
                  </div>
                  <span className={`badge ${a.stock === 0 ? 'badge-danger' : 'badge-warning'}`}>
                    {a.stock} uds
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending orders */}
        <div className="glass-card rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-serif font-bold text-white">Pedidos por confirmar</h3>
            </div>
            <Link to="/dashboard/orders" className="text-xs text-[#E0A96D] hover:underline">
              Ver pedidos
            </Link>
          </div>
          {pendingOrders.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No hay pedidos pendientes.</div>
          ) : (
            <div className="divide-y divide-white/[0.05] max-h-72 overflow-y-auto">
              {pendingOrders.map((o) => (
                <div key={o.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">
                      {o.customer?.name || 'Cliente'}
                      <span className="text-slate-500"> · #{String(o.id).slice(0, 8)}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">{dateTime(o.createdAt)}</div>
                  </div>
                  <span className="text-sm font-bold text-white">{currency(o.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="glass-card rounded-2xl border border-white/[0.06] p-5">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-[#E0A96D]" />
          <h3 className="text-sm font-serif font-bold text-white">Accesos rápidos</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { to: '/dashboard/pos', label: 'Nueva venta' },
            { to: '/dashboard/products', label: 'Gestionar productos' },
            { to: '/dashboard/qr', label: 'Generar etiquetas QR' },
            { to: '/dashboard/orders', label: 'Ver pedidos web' },
            { to: '/dashboard/reports', label: 'Reportes & KPIs' },
          ].map((q) => (
            <Link
              key={q.to}
              to={q.to}
              className="btn-secondary text-xs px-3.5 py-2 rounded-full"
            >
              {q.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
