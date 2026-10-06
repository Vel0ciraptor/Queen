import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Wallet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import api from '../../lib/api';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, PageLoader } from '../../components/ui/Feedback';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/Toast';
import { getApiErrorMessage } from '../../lib/errors';
import { currency, shortDate } from '../../lib/format';

const monthNames = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

export const FinancePage: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState({
    type: 'EXPENSE',
    amount: '',
    description: '',
    category: '',
    reference: '',
    date: '',
  });
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, t, tr] = await Promise.all([
        api.get('/finance/summary'),
        api.get('/finance/monthly-trend'),
        api.get('/finance/transactions', {
          params: { page, limit: 20, type: typeFilter || undefined },
        }),
      ]);
      setSummary(s.data);
      setTrend(safeMonths(t.data));
      setTransactions(tr.data.items ?? []);
      setMeta(tr.data.meta ?? { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudieron cargar las finanzas'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, typeFilter]);

  const safeMonths = (data: any): any[] => {
    const months = data?.months ?? [];
    return months.map((m: any) => ({
      ...m,
      monthName: monthNames[(m.month ?? 1) - 1] ?? m.monthName,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/finance/transactions', {
        type: form.type,
        amount: Number(form.amount),
        description: form.description,
        category: form.category || undefined,
        reference: form.reference || undefined,
        date: form.date ? new Date(form.date).toISOString() : undefined,
      });
      toast.success(form.type === 'INCOME' ? 'Ingreso registrado' : 'Egreso registrado');
      setIsFormOpen(false);
      setForm({ type: 'EXPENSE', amount: '', description: '', category: '', reference: '', date: '' });
      await loadAll();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo registrar la transacción'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/finance/transactions/${toDelete.id}`);
      toast.success('Transacción eliminada');
      setToDelete(null);
      await loadAll();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo eliminar la transacción'));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <PageLoader label="Cargando finanzas…" />;

  const cards = [
    {
      label: 'Ingresos',
      value: currency(summary?.totalIncome ?? 0),
      icon: TrendingUp,
      tone: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/25',
    },
    {
      label: 'Egresos',
      value: currency(summary?.totalExpense ?? 0),
      icon: TrendingDown,
      tone: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/25',
    },
    {
      label: 'Beneficio neto',
      value: currency(summary?.netProfit ?? 0),
      icon: Wallet,
      tone: 'text-[#E0A96D]',
      bg: 'bg-[#E0A96D]/10 border-[#E0A96D]/25',
    },
    {
      label: 'Margen',
      value: `${summary?.marginPercentage ?? 0}%`,
      icon: DollarSign,
      tone: 'text-white',
      bg: 'bg-white/[0.04] border-white/10',
    },
  ];

  const categories = summary?.categoryBreakdown
    ? Object.entries(summary.categoryBreakdown as Record<string, { income: number; expense: number }>)
    : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-bold text-white">Finanzas & Flujo de Caja</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {summary?.transactionCount ?? 0} transacciones registradas
          </p>
        </div>
        <button onClick={() => setIsFormOpen(true)} className="btn-gold text-sm px-4 py-2.5">
          <Plus className="w-4 h-4" /> Nueva transacción
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`glass-card rounded-2xl p-4 border flex items-start justify-between gap-2 ${c.bg}`}
          >
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                {c.label}
              </div>
              <div className={`text-xl sm:text-2xl font-bold font-serif mt-1 truncate ${c.tone}`}>
                {c.value}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0">
              <c.icon className={`w-4 h-4 ${c.tone}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Monthly trend */}
        <div className="lg:col-span-2 glass-card rounded-2xl border border-white/[0.06] p-5">
          <h3 className="text-sm font-serif font-bold text-white mb-4">Tendencia mensual</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="monthName" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{
                    background: '#14141F',
                    border: '1px solid rgba(224,169,109,0.3)',
                    borderRadius: 12,
                    color: '#F8FAFC',
                    fontSize: 12,
                  }}
                  formatter={(value: any, name: any) => [
                    currency(value),
                    name === 'income' ? 'Ingresos' : 'Egresos',
                  ]}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: '#94A3B8', fontSize: 12 }}>
                      {value === 'income' ? 'Ingresos' : 'Egresos'}
                    </span>
                  )}
                />
                <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#F43F5E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="glass-card rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h3 className="text-sm font-serif font-bold text-white">Por categoría</h3>
            <p className="text-[11px] text-slate-500">Agrupación de ingresos y egresos</p>
          </div>
          {categories.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">Sin movimientos aún.</div>
          ) : (
            <div className="divide-y divide-white/[0.05] max-h-72 overflow-y-auto">
              {categories.map(([name, value]) => (
                <div key={name} className="px-5 py-3">
                  <div className="text-sm text-white truncate">{name}</div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-emerald-400">+{currency(value.income)}</span>
                    <span className="text-rose-400">-{currency(value.expense)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transactions */}
      <div className="glass-card rounded-2xl border border-white/[0.06] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => {
              setPage(1);
              setTypeFilter(e.target.value);
            }}
            className="input-luxury text-sm sm:max-w-[220px]"
          >
            <option value="">Todos los tipos</option>
            <option value="INCOME">Solo ingresos</option>
            <option value="EXPENSE">Solo egresos</option>
          </select>
          <span className="text-xs text-slate-500 sm:ml-auto">
            {meta.total} transacciones
          </span>
        </div>

        {transactions.length === 0 ? (
          <EmptyState
            icon={<DollarSign className="w-6 h-6" />}
            title="Sin transacciones"
            description="Registra ingresos y egresos manuales para completar tu flujo de caja."
            action={
              <button onClick={() => setIsFormOpen(true)} className="btn-gold text-sm px-4 py-2">
                <Plus className="w-4 h-4" /> Nueva transacción
              </button>
            }
          />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="table-luxury">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Descripción</th>
                    <th>Categoría</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id}>
                      <td className="text-xs text-slate-400 whitespace-nowrap">{shortDate(t.date)}</td>
                      <td className="text-sm text-white">{t.description}</td>
                      <td className="text-xs text-slate-400">{t.category || '—'}</td>
                      <td>
                        <span className={`badge ${t.type === 'INCOME' ? 'badge-success' : 'badge-danger'}`}>
                          {t.type === 'INCOME' ? 'Ingreso' : 'Egreso'}
                        </span>
                      </td>
                      <td
                        className={`text-sm font-bold ${
                          t.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {t.type === 'INCOME' ? '+' : '-'}
                        {currency(t.amount)}
                      </td>
                      <td>
                        <div className="flex justify-end">
                          <button
                            onClick={() => setToDelete(t)}
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-white/[0.05]">
              {transactions.map((t) => (
                <div key={t.id} className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{t.description}</div>
                    <div className="text-[11px] text-slate-500">
                      {shortDate(t.date)} · {t.category || 'Sin categoría'}
                    </div>
                  </div>
                  <span
                    className={`text-sm font-bold ${
                      t.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {t.type === 'INCOME' ? '+' : '-'}
                    {currency(t.amount)}
                  </span>
                  <button onClick={() => setToDelete(t)} className="p-2 text-slate-500 hover:text-rose-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
              <span className="text-xs text-slate-500">
                Página {meta.page} de {Math.max(meta.totalPages, 1)}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page >= meta.totalPages}
                  className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
                >
                  Siguiente <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* New transaction modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Nueva transacción"
        icon={<DollarSign className="w-5 h-5 text-[#E0A96D]" />}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Tipo *</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="input-luxury text-sm"
              >
                <option value="EXPENSE">Egreso</option>
                <option value="INCOME">Ingreso</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Monto *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                required
                className="input-luxury text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Descripción *</label>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              required
              placeholder="Ej. Pago de alquiler del local"
              className="input-luxury text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Categoría</label>
              <input
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="Ej. Alquiler"
                className="input-luxury text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Fecha</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="input-luxury text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Referencia</label>
            <input
              value={form.reference}
              onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
              placeholder="Ej. REC-0099"
              className="input-luxury text-sm"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="btn-secondary flex-1 text-sm py-2.5"
              disabled={saving}
            >
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-gold flex-1 text-sm py-2.5">
              {saving ? 'Guardando…' : 'Registrar'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!toDelete}
        title="Eliminar transacción"
        message="Esta acción elimina el registro del libro de ingresos/egresos y no se puede deshacer."
        confirmLabel="Eliminar"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};
