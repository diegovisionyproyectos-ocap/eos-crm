import { useEffect, useState } from 'react';
import { Search, User, Mail, Phone, Building2, X, Plus, Pencil, Trash2, Star, FileText } from 'lucide-react';
import Layout from '../components/layout/Layout';
import ContactForm from '../modules/contacts/ContactForm';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { getInitials } from '../utils/formatters';
import useCRMStore from '../store/useCRMStore';
import useAppStore from '../store/useAppStore';

export default function Contacts() {
  const { companies, removeContact, initialize } = useCRMStore();
  const { openModal, addToast } = useAppStore();
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [viewingContact, setViewingContact] = useState(null);

  useEffect(() => { initialize(); }, []);

  const allContacts = companies.flatMap((c) =>
    (c.crm_contacts || []).map((contact) => ({ ...contact, company: c }))
  );

  const filtered = allContacts.filter((ct) => {
    const matchCompany = !companyFilter || ct.company?.id === companyFilter;
    if (!matchCompany) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      ct.name?.toLowerCase().includes(q) ||
      ct.email?.toLowerCase().includes(q) ||
      ct.role?.toLowerCase().includes(q) ||
      ct.company?.name?.toLowerCase().includes(q)
    );
  });

  const handleDelete = async (contact) => {
    if (!confirm(`¿Eliminar a ${contact.name}?`)) return;
    await removeContact(contact.id, contact.company_id);
    addToast('Contacto eliminado');
    if (viewingContact?.id === contact.id) setViewingContact(null);
  };

  return (
    <Layout
      title="Contactos"
      actions={
        <Button icon={Plus} onClick={() => openModal('contactForm')}>
          Nuevo contacto
        </Button>
      }
    >
      <div className="max-w-5xl mx-auto flex flex-col gap-4">
        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-400 transition-all">
            <Search size={15} className="text-slate-400 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, email, cargo, colegio…"
              className="flex-1 text-sm outline-none bg-transparent text-slate-700 placeholder:text-slate-400"
            />
            {search && (
              <button onClick={() => setSearch('')}>
                <X size={14} className="text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Todos los colegios</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <p className="text-sm text-slate-500 whitespace-nowrap">{filtered.length} contactos</p>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100 shadow-card">
            <User size={36} className="text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm font-medium mb-1">
              {allContacts.length === 0 ? 'Sin contactos aún' : 'Sin resultados'}
            </p>
            <p className="text-slate-400 text-xs mb-4">
              {allContacts.length === 0
                ? 'Agrega contactos para cada colegio'
                : 'Intenta con otra búsqueda'}
            </p>
            {allContacts.length === 0 && (
              <Button size="sm" icon={Plus} onClick={() => openModal('contactForm')}>
                Agregar contacto
              </Button>
            )}
          </div>
        )}

        {/* Contact list */}
        <div className="space-y-2">
          {filtered.map((contact) => (
            <div
              key={contact.id}
              className="bg-white rounded-xl border border-slate-100 shadow-card p-4 flex items-start gap-4 hover:shadow-card-hover transition-shadow group"
            >
              {/* Avatar — click to open detail */}
              <button
                onClick={() => setViewingContact(contact)}
                className="relative flex-shrink-0 focus:outline-none"
                title="Ver detalle"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 hover:ring-2 hover:ring-indigo-400 transition-all">
                  {getInitials(contact.name)}
                </div>
                {contact.is_primary && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                    <Star size={9} className="text-white fill-white" />
                  </div>
                )}
              </button>

              {/* Info — click to open detail */}
              <button
                onClick={() => setViewingContact(contact)}
                className="flex-1 min-w-0 text-left"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{contact.name}</p>
                    {contact.role && (
                      <p className="text-xs text-slate-500">{contact.role}</p>
                    )}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    {contact.email && (
                      <p className="text-xs text-indigo-600 flex items-center gap-1 truncate">
                        <Mail size={11} className="flex-shrink-0" />
                        {contact.email}
                      </p>
                    )}
                    {contact.phone && (
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Phone size={11} className="flex-shrink-0" />
                        {contact.phone}
                      </p>
                    )}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Building2 size={11} className="flex-shrink-0 text-slate-400" />
                      <span className="truncate">{contact.company?.name}</span>
                    </div>
                    {contact.notes && (
                      <div className="flex items-start gap-1 text-xs text-slate-400">
                        <FileText size={11} className="flex-shrink-0 mt-0.5" />
                        <span className="truncate">{contact.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                  onClick={() => openModal('contactForm', { ...contact, company_id: contact.company_id || contact.company?.id })}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Editar"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(contact)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ContactForm />

      {/* Contact detail modal */}
      {viewingContact && (
        <ContactDetailModal
          contact={viewingContact}
          onClose={() => setViewingContact(null)}
          onEdit={(ct) => { setViewingContact(null); openModal('contactForm', { ...ct, company_id: ct.company_id || ct.company?.id }); }}
          onDelete={(ct) => handleDelete(ct)}
        />
      )}
    </Layout>
  );
}

function ContactDetailModal({ contact, onClose, onEdit, onDelete }) {
  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Datos del contacto"
      size="sm"
      footer={
        <div className="flex gap-2 w-full">
          <Button variant="secondary" size="sm" icon={Pencil} onClick={() => onEdit(contact)} className="flex-1">
            Editar
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={Trash2}
            onClick={() => { onClose(); onDelete(contact); }}
            className="text-red-500 border-red-200 hover:bg-red-50"
          >
            Eliminar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-4 py-2">
        {/* Avatar */}
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-600">
            {getInitials(contact.name)}
          </div>
          {contact.is_primary && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shadow">
              <Star size={12} className="text-white fill-white" />
            </div>
          )}
        </div>

        {/* Name & role */}
        <div className="text-center">
          <p className="text-lg font-bold text-slate-900">{contact.name}</p>
          {contact.role && <p className="text-sm text-slate-500 mt-0.5">{contact.role}</p>}
          {contact.is_primary && (
            <span className="inline-block mt-1 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              Contacto principal
            </span>
          )}
        </div>

        {/* Details */}
        <div className="w-full space-y-2.5 text-sm">
          {contact.company?.name && (
            <DetailRow icon={<Building2 size={15} className="text-slate-400" />} label="Colegio">
              {contact.company.name}
            </DetailRow>
          )}
          {contact.email && (
            <DetailRow icon={<Mail size={15} className="text-slate-400" />} label="Email">
              <a href={`mailto:${contact.email}`} className="text-indigo-600 hover:underline">
                {contact.email}
              </a>
            </DetailRow>
          )}
          {contact.phone && (
            <DetailRow icon={<Phone size={15} className="text-slate-400" />} label="Teléfono">
              <a href={`tel:${contact.phone}`} className="text-slate-700 hover:underline">
                {contact.phone}
              </a>
            </DetailRow>
          )}
          {contact.notes && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                <FileText size={12} />
                Notas
              </p>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{contact.notes}</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function DetailRow({ icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 leading-none mb-0.5">{label}</p>
        <div className="text-slate-800 font-medium">{children}</div>
      </div>
    </div>
  );
}
