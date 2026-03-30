import { Building2, MapPin, Users, TrendingUp, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { formatStudents, formatCurrency, getInitials } from '../../utils/formatters';
import { COMPANY_STATUS } from '../../utils/constants';
import useAppStore from '../../store/useAppStore';
import useCRMStore from '../../store/useCRMStore';

export default function CompanyCard({ company }) {
  const { openDetailPanel, setSelectedMapCompanyId } = useAppStore();
  const { getOpportunitiesByCompany } = useCRMStore();

  const statusInfo = COMPANY_STATUS[company.status] || COMPANY_STATUS.prospect;
  const opportunities = getOpportunitiesByCompany(company.id);
  const activeOpps = opportunities.filter((o) => !['ganado', 'perdido'].includes(o.stage));
  const totalPipeline = opportunities
    .filter((o) => o.stage !== 'perdido')
    .reduce((sum, o) => sum + (o.value || 0), 0);

  return (
    <div
      className="bg-white rounded-xl border border-slate-100 p-4 shadow-card hover:shadow-card-hover hover:border-slate-200 transition-all duration-150 cursor-pointer group"
      onClick={() => openDetailPanel('company', company.id)}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-sm"
          style={{ backgroundColor: statusInfo.color }}
        >
          {getInitials(company.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{company.name}</p>
              {company.city && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin size={10} />
                  {company.city}
                </p>
              )}
            </div>
            <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0 mt-0.5" />
          </div>
        </div>
      </div>

      {/* Status badge */}
      <div className="mb-3">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}
        >
          <span className={clsx('w-1.5 h-1.5 rounded-full')} style={{ backgroundColor: statusInfo.color }} />
          {statusInfo.label}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-400 mb-0.5">Estudiantes</p>
          <p className="text-xs font-semibold text-slate-700">{formatStudents(company.student_count)}</p>
        </div>
        <div className="text-center p-2 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-400 mb-0.5">Oportunidades</p>
          <p className="text-xs font-semibold text-slate-700">{activeOpps.length} activas</p>
        </div>
        <div className="text-center p-2 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-400 mb-0.5">Pipeline</p>
          <p className="text-xs font-semibold text-slate-700">{formatCurrency(totalPipeline, true)}</p>
        </div>
      </div>

      {/* Map link */}
      {(company.lat && company.lng) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedMapCompanyId(company.id);
          }}
          className="mt-3 w-full text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center justify-center gap-1 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          <MapPin size={12} />
          Ver en mapa
        </button>
      )}
    </div>
  );
}
