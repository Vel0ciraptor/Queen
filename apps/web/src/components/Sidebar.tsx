import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Package,
  ListOrdered,
  DollarSign,
  BarChart3,
  QrCode,
  Users,
  Crown,
  LogOut,
  Store,
  Tag,
  FolderTree,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface SidebarProps {
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard/pos', label: 'Punto de Venta (POS)', icon: ShoppingCart, roles: ['ADMIN', 'PROMOTORA'] },
    { to: '/dashboard/inventory', label: 'Inventario & Stock', icon: Package, roles: ['ADMIN', 'PROMOTORA'] },
    { to: '/dashboard/products', label: 'Productos', icon: Tag, roles: ['ADMIN', 'PROMOTORA'] },
    { to: '/dashboard/categories', label: 'Categorías', icon: FolderTree, roles: ['ADMIN', 'PROMOTORA'] },
    { to: '/dashboard/orders', label: 'Pedidos Web', icon: ListOrdered, roles: ['ADMIN', 'PROMOTORA'] },
    { to: '/dashboard/qr', label: 'Etiquetas & QR', icon: QrCode, roles: ['ADMIN', 'PROMOTORA'] },
    { to: '/dashboard/finance', label: 'Finanzas & Caja', icon: DollarSign, roles: ['ADMIN'] },
    { to: '/dashboard/reports', label: 'Reportes & KPIs', icon: BarChart3, roles: ['ADMIN'] },
    { to: '/dashboard/users', label: 'Equipo & Usuarios', icon: Users, roles: ['ADMIN'] },
  ];

  const allowedItems = navItems.filter((item) =>
    user?.role ? item.roles.includes(user.role) : true
  );

  return (
    <aside className="w-64 h-screen bg-[#0E0E17] border-r border-[rgba(255,255,255,0.06)] flex flex-col justify-between overflow-y-auto">
      <div>
        {/* Brand */}
        <div className="p-6 border-b border-[rgba(255,255,255,0.06)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E0A96D] to-[#C48B4B] p-[1.5px] shadow-lg shadow-[#E0A96D]/20">
            <div className="w-full h-full bg-[#12121C] rounded-[10px] flex items-center justify-center">
              <Crown className="w-5 h-5 text-[#E0A96D]" />
            </div>
          </div>
          <div>
            <h1 className="font-serif font-bold text-white text-lg tracking-wider gold-text">
              Queen Style
            </h1>
            <span className="text-[10px] font-mono tracking-widest text-[#94A3B8] uppercase">
              ERP Panel
            </span>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="p-4 space-y-1.5">
          <NavLink
            to="/"
            target="_blank"
            onClick={onNavigate}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all mb-4 border border-dashed border-white/10"
          >
            <Store className="w-4 h-4 text-[#E0A96D]" />
            <span>Ver Tienda Online ↗</span>
          </NavLink>

          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-3 pb-1">
            Módulos ERP
          </div>

          {allowedItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#E0A96D]/15 text-[#F7D794] border border-[#E0A96D]/30 shadow-lg shadow-[#E0A96D]/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-[rgba(255,255,255,0.06)] bg-black/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#E0A96D]/20 border border-[#E0A96D]/40 text-[#E0A96D] flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {user?.name?.slice(0, 2) || 'QS'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">{user?.name}</div>
              <div className="text-[10px] font-mono text-[#E0A96D]">{user?.role}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
