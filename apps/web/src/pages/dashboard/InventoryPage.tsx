import React, { useEffect, useState } from 'react';
import {
  Package,
  AlertTriangle,
  PackageX,
  SlidersHorizontal,
  Plus,
  History,
  ChevronLeft,
  ChevronRight,
  Warehouse,
  Store,
  Globe,
  Radio,
  ArrowLeftRight,
  Printer,
  CheckCircle2,
  ClipboardCheck,
} from 'lucide-react';
import api from '../../lib/api';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, PageLoader } from '../../components/ui/Feedback';
import { toast } from '../../components/ui/Toast';
import { getApiErrorMessage } from '../../lib/errors';
import { dateTime } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';
import {
  ALL_STOCK_LOCATIONS,
  STOCK_LOCATION_LABELS,
  STOCK_LOCATION_SHORT,
  StockLocation,
  computeLocationStock,
  movementLocationText,
} from '../../lib/inventory';

interface AlertItem {
  id: string;
  stock: number;
  product: {
    id: string;
    name: string;
    sku: string;
    stockMin?: number;
    salePrice?: string | number;
    category?: { name: string };
    images?: { url: string }[];
  };
}

interface Movement {
  id: string;
  type: string;
  quantity: number;
  fromLocation?: string | null;
  location?: string | null;
  reference?: string;
  notes?: string;
  createdAt: string;
  inventory?: {
    product?: { id?: string; name?: string; sku?: string };
  };
}

const MOVEMENT_TYPES = [
  { value: 'PURCHASE', label: 'Compra / Reposición', sign: '+' },
  { value: 'TRANSFER', label: 'Traspaso a ubicación (Tienda / Online / Live)', sign: '⇄' },
  { value: 'RETURN', label: 'Devolución', sign: '+' },
  { value: 'SALE', label: 'Venta', sign: '-' },
  { value: 'LOSS', label: 'Pérdida', sign: '-' },
  { value: 'DAMAGE', label: 'Daño', sign: '-' },
  { value: 'ADJUSTMENT', label: 'Ajuste (sin cambio)', sign: '=' },
];

const TYPE_BADGES: Record<string, string> = {
  PURCHASE: 'badge-success',
  TRANSFER: 'badge-info',
  RETURN: 'badge-success',
  SALE: 'badge-gold',
  LOSS: 'badge-danger',
  DAMAGE: 'badge-danger',
  ADJUSTMENT: 'badge-neutral',
};

const LOCATION_ICONS: Record<StockLocation, React.ReactNode> = {
  BODEGA: <Warehouse className="w-4 h-4" />,
  TIENDA: <Store className="w-4 h-4" />,
  ONLINE: <Globe className="w-4 h-4" />,
  LIVE: <Radio className="w-4 h-4" />,
};

const FREQUENCY_LABEL: Record<string, string> = {
  ONCE: 'Una vez',
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quincenal (2×/mes)',
};

const COUNT_STATUS_LABEL: Record<string, string> = {
  SCHEDULED: 'Programado',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};

const COUNT_STATUS_BADGE: Record<string, string> = {
  SCHEDULED: 'badge-info',
  IN_PROGRESS: 'badge-warning',
  COMPLETED: 'badge-success',
  CANCELLED: 'badge-neutral',
};

