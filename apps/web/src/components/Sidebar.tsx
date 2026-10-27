import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Package,
  DollarSign,
  BarChart3,
  ScanBarcode,
  Users,
  Crown,
  LogOut,
  Store,
  Tag,
  FolderTree,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
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
    { to: '/dashboard/sales', label: 'Ventas', icon: ShoppingCart, roles: ['ADMIN', 'PROMOTORA'] },
    { to: '/dashboard/inventory', label: 'Inventario & Stock', icon: Package, roles: ['ADMIN', 'PROMOTORA'] },
    { to: '/dashboard/products', label: 'Productos', icon: Tag, roles: ['ADMIN', 'PROMOTORA'] },
    { to: '/dashboard/categories', label: 'Categorías', icon: FolderTree, roles: ['ADMIN', 'PROMOTORA'] },
    { to: '/dashboard/qr', label: 'Etiquetas', icon: ScanBarcode, roles: ['ADMIN', 'PROMOTORA'] },
    { to: '/dashboard/finance', label: 'Finanzas & Caja', icon: DollarSign, roles: ['ADMIN'] },
    { to: '/dashboard/reports', label: 'Reportes & KPIs', icon: BarChart3, roles: ['ADMIN'] },
    { to: '/dashboard/users', label: 'Equipo & Usuarios', icon: Users, roles: ['ADMIN'] },
  ];

  const allowedItems = navItems.filter((item) =>
    user?.role ? item.roles.includes(user.role) : true
  );

  return (
    <aside className="w-64 h-screen bg-[var(--surface)] border-r border-[var(--border-subtle)] flex flex-col justify-between overflow-y-auto transition-colors duration-200">
      <div>
        {/* Brand */}
        <div className="p-5 border-b border-[var(--border-subtle)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[var(--pink-strong)] via-[var(--pink-medium)] to-[var(--gold)] p-[1.5px] shadow-md shadow-[var(--pink-strong)]/20">
            <div className="w-full h-full bg-[var(--surface)] rounded-[10px] flex items-center justify-center">
              <Crown className="w-5 h-5 text-[var(--pink-strong)]" />
            </div>
          </div>
          <div>
            <h1 className="font-serif font-bold text-[var(--text-main)] text-lg tracking-wider">
              Queen Style
            </h1>
            <span className="text-[10px] font-mono font-bold tracking-widest text-[var(--pink-strong)] uppercase">
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
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--pink-strong)] hover:bg-[var(--surface2)] transition-all mb-4 border border-dashed border-[var(--border-subtle)] shadow-xs"
          >
            <Store className="w-4 h-4 text-[var(--pink-strong)]" />
            <span>Ver Tienda Online ↗</span>
          </NavLink>

          <div className="text-[10px] uppercase font-extrabold text-[var(--text-dim)] tracking-wider px-3 pb-1">
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
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-[var(--pink-pastel)] text-[var(--magenta-deep)] border border-[var(--border)] shadow-sm dark:bg-[var(--pink-strong)]/20 dark:text-[var(--pink-strong)] dark:border-[var(--pink-strong)]/30'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--surface2)]'
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

      {/* Footer with ThemeToggle & User Profile */}
      <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--surface2)] space-y-3">
        {/* Dark/Light mode switcher */}
        <ThemeToggle variant="expanded" />

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[var(--pink-pastel)] border border-[var(--pink-strong)]/40 text-[var(--magenta-deep)] dark:bg-[var(--pink-strong)]/20 dark:text-[var(--pink-strong)] flex items-center justify-center font-bold text-xs uppercase shrink-0 shadow-xs">
              {user?.name?.slice(0, 2) || 'QS'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-[var(--text-main)] truncate">{user?.name}</div>
              <div className="text-[10px] font-mono font-semibold text-[var(--pink-strong)]">{user?.role}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 text-[var(--text-dim)] hover:text-rose-500 rounded-lg hover:bg-[var(--surface)] transition-all"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
