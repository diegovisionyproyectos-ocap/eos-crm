// Pipeline stages for the B2B school CRM
export const PIPELINE_STAGES = [
  {
    id: 'lead',
    label: 'Lead',
    color: '#64748b',
    bg: '#f1f5f9',
    ring: '#cbd5e1',
    probability: 5,
    description: 'Colegio identificado, sin contacto aún',
  },
  {
    id: 'contacto',
    label: 'Contacto',
    color: '#3b82f6',
    bg: '#eff6ff',
    ring: '#bfdbfe',
    probability: 15,
    description: 'Primer contacto realizado',
  },
  {
    id: 'demo_agendada',
    label: 'Demo agendada',
    color: '#8b5cf6',
    bg: '#f5f3ff',
    ring: '#ddd6fe',
    probability: 30,
    description: 'Demo del EOS coordinada',
  },
  {
    id: 'demo_realizada',
    label: 'Demo realizada',
    color: '#06b6d4',
    bg: '#ecfeff',
    ring: '#a5f3fc',
    probability: 50,
    description: 'Demo ejecutada, esperando feedback',
  },
  {
    id: 'propuesta',
    label: 'Propuesta enviada',
    color: '#f59e0b',
    bg: '#fffbeb',
    ring: '#fde68a',
    probability: 65,
    description: 'Propuesta económica enviada',
  },
  {
    id: 'negociacion',
    label: 'Negociación',
    color: '#f97316',
    bg: '#fff7ed',
    ring: '#fed7aa',
    probability: 80,
    description: 'En proceso de negociación',
  },
  {
    id: 'ganado',
    label: 'Cierre ganado',
    color: '#22c55e',
    bg: '#f0fdf4',
    ring: '#bbf7d0',
    probability: 100,
    description: 'Contrato firmado — cliente activo',
  },
  {
    id: 'perdido',
    label: 'Cierre perdido',
    color: '#ef4444',
    bg: '#fef2f2',
    ring: '#fecaca',
    probability: 0,
    description: 'Oportunidad perdida',
  },
];

export const STAGE_MAP = Object.fromEntries(PIPELINE_STAGES.map((s) => [s.id, s]));

// Company status — matches pipeline outcome
export const COMPANY_STATUS = {
  prospect: { label: 'Prospecto', color: '#6366f1', bg: '#eef2ff', dot: 'bg-indigo-500' },
  active: { label: 'Cliente activo', color: '#22c55e', bg: '#f0fdf4', dot: 'bg-green-500' },
  lost: { label: 'Perdido', color: '#ef4444', bg: '#fef2f2', dot: 'bg-red-500' },
  inactive: { label: 'Inactivo', color: '#94a3b8', bg: '#f8fafc', dot: 'bg-slate-400' },
};

// Map marker colors by company status
export const MAP_STATUS_COLORS = {
  active: '#22c55e',
  prospect: '#6366f1',
  negociacion: '#f97316',
  lost: '#ef4444',
  inactive: '#94a3b8',
};

// Activity types
export const ACTIVITY_TYPES = {
  llamada: { label: 'Llamada', icon: 'Phone', color: '#3b82f6', bg: '#eff6ff' },
  visita: { label: 'Visita', icon: 'MapPin', color: '#8b5cf6', bg: '#f5f3ff' },
  demo: { label: 'Demo', icon: 'Monitor', color: '#06b6d4', bg: '#ecfeff' },
  email: { label: 'Email', icon: 'Mail', color: '#f59e0b', bg: '#fffbeb' },
  tarea: { label: 'Tarea', icon: 'CheckSquare', color: '#22c55e', bg: '#f0fdf4' },
  nota: { label: 'Nota', icon: 'FileText', color: '#64748b', bg: '#f1f5f9' },
};

// Contact roles
export const CONTACT_ROLES = [
  'Director(a)',
  'Rector(a)',
  'Coordinador(a)',
  'Jefe de sistemas',
  'Jefe administrativo',
  'Contador(a)',
  'Recepción',
  'Otro',
];

