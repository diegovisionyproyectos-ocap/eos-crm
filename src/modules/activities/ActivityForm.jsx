import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import { Input, Textarea, Select } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { ACTIVITY_TYPES } from '../../utils/constants';
import useCRMStore from '../../store/useCRMStore';
import useAppStore from '../../store/useAppStore';

const DEFAULT_FORM = {
  type: 'llamada',
  subject: '',
  notes: '',
  company_id: '',
  opportunity_id: '',
  scheduled_at: '',
};

export default function ActivityForm() {
  const { activeModal, modalData, closeModal, addToast } = useAppStore();
  const { companies, opportunities, addActivity } = useCRMStore();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const isOpen = activeModal === 'activityForm';

  useEffect(() => {
    if (!isOpen) return;
    setForm({ ...DEFAULT_FORM, company_id: modalData?.company_id || '', opportunity_id: modalData?.opportunity_id || '' });
  }, [isOpen, modalData]);

  const companyOpps = form.company_id
    ? opportunities.filter((o) => o.company_id === form.company_id)
    : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim()) { addToast('El asunto es requerido', 'error'); return; }
    setSaving(true);
    try {
      await addActivity({ ...form, created_at: new Date().toISOString() });
      addToast('Actividad registrada');
      closeModal();
    } catch (err) {
      addToast(err.message || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title="Nueva actividad"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={closeModal}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={saving}>Registrar</Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Select label="Tipo" value={form.type} onChange={(e) => set('type', e.target.value)}>
          {Object.entries(ACTIVITY_TYPES).map(([key, type]) => (
            <option key={key} value={key}>{type.label}</option>
          ))}
        </Select>

        <Input
          label="Asunto *"
          placeholder="Llamada de seguimiento, Demo inicial…"
          value={form.subject}
          onChange={(e) => set('subject', e.target.value)}
        />

        <Select label="Colegio" value={form.company_id} onChange={(e) => set('company_id', e.target.value)}>
          <option value="">— Sin colegio —</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>

        {companyOpps.length > 0 && (
          <Select label="Oportunidad" value={form.opportunity_id} onChange={(e) => set('opportunity_id', e.target.value)}>
            <option value="">— Sin oportunidad —</option>
            {companyOpps.map((o) => (
              <option key={o.id} value={o.id}>{o.title}</option>
            ))}
          </Select>
        )}

        <Input
          label="Fecha y hora"
          type="datetime-local"
          value={form.scheduled_at}
          onChange={(e) => set('scheduled_at', e.target.value)}
        />

        <Textarea
          label="Notas"
          placeholder="Detalles de la actividad…"
          rows={3}
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </form>
    </Modal>
  );
}
