import { useEffect, useState, useRef } from 'react';
import Layout from '../components/layout/Layout';
import { Users, MapPin, TrendingUp, UserCheck, Plus, Mail, Lock, X, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { getAllProfiles, updateProfileRole, registerUser } from '../services/authService';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import useAppStore from '../store/useAppStore';
import useCRMStore from '../store/useCRMStore';
import { formatRelativeTime, getInitials } from '../utils/formatters';
import maplibregl from 'maplibre-gl';
import { getMapStyle } from '../utils/mapHelpers';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '../utils/constants';
import clsx from 'clsx';

const ROLE_CONFIG = {
  admin: { label: 'Admin', color: 'text-purple-700', bg: 'bg-purple-100', dot: 'bg-purple-500' },
  seller: { label: 'Vendedor', color: 'text-indigo-700', bg: 'bg-indigo-100', dot: 'bg-indigo-500' },
};

export default function Team() {
  const { profile: currentProfile, isAdmin } = useAppStore();
  const { opportunities, activities } = useCRMStore();

  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(null);

  // ── Load team ──────────────────────────────────────────────
  const loadTeam = async () => {
    setLoading(true);
    const data = await getAllProfiles();
    setProfiles(data);
    setLoading(false);
  };

  useEffect(() => {
    loadTeam();
  }, []);

  // ── Realtime subscription for location updates ─────────────
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const channel = supabase
      .channel('team-locations')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'crm_profiles' },
        (payload) => {
          setProfiles((prev) =>
            prev.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } : p))
          );
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // ── Role change ────────────────────────────────────────────
  const handleRoleChange = async (profileId, newRole) => {
    if (!isAdmin()) return;
    setUpdatingRole(profileId);
    try {
      const updated = await updateProfileRole(profileId, newRole);
      if (updated) {
        setProfiles((prev) =>
          prev.map((p) => (p.id === profileId ? { ...p, role: newRole } : p))
        );
      }
    } finally {
      setUpdatingRole(null);
    }
  };

  // ── Stats per user ─────────────────────────────────────────
  const getStats = (userId) => {
    const userOpps = opportunities.filter((o) => o.owner_id === userId);
    const userActivities = activities.filter((a) => a.user_id === userId);
    const pipeline = userOpps
      .filter((o) => !['ganado', 'perdido'].includes(o.stage))
      .reduce((s, o) => s + (o.value || 0), 0);
    return { opps: userOpps.length, acts: userActivities.length, pipeline };
  };

  // ── Online status (seen < 5 min) ───────────────────────────
  const isOnline = (profile) => {
    if (!profile.last_seen) return false;
    return Date.now() - new Date(profile.last_seen).getTime() < 5 * 60 * 1000;
  };

  const onlineCount = profiles.filter(isOnline).length;

  return (
    <Layout title="Equipo de ventas">
      {/* Header stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Total miembros" value={profiles.length} color="indigo" />
        <StatCard icon={Wifi} label="En línea ahora" value={onlineCount} color="green" />
        <StatCard
          icon={TrendingUp}
          label="Oportunidades activas"
          value={opportunities.filter((o) => !['ganado', 'perdido'].includes(o.stage)).length}
          color="amber"
        />
        <StatCard
          icon={UserCheck}
          label="Vendedores"
          value={profiles.filter((p) => p.role === 'seller').length}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Team list */}
        <div className="xl:col-span-2 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-slate-700">Miembros del equipo</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={loadTeam}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Recargar"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
              {isAdmin() && (
                <button
                  onClick={() => setShowInvite(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus size={13} />
                  Crear cuenta
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-slate-100 rounded w-32" />
                      <div className="h-3 bg-slate-100 rounded w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : profiles.length === 0 ? (
            <EmptyTeam />
          ) : (
            profiles.map((p) => {
              const stats = getStats(p.id);
              const online = isOnline(p);
              const roleCfg = ROLE_CONFIG[p.role] || ROLE_CONFIG.seller;
              const isMe = p.id === currentProfile?.id;

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                        {getInitials(p.full_name || p.email || '?')}
                      </div>
                      <span
                        className={clsx(
                          'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
                          online ? 'bg-green-500' : 'bg-slate-300'
                        )}
                        title={online ? 'En línea' : 'Desconectado'}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 text-sm truncate">
                          {p.full_name || 'Sin nombre'}
                        </span>
                        {isMe && (
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                            Tú
                          </span>
                        )}
                        <span className={clsx('text-[11px] font-medium px-2 py-0.5 rounded-full', roleCfg.bg, roleCfg.color)}>
                          {roleCfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{p.email || '—'}</p>

                      {/* Location */}
                      <div className="flex items-center gap-3 mt-2">
                        {p.last_seen ? (
                          <div className={clsx('flex items-center gap-1 text-xs', online ? 'text-green-600' : 'text-slate-400')}>
                            {online ? <Wifi size={11} /> : <WifiOff size={11} />}
                            {online ? 'En línea' : formatRelativeTime(p.last_seen)}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300 flex items-center gap-1">
                            <MapPin size={11} />
                            Sin ubicación
                          </span>
                        )}
                        {p.last_lat && p.last_lng && (
                          <span className="text-xs text-slate-400 font-mono">
                            {Number(p.last_lat).toFixed(4)}, {Number(p.last_lng).toFixed(4)}
                          </span>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 mt-2.5 pt-2.5 border-t border-slate-50">
                        <Stat label="Oportunidades" value={stats.opps} />
                        <Stat label="Actividades" value={stats.acts} />
                        <Stat
                          label="Pipeline"
                          value={`$${(stats.pipeline / 1000).toFixed(0)}K`}
                        />
                      </div>
                    </div>

                    {/* Role toggle (admin only, not self) */}
                    {isAdmin() && !isMe && (
                      <div className="flex-shrink-0">
                        <select
                          value={p.role || 'seller'}
                          disabled={updatingRole === p.id}
                          onChange={(e) => handleRoleChange(p.id, e.target.value)}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 bg-white hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer disabled:opacity-50"
                        >
                          <option value="seller">Vendedor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Live map */}
        <div className="xl:col-span-1">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Ubicaciones en tiempo real</h2>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden" style={{ height: 420 }}>
            <TeamMap profiles={profiles} />
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">
            Actualización cada 30 s · Requiere permiso de ubicación
          </p>
        </div>
      </div>

      {/* Invite modal */}
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onSuccess={loadTeam} />}
    </Layout>
  );
}

// ── Small stat chip ──────────────────────────────────────────
function Stat({ label, value }) {
  return (
    <div>
      <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-xs font-bold text-slate-700">{value}</p>
    </div>
  );
}

// ── KPI stat card ────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
      <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', colors[color])}>
        <Icon size={17} />
      </div>
      <div>
        <p className="text-xl font-bold text-slate-900 leading-none">{value}</p>
        <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────
function EmptyTeam() {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-3">
        <Users size={22} className="text-slate-300" />
      </div>
      <p className="text-slate-500 font-medium">No hay miembros del equipo</p>
      <p className="text-slate-400 text-sm mt-1">
        Conecta Supabase y crea cuentas para tu equipo.
      </p>
    </div>
  );
}

// ── Mini MapLibre map for team locations ─────────────────────
function TeamMap({ profiles }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: getMapStyle(),
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
      attributionControl: false,
    });
    map.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    return () => { map.current?.remove(); map.current = null; };
  }, []);

  // Render a DOM marker for each profile with location
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    const renderMarkers = () => {
      markersRef.current.forEach((mk) => mk.remove());
      markersRef.current = [];

      const withLocation = profiles.filter((p) => p.last_lat && p.last_lng);
      if (withLocation.length === 0) return;

      withLocation.forEach((p) => {
        const el = document.createElement('div');
        el.style.cssText = `
          width:32px;height:32px;border-radius:50%;
          background:${p.role === 'admin' ? '#7c3aed' : '#4f46e5'};
          border:3px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.25);
          display:flex;align-items:center;justify-content:center;
          color:white;font-size:11px;font-weight:700;
          font-family:Inter,sans-serif;cursor:default;
        `;
        el.textContent = getInitials(p.full_name || p.email || '?');

        // Online pulse ring
        const online = p.last_seen && Date.now() - new Date(p.last_seen).getTime() < 5 * 60 * 1000;
        if (online) {
          el.style.outline = '3px solid rgba(34,197,94,0.6)';
          el.style.outlineOffset = '2px';
        }

        const popup = new maplibregl.Popup({ offset: 18, closeButton: false })
          .setHTML(`
            <div style="font-family:Inter,sans-serif;padding:8px 10px;font-size:12px">
              <strong style="color:#0f172a">${p.full_name || 'Sin nombre'}</strong>
              <div style="color:#64748b;margin-top:2px">${p.role === 'admin' ? 'Admin' : 'Vendedor'}</div>
              ${p.last_seen ? `<div style="color:#94a3b8;font-size:11px;margin-top:4px">${online ? '🟢 En línea' : '⚪ ' + formatRelativeTime(p.last_seen)}</div>` : ''}
            </div>
          `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([p.last_lng, p.last_lat])
          .setPopup(popup)
          .addTo(m);

        markersRef.current.push(marker);
      });

      // Fit bounds to all markers
      if (withLocation.length === 1) {
        m.flyTo({ center: [withLocation[0].last_lng, withLocation[0].last_lat], zoom: 13 });
      } else if (withLocation.length > 1) {
        const lngs = withLocation.map((p) => p.last_lng);
        const lats = withLocation.map((p) => p.last_lat);
        m.fitBounds(
          [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
          { padding: 60, maxZoom: 14, duration: 1000 }
        );
      }
    };

    if (m.isStyleLoaded()) {
      renderMarkers();
    } else {
      m.once('load', renderMarkers);
    }
  }, [profiles]);

  return <div ref={mapContainer} className="w-full h-full" />;
}

// ── Invite / Create user modal ───────────────────────────────
function InviteModal({ onClose, onSuccess }) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      setError('Completa todos los campos.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await registerUser(email, password, fullName);
      setSuccess(true);
      setTimeout(() => { onClose(); onSuccess(); }, 2000);
    } catch (err) {
      setError(err.message || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-slate-900">Crear cuenta de vendedor</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <UserCheck size={22} className="text-green-600" />
            </div>
            <p className="font-medium text-slate-900">¡Cuenta creada!</p>
            <p className="text-sm text-slate-500 mt-1">
              El usuario debe confirmar su correo antes de iniciar sesión.
            </p>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombre completo</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="María García"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                <Mail size={12} className="inline mr-1" />Correo
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vendedor@eos.com.sv"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                <Lock size={12} className="inline mr-1" />Contraseña temporal
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            {error && (
              <p className="text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Crear cuenta'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