// Billing cycles
export const BILLING_CYCLES = [
  { id: 'mensual', label: 'Mensual' },
  { id: 'anual', label: 'Anual' },
];

// Lost reasons
export const LOST_REASONS = [
  'Presupuesto insuficiente',
  'Eligió a la competencia',
  'No hay decisión de compra',
  'Mala timing / postergado',
  'Producto no se ajusta',
  'Sin respuesta',
  'Otro',
];

// Default map center — El Salvador
export const DEFAULT_MAP_CENTER = [-88.8965, 13.7942];
export const DEFAULT_MAP_ZOOM = 9;

// Seed data for demo — colegios en El Salvador
export const SEED_COMPANIES = [
  {
    id: 'c1',
    name: 'Colegio Externado San José',
    city: 'San Salvador',
    address: 'Av. Los Diplomáticos, San Salvador',
    lat: 13.7034,
    lng: -89.2073,
    student_count: 1400,
    status: 'active',
    website: '',
    notes: 'Cliente ancla — licencia completa EOS',
  },
  {
    id: 'c2',
    name: 'Colegio García Flamenco',
    city: 'Santa Ana',
    address: '4a Calle Oriente, Santa Ana',
    lat: 13.9942,
    lng: -89.5597,
    student_count: 920,
    status: 'prospect',
    website: '',
    notes: 'Interesados en módulo académico',
  },
  {
    id: 'c3',
    name: 'Instituto Nacional de San Miguel',
    city: 'San Miguel',
    address: 'Av. Roosevelt, San Miguel',
    lat: 13.4833,
    lng: -88.1833,
    student_count: 650,
    status: 'prospect',
    website: '',
    notes: 'Demo realizada, esperando propuesta',
  },
  {
    id: 'c4',
    name: 'Colegio Salesiano Santa Cecilia',
    city: 'Sonsonate',
    address: 'Calle Obispo Marroquín, Sonsonate',
    lat: 13.7194,
    lng: -89.7239,
    student_count: 480,
    status: 'inactive',
    website: '',
    notes: 'Postergado hasta Q3',
  },
  {
    id: 'c5',
    name: 'Colegio Bautista de Usulután',
    city: 'Usulután',
    address: '3a Av. Norte, Usulután',
    lat: 13.3494,
    lng: -88.4447,
    student_count: 750,
    status: 'prospect',
    website: '',
    notes: 'Contacto inicial por referido',
  },
];

export const SEED_OPPORTUNITIES = [
  {
    id: 'o1',
    company_id: 'c2',
    title: 'EOS Completo — García Flamenco',
    stage: 'negociacion',
    value: 4500,
    billing_cycle: 'mensual',
    probability: 80,
    expected_close_date: '2026-04-30',
    notes: 'Negociando descuento por pago anual',
  },
  {
    id: 'o2',
    company_id: 'c3',
    title: 'EOS Académico — San Miguel',
    stage: 'propuesta',
    value: 2800,
    billing_cycle: 'mensual',
    probability: 65,
    expected_close_date: '2026-05-15',
    notes: 'Propuesta enviada el 12/03',
  },
  {
    id: 'o3',
    company_id: 'c4',
    title: 'EOS Básico — Santa Cecilia',
    stage: 'demo_realizada',
    value: 1500,
    billing_cycle: 'mensual',
    probability: 40,
    expected_close_date: '2026-06-01',
    notes: 'Demo muy positiva, pendiente directora',
  },
  {
    id: 'o4',
    company_id: 'c5',
    title: 'EOS Completo — Bautista Usulután',
    stage: 'contacto',
    value: 3200,
    billing_cycle: 'mensual',
    probability: 15,
    expected_close_date: '2026-07-01',
    notes: 'Reunión inicial agendada',
  },
  {
    id: 'o5',
    company_id: 'c1',
    title: 'Renovación anual — Externado San José',
    stage: 'ganado',
    value: 48000,
    billing_cycle: 'anual',
    probability: 100,
    expected_close_date: '2026-03-01',
    notes: 'Renovación firmada. Sincronizado con ERP.',
    erp_synced: true,
  },
];
