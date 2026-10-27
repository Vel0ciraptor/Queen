import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Crown, LogIn, LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';

interface NavbarProps {
  onOpenCart: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenCart }) => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const itemCount = useCartStore((s) => s.getItemCount());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-[var(--surface)]/95 border-b border-[var(--border-subtle)] backdrop-blur-xl shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[var(--pink-strong)] via-[var(--pink-medium)] to-[var(--gold)] p-[1.5px] shadow-md shadow-[var(--pink-strong)]/20">
            <div className="w-full h-full bg-[var(--surface)] rounded-[10px] flex items-center justify-center transition-all duration-300">
              <Crown className="w-6 h-6 text-[var(--pink-strong)]" />
            </div>
          </div>
          <div>
            <span className="font-serif text-2xl font-bold tracking-wider text-[var(--text-main)] uppercase">
              Queen Style
            </span>
            <span className="block text-[10px] tracking-[0.25em] text-[var(--pink-strong)] uppercase font-sans font-bold">
              Haute Couture & ERP
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            to="/"
            className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--pink-strong)] transition-colors"
          >
            Colección & Catálogo
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 text-sm font-bold text-[var(--magenta-deep)] bg-[var(--pink-pastel)] hover:bg-[var(--pink-medium)]/30 dark:text-[var(--pink-strong)] dark:bg-[var(--pink-strong)]/15 border border-[var(--border)] px-4 py-2 rounded-xl transition-all shadow-xs"
              >
                <LayoutDashboard className="w-4 h-4" />
                Panel ERP ({user?.role})
              </Link>

              <button
                onClick={handleLogout}
                className="text-sm text-[var(--text-dim)] hover:text-rose-500 flex items-center gap-1 p-2 rounded-lg hover:bg-[var(--surface2)] transition-colors"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--pink-strong)] transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Acceso Personal
            </Link>
          )}

          {/* Theme Toggle */}
          <ThemeToggle variant="compact" />

          {/* Cart Bag Button */}
          <button
            onClick={onOpenCart}
            className="relative p-2.5 rounded-xl bg-[var(--surface2)] hover:bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--text-main)] transition-all flex items-center gap-2 shadow-xs"
          >
            <ShoppingBag className="w-5 h-5 text-[var(--pink-strong)]" />
            <span className="text-sm font-bold hidden sm:inline">Bolsa</span>
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[var(--pink-strong)] text-white text-xs font-bold flex items-center justify-center shadow-md animate-pulse">
                {itemCount}
              </span>
            )}
          </button>
        </nav>

        {/* Mobile menu button */}
        <div className="flex items-center gap-2.5 md:hidden">
          <ThemeToggle variant="compact" />

          <button
            onClick={onOpenCart}
            className="relative p-2 rounded-xl bg-[var(--surface2)] border border-[var(--border-subtle)] text-[var(--pink-strong)] shadow-xs"
          >
            <ShoppingBag className="w-5 h-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--pink-strong)] text-white text-[10px] font-bold flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-main)]"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-2 pb-6 border-t border-[var(--border-subtle)] bg-[var(--surface)]/98 backdrop-blur-2xl space-y-4 shadow-lg">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-bold text-[var(--text-main)] hover:text-[var(--pink-strong)]"
          >
            Catálogo Boutique
          </Link>
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-base font-bold text-[var(--pink-strong)]"
              >
                Panel ERP ({user?.role})
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="text-left w-full text-base font-semibold text-rose-500"
              >
                Cerrar Sesión
              </button>
            </>
          ) : (
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-semibold text-[var(--text-secondary)]"
            >
              Acceso Personal (Login)
            </Link>
          )}
        </div>
      )}
    </header>
  );
};
