import { Droppable } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import clsx from 'clsx';
import OpportunityCard from './OpportunityCard';
import { formatCurrency } from '../../utils/formatters';
import useAppStore from '../../store/useAppStore';

export default function PipelineColumn({ stage, opportunities = [] }) {
  const { openModal } = useAppStore();
  const totalValue = opportunities.reduce((sum, o) => sum + (o.value || 0), 0);

  return (
    <div className="flex flex-col flex-shrink-0 w-72 min-w-72 h-full">
      {/* Column header */}
      <div
        className="flex items-center justify-between px-3 py-3 rounded-t-xl border border-b-0"
        style={{ backgroundColor: stage.bg, borderColor: stage.ring }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
          <span className="text-sm font-semibold text-slate-700 truncate">{stage.label}</span>
          <span
            className="flex-shrink-0 w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center text-white"
            style={{ backgroundColor: stage.color }}
          >
            {opportunities.length}
          </span>
        </div>
        <button
          onClick={() => openModal('opportunityForm', { stage: stage.id })}
          className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 text-slate-500 hover:text-slate-700 transition-colors"
          title={`Nueva oportunidad en ${stage.label}`}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Total value bar */}
      {totalValue > 0 && (
        <div
          className="px-3 py-1.5 text-[11px] font-medium border-x"
          style={{ backgroundColor: stage.bg, borderColor: stage.ring, color: stage.color }}
        >
          {formatCurrency(totalValue, true)} en pipeline
        </div>
      )}

      {/* Droppable area */}
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={clsx(
              'flex-1 overflow-y-auto p-2 rounded-b-xl border space-y-2 transition-colors min-h-[200px]',
              snapshot.isDraggingOver ? 'bg-indigo-50/80 border-indigo-200' : 'bg-slate-50/60',
            )}
            style={{ borderColor: snapshot.isDraggingOver ? undefined : stage.ring }}
          >
            {opportunities.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-xs text-slate-400">Sin oportunidades</p>
                <button
                  onClick={() => openModal('opportunityForm', { stage: stage.id })}
                  className="mt-2 text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
                >
                  + Agregar
                </button>
              </div>
            )}
            {opportunities.map((opp, index) => (
              <OpportunityCard key={opp.id} opportunity={opp} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
