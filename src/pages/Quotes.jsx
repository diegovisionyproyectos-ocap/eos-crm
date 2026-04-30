import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Trash2, ChevronRight } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Button from '../components/ui/Button';
import { formatCurrency, formatDate } from '../utils/formatters';
import { fetchQuotes, deleteQuote } from '../services/quotesService';
import useAppStore from '../store/useAppStore';
import clsx from 'clsx';

export const QUOTE_STATUS = {
  borrador:  { label: 'Borrador',   color: '#94a3b8', bg: '#f1f5f9' },
  enviado:   { label: 'Enviado',    color: '#3b82f6', bg: '#eff6ff' },
  aprobado:  { label: 'Aprobado',   color: '#22c55e', bg: '#f0fdf4' },
  rechazado: { label: 'Rechazado',  color: '#ef4444', bg: '#fef2f2' },
};

export default function Quotes() {
  const navigate = useNavigate();
  const { addToast } = useAppStore();
  const [quotes, setQuotes]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const load = () => {
    setLoading(true);
    fetchQuotes().then((d) => { setQuotes(d); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const filtered = statusFilter
    ? quotes.filter((q) => q.status === statusFilter)
    : quotes;

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar esta cotización?')) return;
    await deleteQuote(id);
    setQuotes((prev) => prev.filter((q) => q.id !== id));
    addToast('Cotización eliminada');
  };

  return (
    <Layout
      title="Cotizaciones"
      actions={
        <Button icon={Plus} onClick={() => navigate('/cotizaciones/nueva')}>
          Nueva cotización
        </Button>
      }
    >
      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">Todos los estados</option>
          {Object.entries(QUOTE_STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <span className="text-sm text-slate-400">{filtered.length} cotizaciones</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-white rounded-xl border border-slate-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-100">
          <FileText size={32} className="text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No hay cotizaciones</p>
          <button
            onClick={() => navigate('/cotizaciones/nueva')}
            className="mt-3 text-indigo-600 text-sm hover:underline"
          >
            Crear primera cotización →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => {
            const qs = QUOTE_STATUS[q.status] || QUOTE_STATUS.borrador;
            const company = q.crm_companies;
            const itemCount = q.crm_quote_items?.length ?? 0;
            return (
              <div
                key={q.id}
                onClick={() => navigate(`/cotizaciones/${q.id}`)}
                className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:shadow-md cursor-pointer transition-shadow group"
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText size={18} className="text-indigo-600" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      {q.code && (
                        <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                          {q.code}
                        </span>
                      )}
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {company?.name ?? '—'}
                      </span>
                      <span
                        className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: qs.bg, color: qs.color }}
                      >
                        {qs.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {formatDate(q.created_at)} · {itemCount} {itemCount === 1 ? 'producto' : 'productos'}
                    </p>
                  </div>

                  {/* Total + actions */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-lg font-bold text-slate-900">
                      {formatCurrency(q.total)}
                    </span>
                    <button
                      onClick={(e) => handleDelete(e, q.id)}
                      className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
