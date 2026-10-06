import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Crown, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard/pos';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/login', { email, password });
      const payload = res.data?.data ?? res.data ?? {};
      const { user, accessToken } = payload;
      if (!accessToken || !user) {
        setError('Respuesta inválida del servidor. Intenta de nuevo.');
        return;
      }
      login(user, accessToken);
      navigate(from, { replace: true });
    } catch (err: any) {
      // Offline / Demo fallback authentication if API is not running yet
      if (email === 'admin@queenstyle.com' && password === 'Admin123!') {
        login(
          {
            id: 'mock-admin',
            email: 'admin@queenstyle.com',
            name: 'Administradora Queen',
            role: 'ADMIN',
            isActive: true,
          },
          'mock-jwt-admin-token'
        );
        navigate(from, { replace: true });
      } else if (email === 'promotora@queenstyle.com' && password === 'Promotora123!') {
        login(
          {
            id: 'mock-promotora',
            email: 'promotora@queenstyle.com',
            name: 'Ana Promotora',
            role: 'PROMOTORA',
            isActive: true,
          },
          'mock-jwt-promotora-token'
        );
        navigate('/dashboard/pos', { replace: true });
      } else {
        setError('Credenciales inválidas. Verifica tu correo y contraseña.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (role: 'ADMIN' | 'PROMOTORA') => {
    if (role === 'ADMIN') {
      setEmail('admin@queenstyle.com');
      setPassword('Admin123!');
    } else {
      setEmail('promotora@queenstyle.com');
      setPassword('Promotora123!');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#E0A96D]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#FF6B81]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo and Brand */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 group mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#E0A96D] to-[#C48B4B] p-[1.5px] shadow-xl shadow-[#E0A96D]/20">
              <div className="w-full h-full bg-[#12121C] rounded-[14px] flex items-center justify-center">
                <Crown className="w-7 h-7 text-[#E0A96D]" />
              </div>
            </div>
          </Link>
          <h1 className="font-serif text-3xl font-bold text-white tracking-wide">
            Queen Style <span className="gold-text">ERP</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-mono">
            Acceso a Personal & Administración
          </p>
        </div>

        {/* Login Glass Card */}
        <div className="glass-card p-8 rounded-3xl border border-white/10 bg-[#12121C]/90 shadow-2xl space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="admin@queenstyle.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-luxury text-sm pl-10 pr-4 py-3 rounded-xl w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-luxury text-sm pl-10 pr-4 py-3 rounded-xl w-full"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 mt-2"
            >
              <span>{loading ? 'Verificando...' : 'Iniciar Sesión'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Fill Demo Badges */}
          <div className="pt-4 border-t border-white/[0.08] space-y-3">
            <div className="text-[11px] text-slate-400 text-center font-medium">
              Acceso rápido para demostración:
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('ADMIN')}
                className="p-2 rounded-xl bg-white/[0.04] hover:bg-[#E0A96D]/15 border border-white/[0.08] hover:border-[#E0A96D]/40 text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white group-hover:text-[#F7D794]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#E0A96D]" />
                  <span>Admin</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">Control Total</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('PROMOTORA')}
                className="p-2 rounded-xl bg-white/[0.04] hover:bg-[#E0A96D]/15 border border-white/[0.08] hover:border-[#E0A96D]/40 text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white group-hover:text-[#F7D794]">
                  <UserCheck className="w-3.5 h-3.5 text-[#FF6B81]" />
                  <span>Promotora</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">POS & Stock</div>
              </button>
            </div>
          </div>
        </div>

        {/* Back to store link */}
        <div className="text-center mt-6">
          <Link to="/" className="text-xs text-slate-400 hover:text-white transition-colors">
            ← Volver a la Tienda Pública
          </Link>
        </div>
      </div>
    </div>
  );
};
