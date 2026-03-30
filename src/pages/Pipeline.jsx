import { useEffect } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { Plus, Filter } from 'lucide-react';
import Layout from '../components/layout/Layout';
import PipelineColumn from '../modules/pipeline/PipelineColumn';
import OpportunityForm from '../modules/pipeline/OpportunityForm';
import Button from '../components/ui/Button';
import { PIPELINE_STAGES } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';
import useCRMStore from '../store/useCRMStore';
import useAppStore from '../store/useAppStore';

export default function Pipeline() {
  const { opportunities, initialize, moveStage } = useCRMStore();
  const { openModal } = useAppStore();

  useEffect(() => { initialize(); }, []);

  // ── Drag & drop handler ───────────────────────────────────────────────────────
  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStage = destination.droppableId;
    const stageConfig = PIPELINE_STAGES.find((s) => s.id === newStage);
    await moveStage(draggableId, newStage, stageConfig?.probability || 0);
  };

  // ── Group opportunities by stage ──────────────────────────────────────────────
  const byStage = Object.fromEntries(
    PIPELINE_STAGES.map((s) => [s.id, []])
  );
  opportunities.forEach((opp) => {
    if (byStage[opp.stage]) byStage[opp.stage].push(opp);
  });

  // ── Pipeline summary metrics ───────────────────────────────────────────────────
  const totalActive = opportunities
    .filter((o) => !['ganado', 'perdido'].includes(o.stage))
    .reduce((sum, o) => sum + (o.value || 0), 0);

  const totalWon = opportunities
    .filter((o) => o.stage === 'ganado')
    .reduce((sum, o) => sum + (o.value || 0), 0);

  return (
    <Layout
      title="Pipeline de Ventas"
      actions={
        <Button icon={Plus} onClick={() => openModal('opportunityForm')}>
          Nueva oportunidad
        </Button>
      }
    >
      {/* Summary bar */}
      <div className="flex items-center gap-6 mb-4 px-1">
        <div className="text-sm">
          <span className="text-slate-500">Pipeline activo: </span>
          <span className="font-semibold text-slate-900">{formatCurrency(totalActive, true)}</span>
        </div>
        <div className="text-sm">
          <span className="text-slate-500">Ganado: </span>
          <span className="font-semibold text-green-600">{formatCurrency(totalWon, true)}</span>
        </div>
        <div className="text-sm">
          <span className="text-slate-500">Oportunidades: </span>
          <span className="font-semibold text-slate-900">{opportunities.length}</span>
        </div>
      </div>

      {/* Kanban board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-6 h-[calc(100vh-220px)]">
          {PIPELINE_STAGES.map((stage) => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              opportunities={byStage[stage.id] || []}
            />
          ))}
        </div>
      </DragDropContext>

      {/* Modals */}
      <OpportunityForm />
    </Layout>
  );
}
