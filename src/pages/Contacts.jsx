import { useEffect, useState } from 'react';
import { Search, User, Mail, Phone, Building2, X, Plus, Pencil, Trash2, Star } from 'lucide-react';
import Layout from '../components/layout/Layout';
import ContactForm from '../modules/contacts/ContactForm';
import Button from '../components/ui/Button';
import { getInitials } from '../utils/formatters';
import useCRMStore from '../store/useCRMStore';
import useAppStore from '../store/useAppStore';

export default function Contacts() {
  const { companies, removeContact, initialize } = useCRMStore();
  const { openModal, addToast } = useAppStore();
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');

  useEffect(() => { initialize(); }, []);

  // Flatten all contacts from companies
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
              className="bg-white rounded-xl border border-slate-100 shadow-card p-4 flex items-center gap-4 hover:shadow-card-hover transition-shadow group"
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                  {getInitials(contact.name)}
                </div>
                {contact.is_primary && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                    <Star size={9} className="text-white fill-white" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{contact.name}</p>
                  {contact.role && (
                    <p className="text-xs text-slate-500">{contact.role}</p>
                  )}
                </div>
                <div className="min-w-0 space-y-0.5">
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-xs text-indigo-600 hover:underline flex items-center gap-1 truncate"
                    >
                      <Mail size={11} className="flex-shrink-0" />
                      {contact.email}
                    </a>
                  )}
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="text-xs text-slate-500 flex items-center gap-1"
                    >
                      <Phone size={11} className="flex-shrink-0" />
                      {contact.phone}
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Building2 size={11} className="flex-shrink-0 text-slate-400" />
                  <span className="truncate">{contact.company?.name}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                  onClick={() => openModal('contactForm', { ...contact, company_id: contact.company_id })}
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
    </Layout>
  );
}
