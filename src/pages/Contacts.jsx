import { useEffect, useState } from 'react';
import { Search, User, Mail, Phone, Building2, X, Plus } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { getInitials } from '../utils/formatters';
import { CONTACT_ROLES } from '../utils/constants';
import useCRMStore from '../store/useCRMStore';
import useAppStore from '../store/useAppStore';

export default function Contacts() {
  const { companies, initialize } = useCRMStore();
  const { openModal } = useAppStore();
  const [search, setSearch] = useState('');

  useEffect(() => { initialize(); }, []);

  // Flatten all contacts from companies
  const allContacts = companies.flatMap((c) =>
    (c.crm_contacts || []).map((contact) => ({ ...contact, company: c }))
  );

  const filtered = allContacts.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.company?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <Layout title="Contactos">
      <div className="max-w-4xl mx-auto">
        {/* Search */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-400 transition-all">
            <Search size={15} className="text-slate-400 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, email, colegio…"
              className="flex-1 text-sm outline-none bg-transparent text-slate-700 placeholder:text-slate-400"
            />
            {search && (
              <button onClick={() => setSearch('')}><X size={14} className="text-slate-400" /></button>
            )}
          </div>
          <p className="text-sm text-slate-500">{filtered.length} contactos</p>
        </div>

        {/* Empty */}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <User size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">
              {allContacts.length === 0
                ? 'Sin contactos. Agrega contactos al crear un colegio.'
                : 'No se encontraron contactos con esa búsqueda.'}
            </p>
          </div>
        )}

        {/* Contact list */}
        <div className="space-y-2">
          {filtered.map((contact) => (
            <div
              key={contact.id}
              className="bg-white rounded-xl border border-slate-100 shadow-card p-4 flex items-center gap-4 hover:shadow-card-hover transition-shadow"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 flex-shrink-0">
                {getInitials(contact.name)}
              </div>
              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-1">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{contact.name}</p>
                  {contact.role && (
                    <p className="text-xs text-slate-500">{contact.role}</p>
                  )}
                </div>
                <div className="min-w-0 space-y-0.5">
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="text-xs text-indigo-600 hover:underline flex items-center gap-1 truncate">
                      <Mail size={11} className="flex-shrink-0" />
                      {contact.email}
                    </a>
                  )}
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} className="text-xs text-slate-500 flex items-center gap-1">
                      <Phone size={11} className="flex-shrink-0" />
                      {contact.phone}
                    </a>
                  )}
                </div>
                {contact.company && (
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Building2 size={11} className="flex-shrink-0" />
                    <span className="truncate">{contact.company.name}</span>
                  </div>
                )}
              </div>
              {contact.is_primary && (
                <span className="flex-shrink-0 text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  Principal
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
