import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Building2, X, MapPin, Users, Pencil, Trash2, Star, FolderOpen } from 'lucide-react';
import Layout from '../components/layout/Layout';
import CompanyCard from '../modules/companies/CompanyCard';
import CompanyForm from '../modules/companies/CompanyForm';
import ContactForm from '../modules/contacts/ContactForm';
import ActivityFeed from '../modules/activities/ActivityFeed';
import Button from '../components/ui/Button';
import { COMPANY_STATUS, PIPELINE_STAGES } from '../utils/constants';
import { formatCurrency, formatStudents, getInitials } from '../utils/formatters';
import useCRMStore from '../store/useCRMStore';
import useAppStore from '../store/useAppStore';

export default function Companies() {
  const { companies, opportunities, initialize, removeCompany, removeContact } = useCRMStore();
  const { openModal, detailPanel, openDetailPanel, closeDetailPanel, addToast } = useAppStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { initialize(); }, []);

  const filtered = companies.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      c.name.toLowerCase().includes(q) ||
      (c.city || '').toLowerCase().includes(q) ||
      (c.code || '').toLowerCase().includes(q);
    const matchStatus = !statusFilter || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const selectedCompany = detailPanel?.type === 'company'
    ? companies.find((c) => c.id === detailPanel.id)
    : null;

  const companyOpps = selectedCompany
    ? opportunities.filter((o) => o.company_id === selectedCompany.id)
    : [];

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este colegio?')) return;
    await removeCompany(id);
    closeDetailPanel();
    addToast('Colegio eliminado');
  };

  const handleDeleteContact = async (contactId, companyId) => {
    if (!confirm('¿Eliminar este contacto?')) return;
    await removeContact(contactId, companyId);
    addToast('Contacto eliminado');
  };

  return (
    <Layout
      title="Colegios"
      actions={
        <Button icon={Plus} onClick={() => openModal('companyForm')}>
          Nuevo colegio
        </Button>
      }
    >
      <div className="flex gap-4 h-[calc(100vh-160px)]">
        {/* Main list */}
        <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-hidden">
          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-400 focus-within:border-transparent transition-all">
              <Search size={15} className="text-slate-400 flex-shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar colegios…"
                className="flex-1 text-sm outline-none bg-transparent text-slate-700 placeholder:text-slate-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Todos los estados</option>
              {Object.entries(COMPANY_STATUS).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
            <p className="text-sm text-slate-500 whitespace-nowrap">
              {filtered.length} colegios
            </p>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48">
                <Building2 size={32} className="text-slate-300 mb-3" />
                <p className="text-sm text-slate-400 mb-2">No se encontraron colegios</p>
                <Button size="sm" onClick={() => openModal('companyForm')}>
                  Agregar colegio
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 pb-4">
                {filtered.map((company) => (
                  <CompanyCard key={company.id} company={company} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail slide-over panel */}
        {selectedCompany && (
          <div className="w-80 flex-shrink-0 bg-white border border-slate-100 rounded-2xl shadow-card overflow-hidden flex flex-col animate-slide-in-right">
            {/* Panel header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: COMPANY_STATUS[selectedCompany.status]?.color || '#6366f1' }}
                >
                  {getInitials(selectedCompany.name)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900 truncate">{selectedCompany.name}</p>
                    {selectedCompany.code && (
                      <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded flex-shrink-0">
                        {selectedCompany.code}
                      </span>
                    )}
                  </div>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: COMPANY_STATUS[selectedCompany.status]?.bg,
                      color: COMPANY_STATUS[selectedCompany.status]?.color,
                    }}
                  >
                    {COMPANY_STATUS[selectedCompany.status]?.label}
                  </span>
                </div>
              </div>
              <button onClick={closeDetailPanel} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0">
                <X size={16} />
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                {selectedCompany.city && (
                  <InfoItem icon={<MapPin size={14} />} label="Ciudad" value={selectedCompany.city} />
                )}
                {selectedCompany.student_count && (
                  <InfoItem icon={<Users size={14} />} label="Estudiantes" value={formatStudents(selectedCompany.student_count)} />
                )}
              </div>

              {selectedCompany.address && (
                <div className="text-sm">
                  <p className="text-xs font-medium text-slate-500 mb-1">Dirección</p>
                  <p className="text-slate-700">{selectedCompany.address}</p>
                </div>
              )}

              {selectedCompany.notes && (
                <div className="text-sm">
                  <p className="text-xs font-medium text-slate-500 mb-1">Notas</p>
                  <p className="text-slate-600 text-xs leading-relaxed">{selectedCompany.notes}</p>
                </div>
              )}

              {/* Contacts */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-700">
                    Contactos ({(selectedCompany.crm_contacts || []).length})
                  </p>
                  <button
                    onClick={() => openModal('contactForm', { company_id: selectedCompany.id })}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    + Agregar
                  </button>
                </div>
                {(selectedCompany.crm_contacts || []).length === 0 ? (
                  <p className="text-xs text-slate-400">Sin contactos registrados</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedCompany.crm_contacts.map((ct) => (
                      <div key={ct.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-2 group">
                        <div className="relative flex-shrink-0">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                            {getInitials(ct.name)}
                          </div>
                          {ct.is_primary && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-400 rounded-full flex items-center justify-center">
                              <Star size={7} className="text-white fill-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-800 truncate">{ct.name}</p>
                          {ct.role && <p className="text-[10px] text-slate-500">{ct.role}</p>}
                          {ct.phone && <p className="text-[10px] text-slate-400">{ct.phone}</p>}
                        </div>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button
                            onClick={() => openModal('contactForm', { ...ct, company_id: selectedCompany.id })}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded"
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            onClick={() => handleDeleteContact(ct.id, selectedCompany.id)}
                            className="p-1 text-slate-400 hover:text-red-500 rounded"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Opportunities */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-700">Oportunidades ({companyOpps.length})</p>
                  <button
                    onClick={() => openModal('opportunityForm', { company_id: selectedCompany.id })}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    + Nueva
                  </button>
                </div>
                {companyOpps.length === 0 ? (
                  <p className="text-xs text-slate-400">Sin oportunidades</p>
                ) : (
                  <div className="space-y-2">
                    {companyOpps.map((opp) => {
                      const stg = PIPELINE_STAGES.find((s) => s.id === opp.stage);
                      return (
                        <div key={opp.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-medium text-slate-800 truncate">{opp.title}</p>
                            <span
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: stg?.bg, color: stg?.color }}
                            >
                              {stg?.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {formatCurrency(opp.value, true)} · {opp.probability}%
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recent activities */}
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-3">Actividades recientes</p>
                <ActivityFeed companyId={selectedCompany.id} limit={5} />
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 py-3 border-t border-slate-100 space-y-2">
              <Button
                size="sm"
                icon={FolderOpen}
                className="w-full"
                onClick={() => navigate(`/expediente/${selectedCompany.id}`)}
              >
                Ver expediente
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Pencil}
                  className="flex-1"
                  onClick={() => openModal('companyForm', selectedCompany)}
                >
                  Editar
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Trash2}
                  onClick={() => handleDelete(selectedCompany.id)}
                  className="text-red-500 border-red-200 hover:bg-red-50"
                >
                  Eliminar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CompanyForm />
      <ContactForm />
    </Layout>
  );
}

function InfoItem({ icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-slate-400 mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm text-slate-700 font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
