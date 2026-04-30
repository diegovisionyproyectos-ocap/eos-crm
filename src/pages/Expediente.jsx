import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, MapPin, Users, Phone, Mail, Globe,
  Upload, Trash2, Download, Plus, CheckCircle, Clock,
  AlertCircle, XCircle, FolderOpen,
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { COMPANY_STATUS } from '../utils/constants';
import { formatCurrency, formatStudents, formatRelativeTime, getInitials } from '../utils/formatters';
import useCRMStore from '../store/useCRMStore';
import useAppStore from '../store/useAppStore';
import { fetchDocuments, uploadDocument, deleteDocument, getDocumentUrl } from '../services/documentsService';
import { fetchContracts, createContract, deleteContract } from '../services/contractsService';
import { fetchQuotes, deleteQuote } from '../services/quotesService';
import { QUOTE_STATUS } from './Quotes';
import clsx from 'clsx';

// ── Config ───────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'info',          label: 'Info general' },
  { id: 'contactos',     label: 'Contactos' },
  { id: 'cotizaciones',  label: 'Cotizaciones' },
  { id: 'contratos',     label: 'Contratos' },
  { id: 'documentos',    label: 'Documentos' },
  { id: 'visitas',       label: 'Visitas' },
  { id: 'notas',         label: 'Notas' },
];

const CONTRACT_STATUS = {
  borrador:  { label: 'Borrador',   color: '#94a3b8', bg: '#f1f5f9', Icon: Clock },
  activo:    { label: 'Activo',     color: '#22c55e', bg: '#f0fdf4', Icon: CheckCircle },
  vencido:   { label: 'Vencido',    color: '#f59e0b', bg: '#fffbeb', Icon: AlertCircle },
  cancelado: { label: 'Cancelado',  color: '#ef4444', bg: '#fef2f2', Icon: XCircle },
};

const DOC_CATEGORIES = [
  { value: 'contrato',     label: 'Contrato' },
  { value: 'propuesta',    label: 'Propuesta' },
  { value: 'presentacion', label: 'Presentación' },
  { value: 'factura',      label: 'Factura' },
  { value: 'otro',         label: 'Otro' },
];

const ACTIVITY_TYPE_LABELS = {
  llamada:   'Llamada',
  visita:    'Visita',
  email:     'Email',
  demo:      'Demo',
  reunion:   'Reunión',
  seguimiento: 'Seguimiento',
};

// ── Main page ────────────────────────────────────────────────────────────────

