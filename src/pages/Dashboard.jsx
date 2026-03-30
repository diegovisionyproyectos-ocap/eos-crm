import { useEffect } from 'react';
import { DollarSign, TrendingUp, Building2, CheckCircle2, XCircle, Zap } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import Layout from '../components/layout/Layout';
import KPICard from '../components/ui/KPICard';
import ActivityFeed from '../modules/activities/ActivityFeed';
import Button from '../components/ui/Button';
import { formatCurrency } from '../utils/formatters';
import { PIPELINE_STAGES } from '../utils/constants';
import useCRMStore from '../store/useCRMStore';
import useAppStore from '../store/useAppStore';

export default function Dashboard() {
  const { opportunities, companies, activities, initialize } = useCRMStore();
  const { openModal, addToast } = useAppStore();

  useEffect(() => { initialize(); }, []);

  // ── Metrics ──────────────────────────────────────────────────────────────────
  const totalPipeline = opportunities
    .filter((o) => o.stage !== 'perdido')
    .reduce((sum, o) => sum + (o.value || 0), 0);

  const weighted = opportunities
    .filter((o) => o.stage !== 'perdido')
    .reduce((sum, o) => sum + (o.value || 0) * ((o.probability || 0) / 100), 0);

  const won = opportunities
    .filter((o) => o.stage === 'ganado')
    .reduce((sum, o) => sum + (o.value || 0), 0);

  const activeOpps = opportunities.filter((o) => !['ganado', 'perdido'].includes(o.stage)).length;
  const activeCompanies = companies.filter((c) => c.status === 'active').length;

  // ── Funnel chart data ─────────────────────────────────────────────────────────
  const funnelData = PIPELINE_STAGES.slice(0, 7).map((stage) => ({
    name: stage.label.split(' ')[0],
    value: opportunities.filter((o) => o.stage === stage.id).length,
    color: stage.color,
  })).filter((d) => d.value > 0);

  // ── Pipeline value by stage ───────────────────────────────────────────────────
  const stageValueData = PIPELINE_STAGES.slice(0, 6).map((stage) => ({
    name: stage.label.split(' ')[0],
    value: opportunities
      .filter((o) => o.stage === stage.id)
      .reduce((sum, o) => sum + (o.value || 0), 0),
    color: stage.color,
  })).filter((d) => d.value > 0);

  // ── Status distribution ───────────────────────────────────────────────────────
  const statusData = [
    { name: 'Activos', value: activeCompanies, color: '#22c55e' },
    { name: 'Prospectos', value: companies.filter((c) => c.status === 'prospect').length, color: '#6366f1' },
    { name: 'Inactivos', value: companies.filter((c) => c.status === 'inactive').length, color: '#94a3b8' },
    { name: 'Perdidos', value: companies.filter((c) => c.status === 'lost').length, color: '#ef4444' },
  ].filter((d) => d.value > 0);

  return (
    <Layout title="Dashboard">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Pipeline total"
          value={formatCurrency(totalPipeline, true)}
          subtitle="Oportunidades activas"
          icon={DollarSign}
          color="indigo"
        />
        <KPICard
          title="Pipeline ponderado"
          value={formatCurrency(weighted, true)}
          subtitle="Ajustado por probabilidad"
          icon={TrendingUp}
          color="cyan"
        />
        <KPICard
          title="Ingresos ganados"
          value={formatCurrency(won, true)}
          subtitle={`${opportunities.filter((o) => o.stage === 'ganado').length} contratos cerrados`}
          icon={CheckCircle2}
          color="green"
        />
        <KPICard
          title="Colegios activos"
          value={activeCompanies}
          subtitle={`${companies.length} en total`}
          icon={Building2}
          color="amber"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Funnel / Stage count */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Embudo de ventas</h2>
              <p className="text-xs text-slate-400">{activeOpps} oportunidades activas</p>
            </div>
          </div>
          {funnelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={funnelData} barSize={28}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: 12 }}
                  formatter={(v) => [v, 'Oportunidades']}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {funnelData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </div>

        {/* Pipeline value by stage */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Valor por etapa</h2>
              <p className="text-xs text-slate-400">Distribución del pipeline en COP</p>
            </div>
          </div>
          {stageValueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stageValueData} barSize={28}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: 12 }}
                  formatter={(v) => [
                    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v),
                    'Valor',
                  ]}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {stageValueData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </div>
      </div>

      {/* Activity feed + Quick actions + Status donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity feed */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-card p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Actividad reciente</h2>
          <ActivityFeed limit={8} />
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Company status donut */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Colegios por estado</h2>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: 12 }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>

          {/* Quick actions */}
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} />
              <h2 className="text-sm font-semibold">Acciones rápidas</h2>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => openModal('opportunityForm')}
                className="w-full text-left text-sm px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors font-medium"
              >
                + Nueva oportunidad
              </button>
              <button
                onClick={() => openModal('companyForm')}
                className="w-full text-left text-sm px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors font-medium"
              >
                + Registrar colegio
              </button>
              <button
                onClick={() => openModal('activityForm')}
                className="w-full text-left text-sm px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors font-medium"
              >
                + Registrar actividad
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function EmptyChart() {
  return (
    <div className="h-[200px] flex items-center justify-center">
      <p className="text-sm text-slate-400">Sin datos suficientes</p>
    </div>
  );
}
