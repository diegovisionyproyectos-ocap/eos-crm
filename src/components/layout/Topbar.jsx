import { Search, Bell, Plus, LogOut } from 'lucide-react';
import { useState } from 'react';
import useAppStore from '../../store/useAppStore';
import { getInitials } from '../../utils/formatters';
import clsx from 'clsx';

const ROLE_LABEL = { admin: 'Admin', seller: 'Vendedor' };
const ROLE_COLOR = { admin: 'text-purple-600 bg-purple-50', seller: 'text-indigo-600 bg-indigo-50' };

export default function Topbar({ title, actions }) {
  const { profile, openModal, logout } = useAppStore();
  const [search, setSearch] = useState('');

  const roleLabel = ROLE_LABEL[profile?.role] || 'Vendedor';
  const roleColor = ROLE_COLOR[profile?.role] || ROLE_COLOR.seller;

  return (
    <header className="flex-shrink-0 h-16 bg-white border-b border-slate-100 flex items-center gap-4 px-6 shadow-sm z-10">
      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold text-slate-900 truncate">{title}</h1>
      </div>

      {/* Search */}
      <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-64 focus-within:ring-2 focus-within:ring-indigo-400 focus-within:border-transparent transition-all">
        <Search size={15} className="text-slate-400 flex-shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar colegios, oportunidades…"
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-slate-400 text-slate-700 min-w-0"
        />
      </div>

      {/* Page actions */}
      {actions && <div className="flex items-center gap-2">{actions}</div>}

      {/* Quick add — only for admin or if no role restriction */}
      <button
        onClick={() => openModal('opportunityForm')}
        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
      >
        <Plus size={15} />
        <span className="hidden sm:inline">Nueva oportunidad</span>
      </button>

      {/* Notifications */}
      <button className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
        <Bell size={18} />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
      </button>

      {/* User info + logout */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 p-1.5 rounded-lg">
          <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center text-white text-[11px] font-bold">
            {getInitials(profile?.full_name || profile?.email || '?')}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-slate-700 leading-tight">
              {profile?.full_name || profile?.email || 'Usuario'}
            </p>
            <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', roleColor)}>
              {roleLabel}
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          title="Cerrar sesión"
          className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
