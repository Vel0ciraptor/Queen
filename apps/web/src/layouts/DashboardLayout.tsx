import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { useAuthStore } from '../store/authStore';
import { Bell, AlertTriangle, Menu } from 'lucide-react';
import api from '../lib/api';

export const DashboardLayout: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
    setShowNotifications(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated, location.pathname]);

  const fetchNotifications = async () => {
    try {
      const [notifsRes, countRes] = await Promise.all([
        api.get('/notifications'),
        api.get('/notifications/unread-count'),
      ]);
      setNotifications(notifsRes.data);
      setUnreadCount(countRes.data.unreadCount || 0);
    } catch {
      // Offline / initial fallback notifications
      setNotifications([
        {
          id: '1',
          title: 'Stock Bajo',
          message: 'Falda Plisada Champagne tiene solo 4 unidades restantes.',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ]);
      setUnreadCount(1);
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Generate page title from route
  const path = location.pathname;
  let pageTitle = 'Panel General';
  if (path.endsWith('/pos')) pageTitle = 'Punto de Venta (POS)';
  else if (path.endsWith('/inventory')) pageTitle = 'Inventario & Stock';
  else if (path.endsWith('/products')) pageTitle = 'Catálogo de Productos';
  else if (path.endsWith('/categories')) pageTitle = 'Categorías';
  else if (path.endsWith('/orders')) pageTitle = 'Gestión de Pedidos Web';
  else if (path.endsWith('/finance')) pageTitle = 'Finanzas & Flujo de Caja';
  else if (path.endsWith('/reports')) pageTitle = 'Reportes & Analíticas';
  else if (path.endsWith('/qr')) pageTitle = 'Generador de Códigos QR & Etiquetas';
  else if (path.endsWith('/users')) pageTitle = 'Gestión de Personal & Roles';
  else if (path.endsWith('/dashboard')) pageTitle = 'Resumen General';

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F8FAFC]">
      {/* Mobile drawer backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar (drawer on mobile, static on desktop) */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-out lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onNavigate={() => setMobileNavOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 min-h-screen">
        {/* Top Bar */}
        <header className="h-16 border-b border-[rgba(255,255,255,0.06)] bg-[#0E0E17]/80 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:text-white transition-all"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-serif font-bold text-white tracking-wide truncate">
                {pageTitle}
              </h2>
              <div className="text-[11px] text-slate-500 font-mono hidden sm:block">
                Queen Style ERP • Sistema Integrado
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 relative">
            {/* Notifications Button */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white transition-all"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E0A96D] text-[#12121C] text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 bg-[#141422] border border-white/10 rounded-2xl shadow-2xl p-4 z-50 animate-slideUp">
                <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                  <span className="text-xs font-bold text-white font-serif">
                    Notificaciones
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[10px] text-[#E0A96D] hover:underline"
                    >
                      Marcar todo leído
                    </button>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">
                      No hay notificaciones
                    </p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-2.5 rounded-xl text-xs border ${
                          n.isRead
                            ? 'bg-white/[0.02] border-white/[0.04] text-slate-400'
                            : 'bg-[#E0A96D]/10 border-[#E0A96D]/25 text-white'
                        }`}
                      >
                        <div className="font-semibold flex items-center gap-1.5 mb-0.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#E0A96D]" />
                          {n.title}
                        </div>
                        <p className="text-[11px] text-slate-300">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
