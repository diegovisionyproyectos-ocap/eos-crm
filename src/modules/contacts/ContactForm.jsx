import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import { Input, Textarea, Select } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { CONTACT_ROLES } from '../../utils/constants';
import useCRMStore from '../../store/useCRMStore';
import useAppStore from '../../store/useAppStore';

const CUSTOM_ROLE = '__custom__';

const DEFAULT_FORM = {
  name: '',
  role: '',
  email: '',
  phone: '',
  is_primary: false,
  notes: '',
};

export default function ContactForm() {
  const { companies, addContact, editContact } = useCRMStore();
  const { activeModal, modalData, closeModal, addToast } = useAppStore();

  const isOpen = activeModal === 'contactForm';
  const isEditing = isOpen && !!modalData?.id;

  const [form, setForm] = useState(DEFAULT_FORM);
  const [companyId, setCompanyId] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [customRole, setCustomRole] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (isEditing) {
      const savedRole = modalData.role || '';
      const isKnownRole = CONTACT_ROLES.includes(savedRole);
      setForm({
        name: modalData.name || '',
        role: isKnownRole ? savedRole : (savedRole ? CUSTOM_ROLE : ''),
        email: modalData.email || '',
        phone: modalData.phone || '',
        is_primary: modalData.is_primary || false,
        notes: modalData.notes || '',
      });
      setCustomRole(isKnownRole ? '' : savedRole);
      setCompanyId(modalData.company_id || '');
    } else {
      setForm(DEFAULT_FORM);
      setCustomRole('');
      setCompanyId(modalData?.company_id || '');
    }
    setErrors({});
  }, [isOpen, modalData]);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'El nombre es requerido';
    if (!companyId) e.company = 'Selecciona un colegio';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      const finalRole = form.role === CUSTOM_ROLE ? customRole.trim() : form.role;
      const payload = { ...form, role: finalRole };
      if (isEditing) {
        await editContact(modalData.id, companyId, payload);
        addToast('Contacto actualizado');
      } else {
        await addContact(companyId, payload);
        addToast('Contacto creado');
      }
      closeModal();
    } catch (err) {
      addToast(err.message || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const presetCompany = isOpen && modalData?.company_id
    ? companies.find((c) => c.id === modalData.company_id)
    : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title={isEditing ? 'Editar contacto' : 'Nuevo contacto'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={closeModal}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={saving}>
            {isEditing ? 'Guardar cambios' : 'Crear contacto'}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* Company selector */}
        {presetCompany ? (
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Colegio</p>
            <p className="text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              {presetCompany.name}
            </p>
          </div>
        ) : (
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              Colegio <span className="text-red-500">*</span>
            </label>
            <select
              value={companyId}
              onChange={(e) => { setCompanyId(e.target.value); setErrors((er) => ({ ...er, company: undefined })); }}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Seleccionar colegio…</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.company && <p className="text-xs text-red-500 mt-1">{errors.company}</p>}
          </div>
        )}

        <Input
          label="Nombre *"
          placeholder="María García"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          error={errors.name}
        />

        <Select
          label="Cargo"
          value={form.role}
          onChange={(e) => set('role', e.target.value)}
        >
          <option value="">Sin especificar</option>
          {CONTACT_ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
          <option value={CUSTOM_ROLE}>Rol no encontrado — escríbelo aquí</option>
        </Select>
        {form.role === CUSTOM_ROLE && (
          <Input
            label="Escribe el rol de la persona"
            placeholder="Ej: Secretaria, Subdirector, Tesorero…"
            value={customRole}
            onChange={(e) => setCustomRole(e.target.value)}
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="maria@colegio.edu"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
          />
          <Input
            label="Teléfono"
            type="tel"
            placeholder="+503 7000-0000"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.is_primary}
            onChange={(e) => set('is_primary', e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
          />
          <span className="text-sm text-slate-700">Contacto principal del colegio</span>
        </label>

        <Textarea
          label="Notas"
          placeholder="Información adicional…"
          rows={2}
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </form>
    </Modal>
  );
}