export const InventoryPage: React.FC = () => {
  const role = useAuthStore((s) => s.user?.role);
  const canAdjust = role === 'ADMIN';

  const [tab, setTab] = useState<'overview' | 'history' | 'counts'>('overview');
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [movements, setMovements] = useState<Movement[]>([]);
  const [movementsMeta, setMovementsMeta] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });
  const [movementPage, setMovementPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [loadingMovements, setLoadingMovements] = useState(false);

  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [target, setTarget] = useState<AlertItem | null>(null);

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const [form, setForm] = useState({
    type: 'PURCHASE',
    quantity: '1',
    reference: '',
    notes: '',
    fromLocation: 'BODEGA' as StockLocation,
    location: 'BODEGA' as StockLocation,
  });
  const [adjustForm, setAdjustForm] = useState({ newStock: '', reason: '' });
  const [saving, setSaving] = useState(false);

  // ── Modal por ubicación + ticket de traspaso múltiple ──────────────────────
  const [locationModal, setLocationModal] = useState<StockLocation | null>(null);
  const [byLocation, setByLocation] = useState<any[] | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketTo, setTicketTo] = useState<StockLocation>('TIENDA');
  const [ticketQty, setTicketQty] = useState<Record<string, number>>({});
  const [ticketNotes, setTicketNotes] = useState('');
  const [savingTicket, setSavingTicket] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<any>(null);

  // ── Conteos cíclicos (checklist físico + cuadre de inventario) ──────────────
  const [counts, setCounts] = useState<any[]>([]);
  const [countsLoading, setCountsLoading] = useState(false);
  const [countStats, setCountStats] = useState<any>(null);
  const [newCountOpen, setNewCountOpen] = useState(false);
  const [newCountForm, setNewCountForm] = useState({
    location: 'TIENDA' as StockLocation,
    frequency: 'WEEKLY',
    notes: '',
  });
  const [savingCount, setSavingCount] = useState(false);
  const [activeCount, setActiveCount] = useState<any | null>(null);
  const [countSearch, setCountSearch] = useState('');

  // Inventario del producto seleccionado (para mostrar disponibilidad por ubicación)
  const [productInventory, setProductInventory] = useState<any>(null);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await api.get('/inventory/overview');
      setOverview(res.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo cargar el inventario'));
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    setLoadingMovements(true);
    try {
      const res = await api.get('/inventory/movements', {
        params: { page: movementPage, limit: 20, type: typeFilter || undefined },
      });
      setMovements(res.data.items ?? []);
      setMovementsMeta(res.data.meta ?? { page: 1, totalPages: 1, total: 0, limit: 20 });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo cargar el historial'));
    } finally {
      setLoadingMovements(false);
    }
  };

  useEffect(() => {
    void fetchOverview();
  }, []);

  useEffect(() => {
    if (tab === 'history') void fetchMovements();
    if (tab === 'counts') void fetchCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, movementPage, typeFilter]);

  useEffect(() => {
    if (search.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get('/products', { params: { search: search.trim(), limit: 8 } });
        setResults(res.data.items ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const openMovement = (product?: any) => {
    setSelectedProduct(product || null);
    setForm({
      type: 'PURCHASE',
      quantity: '1',
      reference: '',
      notes: '',
      fromLocation: 'BODEGA',
      location: 'BODEGA',
    });
    setSearch('');
    setResults([]);
    setIsMovementOpen(true);
  };

  // Carga el reparto por ubicación del producto elegido en el modal.
  useEffect(() => {
    if (!isMovementOpen || !selectedProduct?.id) {
      setProductInventory(null);
      return;
    }
    let cancelled = false;
    api
      .get(`/inventory/${selectedProduct.id}`)
      .then((res) => {
        if (!cancelled) setProductInventory(res.data);
      })
      .catch(() => {
        if (!cancelled) setProductInventory(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isMovementOpen, selectedProduct]);

  const availableByLocation: Record<StockLocation, number> = computeLocationStock(productInventory);

  // Al cambiar de tipo, reposicionar destino/origen por defecto.
  useEffect(() => {
    setForm((f) => {
      if (f.type === 'TRANSFER') {
        const from = f.fromLocation;
        const to = from === 'TIENDA' ? 'BODEGA' : 'TIENDA';
        return { ...f, location: to as StockLocation };
      }
      return f;
    });
  }, [form.type]);

  const openAdjust = (item: AlertItem) => {
    setTarget(item);
    setAdjustForm({ newStock: String(item.stock), reason: '' });
    setIsAdjustOpen(true);
  };

  const submitMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      toast.error('Selecciona un producto');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        productId: selectedProduct.id,
        type: form.type,
        quantity: Number(form.quantity),
        reference: form.reference || undefined,
        notes: form.notes || undefined,
      };
      if (form.type === 'TRANSFER') {
        payload.fromLocation = form.fromLocation;
        payload.location = form.location;
      } else if (form.type === 'PURCHASE' || form.type === 'RETURN') {
        payload.location = form.location;
      }
      await api.post('/inventory/movement', payload);
      toast.success('Movimiento registrado');
      setIsMovementOpen(false);
      setByLocation(null);
      await fetchOverview();
      if (tab === 'history') await fetchMovements();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo registrar el movimiento'));
    } finally {
      setSaving(false);
    }
  };

  const submitAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setSaving(true);
    try {
      await api.post(`/inventory/${target.product.id}/adjust`, {
        newStock: Number(adjustForm.newStock),
        reason: adjustForm.reason,
      });
      toast.success('Stock ajustado correctamente');
      setIsAdjustOpen(false);
      setByLocation(null);
      await fetchOverview();
      if (tab === 'history') await fetchMovements();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo ajustar el stock'));
    } finally {
      setSaving(false);
    }
  };

  // ── Modal por ubicación + ticket de traspaso múltiple ──────────────────────
  const currentLocationData = locationModal
    ? (byLocation ?? []).find((l) => l.location === locationModal)
    : null;
  const locationItems: any[] = currentLocationData?.items ?? [];
  const lowInLocation = locationItems.filter((i) => i.lowStock);

  const openLocation = async (loc: StockLocation) => {
    setLocationModal(loc);
    setSelectedIds([]);
    setCreatedTicket(null);
    setTicketOpen(false);
    setLoadingLocation(true);
    try {
      if (!byLocation) {
        const res = await api.get('/inventory/by-location');
        setByLocation(res.data);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudieron cargar los productos'));
      setLocationModal(null);
    } finally {
      setLoadingLocation(false);
    }
  };

  const closeLocation = () => {
    setLocationModal(null);
    setSelectedIds([]);
    setTicketOpen(false);
    setCreatedTicket(null);
  };

  const toggleSelect = (productId: string) =>
    setSelectedIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    );

  const toggleSelectAll = () =>
    setSelectedIds((prev) =>
      prev.length === locationItems.length ? [] : locationItems.map((i) => i.productId),
    );

  const armTicket = () => {
    if (selectedIds.length === 0 || !locationModal) return;
    // Destino sugerido: hacia la tienda física o hacia Live.
    setTicketTo(locationModal === 'TIENDA' ? 'LIVE' : 'TIENDA');
    const qtys: Record<string, number> = {};
    for (const item of locationItems) {
      if (selectedIds.includes(item.productId)) qtys[item.productId] = item.quantity;
    }
    setTicketQty(qtys);
    setTicketNotes('');
    setCreatedTicket(null);
    setTicketOpen(true);
  };

  const ticketItems: any[] = locationItems.filter((i) => selectedIds.includes(i.productId));

  const submitTicket = async () => {
    if (!locationModal) return;
    const items = selectedIds
      .map((id) => ({ productId: id, quantity: Number(ticketQty[id]) || 0 }))
      .filter((i) => i.quantity > 0);

    if (items.length === 0) {
      toast.error('Indica al menos una cantidad mayor a cero');
      return;
    }

    setSavingTicket(true);
    try {
      const res = await api.post('/inventory/transfer-ticket', {
        fromLocation: locationModal,
        toLocation: ticketTo,
        items,
        notes: ticketNotes || undefined,
      });
      setCreatedTicket(res.data);
      setByLocation(null); // se recarga en la próxima apertura
      await fetchOverview();
      if (tab === 'history') await fetchMovements();
      toast.success(`Ticket ${res.data.ticket} creado · ${res.data.totalUnits} unidades`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo crear el ticket de traspaso'));
    } finally {
      setSavingTicket(false);
    }
  };

  const printTicket = () => {
    const t = createdTicket;
    if (!t) return;
    const w = window.open('', '_blank', 'width=480,height=700');
    if (!w) return;
    const rows = (t.movements ?? [])
      .map(
        (m: any) =>
          `<tr><td style="padding:4px 0">${m.product?.name ?? ''}</td><td style="padding:4px 0;color:#666">${m.product?.sku ?? ''}</td><td style="padding:4px 0;text-align:right;font-weight:bold">${m.quantity}</td></tr>`,
      )
      .join('');
    w.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>Ticket ${t.ticket}</title>` +
        `<style>body{font-family:Arial,Helvetica,sans-serif;padding:28px;color:#111;max-width:420px}` +
        `h1{font-size:16px;margin:0 0 4px} .sub{font-size:12px;color:#555;margin-bottom:14px}` +
        `table{width:100%;border-collapse:collapse;font-size:13px;border-top:1px solid #ddd;border-bottom:1px solid #ddd}` +
        `th{text-align:left;font-size:11px;text-transform:uppercase;color:#777;padding:6px 0;border-bottom:1px solid #ddd}` +
        `.foot{margin-top:16px;font-size:12px;color:#555} .sig{margin-top:40px;display:flex;gap:40px;font-size:12px;color:#333}` +
        `.sig div{flex:1;border-top:1px solid #999;padding-top:6px;text-align:center}</style></head><body>` +
        `<h1>👑 QUEEN STYLE — Ticket de Traspaso</h1>` +
        `<div class="sub"><b>${t.ticket}</b> · ${new Date().toLocaleString('es-VE')}</div>` +
        `<div class="sub">Origen: <b>${t.fromLabel}</b> → Destino: <b>${t.toLabel}</b></div>` +
        `<table><thead><tr><th>Producto</th><th>SKU</th><th style="text-align:right">Cant.</th></tr></thead><tbody>${rows}</tbody></table>` +
        `<div class="foot">Total de unidades: <b>${t.totalUnits}</b>` +
        (t.notes ? `<br>Notas: ${t.notes}` : '') +
        `</div>` +
        `<div class="sig"><div>Entregado por</div><div>Recibido por</div></div>` +
        `</body></html>`,
    );
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  // ── Conteos cíclicos: carga y acciones ─────────────────────────────────────
  const fetchCounts = async () => {
    setCountsLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        api.get('/inventory/counts', { params: { limit: 50 } }),
        api.get('/inventory/counts/stats'),
      ]);
      setCounts(listRes.data.items ?? []);
      setCountStats(statsRes.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudieron cargar los conteos'));
    } finally {
      setCountsLoading(false);
    }
  };

  const submitNewCount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCount(true);
    try {
      const res = await api.post('/inventory/counts', {
        location: newCountForm.location,
        frequency: newCountForm.frequency,
        notes: newCountForm.notes || undefined,
      });
      toast.success(`Conteo iniciado · ${res.data.totalItems} productos en el checklist`);
      setNewCountOpen(false);
      setNewCountForm({ location: 'TIENDA', frequency: 'WEEKLY', notes: '' });
      await fetchCounts();
      await openCountDetail(res.data.id);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo iniciar el conteo'));
    } finally {
      setSavingCount(false);
    }
  };

  const openCountDetail = async (id: string) => {
    setActiveCount({ id }); // placeholder mientras carga
    try {
      const res = await api.get(`/inventory/counts/${id}`);
      setActiveCount(res.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo abrir el conteo'));
      setActiveCount(null);
    }
  };

  const setCountedItem = async (countId: string, itemId: string, counted: number) => {
    try {
      const res = await api.patch(`/inventory/counts/${countId}/items/${itemId}`, { counted });
      setActiveCount(res.data);
      setCounts((prev) => prev.map((c) => (c.id === countId ? { ...c, ...res.data } : c)));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo guardar la cantidad'));
    }
  };

  const finishCount = async (id: string) => {
    setSavingCount(true);
    try {
      const res = await api.post(`/inventory/counts/${id}/complete`);
      setActiveCount(res.data);
      toast.success(
        res.data.mismatched === 0
          ? 'Conteo finalizado · el inventario cuadró ✓'
          : `Conteo finalizado · ${res.data.mismatched} producto(s) con diferencia (neto ${
              res.data.netDiff > 0 ? '+' : ''
            }${res.data.netDiff})`,
      );
      await fetchCounts();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo finalizar el conteo'));
    } finally {
      setSavingCount(false);
    }
  };

  const cancelCountById = async (id: string) => {
    setSavingCount(true);
    try {
      await api.patch(`/inventory/counts/${id}/status`);
      toast.success('Conteo cancelado');
      setActiveCount(null);
      await fetchCounts();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo cancelar el conteo'));
    } finally {
      setSavingCount(false);
    }
  };

  const visibleCountItems: any[] = (activeCount?.items ?? []).filter((i: any) => {
    if (!countSearch.trim()) return true;
    const q = countSearch.toLowerCase();
    return (
      (i.product?.name || '').toLowerCase().includes(q) ||
      (i.product?.sku || '').toLowerCase().includes(q)
    );
  });

  const lowStock: AlertItem[] = overview?.lowStockProducts ?? [];
  const outOfStock: AlertItem[] = overview?.outOfStockProducts ?? [];
  const recent: Movement[] = overview?.recentMovements ?? [];

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Productos en stock', value: overview?.totalProducts ?? '—', icon: Package, tone: 'text-white' },
          { label: 'Stock bajo', value: overview?.lowStockCount ?? '—', icon: AlertTriangle, tone: 'text-amber-400' },
          { label: 'Agotados', value: overview?.outOfStockCount ?? '—', icon: PackageX, tone: 'text-rose-400' },
          {
            label: 'Últimos movimientos',
            value: recent.length || '—',
            icon: History,
            tone: 'text-[#E0A96D]',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="glass-card rounded-2xl p-4 border border-white/[0.06] flex items-start justify-between gap-2"
          >
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                {stat.label}
              </div>
              <div className={`text-2xl font-bold font-serif mt-1 ${stat.tone}`}>{stat.value}</div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0">
              <stat.icon className={`w-4 h-4 ${stat.tone}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Tabs + actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] self-start">
          {(
            [
              { key: 'overview', label: 'Resumen & alertas' },
              { key: 'counts', label: 'Conteos (cuadre)' },
              { key: 'history', label: 'Historial de movimientos' },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                tab === t.key
                  ? 'bg-[#E0A96D] text-[#12121C]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => openMovement()} className="btn-gold text-sm px-4 py-2.5">
            <Plus className="w-4 h-4" /> Registrar movimiento
          </button>
          <button
            onClick={() => openLocation('BODEGA')}
            className="btn-secondary text-sm px-4 py-2.5"
            title="Seleccionar varios productos y armar un ticket de traspaso"
          >
            <ArrowLeftRight className="w-4 h-4" /> Traspaso múltiple
          </button>
        </div>
      </div>

      {tab === 'counts' ? (
        <div className="space-y-5">
          {/* KPIs de cuadre */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: '% de cuadre',
                value: countStats?.matchRate != null ? `${countStats.matchRate}%` : '—',
                tone:
                  (countStats?.matchRate ?? 100) >= 100
                    ? 'text-emerald-400'
                    : (countStats?.matchRate ?? 0) >= 90
                      ? 'text-amber-400'
                      : 'text-rose-400',
                sub: countStats?.mismatched
                  ? `${countStats.mismatched} producto(s) con diferencia`
                  : 'Todo cuadra',
              },
              {
                label: 'Productos contados',
                value: String(countStats?.itemsCounted ?? 0),
                tone: 'text-white',
                sub: `en ${countStats?.completed ?? 0} conteo(s) completado(s)`,
              },
              {
                label: 'Diferencia neta',
                value:
                  countStats?.netDiff != null
                    ? `${countStats.netDiff > 0 ? '+' : ''}${countStats.netDiff} uds`
                    : '—',
                tone: (countStats?.netDiff ?? 0) === 0 ? 'text-emerald-400' : 'text-rose-400',
                sub: 'contado − sistema',
              },
              {
                label: 'Último conteo',
                value: countStats?.lastCompletedAt
                  ? dateTime(countStats.lastCompletedAt)
                  : '—',
                tone: 'text-white',
                sub: countStats?.lastFrequency
                  ? `Cadencia ${FREQUENCY_LABEL[countStats.lastFrequency]?.toLowerCase()}`
                  : 'Sin conteos completados',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl bg-white/[0.04] border border-white/[0.07] p-4"
              >
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  {stat.label}
                </div>
                <div className={`text-2xl font-bold font-serif mt-1 ${stat.tone}`}>{stat.value}</div>
                <div className="text-[11px] text-slate-500 mt-0.5 truncate">{stat.sub}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-500 max-w-xl">
              Realiza el conteo físico con un checklist (semanal o quincenal). El historial y los
              KPIs muestran cuánto existe y si el inventario cuadra.
            </p>
            <button
              onClick={() => setNewCountOpen(true)}
              className="btn-gold text-sm px-4 py-2.5 self-start"
            >
              <ClipboardCheck className="w-4 h-4" /> Nuevo conteo
            </button>
          </div>

          {/* Lista de conteos (historial) */}
          <div className="glass-card rounded-2xl border border-white/[0.06] overflow-hidden">
            {countsLoading ? (
              <PageLoader label="Cargando conteos…" />
            ) : counts.length === 0 ? (
              <EmptyState
                icon={<ClipboardCheck className="w-6 h-6" />}
                title="Sin conteos"
                description="Crea tu primer conteo físico para verificar si el inventario cuadra."
              />
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {counts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => openCountDetail(c.id)}
                    className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
                  >
                    <span className={`badge ${COUNT_STATUS_BADGE[c.status]} shrink-0`}>
                      {COUNT_STATUS_LABEL[c.status]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white">
                        {STOCK_LOCATION_LABELS[c.location as StockLocation] || c.location}
                        <span className="text-slate-500">
                          {' '}
                          · {FREQUENCY_LABEL[c.frequency] || c.frequency}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {dateTime(c.createdAt)} · {c.countedItems}/{c.totalItems} contados
                      </div>
                    </div>
                    {c.status === 'COMPLETED' ? (
                      c.mismatched === 0 ? (
                        <span className="badge badge-success shrink-0">Cuadró ✓</span>
                      ) : (
                        <span
                          className={`badge ${
                            c.netDiff < 0 ? 'badge-danger' : 'badge-info'
                          } shrink-0`}
                        >
                          {c.netDiff > 0 ? '+' : ''}
                          {c.netDiff} uds
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-slate-400 shrink-0">{c.matched} ✓</span>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : tab === 'overview' ? (
        loading ? (
          <PageLoader label="Cargando inventario…" />
        ) : (
          <div className="space-y-5">
            {/* Stock por ubicación */}
            <div className="glass-card rounded-2xl border border-white/[0.06] p-5">
              <div className="flex items-center justify-between mb-4 gap-2">
                <div>
                  <h3 className="text-sm font-serif font-bold text-white">Stock por ubicación</h3>
                  <p className="text-[11px] text-slate-500">
                    Inventario general y a dónde se distribuyen los productos
                  </p>
                </div>
                <span className="badge badge-gold shrink-0">
                  {overview?.totalUnits ?? 0} unidades
                </span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {(overview?.locations ?? []).map((loc: any) => {
                  const total = overview?.totalUnits ?? 0;
                  const pct = total > 0 ? Math.round((loc.units / total) * 100) : 0;
                  return (
                    <div
                      key={loc.location}
                      onClick={() => openLocation(loc.location as StockLocation)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') openLocation(loc.location as StockLocation);
                      }}
                      className="rounded-xl bg-white/[0.04] border border-white/[0.07] p-4 cursor-pointer hover:border-[#E0A96D]/50 hover:bg-white/[0.06] transition-all group"
                      title="Ver productos de esta ubicación"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold truncate">
                          {loc.label}
                        </div>
                        <span className="text-[#E0A96D] shrink-0">
                          {LOCATION_ICONS[loc.location as StockLocation]}
                        </span>
                      </div>
                      <div className="text-2xl font-bold font-serif text-white mt-1.5">
                        {loc.units}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        unidades · {loc.products} producto{loc.products === 1 ? '' : 's'}
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#E0A96D]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="mt-2 text-[10px] text-[#E0A96D]/80 font-semibold opacity-70 group-hover:opacity-100 transition-opacity">
                        Ver productos →
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Low / out of stock */}
            <div className="glass-card rounded-2xl border border-white/[0.06] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-serif font-bold text-white">Alertas de stock</h3>
              </div>

              {lowStock.length === 0 && outOfStock.length === 0 ? (
                <EmptyState
                  icon={<Package className="w-6 h-6" />}
                  title="Sin alertas"
                  description="Todos los productos activos tienen stock saludable."
                />
              ) : (
                <div className="divide-y divide-white/[0.05] max-h-[480px] overflow-y-auto">
                  {[...outOfStock, ...lowStock].map((item) => (
                    <div key={item.id} className="px-5 py-3.5 flex items-center gap-3">
                      <img
                        src={item.product.images?.[0]?.url || '/placeholder-product.png'}
                        alt=""
                        className="w-10 h-12 rounded-lg object-cover bg-white/5 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white truncate">
                          {item.product.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">{item.product.sku}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`badge ${item.stock === 0 ? 'badge-danger' : 'badge-warning'}`}>
                          {item.stock} uds
                        </span>
                        <div className="text-[10px] text-slate-500 mt-1">
                          mín. {item.product.stockMin ?? 5}
                        </div>
                      </div>
                      {canAdjust && (
                        <button
                          onClick={() => openAdjust(item)}
                          className="btn-secondary text-xs px-3 py-1.5 shrink-0"
                          title="Ajuste manual"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Ajustar</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent movements */}
            <div className="glass-card rounded-2xl border border-white/[0.06] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
                <History className="w-4 h-4 text-[#E0A96D]" />
                <h3 className="text-sm font-serif font-bold text-white">Últimos movimientos</h3>
              </div>

              {recent.length === 0 ? (
                <EmptyState
                  icon={<History className="w-6 h-6" />}
                  title="Sin movimientos"
                  description="Las entradas y salidas de stock aparecerán aquí."
                />
              ) : (
                <div className="divide-y divide-white/[0.05] max-h-[480px] overflow-y-auto">
                  {recent.map((m) => (
                    <div key={m.id} className="px-5 py-3.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">
                          {m.inventory?.product?.name || 'Producto'}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {m.reference || MOVEMENT_TYPES.find((t) => t.value === m.type)?.label}
                          {m.notes ? ` · ${m.notes}` : ''}
                          {movementLocationText(m) !== '—' && (
                            <span className="text-[#E0A96D]"> · {movementLocationText(m)}</span>
                          )}
                        </div>
                      </div>
                      <span className={`badge ${TYPE_BADGES[m.type] || 'badge-neutral'}`}>{m.type}</span>
                      <span className="text-sm font-bold text-white w-10 text-right">{m.quantity}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </div>
          </div>
        )
      ) : (
        <div className="glass-card rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center gap-3">
            <select
              value={typeFilter}
              onChange={(e) => {
                setMovementPage(1);
                setTypeFilter(e.target.value);
              }}
              className="input-luxury text-sm sm:max-w-[240px]"
            >
              <option value="">Todos los tipos</option>
              {MOVEMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500 sm:ml-auto">
              {movementsMeta.total} movimientos registrados
            </span>
          </div>

          {loadingMovements ? (
            <PageLoader label="Cargando historial…" />
          ) : movements.length === 0 ? (
            <EmptyState
              icon={<History className="w-6 h-6" />}
              title="Sin movimientos"
              description="No hay movimientos para los filtros seleccionados."
            />
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="table-luxury">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Producto</th>
                      <th>Tipo</th>
                      <th>Ubicación</th>
                      <th>Cantidad</th>
                      <th>Referencia / Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => (
                      <tr key={m.id}>
                        <td className="text-xs text-slate-400 whitespace-nowrap">
                          {dateTime(m.createdAt)}
                        </td>
                        <td>
                          <div className="text-sm text-white">{m.inventory?.product?.name || '—'}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {m.inventory?.product?.sku}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${TYPE_BADGES[m.type] || 'badge-neutral'}`}>
                            {m.type}
                          </span>
                        </td>
                        <td className="text-xs text-slate-400 whitespace-nowrap">
                          {movementLocationText(m) === '—' ? (
                            <span className="text-slate-600">—</span>
                          ) : (
                            <span className="text-[#E0A96D]">{movementLocationText(m)}</span>
                          )}
                        </td>
                        <td className="text-sm font-bold text-white">{m.quantity}</td>
                        <td className="text-xs text-slate-400">
                          {m.reference || '—'}
                          {m.notes ? <div className="text-slate-500">{m.notes}</div> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-white/[0.05]">
                {movements.map((m) => (
                  <div key={m.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-white">
                        {m.inventory?.product?.name || '—'}
                      </span>
                      <span className={`badge ${TYPE_BADGES[m.type] || 'badge-neutral'}`}>{m.type}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{dateTime(m.createdAt)}</span>
                      <span className="font-bold text-white text-sm">{m.quantity} uds</span>
                    </div>
                    {movementLocationText(m) !== '—' && (
                      <div className="text-[11px] text-[#E0A96D]">{movementLocationText(m)}</div>
                    )}
                    {m.notes && <div className="text-[11px] text-slate-500">{m.notes}</div>}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
                <span className="text-xs text-slate-500">
                  Página {movementsMeta.page} de {Math.max(movementsMeta.totalPages, 1)}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMovementPage((p) => Math.max(1, p - 1))}
                    disabled={movementPage <= 1}
                    className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" /> Anterior
                  </button>
                  <button
                    onClick={() => setMovementPage((p) => Math.min(movementsMeta.totalPages, p + 1))}
                    disabled={movementPage >= movementsMeta.totalPages}
                    className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
                  >
                    Siguiente <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Movement modal */}
      <Modal
        isOpen={isMovementOpen}
        onClose={() => setIsMovementOpen(false)}
        title="Registrar movimiento de stock"
        icon={<History className="w-5 h-5 text-[#E0A96D]" />}
      >
        <form onSubmit={submitMovement} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Producto *</label>
            <input
              value={selectedProduct ? `${selectedProduct.name} (${selectedProduct.sku})` : search}
              onChange={(e) => {
                setSelectedProduct(null);
                setSearch(e.target.value);
              }}
              placeholder="Busca por nombre o SKU…"
              className="input-luxury text-sm"
              disabled={!!selectedProduct}
            />
            {selectedProduct && (
              <button
                type="button"
                onClick={() => {
                  setSelectedProduct(null);
                  setSearch('');
                }}
                className="text-[11px] text-[#E0A96D] hover:underline mt-1"
              >
                Cambiar producto
              </button>
            )}

            {!selectedProduct && search.trim().length >= 2 && (
              <div className="mt-2 rounded-xl border border-white/10 bg-[#14141F] max-h-48 overflow-y-auto">
                {searching && <div className="px-3 py-2 text-xs text-slate-500">Buscando…</div>}
                {!searching && results.length === 0 && (
                  <div className="px-3 py-2 text-xs text-slate-500">Sin resultados</div>
                )}
                {results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedProduct(p);
                      setResults([]);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-white/5 flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="text-[11px] text-slate-500 font-mono shrink-0">{p.sku}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Tipo de movimiento *</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="input-luxury text-sm"
            >
              {MOVEMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.sign} {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Cantidad *</label>
            <input
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              required
              className="input-luxury text-sm"
            />
          </div>

          {/* Ubicaciones: traspaso o destino de ingreso */}
          {form.type === 'TRANSFER' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Origen *</label>
                <select
                  value={form.fromLocation}
                  onChange={(e) => {
                    const from = e.target.value as StockLocation;
                    setForm((f) => ({
                      ...f,
                      fromLocation: from,
                      location:
                        f.location === from
                          ? ((from === 'TIENDA' ? 'BODEGA' : 'TIENDA') as StockLocation)
                          : f.location,
                    }));
                  }}
                  className="input-luxury text-sm"
                >
                  {ALL_STOCK_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc} disabled={loc === form.location}>
                      {STOCK_LOCATION_LABELS[loc]} ({availableByLocation[loc]})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Destino *</label>
                <select
                  value={form.location}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, location: e.target.value as StockLocation }))
                  }
                  className="input-luxury text-sm"
                >
                  {ALL_STOCK_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc} disabled={loc === form.fromLocation}>
                      {STOCK_LOCATION_LABELS[loc]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : form.type === 'PURCHASE' || form.type === 'RETURN' ? (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Destino (dónde ingresa el stock)
              </label>
              <select
                value={form.location}
                onChange={(e) =>
                  setForm((f) => ({ ...f, location: e.target.value as StockLocation }))
                }
                className="input-luxury text-sm"
              >
                {ALL_STOCK_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {STOCK_LOCATION_LABELS[loc]}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500">
              {form.type === 'SALE'
                ? 'La venta descuenta primero de Tienda y luego de Online / Live; la bodega absorbe el resto.'
                : form.type === 'LOSS' || form.type === 'DAMAGE'
                ? 'La salida descuenta primero de la bodega; si no alcanza, consume los canales.'
                : 'El ajuste recalcula la bodega y los canales según el nuevo conteo.'}
            </p>
          )}

          {/* Disponibilidad por ubicación del producto seleccionado */}
          {productInventory && (
            <div className="flex flex-wrap gap-2">
              {ALL_STOCK_LOCATIONS.map((loc) => (
                <span
                  key={loc}
                  className="text-[11px] px-2 py-1 rounded-lg bg-white/[0.05] border border-white/[0.08] text-slate-300"
                >
                  {STOCK_LOCATION_SHORT[loc]}:{' '}
                  <b className="text-white">{availableByLocation[loc]}</b>
                </span>
              ))}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Referencia</label>
            <input
              value={form.reference}
              onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
              placeholder="Ej. FAC-2026-001"
              className="input-luxury text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Notas</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Motivo o detalle del movimiento"
              className="input-luxury text-sm resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setIsMovementOpen(false)}
              className="btn-secondary flex-1 text-sm py-2.5"
              disabled={saving}
            >
              Cancelar
            </button>
            <button type="submit" disabled={saving || !selectedProduct} className="btn-gold flex-1 text-sm py-2.5">
              {saving ? 'Registrando…' : 'Registrar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Adjust modal (ADMIN) */}
      <Modal
        isOpen={isAdjustOpen}
        onClose={() => setIsAdjustOpen(false)}
        title="Ajuste manual de stock"
        icon={<SlidersHorizontal className="w-5 h-5 text-[#E0A96D]" />}
        maxWidth="max-w-md"
      >
        {target && (
          <form onSubmit={submitAdjust} className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.07]">
              <img
                src={target.product.images?.[0]?.url || '/placeholder-product.png'}
                alt=""
                className="w-12 h-14 rounded-lg object-cover bg-white/5"
              />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">{target.product.name}</div>
                <div className="text-[11px] text-slate-500 font-mono">{target.product.sku}</div>
                <div className="text-xs text-amber-400 mt-0.5">Stock actual: {target.stock}</div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Nuevo stock (conteo físico) *
              </label>
              <input
                type="number"
                min="0"
                value={adjustForm.newStock}
                onChange={(e) => setAdjustForm((f) => ({ ...f, newStock: e.target.value }))}
                required
                className="input-luxury text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Motivo del ajuste *</label>
              <textarea
                rows={2}
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Ej. Conteo físico de fin de mes"
                required
                className="input-luxury text-sm resize-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setIsAdjustOpen(false)}
                className="btn-secondary flex-1 text-sm py-2.5"
                disabled={saving}
              >
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="btn-gold flex-1 text-sm py-2.5">
                {saving ? 'Aplicando…' : 'Aplicar ajuste'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Modal: productos por ubicación (click en Inventario / Tiendas) ── */}
      <Modal
        isOpen={!!locationModal}
        onClose={closeLocation}
        title={
          locationModal
            ? `Productos en ${STOCK_LOCATION_LABELS[locationModal]}`
            : 'Productos por ubicación'
        }
        icon={LOCATION_ICONS[locationModal ?? 'BODEGA']}
        maxWidth="max-w-3xl"
      >
        {loadingLocation ? (
          <PageLoader label="Cargando productos…" />
        ) : !currentLocationData ? (
          <EmptyState
            icon={<Package className="w-6 h-6" />}
            title="Sin datos"
            description="No se pudieron cargar los productos de esta ubicación."
          />
        ) : locationItems.length === 0 ? (
          <EmptyState
            icon={<Package className="w-6 h-6" />}
            title="Ubicación vacía"
            description="No hay productos con stock en esta ubicación."
          />
        ) : (
          <div className="space-y-4">
            {/* Resumen de la ubicación */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <div className="text-lg font-bold text-white">{currentLocationData.units}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Unidades</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <div className="text-lg font-bold text-white">{currentLocationData.products}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Productos</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <div
                  className={`text-lg font-bold ${
                    currentLocationData.lowStockCount > 0 ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {currentLocationData.lowStockCount}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">
                  Stock bajo
                </div>
              </div>
            </div>

            {/* Selección múltiple */}
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedIds.length === locationItems.length && locationItems.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 accent-[#E0A96D]"
                />
                Seleccionar todo
              </label>
              <span className="text-[11px] font-semibold text-[#E0A96D]">
                {selectedIds.length} de {locationItems.length} seleccionados
              </span>
            </div>

            {/* Lista de productos */}
            <div className="divide-y divide-white/[0.05] rounded-xl border border-white/[0.07] max-h-[46vh] overflow-y-auto">
              {locationItems.map((item) => {
                const selected = selectedIds.includes(item.productId);
                return (
                  <div
                    key={item.productId}
                    onClick={() => toggleSelect(item.productId)}
                    className={`px-3 py-2.5 flex items-center gap-3 cursor-pointer transition-colors ${
                      selected ? 'bg-[#E0A96D]/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleSelect(item.productId)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 accent-[#E0A96D] shrink-0 cursor-pointer"
                    />
                    <img
                      src={item.image || '/placeholder-product.png'}
                      alt=""
                      className="w-9 h-11 rounded object-cover bg-white/5 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{item.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
                        {item.sku}
                        {item.lowStock && (
                          <span className="badge badge-warning !py-0 !px-1.5 !text-[9px]">
                            Stock bajo
                          </span>
                        )}
                        {item.status !== 'ACTIVE' && (
                          <span className="badge badge-neutral !py-0 !px-1.5 !text-[9px]">
                            Inactivo
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-white">{item.quantity}</div>
                      <div className="text-[10px] text-slate-500">
                        aquí · total {item.stockTotal}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {lowInLocation.length > 0 && (
              <p className="text-[11px] text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {lowInLocation.length} producto{lowInLocation.length === 1 ? '' : 's'} con stock
                bajo en todo el inventario.
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={closeLocation} className="btn-secondary flex-1 text-sm py-2.5">
                Cerrar
              </button>
              <button
                onClick={armTicket}
                disabled={selectedIds.length === 0}
                className="btn-gold flex-1 text-sm py-2.5 inline-flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <ArrowLeftRight className="w-4 h-4" />
                Armar ticket ({selectedIds.length})
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: ticket de traspaso ─────────────────────────────────────── */}
      <Modal
        isOpen={ticketOpen}
        onClose={() => !savingTicket && setTicketOpen(false)}
        title={createdTicket ? 'Ticket de traspaso creado' : 'Armar ticket de traspaso'}
        icon={<ArrowLeftRight className="w-5 h-5 text-[#E0A96D]" />}
        maxWidth="max-w-lg"
      >
        {!createdTicket ? (
          <div className="space-y-4">
            {/* Origen → Destino */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Origen</label>
                <div className="input-luxury text-sm bg-white/[0.04] text-slate-300 flex items-center">
                  {locationModal ? STOCK_LOCATION_LABELS[locationModal] : '—'}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Destino *
                </label>
                <select
                  value={ticketTo}
                  onChange={(e) => setTicketTo(e.target.value as StockLocation)}
                  className="input-luxury text-sm"
                >
                  {ALL_STOCK_LOCATIONS.filter((loc) => loc !== locationModal).map((loc) => (
                    <option key={loc} value={loc}>
                      {STOCK_LOCATION_LABELS[loc]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Productos y cantidades */}
            <div>
              <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-2">
                Productos del ticket ({ticketItems.length})
              </h4>
              <div className="divide-y divide-white/[0.05] rounded-xl border border-white/[0.07] max-h-64 overflow-y-auto">
                {ticketItems.map((item) => (
                  <div key={item.productId} className="px-3 py-2.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{item.name}</div>
                      <div className="text-[11px] text-slate-500">
                        <span className="font-mono">{item.sku}</span> · disponible:{' '}
                        {item.quantity}
                      </div>
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={item.quantity}
                      value={ticketQty[item.productId] ?? 1}
                      onChange={(e) =>
                        setTicketQty((prev) => ({
                          ...prev,
                          [item.productId]: Math.max(
                            1,
                            Math.min(item.quantity, Number(e.target.value) || 1),
                          ),
                        }))
                      }
                      className="input-luxury text-sm w-20 text-center"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Notas del traspaso
              </label>
              <input
                value={ticketNotes}
                onChange={(e) => setTicketNotes(e.target.value)}
                placeholder="Ej. Reposición semanal para tienda"
                className="input-luxury text-sm"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setTicketOpen(false)}
                className="btn-secondary flex-1 text-sm py-2.5"
                disabled={savingTicket}
              >
                Volver
              </button>
              <button
                onClick={submitTicket}
                disabled={savingTicket || ticketItems.length === 0}
                className="btn-gold flex-1 text-sm py-2.5"
              >
                {savingTicket ? 'Creando…' : 'Crear ticket'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center space-y-2 py-2">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <p className="text-sm text-slate-300">
                Ticket <span className="font-mono font-bold text-white">{createdTicket.ticket}</span>
              </p>
              <p className="text-xs text-slate-500">
                {createdTicket.fromLabel} → {createdTicket.toLabel} ·{' '}
                {createdTicket.totalUnits} unidades en {createdTicket.movements?.length ?? 0}{' '}
                producto(s)
              </p>
            </div>

            <div className="divide-y divide-white/[0.05] rounded-xl border border-white/[0.07] max-h-56 overflow-y-auto">
              {(createdTicket.movements ?? []).map((m: any) => (
                <div key={m.id} className="px-3 py-2.5 flex items-center justify-between gap-3">
                  <span className="text-sm text-white truncate">{m.product?.name}</span>
                  <span className="text-sm font-bold text-[#E0A96D] shrink-0">
                    {m.quantity} uds
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={printTicket}
                className="btn-secondary flex-1 text-sm py-2.5 inline-flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Imprimir
              </button>
              <button onClick={closeLocation} className="btn-gold flex-1 text-sm py-2.5">
                Listo
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: nuevo conteo de inventario ─────────────────────────────── */}
      <Modal
        isOpen={newCountOpen}
        onClose={() => !savingCount && setNewCountOpen(false)}
        title="Nuevo conteo de inventario"
        icon={<ClipboardCheck className="w-5 h-5 text-[#E0A96D]" />}
        maxWidth="max-w-md"
      >
        <form onSubmit={submitNewCount} className="space-y-4">
          <p className="text-xs text-slate-400">
            Al iniciar se congela el stock esperado de cada producto de la ubicación. Luego marcas
            en el checklist lo que encuentres físicamente; al finalizar se calcula si el inventario
            cuadra.
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Ubicación a contar *
            </label>
            <select
              value={newCountForm.location}
              onChange={(e) =>
                setNewCountForm((f) => ({ ...f, location: e.target.value as StockLocation }))
              }
              className="input-luxury text-sm"
            >
              {ALL_STOCK_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {STOCK_LOCATION_LABELS[loc]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Frecuencia *
            </label>
            <select
              value={newCountForm.frequency}
              onChange={(e) => setNewCountForm((f) => ({ ...f, frequency: e.target.value }))}
              className="input-luxury text-sm"
            >
              <option value="ONCE">Una vez</option>
              <option value="WEEKLY">Semanal (cada semana)</option>
              <option value="BIWEEKLY">Quincenal (dos veces al mes)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Notas (opcional)
            </label>
            <input
              value={newCountForm.notes}
              onChange={(e) => setNewCountForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Ej. Conteo semanal de tienda física"
              className="input-luxury text-sm"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setNewCountOpen(false)}
              className="btn-secondary flex-1 text-sm py-2.5"
              disabled={savingCount}
            >
              Cancelar
            </button>
            <button type="submit" disabled={savingCount} className="btn-gold flex-1 text-sm py-2.5">
              {savingCount ? 'Iniciando…' : 'Iniciar conteo'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: checklist del conteo / detalle ─────────────────────────── */}
      <Modal
        isOpen={!!activeCount}
        onClose={() => !savingCount && setActiveCount(null)}
        title={
          activeCount?.items
            ? `Conteo · ${STOCK_LOCATION_LABELS[activeCount.location as StockLocation] || activeCount.location}`
            : 'Conteo de inventario'
        }
        icon={<ClipboardCheck className="w-5 h-5 text-[#E0A96D]" />}
        maxWidth="max-w-2xl"
      >
        {!activeCount?.items ? (
          <PageLoader label="Cargando conteo…" />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`badge ${COUNT_STATUS_BADGE[activeCount.status]}`}>
                {COUNT_STATUS_LABEL[activeCount.status]}
              </span>
              <span className="badge badge-neutral">
                {FREQUENCY_LABEL[activeCount.frequency] || activeCount.frequency}
              </span>
              <span className="text-xs text-slate-400 ml-auto">
                {activeCount.countedItems}/{activeCount.totalItems} contados
              </span>
            </div>

            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#E0A96D] transition-all"
                style={{
                  width: `${
                    activeCount.totalItems
                      ? Math.round((activeCount.countedItems / activeCount.totalItems) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>

            {activeCount.status === 'COMPLETED' && (
              <div
                className={`p-3 rounded-xl text-xs border ${
                  activeCount.mismatched === 0
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}
              >
                {activeCount.mismatched === 0
                  ? `El inventario cuadró: ${activeCount.matched} producto(s) con cantidad exacta.`
                  : `${activeCount.matched} cuadraron · ${activeCount.mismatched} con diferencia · diferencia neta ${
                      activeCount.netDiff > 0 ? '+' : ''
                    }${activeCount.netDiff} uds.`}
              </div>
            )}

            {activeCount.status === 'IN_PROGRESS' && (
              <input
                value={countSearch}
                onChange={(e) => setCountSearch(e.target.value)}
                placeholder="Buscar producto en el checklist…"
                className="input-luxury text-sm"
              />
            )}

            <div className="divide-y divide-white/[0.05] rounded-xl border border-white/[0.07] max-h-[44vh] overflow-y-auto">
              {visibleCountItems.map((item) => {
                const isCounted = item.counted !== null && item.counted !== undefined;
                const editable = activeCount.status === 'IN_PROGRESS';
                return (
                  <div
                    key={item.id}
                    className={`px-3 py-2.5 flex items-center gap-3 ${
                      isCounted ? 'bg-emerald-500/[0.04]' : ''
                    }`}
                  >
                    {isCounted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded border border-slate-600 shrink-0" />
                    )}
                    <img
                      src={item.product?.images?.[0]?.url || '/placeholder-product.png'}
                      alt=""
                      className="w-9 h-11 rounded object-cover bg-white/5 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{item.product?.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {item.product?.sku} · sistema: {item.expected}
                      </div>
                    </div>
                    {editable ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          min={0}
                          value={item.counted ?? ''}
                          placeholder="—"
                          onChange={(e) => {
                            const v =
                              e.target.value === '' ? 0 : Math.max(0, Number(e.target.value) || 0);
                            setCountedItem(activeCount.id, item.id, v);
                          }}
                          className="input-luxury text-sm w-20 text-center"
                        />
                        <button
                          type="button"
                          title="Igual al sistema"
                          onClick={() => setCountedItem(activeCount.id, item.id, item.expected)}
                          className="btn-secondary text-xs px-2 py-1.5"
                        >
                          =
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-white shrink-0">
                        {item.counted ?? '—'}
                      </span>
                    )}
                    {isCounted ? (
                      item.diff === 0 ? (
                        <span className="badge badge-success shrink-0">Cuadra</span>
                      ) : (
                        <span
                          className={`badge ${item.diff < 0 ? 'badge-danger' : 'badge-info'} shrink-0`}
                        >
                          {item.diff > 0 ? '+' : ''}
                          {item.diff}
                        </span>
                      )
                    ) : (
                      <span className="badge badge-neutral shrink-0 opacity-50">Pendiente</span>
                    )}
                  </div>
                );
              })}
              {visibleCountItems.length === 0 && (
                <div className="px-4 py-8 text-center text-xs text-slate-500">
                  Sin productos que coincidan con la búsqueda.
                </div>
              )}
            </div>

            {activeCount.notes && (
              <p className="text-[11px] text-slate-500">Notas: {activeCount.notes}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setActiveCount(null)}
                className="btn-secondary flex-1 text-sm py-2.5"
                disabled={savingCount}
              >
                Cerrar
              </button>
              {activeCount.status === 'IN_PROGRESS' && (
                <>
                  <button
                    onClick={() => cancelCountById(activeCount.id)}
                    className="btn-secondary text-sm py-2.5 px-4 text-rose-300"
                    disabled={savingCount}
                    title="Cancelar conteo"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => finishCount(activeCount.id)}
                    disabled={savingCount || activeCount.countedItems < activeCount.totalItems}
                    className="btn-gold flex-1 text-sm py-2.5"
                    title={
                      activeCount.countedItems < activeCount.totalItems
                        ? 'Faltan productos por contar'
                        : 'Cerrar el conteo y ver el resultado'
                    }
                  >
                    {savingCount ? 'Finalizando…' : 'Finalizar conteo'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
