import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import { Input, Textarea, Select } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { PIPELINE_STAGES, BILLING_CYCLES, LOST_REASONS } from '../../utils/constants';
import useCRMStore from '../../store/useCRMStore';
import useAppStore from '../../store/useAppStore';

const DEFAULT_FORM = {
  title: '',
  company_id: '',
  stage: 'lead',
  value: '',
  billing_cycle: 'mensual',
  probability: '',
  expected_close_date: '',
  notes: '',
  lost_reason: '',
};

export default function OpportunityForm() {
  const { activeModal, modalData, closeModal, addToast } = useAppStore();
  const { companies, addOpportunity, editOpportunity } = useCRMStore();

  const isEditing = activeModal === 'opportunityForm' && modalData?.id;
  const prefill = activeModal === 'opportunityForm' ? modalData : null;

  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (activeModal !== 'opportunityForm') return;
    if (isEditing) {
      setForm({
        title: prefill.title || '',
        company_id: prefill.company_id || '',
        stage: prefill.stage || 'lead',
        value: prefill.value || '',
        billing_cycle: prefill.billing_cycle || 'mensual',
        probability: prefill.probability ?? '',
        expected_close_date: prefill.expected_close_date || '',
        notes: prefill.notes || '',
        lost_reason: prefill.lost_reason || '',
      });
    } else {
      setForm({ ...DEFAULT_FORM, stage: prefill?.stage || 'lead' });
    }
    setErrors({});
  }, [activeModal, modalData]);

  // Auto-fill probability from stage
  useEffect(() => {
    const stage = PIPELINE_STAGES.find((s) => s.id === form.stage);
    if (stage && form.probability === '') {
      setForm((f) => ({ ...f, probability: stage.probability }));
    }
  }, [form.stage]);

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'El título es requerido';
    if (!form.company_id) e.company_id = 'Selecciona un colegio';
    if (!form.value || isNaN(Number(form.value))) e.value = 'Ingresa un valor válido';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      const payload = {
        ...form,
        value: Number(form.value),
        probability: Number(form.probability) || 0,
      };

      if (isEditing) {
        await editOpportunity(prefill.id, payload);
        addToast('Oportunidad actualizada correctamente');
      } else {
        await addOpportunity(payload);
        addToast('Oportunidad creada correctamente');
      }
      closeModal();
    } catch (err) {
      addToast(err.message || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const isOpen = activeModal === 'opportunityForm';

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title={isEditing ? 'Editar oportunidad' : 'Nueva oportunidad'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={closeModal}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={saving}>
            {isEditing ? 'Guardar cambios' : 'Crear oportunidad'}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="Título de la oportunidad"
          placeholder="EOS Completo — Colegio San Marcos"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          error={errors.title}
        />

        <Select
          label="Colegio"
          value={form.company_id}
          onChange={(e) => set('company_id', e.target.value)}
          error={errors.company_id}
        >
          <option value="">— Seleccionar colegio —</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name} {c.city ? `· ${c.city}` : ''}</option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Etapa"
            value={form.stage}
            onChange={(e) => set('stage', e.target.value)}
          >
            {PIPELINE_STAGES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </Select>

          <Input
            label="Probabilidad (%)"
            type="number"
            min="0"
            max="100"
            placeholder="65"
            value={form.probability}
            onChange={(e) => set('probability', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Valor del contrato (COP)"
            type="number"
            placeholder="4500000"
            value={form.value}
            onChange={(e) => set('value', e.target.value)}
            error={errors.value}
          />

          <Select
            label="Ciclo de facturación"
            value={form.billing_cycle}
            onChange={(e) => set('billing_cycle', e.target.value)}
          >
            {BILLING_CYCLES.map((b) => (
              <option key={b.id} value={b.id}>{b.label}</option>
            ))}
          </Select>
        </div>

        <Input
          label="Fecha estimada de cierre"
          type="date"
          value={form.expected_close_date}
          onChange={(e) => set('expected_close_date', e.target.value)}
        />

        {form.stage === 'perdido' && (
          <Select
            label="Motivo de pérdida"
            value={form.lost_reason}
            onChange={(e) => set('lost_reason', e.target.value)}
          >
            <option value="">— Seleccionar motivo —</option>
            {LOST_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Select>
        )}

        <Textarea
          label="Notas"
          placeholder="Contexto, próximos pasos, condiciones especiales…"
          rows={3}
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </form>
    </Modal>
  );
}