export default function Expediente() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { companies, activities, initialize, editCompany } = useCRMStore();
  const { addToast } = useAppStore();

  const [activeTab, setActiveTab]           = useState('info');
  const [contracts, setContracts]           = useState([]);
  const [documents, setDocuments]           = useState([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [loadingDocs, setLoadingDocs]       = useState(false);
  const [showContractForm, setShowContractForm] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [quotes, setQuotes]                 = useState([]);
  const [loadingQuotes, setLoadingQuotes]   = useState(false);
  const [notes, setNotes]                   = useState('');
  const [savingNotes, setSavingNotes]       = useState(false);

  useEffect(() => { initialize(); }, []);

  const company = companies.find((c) => c.id === companyId);
  const companyActivities = activities
    .filter((a) => a.company_id === companyId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  useEffect(() => {
    if (company) setNotes(company.notes || '');
  }, [company?.id]);

  useEffect(() => {
    if (!companyId) return;
    setLoadingContracts(true);
    fetchContracts(companyId).then((d) => { setContracts(d); setLoadingContracts(false); });
    setLoadingDocs(true);
    fetchDocuments(companyId).then((d) => { setDocuments(d); setLoadingDocs(false); });
    setLoadingQuotes(true);
    fetchQuotes(companyId).then((d) => { setQuotes(d); setLoadingQuotes(false); });
  }, [companyId]);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await editCompany(companyId, { notes });
      addToast('Notas guardadas');
    } catch {
      addToast('Error al guardar notas', 'error');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDeleteContract = async (id) => {
    if (!confirm('¿Eliminar este contrato?')) return;
    await deleteContract(id);
    setContracts((prev) => prev.filter((c) => c.id !== id));
    addToast('Contrato eliminado');
  };

  const handleDeleteQuote = async (e, id) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar esta cotización?')) return;
    await deleteQuote(id);
    setQuotes((prev) => prev.filter((q) => q.id !== id));
    addToast('Cotización eliminada');
  };

  const handleDeleteDoc = async (doc) => {
    if (!confirm('¿Eliminar este documento?')) return;
    await deleteDocument(doc.id, doc.file_path);
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    addToast('Documento eliminado');
  };

  if (!company) {
    return (
      <Layout title="Expediente">
        <div className="flex flex-col items-center justify-center h-64">
          <FolderOpen size={32} className="text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">Colegio no encontrado.</p>
          <button
            onClick={() => navigate('/colegios')}
            className="mt-3 text-indigo-600 text-sm hover:underline"
          >
            Volver a Colegios
          </button>
        </div>
      </Layout>
    );
  }

  const statusInfo = COMPANY_STATUS[company.status] || COMPANY_STATUS.prospect;

  return (
    <Layout title={`Expediente · ${company.code || company.name}`}>
      {/* Back */}
      <button
        onClick={() => navigate('/colegios')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
      >
        <ArrowLeft size={15} /> Volver a Colegios
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4">
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
            style={{ backgroundColor: statusInfo.color }}
          >
            {getInitials(company.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-slate-900">{company.name}</h1>
              {company.code && (
                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                  {company.code}
                </span>
              )}
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full"
                style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}
              >
                {statusInfo.label}
              </span>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              {company.city && (
                <span className="text-sm text-slate-500 flex items-center gap-1">
                  <MapPin size={13} /> {company.city}
                </span>
              )}
              {company.student_count && (
                <span className="text-sm text-slate-500 flex items-center gap-1">
                  <Users size={13} /> {formatStudents(company.student_count)} estudiantes
                </span>
              )}
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-500 flex items-center gap-1 hover:text-indigo-700"
                >
                  <Globe size={13} /> Sitio web
                </a>
              )}
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400 flex-shrink-0">
            <span>{quotes.length} cotizaciones</span>
            <span>·</span>
            <span>{contracts.length} contratos</span>
            <span>·</span>
            <span>{documents.length} docs</span>
            <span>·</span>
            <span>{companyActivities.length} visitas</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl w-fit overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── INFO ── */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SectionCard title="Datos generales">
            <InfoRow label="Código"       value={company.code}    mono />
            <InfoRow label="Nombre"       value={company.name} />
            <InfoRow label="Ciudad"       value={company.city} />
            <InfoRow label="Dirección"    value={company.address} />
            <InfoRow label="Estudiantes"  value={formatStudents(company.student_count)} />
            <InfoRow label="Estado"       value={statusInfo.label} />
            <InfoRow label="País"         value={company.country || 'El Salvador'} />
            {company.website && (
              <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                <span className="text-xs text-slate-400">Sitio web</span>
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:underline truncate max-w-[200px]"
                >
                  {company.website}
                </a>
              </div>
            )}
          </SectionCard>
          <SectionCard title="Ubicación">
            {company.lat && company.lng ? (
              <div className="space-y-2">
                <p className="text-xs font-mono text-slate-600">
                  {Number(company.lat).toFixed(6)}, {Number(company.lng).toFixed(6)}
                </p>
                <a
                  href={`https://maps.google.com/?q=${company.lat},${company.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Ver en Google Maps →
                </a>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Sin coordenadas registradas</p>
            )}
          </SectionCard>
        </div>
      )}

      {/* ── CONTACTOS ── */}
      {activeTab === 'contactos' && (
        <SectionCard title="Contactos">
          {!(company.crm_contacts?.length) ? (
            <EmptySection icon={Users} text="Sin contactos registrados" />
          ) : (
            <div className="divide-y divide-slate-50">
              {company.crm_contacts.map((contact) => (
                <div key={contact.id} className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-800">{contact.name}</span>
                      {contact.is_primary && (
                        <span className="text-[10px] bg-indigo-50 text-indigo-600 font-medium px-1.5 py-0.5 rounded">
                          Principal
                        </span>
                      )}
                    </div>
                    {contact.role && (
                      <p className="text-xs text-slate-400 mt-0.5">{contact.role}</p>
                    )}
                  </div>
                  <div className="text-right space-y-1">
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-xs text-indigo-600 flex items-center justify-end gap-1 hover:underline"
                      >
                        <Mail size={11} /> {contact.email}
                      </a>
                    )}
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        className="text-xs text-slate-500 flex items-center justify-end gap-1 hover:underline"
                      >
                        <Phone size={11} /> {contact.phone}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* ── COTIZACIONES ── */}
      {activeTab === 'cotizaciones' && (
        <div>
          <div className="flex justify-end mb-3">
            <button
              onClick={() => navigate(`/cotizaciones/nueva?empresa=${companyId}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus size={13} /> Nueva cotización
            </button>
          </div>

          {loadingQuotes ? (
            <LoadingRows />
          ) : quotes.length === 0 ? (
            <EmptySection icon={FileText} text="Sin cotizaciones registradas" />
          ) : (
            <div className="space-y-3">
              {quotes.map((q) => {
                const qs = QUOTE_STATUS[q.status] || QUOTE_STATUS.borrador;
                const itemCount = q.crm_quote_items?.length ?? 0;
                return (
                  <div
                    key={q.id}
                    onClick={() => navigate(`/cotizaciones/${q.id}`)}
                    className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:shadow-md cursor-pointer transition-shadow group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FileText size={16} className="text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          {q.code && (
                            <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                              {q.code}
                            </span>
                          )}
                          <span
                            className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: qs.bg, color: qs.color }}
                          >
                            {qs.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          {formatRelativeTime(q.created_at)} · {itemCount} {itemCount === 1 ? 'producto' : 'productos'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-base font-bold text-slate-900">
                          {formatCurrency(q.total)}
                        </span>
                        <button
                          onClick={(e) => handleDeleteQuote(e, q.id)}
                          className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CONTRATOS ── */}
      {activeTab === 'contratos' && (
        <div>
          <div className="flex justify-end mb-3">
            <button
              onClick={() => setShowContractForm((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus size={13} /> Nuevo contrato
            </button>
          </div>

          {showContractForm && (
            <ContractForm
              companyId={companyId}
              onSave={(c) => {
                setContracts((prev) => [c, ...prev]);
                setShowContractForm(false);
                addToast('Contrato creado');
              }}
              onCancel={() => setShowContractForm(false)}
            />
          )}

          {loadingContracts ? (
            <LoadingRows />
          ) : contracts.length === 0 ? (
            <EmptySection icon={FileText} text="Sin contratos registrados" />
          ) : (
            <div className="space-y-3">
              {contracts.map((contract) => {
                const cs = CONTRACT_STATUS[contract.status] || CONTRACT_STATUS.borrador;
                return (
                  <div
                    key={contract.id}
                    className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {contract.code && (
                            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {contract.code}
                            </span>
                          )}
                          <span className="text-sm font-semibold text-slate-800">
                            {contract.title}
                          </span>
                          <span
                            className="text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
                            style={{ backgroundColor: cs.bg, color: cs.color }}
                          >
                            <cs.Icon size={10} /> {cs.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                          {contract.value && (
                            <span className="font-medium text-slate-600">
                              {formatCurrency(contract.value)}
                            </span>
                          )}
                          {contract.start_date && <span>Inicio: {contract.start_date}</span>}
                          {contract.end_date   && <span>Vence: {contract.end_date}</span>}
                        </div>
                        {contract.notes && (
                          <p className="text-xs text-slate-500 mt-1">{contract.notes}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteContract(contract.id)}
                        className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── DOCUMENTOS ── */}
      {activeTab === 'documentos' && (
        <div>
          <div className="flex justify-end mb-3">
            <button
              onClick={() => setShowUploadForm((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Upload size={13} /> Subir documento
            </button>
          </div>

          {showUploadForm && (
            <UploadForm
              companyId={companyId}
              onSave={(d) => {
                setDocuments((prev) => [d, ...prev]);
                setShowUploadForm(false);
                addToast('Documento subido');
              }}
              onCancel={() => setShowUploadForm(false)}
            />
          )}

          {loadingDocs ? (
            <LoadingRows />
          ) : documents.length === 0 ? (
            <EmptySection icon={Upload} text="Sin documentos subidos" />
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} onDelete={() => handleDeleteDoc(doc)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── VISITAS ── */}
      {activeTab === 'visitas' && (
        <SectionCard title={`Historial de visitas (${companyActivities.length})`}>
          {companyActivities.length === 0 ? (
            <EmptySection icon={MapPin} text="Sin visitas registradas" />
          ) : (
            <div className="divide-y divide-slate-50">
              {companyActivities.map((act) => (
                <div key={act.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      {act.type && (
                        <span className="text-[10px] font-medium bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                          {ACTIVITY_TYPE_LABELS[act.type] || act.type}
                        </span>
                      )}
                      <span className="text-sm font-medium text-slate-800">
                        {act.title || act.type || 'Actividad'}
                      </span>
                    </div>
                    {act.notes && (
                      <p className="text-xs text-slate-500">{act.notes}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0 whitespace-nowrap">
                    {formatRelativeTime(act.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* ── NOTAS ── */}
      {activeTab === 'notas' && (
        <SectionCard title="Notas del colegio">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={10}
            placeholder="Escribe notas relevantes sobre este colegio: personas clave, contexto, acuerdos verbales…"
            className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={handleSaveNotes}
              disabled={savingNotes}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {savingNotes ? 'Guardando…' : 'Guardar notas'}
            </button>
          </div>
        </SectionCard>
      )}
    </Layout>
  );
}

// ── Reusable sub-components ──────────────────────────────────────────────────

function SectionCard({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
      {title && <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>}
      {children}
    </div>
  );
}

function InfoRow({ label, value, mono = false }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={clsx('text-xs font-medium text-slate-700', mono && 'font-mono text-indigo-600')}>
        {value}
      </span>
    </div>
  );
}

function EmptySection({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-10">
      <Icon size={26} className="text-slate-300 mb-2" />
      <p className="text-sm text-slate-400">{text}</p>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-14 bg-white rounded-xl border border-slate-100 animate-pulse" />
      ))}
    </div>
  );
}

// ── Document row ─────────────────────────────────────────────────────────────

const DOC_CAT_COLORS = {
  contrato:     'bg-indigo-50 text-indigo-600',
  propuesta:    'bg-purple-50 text-purple-600',
  presentacion: 'bg-blue-50 text-blue-600',
  factura:      'bg-amber-50 text-amber-600',
  otro:         'bg-slate-100 text-slate-500',
};

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentRow({ doc, onDelete }) {
  const url = getDocumentUrl(doc.file_path);
  const catLabel = DOC_CATEGORIES.find((c) => c.value === doc.category)?.label || 'Otro';

  return (
    <div className="bg-white rounded-xl border border-slate-100 px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <FileText size={18} className="text-slate-400 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{doc.name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={clsx('text-[10px] font-medium px-1.5 py-0.5 rounded', DOC_CAT_COLORS[doc.category] || DOC_CAT_COLORS.otro)}>
              {catLabel}
            </span>
            {doc.file_size && (
              <span className="text-[10px] text-slate-400">{formatFileSize(doc.file_size)}</span>
            )}
            <span className="text-[10px] text-slate-400">{formatRelativeTime(doc.created_at)}</span>
            {doc.notes && <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{doc.notes}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Descargar / ver"
          >
            <Download size={14} />
          </a>
        )}
        <button
          onClick={onDelete}
          className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Contract form ────────────────────────────────────────────────────────────

function ContractForm({ companyId, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: '', status: 'borrador', value: '',
    start_date: '', end_date: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const data = await createContract({
        company_id:  companyId,
        title:       form.title.trim(),
        status:      form.status,
        value:       form.value       ? Number(form.value) : null,
        start_date:  form.start_date  || null,
        end_date:    form.end_date    || null,
        notes:       form.notes.trim() || null,
      });
      onSave(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-4">
      <h4 className="text-sm font-semibold text-slate-700 mb-3">Nuevo contrato</h4>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Título del contrato *"
          required
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {Object.entries(CONTRACT_STATUS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <input
            type="number"
            value={form.value}
            onChange={(e) => set('value', e.target.value)}
            placeholder="Valor ($)"
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Fecha inicio</label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => set('start_date', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Fecha vencimiento</label>
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => set('end_date', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>
        <input
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Notas del contrato (opcional)"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-3 py-1.5 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar contrato'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Upload form ──────────────────────────────────────────────────────────────

function UploadForm({ companyId, onSave, onCancel }) {
  const [file, setFile]         = useState(null);
  const [category, setCategory] = useState('otro');
  const [notes, setNotes]       = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState('');
  const fileRef = useRef(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const data = await uploadDocument(companyId, file, category, notes);
      onSave(data);
    } catch (err) {
      setError(err.message || 'Error al subir el archivo. Verifica que el bucket "crm-documents" exista en Supabase Storage.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-4">
      <h4 className="text-sm font-semibold text-slate-700 mb-3">Subir documento</h4>
      <form onSubmit={handleUpload} className="space-y-3">
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-indigo-200 rounded-xl p-6 text-center cursor-pointer hover:bg-white/50 transition-colors"
        >
          {file ? (
            <p className="text-sm text-slate-700 font-medium">{file.name}</p>
          ) : (
            <>
              <Upload size={22} className="text-indigo-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Clic para seleccionar archivo</p>
              <p className="text-xs text-slate-400 mt-1">PDF, Word, Excel, imágenes…</p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {DOC_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Nota del documento"
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        {error && (
          <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={uploading || !file}
            className="px-3 py-1.5 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {uploading ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Upload size={13} />
            )}
            {uploading ? 'Subiendo…' : 'Subir'}
          </button>
        </div>
      </form>
    </div>
  );
}
