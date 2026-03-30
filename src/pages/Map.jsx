import { useEffect } from 'react';
import { Layers, Thermometer, Navigation, Building2, X } from 'lucide-react';
import clsx from 'clsx';
import Layout from '../components/layout/Layout';
import MapView from '../modules/map/MapView';
import CompanyCard from '../modules/companies/CompanyCard';
import { COMPANY_STATUS } from '../utils/constants';
import useCRMStore from '../store/useCRMStore';
import useAppStore from '../store/useAppStore';

const MAP_MODES = [
  { id: 'markers', label: 'Marcadores', icon: Building2 },
  { id: 'heatmap', label: 'Heatmap', icon: Thermometer },
  { id: 'routes', label: 'Rutas', icon: Navigation },
];

export default function MapPage() {
  const { companies, opportunities, initialize } = useCRMStore();
  const { mapMode, setMapMode, selectedMapCompanyId, setSelectedMapCompanyId, openModal } = useAppStore();

  useEffect(() => { initialize(); }, []);

  const selectedCompany = companies.find((c) => c.id === selectedMapCompanyId);
  const companyOpps = selectedCompany
    ? opportunities.filter((o) => o.company_id === selectedCompany.id)
    : [];

  return (
    <Layout
      title="Mapa de Colegios"
      actions={
        <button
          onClick={() => openModal('companyForm')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          + Colegio
        </button>
      }
    >
      <div className="flex gap-4 h-[calc(100vh-160px)]">
        {/* Map */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {/* Mode toggles */}
          <div className="flex items-center gap-2">
            {MAP_MODES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setMapMode(id)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                  mapMode === id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                )}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}

            {/* Legend */}
            <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-green-500 ring-2 ring-white ring-offset-1 shadow" />
                Cliente activo
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-indigo-500 ring-2 ring-white ring-offset-1 shadow" />
                Prospecto
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-orange-500 ring-2 ring-white ring-offset-1 shadow" />
                Negociación
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-white ring-offset-1 shadow" />
                Perdido
              </span>
            </div>
          </div>

          {/* Map container */}
          <div className="flex-1 rounded-xl overflow-hidden shadow-card border border-slate-100">
            <MapView onCompanyClick={setSelectedMapCompanyId} />
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-4 text-xs text-slate-500 px-1">
            <span>{companies.filter((c) => c.lat && c.lng).length} colegios en mapa</span>
            <span>·</span>
            <span>{companies.filter((c) => c.status === 'active').length} clientes activos</span>
            <span>·</span>
            <span>{companies.filter((c) => c.status === 'prospect').length} prospectos</span>
          </div>
        </div>

        {/* Side panel */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-3">
          {selectedCompany ? (
            <div className="flex-1 flex flex-col gap-3 overflow-hidden">
              {/* Selected company detail */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900">Detalle</h3>
                  <button
                    onClick={() => setSelectedMapCompanyId(null)}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-slate-900">{selectedCompany.name}</p>
                  {selectedCompany.city && <p className="text-slate-500">📍 {selectedCompany.city}</p>}
                  {selectedCompany.student_count && (
                    <p className="text-slate-500">👨‍🎓 {selectedCompany.student_count?.toLocaleString('es-CO')} estudiantes</p>
                  )}
                  <div className="pt-1">
                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{
                        backgroundColor: COMPANY_STATUS[selectedCompany.status]?.bg,
                        color: COMPANY_STATUS[selectedCompany.status]?.color,
                      }}
                    >
                      {COMPANY_STATUS[selectedCompany.status]?.label}
                    </span>
                  </div>
                </div>

                {companyOpps.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs font-medium text-slate-500 mb-2">Oportunidades</p>
                    <div className="space-y-1.5">
                      {companyOpps.slice(0, 3).map((opp) => (
                        <div key={opp.id} className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 truncate max-w-[140px]">{opp.title}</span>
                          <span className="text-slate-500 ml-2">
                            {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(opp.value || 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* School list */
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
              <p className="text-xs font-medium text-slate-500 px-1">
                {companies.length} colegios registrados
              </p>
              {companies.map((company) => (
                <CompanyCard key={company.id} company={company} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
