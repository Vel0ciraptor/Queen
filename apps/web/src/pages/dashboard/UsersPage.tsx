import React, { useEffect, useState } from 'react';
import { Users, Plus, Pencil, UserCheck, UserX, ShieldCheck, Search } from 'lucide-react';
import api from '../../lib/api';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, PageLoader } from '../../components/ui/Feedback';
import { toast } from '../../components/ui/Toast';
import { getApiErrorMessage } from '../../lib/errors';
import { initials, shortDate } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';

interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'PROMOTORA';
  isActive: boolean;
  createdAt?: string;
  lastLoginAt?: string | null;
}

const emptyForm = { name: '', email: '', password: '', role: 'PROMOTORA' as 'ADMIN' | 'PROMOTORA' };

export const UsersPage: React.FC = () => {
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeamUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(Array.isArray(res.data) ? res.data : res.data.items ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudieron cargar los usuarios'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase()),
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (user: TeamUser) => {
    setEditing(user);
    setForm({ name: user.name, email: user.email, password: '', role: user.role });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const payload: Record<string, unknown> = {
          name: form.name,
          email: form.email,
          role: form.role,
        };
        if (form.password) payload.password = form.password;
        await api.patch(`/users/${editing.id}`, payload);
        toast.success('Usuario actualizado');
      } else {
        await api.post('/users', form);
        toast.success('Usuario creado correctamente');
      }
      setIsFormOpen(false);
      await fetchUsers();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo guardar el usuario'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user: TeamUser) => {
    if (user.id === currentUser?.id) {
      toast.error('No puedes desactivar tu propia cuenta');
      return;
    }
    try {
      await api.patch(`/users/${user.id}`, { isActive: !user.isActive });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u)));
      toast.success(user.isActive ? 'Usuario desactivado' : 'Usuario reactivado');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo actualizar el estado'));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-bold text-white">Equipo & Usuarios</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {users.length} miembros · {users.filter((u) => u.isActive).length} activos
          </p>
        </div>
        <button onClick={openCreate} className="btn-gold text-sm px-4 py-2.5">
          <Plus className="w-4 h-4" /> Nuevo usuario
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email o rol…"
          className="input-luxury text-sm pl-9"
        />
      </div>

      <div className="glass-card rounded-2xl overflow-hidden border border-white/[0.06]">
        {loading ? (
          <PageLoader label="Cargando equipo…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title="Sin usuarios"
            description="Agrega integrantes de tu equipo para asignarles roles."
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="table-luxury">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Registro</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#E0A96D]/15 border border-[#E0A96D]/30 text-[#E0A96D] flex items-center justify-center text-xs font-bold shrink-0">
                            {initials(user.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-white truncate">
                              {user.name}
                              {user.id === currentUser?.id && (
                                <span className="ml-2 text-[10px] text-[#E0A96D]">tú</span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 truncate">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${user.role === 'ADMIN' ? 'badge-gold' : 'badge-neutral'}`}>
                          {user.role === 'ADMIN' ? 'Admin' : 'Promotora'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                          {user.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="text-xs text-slate-400">{shortDate(user.createdAt)}</td>
                      <td>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(user)}
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleActive(user)}
                            className={`p-2 rounded-lg transition-colors hover:bg-white/5 ${
                              user.isActive ? 'text-slate-400 hover:text-rose-400' : 'text-emerald-400'
                            }`}
                            title={user.isActive ? 'Desactivar' : 'Reactivar'}
                          >
                            {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-white/[0.05]">
              {filtered.map((user) => (
                <div key={user.id} className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#E0A96D]/15 border border-[#E0A96D]/30 text-[#E0A96D] flex items-center justify-center text-xs font-bold shrink-0">
                      {initials(user.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{user.name}</div>
                      <div className="text-xs text-slate-500 truncate">{user.email}</div>
                    </div>
                    <span className={`badge ${user.role === 'ADMIN' ? 'badge-gold' : 'badge-neutral'}`}>
                      {user.role === 'ADMIN' ? 'Admin' : 'Promotora'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {user.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                    <div className="flex gap-1.5">
                      <button onClick={() => openEdit(user)} className="btn-secondary text-xs px-3 py-1.5">
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </button>
                      <button
                        onClick={() => toggleActive(user)}
                        className={user.isActive ? 'btn-danger text-xs px-3 py-1.5' : 'btn-secondary text-xs px-3 py-1.5'}
                      >
                        {user.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        {user.isActive ? 'Desactivar' : 'Reactivar'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editing ? 'Editar usuario' : 'Nuevo usuario'}
        icon={<ShieldCheck className="w-5 h-5 text-[#E0A96D]" />}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Nombre completo *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              placeholder="Ej. Ana Pérez"
              className="input-luxury text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              placeholder="ana@queenstyle.com"
              className="input-luxury text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Contraseña {editing ? '(dejar vacío para mantener)' : '*'}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required={!editing}
              minLength={6}
              placeholder={editing ? '••••••••' : 'Mínimo 6 caracteres'}
              className="input-luxury text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Rol</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'ADMIN' | 'PROMOTORA' }))}
              className="input-luxury text-sm"
            >
              <option value="PROMOTORA">Promotora — ventas e inventario</option>
              <option value="ADMIN">Administrador — acceso total</option>
            </select>
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
              {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
