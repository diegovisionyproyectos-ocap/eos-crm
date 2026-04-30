import { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { Input, Textarea, Select } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { COMPANY_STATUS } from '../../utils/constants';
import useCRMStore from '../../store/useCRMStore';
import useAppStore from '../../store/useAppStore';

const DEFAULT_FORM = {
  name: '',
  city: '',
  address: '',
  student_count: '',
  status: 'prospect',
  website: '',
  notes: '',
  lat: '',
  lng: '',
};

export default function CompanyForm() {
  const { activeModal, modalData, closeModal, addToast, startLocationPick, pickedLocation, cancelLocationPick } = useAppStore();
  const { addCompany, editCompany } = useCRMStore();

  const isEditing = activeModal === 'companyForm' && modalData?.id;
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (activeModal !== 'companyForm') return;
    if (isEditing && modalData) {
      setForm({
        name: modalData.name || '',
        city: modalData.city || '',
        address: modalData.address || '',
        student_count: modalData.student_count || '',
        status: modalData.status || 'prospect',
        website: modalData.website || '',
        notes: modalData.notes || '',
        lat: modalData.lat || '',
        lng: modalData.lng || '',
      });
    } else {
      setForm(DEFAULT_FORM);
    }
    setErrors({});
  }, [activeModal, modalData]);

  // When user picks location on map
  useEffect(() => {
    if (pickedLocation && activeModal === 'companyForm') {
      setForm((f) => ({
        ...f,
        lat: pickedLocation.lat.toFixed(6),
        lng: pickedLocation.lng.toFixed(6),
      }));
    }
  }, [pickedLocation, activeModal]);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'El nombre es requerido';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      const payload = {
        ...form,
        student_count: form.student_count ? Number(form.student_count) : null,
        lat: form.lat ? Number(form.lat) : null,
        lng: form.lng ? Number(form.lng) : null,
      };

      if (isEditing) {
        await editCompany(modalData.id, payload);
        addToast('Colegio actualizado correctamente');
      } else {
        await addCompany(payload);
        addToast('Colegio creado correctamente');
      }
      cancelLocationPick();
      closeModal();
    } catch (err) {
      addToast(err.message || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const isOpen = activeModal === 'companyForm';

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { cancelLocationPick(); closeModal(); }}
      title={isEditing ? 'Editar colegio' : 'Nuevo colegio'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => { cancelLocationPick(); closeModal(); }}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={saving}>
            {isEditing ? 'Guardar cambios' : 'Crear colegio'}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {isEditing && modalData?.code && (
          <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-lg border border-indigo-100">
            <span className="text-xs text-slate-500">Código:</span>
            <span className="text-sm font-mono font-bold text-indigo-600">{modalData.code}</span>
          </div>
        )}
        <Input
          label="Nombre del colegio *"
          placeholder="Colegio Los Andes"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          error={errors.name}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Ciudad"
            placeholder="Bogotá"
            value={form.city}
            onChange={(e) => set('city', e.target.value)}
          />
          <Input
            label="No. de estudiantes"
            type="number"
            placeholder="1200"
            value={form.student_count}
            onChange={(e) => set('student_count', e.target.value)}
          />
        </div>

        <Input
          label="Dirección"
          placeholder="Cra 15 #72-41"
          value={form.address}
          onChange={(e) => set('address', e.target.value)}
        />

        <Select
          label="Estado"
          value={form.status}
          onChange={(e) => set('status', e.target.value)}
        >
          {Object.entries(COMPANY_STATUS).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </Select>

        {/* Coordinates */}
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">
            Ubicación en mapa
          </label>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <Input
              placeholder="Latitud (ej: 4.6589)"
              type="number"
              step="any"
              value={form.lat}
              onChange={(e) => set('lat', e.target.value)}
            />
            <Input
              placeholder="Longitud (ej: -74.0558)"
              type="number"
              step="any"
              value={form.lng}
              onChange={(e) => set('lng', e.target.value)}
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={MapPin}
            onClick={() => { closeModal(); startLocationPick(); }}
            type="button"
          >
            Seleccionar en mapa
          </Button>
          {form.lat && form.lng && (
            <p className="text-xs text-green-600 mt-1">
              ✓ Ubicación: {Number(form.lat).toFixed(4)}, {Number(form.lng).toFixed(4)}
            </p>
          )}
        </div>

        <Input
          label="Sitio web"
          placeholder="https://colegio.edu.co"
          type="url"
          value={form.website}
          onChange={(e) => set('website', e.target.value)}
        />

        <Textarea
          label="Notas"
          placeholder="Información relevante del colegio…"
          rows={3}
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </form>
    </Modal>
  );
}
