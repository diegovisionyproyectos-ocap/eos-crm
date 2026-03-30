import { useEffect, useState } from 'react';
import { Plus, Filter } from 'lucide-react';
import Layout from '../components/layout/Layout';
import ActivityFeed from '../modules/activities/ActivityFeed';
import ActivityForm from '../modules/activities/ActivityForm';
import Button from '../components/ui/Button';
import { ACTIVITY_TYPES } from '../utils/constants';
import useCRMStore from '../store/useCRMStore';
import useAppStore from '../store/useAppStore';

export default function Activities() {
  const { activities, initialize } = useCRMStore();
  const { openModal } = useAppStore();
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => { initialize(); }, []);

  const filtered = typeFilter
    ? activities.filter((a) => a.type === typeFilter)
    : activities;

  return (
    <Layout
      title="Actividades"
      actions={
        <Button icon={Plus} onClick={() => openModal('activityForm')}>
          Nueva actividad
        </Button>
      }
    >
      <div className="max-w-2xl mx-auto">
        {/* Filter pills */}
        <div className="flex items-center gap-2 flex-wrap mb-6">
          <button
            onClick={() => setTypeFilter('')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !typeFilter ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            Todas ({activities.length})
          </button>
          {Object.entries(ACTIVITY_TYPES).map(([key, type]) => {
            const count = activities.filter((a) => a.type === key).length;
            if (!count) return null;
            return (
              <button
                key={key}
                onClick={() => setTypeFilter(typeFilter === key ? '' : key)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors border"
                style={
                  typeFilter === key
                    ? { backgroundColor: type.color, color: '#fff', borderColor: type.color }
                    : { backgroundColor: type.bg, color: type.color, borderColor: type.bg }
                }
              >
                {type.label} ({count})
              </button>
            );
          })}
        </div>

        <ActivityFeed limit={filtered.length} />
      </div>

      <ActivityForm />
    </Layout>
  );
}
