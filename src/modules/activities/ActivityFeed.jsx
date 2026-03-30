import { Phone, MapPin, Monitor, Mail, CheckSquare, FileText, Check, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { formatRelativeTime, formatDate } from '../../utils/formatters';
import { ACTIVITY_TYPES } from '../../utils/constants';
import useCRMStore from '../../store/useCRMStore';
import useAppStore from '../../store/useAppStore';

const ICONS = { Phone, MapPin, Monitor, Mail, CheckSquare, FileText };

export default function ActivityFeed({ companyId, limit = 20 }) {
  const { activities, finishActivity, removeActivity } = useCRMStore();
  const { addToast } = useAppStore();

  const filtered = activities
    .filter((a) => !companyId || a.company_id === companyId)
    .slice(0, limit);

  if (filtered.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-slate-400">Sin actividades registradas</p>
      </div>
    );
  }

  const handleComplete = async (id) => {
    await finishActivity(id);
    addToast('Actividad completada');
  };

  const handleDelete = async (id) => {
    await removeActivity(id);
    addToast('Actividad eliminada', 'info');
  };

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-100" />

      <div className="space-y-4">
        {filtered.map((activity) => {
          const type = ACTIVITY_TYPES[activity.type] || ACTIVITY_TYPES.nota;
          const Icon = ICONS[type.icon] || FileText;
          const isDone = !!activity.completed_at;

          return (
            <div key={activity.id} className="relative flex items-start gap-4 pl-1 group">
              {/* Icon dot */}
              <div
                className={clsx(
                  'flex-shrink-0 z-10 w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white transition-all',
                  isDone ? 'bg-green-100' : ''
                )}
                style={{ backgroundColor: isDone ? undefined : type.bg }}
              >
                {isDone
                  ? <Check size={14} className="text-green-600" />
                  : <Icon size={14} style={{ color: type.color }} />
                }
              </div>

              {/* Content */}
              <div className={clsx(
                'flex-1 bg-white rounded-xl border border-slate-100 p-3 shadow-card',
                isDone && 'opacity-60'
              )}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: type.bg, color: type.color }}
                      >
                        {type.label}
                      </span>
                      <span className="text-sm font-medium text-slate-800 truncate">
                        {activity.subject}
                      </span>
                    </div>
                    {activity.notes && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{activity.notes}</p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      {activity.crm_companies?.name && (
                        <span className="mr-2">📍 {activity.crm_companies.name}</span>
                      )}
                      {formatRelativeTime(activity.created_at)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {!isDone && (
                      <button
                        onClick={() => handleComplete(activity.id)}
                        className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                        title="Marcar como completada"
                      >
                        <Check size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(activity.id)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
