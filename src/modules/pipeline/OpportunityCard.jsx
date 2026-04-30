import { Draggable } from '@hello-pangea/dnd';
import { Building2, Calendar, TrendingUp, MoreVertical, MapPin, Award, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { formatCurrency, formatDate, getInitials } from '../../utils/formatters';
import { STAGE_MAP } from '../../utils/constants';
import useCRMStore from '../../store/useCRMStore';
import useAppStore from '../../store/useAppStore';

export default function OpportunityCard({ opportunity, index }) {
  const { getCompanyById, removeOpportunity } = useCRMStore();
  const { openDetailPanel, openModal, addToast } = useAppStore();

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirm(`¿Eliminar "${opportunity.title}"?`)) return;
    await removeOpportunity(opportunity.id);
    addToast('Oportunidad eliminada');
  };

  const company = getCompanyById(opportunity.company_id) || opportunity.crm_companies;
  const stage = STAGE_MAP[opportunity.stage];
  const isWon = opportunity.stage === 'ganado';
  const isLost = opportunity.stage === 'perdido';

  return (
    <Draggable draggableId={opportunity.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={clsx(
            'bg-white rounded-xl border border-slate-100 p-4 shadow-card cursor-grab active:cursor-grabbing',
            'hover:shadow-card-hover hover:border-slate-200 transition-all duration-150',
            snapshot.isDragging && 'kanban-dragging ring-2 ring-indigo-400 ring-offset-2',
            isWon && 'border-l-4 border-l-green-500',
            isLost && 'border-l-4 border-l-red-400 opacity-70'
          )}
          onClick={() => openDetailPanel('opportunity', opportunity.id)}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: stage?.color || '#6366f1' }}
              >
                {getInitials(company?.name || 'C')}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate leading-tight">
                  {opportunity.title}
                </p>
                {company && (
                  <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                    <Building2 size={10} className="flex-shrink-0" />
                    {company.name}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); openModal('opportunityForm', opportunity); }}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Editar"
              >
                <MoreVertical size={14} />
              </button>
              <button
                onClick={handleDelete}
                className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Eliminar"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* Value + Probability */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-base font-bold text-slate-900">
              {formatCurrency(opportunity.value, true)}
            </span>
            <div className="flex items-center gap-1">
              <TrendingUp size={12} className="text-slate-400" />
              <span className={clsx(
                'text-xs font-semibold',
                opportunity.probability >= 70 ? 'text-green-600' :
                opportunity.probability >= 40 ? 'text-amber-600' : 'text-slate-500'
              )}>
                {opportunity.probability}%
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-slate-100 rounded-full mb-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${opportunity.probability}%`,
                backgroundColor: stage?.color || '#6366f1',
              }}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <Calendar size={11} />
              <span>{formatDate(opportunity.expected_close_date, 'dd MMM')}</span>
            </div>
            <div className="flex items-center gap-2">
              {company?.city && (
                <span className="flex items-center gap-0.5">
                  <MapPin size={11} />
                  {company.city}
                </span>
              )}
              {opportunity.erp_synced && (
                <span className="flex items-center gap-0.5 text-green-600" title="Sincronizado con ERP">
                  <Award size={11} />
                  ERP
                </span>
              )}
              <span className="text-slate-300">
                {opportunity.billing_cycle === 'anual' ? '/año' : '/mes'}
              </span>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
