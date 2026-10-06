import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Crown, LogIn, LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
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
    <header className="sticky top-0 z-50 glass-panel border-b border-[rgba(255,255,255,0.08)] backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#E0A96D] via-[#F7D794] to-[#C48B4B] p-[1.5px] shadow-lg shadow-[#E0A96D]/20">
            <div className="w-full h-full bg-[#12121C] rounded-[10px] flex items-center justify-center group-hover:bg-transparent transition-all duration-300">
              <Crown className="w-6 h-6 text-[#E0A96D] group-hover:text-[#12121C] transition-colors" />
            </div>
          </div>
          <div>
            <span className="font-serif text-2xl font-bold tracking-wider gold-text uppercase">
              Queen Style
            </span>
            <span className="block text-[10px] tracking-[0.25em] text-[#94A3B8] uppercase font-sans">
              Haute Couture & ERP
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            to="/"
            className="text-sm font-medium text-[#F8FAFC] hover:text-[#E0A96D] transition-colors"
          >
            Colección & Catálogo
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#E0A96D] bg-[#E0A96D]/10 hover:bg-[#E0A96D]/20 border border-[#E0A96D]/30 px-4 py-2 rounded-lg transition-all"
              >
                <LayoutDashboard className="w-4 h-4" />
                Panel ERP ({user?.role})
              </Link>

              <button
                onClick={handleLogout}
                className="text-sm text-[#94A3B8] hover:text-[#F43F5E] flex items-center gap-1 transition-colors"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Acceso Personal
            </Link>
          )}

          {/* Cart Bag Button */}
          <button
            onClick={onOpenCart}
            className="relative p-2.5 rounded-xl bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] transition-all flex items-center gap-2"
          >
            <ShoppingBag className="w-5 h-5 text-[#E0A96D]" />
            <span className="text-sm font-medium hidden sm:inline">Bolsa</span>
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#E0A96D] text-[#12121C] text-xs font-bold flex items-center justify-center shadow-md animate-pulse">
                {itemCount}
              </span>
            )}
          </button>
        </nav>

        {/* Mobile menu button */}
        <div className="flex items-center gap-3 md:hidden">
          <button
            onClick={onOpenCart}
            className="relative p-2 rounded-lg bg-[rgba(255,255,255,0.05)] text-[#E0A96D]"
          >
            <ShoppingBag className="w-5 h-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E0A96D] text-[#12121C] text-[10px] font-bold flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#94A3B8] hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-2 pb-6 border-t border-[rgba(255,255,255,0.08)] bg-[#12121C]/95 backdrop-blur-2xl space-y-4">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-white hover:text-[#E0A96D]"
          >
            Catálogo Boutique
          </Link>
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-base font-medium text-[#E0A96D]"
              >
                Panel ERP ({user?.role})
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="text-left w-full text-base font-medium text-rose-400"
              >
                Cerrar Sesión
              </button>
            </>
          ) : (
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-slate-300"
            >
              Acceso Personal (Login)
            </Link>
          )}
        </div>
      )}
    </header>
  );
};
