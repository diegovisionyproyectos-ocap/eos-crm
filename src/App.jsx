import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import useAppStore from './store/useAppStore';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Pipeline from './pages/Pipeline';
import MapPage from './pages/Map';
import Companies from './pages/Companies';
import Contacts from './pages/Contacts';
import Activities from './pages/Activities';
import Settings from './pages/Settings';
import Team from './pages/Team';
import Expediente from './pages/Expediente';

// Global modal forms
import OpportunityForm from './modules/pipeline/OpportunityForm';
import CompanyForm from './modules/companies/CompanyForm';
import ActivityForm from './modules/activities/ActivityForm';

export default function App() {
  const { initAuth } = useAppStore();

  useEffect(() => {
    initAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BrowserRouter>
      <GlobalModals />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected — any authenticated user */}
        <Route path="/" element={<AuthGuard><Dashboard /></AuthGuard>} />
        <Route path="/pipeline" element={<AuthGuard><Pipeline /></AuthGuard>} />
        <Route path="/mapa" element={<AuthGuard><MapPage /></AuthGuard>} />
        <Route path="/colegios" element={<AuthGuard><Companies /></AuthGuard>} />
        <Route path="/contactos" element={<AuthGuard><Contacts /></AuthGuard>} />
        <Route path="/actividades" element={<AuthGuard><Activities /></AuthGuard>} />
        <Route path="/ajustes" element={<AuthGuard><Settings /></AuthGuard>} />
        <Route path="/expediente/:companyId" element={<AuthGuard><Expediente /></AuthGuard>} />

        {/* Admin only */}
        <Route path="/equipo" element={<AuthGuard adminOnly><Team /></AuthGuard>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// ── Auth guard ────────────────────────────────────────────────
function AuthGuard({ children, adminOnly = false }) {
  const { isAuthenticated, authLoading, profile } = useAppStore();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Cargando…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}

// ── Global modals ─────────────────────────────────────────────
function GlobalModals() {
  return (
    <>
      <OpportunityForm />
      <CompanyForm />
      <ActivityForm />
    </>
  );
}
