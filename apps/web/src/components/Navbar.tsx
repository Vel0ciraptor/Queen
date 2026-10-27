import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, LogIn, LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
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
    <header className="sticky top-2.5 sm:top-4 z-50 px-3 sm:px-6 max-w-6xl mx-auto w-full transition-all duration-300">
      {/* iPhone Glass Capsule Navbar */}
      <div className="ios-capsule-navbar flex items-center justify-between px-4 sm:px-6 h-16 sm:h-18 rounded-full">
        {/* Brand: QueenStyle + Tienda Online (Clean without crown for mobile perfection) */}
        <Link to="/" className="flex flex-col group transition-transform duration-200 hover:scale-105">
          <span className="font-serif text-xl sm:text-2xl font-black tracking-tight text-[var(--text-main)] leading-none">
            Queen<span className="text-[var(--pink-strong)]">Style</span>
          </span>
          <span className="block text-[8.5px] sm:text-[9.5px] tracking-[0.25em] text-[var(--pink-strong)] uppercase font-sans font-extrabold mt-0.5">
            Tienda Online
          </span>
        </Link>

        {/* Desktop Nav Controls */}
        <nav className="hidden md:flex items-center gap-5">
          <Link
            to="/"
            className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--pink-strong)] transition-all duration-200 hover:scale-105 active:scale-95"
          >
            Colección & Catálogo
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center gap-2.5">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--magenta-deep)] bg-[var(--pink-pastel)] hover:bg-[var(--pink-medium)]/30 dark:text-[var(--pink-strong)] dark:bg-[var(--pink-strong)]/20 border border-[var(--border)] px-3.5 py-2 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 shadow-xs"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Panel ERP ({user?.role})</span>
              </Link>

              <button
                onClick={handleLogout}
                className="text-xs text-[var(--text-dim)] hover:text-rose-500 flex items-center gap-1 p-2 rounded-full hover:bg-[var(--surface2)] transition-all duration-200 hover:scale-110 active:scale-95"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--pink-strong)] transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Acceso Personal</span>
            </Link>
          )}

          {/* Theme Toggle with iPhone touch-zoom */}
          <div className="transition-transform duration-200 hover:scale-110 active:scale-95">
            <ThemeToggle variant="compact" />
          </div>

          {/* Cart Bag Button — iOS Capsule Pill */}
          <button
            onClick={onOpenCart}
            className="relative px-3.5 py-2 rounded-full bg-gradient-to-r from-[var(--pink-strong)] to-[#e0007b] text-white transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
          >
            <ShoppingBag className="w-4 h-4 text-white" />
            <span className="text-xs font-extrabold hidden sm:inline">Bolsa</span>
            {itemCount > 0 && (
              <span className="w-4.5 h-4.5 rounded-full bg-white text-[var(--magenta-deep)] text-[10px] font-black flex items-center justify-center shadow-xs">
                {itemCount}
              </span>
            )}
          </button>
        </nav>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          <div className="transition-transform duration-200 hover:scale-110 active:scale-95">
            <ThemeToggle variant="compact" />
          </div>

          <button
            onClick={onOpenCart}
            className="relative p-2.5 rounded-full bg-gradient-to-r from-[var(--pink-strong)] to-[#e0007b] text-white shadow-md active:scale-95 transition-transform"
          >
            <ShoppingBag className="w-4 h-4 text-white" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-[var(--magenta-deep)] text-[10px] font-black flex items-center justify-center shadow-xs">
                {itemCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-main)] active:scale-95 transition-transform"
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Floating Glass Island Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 p-4 rounded-3xl border border-white/80 dark:border-white/15 bg-white/90 dark:bg-[#180d17]/95 backdrop-blur-3xl space-y-3 shadow-2xl animate-slideUp">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-bold text-[var(--text-main)] hover:text-[var(--pink-strong)] px-3 py-2 rounded-2xl hover:bg-[var(--surface2)]"
          >
            Catálogo & Tienda
          </Link>
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-bold text-[var(--pink-strong)] px-3 py-2 rounded-2xl bg-[var(--pink-pastel)]/30 dark:bg-[var(--pink-strong)]/20"
              >
                Panel ERP ({user?.role})
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="text-left w-full text-sm font-semibold text-rose-500 px-3 py-2 rounded-2xl hover:bg-rose-500/10"
              >
                Cerrar Sesión
              </button>
            </>
          ) : (
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-[var(--text-secondary)] px-3 py-2 rounded-2xl hover:bg-[var(--surface2)]"
            >
              Acceso Personal (Login)
            </Link>
          )}
        </div>
      )}
    </header>
  );
};
