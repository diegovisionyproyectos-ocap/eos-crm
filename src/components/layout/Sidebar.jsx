import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Kanban,
  Map,
  Building2,
  Users,
  CalendarCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  UserCog,
  LogOut,
  FileText,
} from 'lucide-react';
import clsx from 'clsx';
import useAppStore from '../../store/useAppStore';
import { getInitials } from '../../utils/formatters';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/pipeline', label: 'Pipeline', icon: Kanban },
  { to: '/mapa', label: 'Mapa', icon: Map },
  { to: '/colegios', label: 'Colegios', icon: Building2 },
  { to: '/contactos', label: 'Contactos', icon: Users },
  { to: '/actividades',   label: 'Actividades',   icon: CalendarCheck },
  { to: '/cotizaciones',  label: 'Cotizaciones',  icon: FileText },
];

const ROLE_LABEL = { admin: 'Admin', seller: 'Vendedor' };

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar, profile, isAdmin, logout } = useAppStore();
  const admin = isAdmin();

  return (
    <aside
      className={clsx(
        'flex-shrink-0 flex flex-col bg-[#0f172a] transition-all duration-300 ease-in-out h-full',
        sidebarOpen ? 'w-60' : 'w-16'
      )}
    >
      {/* Logo */}
      <div className={clsx('flex items-center gap-3 px-4 h-16 border-b border-white/5 flex-shrink-0', !sidebarOpen && 'justify-center px-2')}>
        <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
          <GraduationCap size={18} className="text-white" />
        </div>
        {sidebarOpen && (
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight">EOS CRM</p>
            <p className="text-slate-500 text-[10px] leading-tight">El Salvador</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 no-scrollbar space-y-0.5">
        {sidebarOpen && (
          <p className="px-3 mb-2 text-[10px] font-semibold tracking-widest uppercase text-slate-600">
            Principal
          </p>
        )}
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white',
                !sidebarOpen && 'justify-center px-2'
              )
            }
            title={!sidebarOpen ? label : undefined}
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className={clsx('flex-shrink-0', isActive ? 'text-white' : 'text-slate-400 group-hover:text-white')} />
                {sidebarOpen && <span className="truncate">{label}</span>}
              </>
            )}
          </NavLink>
        ))}

        {/* Admin-only section */}
        {admin && (
          <>
            {sidebarOpen && (
              <p className="px-3 mt-4 mb-2 text-[10px] font-semibold tracking-widest uppercase text-slate-600">
                Administración
              </p>
            )}
            <NavLink
              to="/equipo"
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                  isActive
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white',
                  !sidebarOpen && 'justify-center px-2'
                )
              }
              title={!sidebarOpen ? 'Equipo' : undefined}
            >
              {({ isActive }) => (
                <>
                  <UserCog size={18} className={clsx('flex-shrink-0', isActive ? 'text-white' : 'text-slate-400 group-hover:text-white')} />
                  {sidebarOpen && <span className="truncate">Equipo</span>}
                </>
              )}
            </NavLink>
          </>
        )}
      </nav>

      {/* Bottom — user + settings */}
      <div className="py-3 px-2 border-t border-white/5 space-y-0.5">
        <NavLink
          to="/ajustes"
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
              isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white',
              !sidebarOpen && 'justify-center px-2'
            )
          }
          title={!sidebarOpen ? 'Ajustes' : undefined}
        >
          <Settings size={18} className="flex-shrink-0" />
          {sidebarOpen && <span className="truncate">Ajustes</span>}
        </NavLink>

        {/* User profile strip */}
        {sidebarOpen && profile && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 mt-1 rounded-lg bg-white/5">
            <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
              {getInitials(profile.full_name || profile.email || '?')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate leading-tight">
                {profile.full_name || profile.email || 'Usuario'}
              </p>
              <p className={clsx(
                'text-[10px] font-medium leading-tight',
                profile.role === 'admin' ? 'text-purple-400' : 'text-slate-500'
              )}>
                {ROLE_LABEL[profile.role] || 'Vendedor'}
              </p>
            </div>
            <button
              onClick={logout}
              title="Cerrar sesión"
              className="text-slate-600 hover:text-red-400 transition-colors p-0.5"
            >
              <LogOut size={13} />
            </button>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className={clsx(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-all duration-150 text-sm font-medium',
            !sidebarOpen && 'justify-center px-2'
          )}
        >
          {sidebarOpen ? (
            <>
              <ChevronLeft size={18} className="flex-shrink-0" />
              <span>Colapsar</span>
            </>
          ) : (
            <ChevronRight size={18} />
          )}
        </button>
      </div>
    </aside>
  );
}
