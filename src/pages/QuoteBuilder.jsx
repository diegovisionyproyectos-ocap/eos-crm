import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Printer, Save, FileText } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { formatCurrency, formatDate } from '../utils/formatters';
import useCRMStore from '../store/useCRMStore';
import useAppStore from '../store/useAppStore';
import { fetchQuote, createQuote, updateQuote } from '../services/quotesService';
import { QUOTE_STATUS } from './Quotes';
import clsx from 'clsx';

// ── Constants ────────────────────────────────────────────────────────────────

const TAX_RATE = 13; // IVA El Salvador

const QUICK_PRODUCTS = [
  { label: 'EOS Completo',         description: 'EOS Completo — Módulo académico + administrativo', unit_price: 4500 },
  { label: 'EOS Académico',        description: 'EOS Académico — Módulo académico',                 unit_price: 2800 },
  { label: 'EOS Básico',           description: 'EOS Básico — Módulo básico',                       unit_price: 1500 },
  { label: 'EOS Administrativo',   description: 'EOS Administrativo — Módulo administrativo',       unit_price: 2200 },
  { label: 'Capacitación',         description: 'Capacitación y onboarding (10 horas)',              unit_price: 500  },
  { label: 'Soporte mensual',      description: 'Soporte técnico mensual',                           unit_price: 200  },
  { label: 'Implementación',       description: 'Implementación y configuración inicial',            unit_price: 800  },
  { label: 'Licencia por usuario', description: 'Licencia adicional por usuario',                    unit_price: 50   },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const newItem = () => ({
  _key: crypto.randomUUID(),
  description: '',
  quantity: 1,
  unit_price: 0,
  discount_pct: 0,
  total: 0,
});

function calcItem(item) {
  const gross    = Number(item.quantity) * Number(item.unit_price);
  const discount = gross * (Number(item.discount_pct) / 100);
  return { ...item, total: Math.max(0, gross - discount) };
}

function calcTotals(items, globalDiscPct, taxPct) {
  const subtotal        = items.reduce((s, i) => s + i.total, 0);
  const discountAmount  = subtotal * (Number(globalDiscPct) / 100);
  const afterDiscount   = subtotal - discountAmount;
  const taxAmount       = afterDiscount * (Number(taxPct) / 100);
  const total           = afterDiscount + taxAmount;
  return { subtotal, discountAmount, taxAmount, total };
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function QuoteBuilder() {
  const { quoteId }       = useParams();
  const [searchParams]    = useSearchParams();
  const navigate          = useNavigate();
  const isNew             = !quoteId;

  const { companies, initialize } = useCRMStore();
  const { addToast }              = useAppStore();

  const [companyId,    setCompanyId]    = useState(searchParams.get('empresa') || '');
  const [status,       setStatus]       = useState('borrador');
  const [validityDays, setValidityDays] = useState(30);
  const [discountPct,  setDiscountPct]  = useState(0);
  const [taxPct,       setTaxPct]       = useState(TAX_RATE);
  const [notes,        setNotes]        = useState('');
  const [items,        setItems]        = useState([newItem()]);
  const [quoteCode,    setQuoteCode]    = useState('');
  const [saving,       setSaving]       = useState(false);
  const [loading,      setLoading]      = useState(!isNew);

  useEffect(() => { initialize(); }, []);

  // Load existing quote
  useEffect(() => {
    if (isNew) return;
    fetchQuote(quoteId).then((q) => {
      if (!q) { setLoading(false); return; }
      setCompanyId(q.company_id);
      setStatus(q.status);
      setValidityDays(q.validity_days);
      setDiscountPct(q.discount_pct);
      setTaxPct(q.tax_pct);
      setNotes(q.notes || '');
      setQuoteCode(q.code || '');
      const loadedItems = (q.crm_quote_items || [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((i) => ({ ...i, _key: i.id }));
      setItems(loadedItems.length ? loadedItems : [newItem()]);
      setLoading(false);
    });
  }, [quoteId]);

  const company = companies.find((c) => c.id === companyId);
  const { subtotal, discountAmount, taxAmount, total } = calcTotals(items, discountPct, taxPct);

  // ── Item handlers ────────────────────────────────────────────────────────

  const updateItem = (key, field, value) =>
    setItems((prev) =>
      prev.map((it) => it._key !== key ? it : calcItem({ ...it, [field]: value }))
    );

  const addItem = (prefill = {}) =>
    setItems((prev) => [...prev, calcItem({ ...newItem(), ...prefill })]);

  const removeItem = (key) =>
    setItems((prev) => prev.filter((it) => it._key !== key));

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!companyId) { addToast('Selecciona un colegio', 'error'); return; }
    const validItems = items.filter((i) => i.description.trim());
    if (!validItems.length) { addToast('Agrega al menos un producto', 'error'); return; }

    setSaving(true);
    try {
      const payload = {
        company_id: companyId, status, validity_days: validityDays,
        discount_pct: discountPct, tax_pct: taxPct,
        subtotal, discount_amount: discountAmount, tax_amount: taxAmount, total,
        notes: notes || null,
      };
      const cleanItems = validItems.map(({ _key, id, quote_id, sort_order, ...rest }) => rest);

      if (isNew) {
        const q = await createQuote(payload, cleanItems);
        addToast('Cotización creada');
        navigate(`/cotizaciones/${q.id}`, { replace: true });
      } else {
        await updateQuote(quoteId, payload, cleanItems);
        addToast('Cotización guardada');
      }
    } catch (err) {
      addToast(err.message || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Cotización">
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <>
      {/* Print: hide everything except the print container */}
      <style>{`
        @media print {
          #app-root, header, aside, nav { display: none !important; }
          #quote-print-area { display: block !important; position: fixed; inset: 0; }
        }
        #quote-print-area { display: none; }
      `}</style>

      <div id="quote-print-area">
        <PrintableQuote
          company={company}
          code={quoteCode}
          items={items.filter((i) => i.description.trim())}
          subtotal={subtotal}
          discountAmount={discountAmount}
          discountPct={discountPct}
          taxAmount={taxAmount}
          taxPct={taxPct}
          total={total}
          validityDays={validityDays}
          notes={notes}
        />
      </div>

      <Layout title={isNew ? 'Nueva cotización' : `Cotización ${quoteCode}`}>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-5 transition-colors"
        >
          <ArrowLeft size={15} /> Volver
        </button>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* ── LEFT — form ── */}
          <div className="xl:col-span-2 space-y-4">

            {/* Header fields */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Colegio *</label>
                  <select
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    disabled={!isNew && !!companyId}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-50 disabled:text-slate-500"
                  >
                    <option value="">Seleccionar colegio…</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code ? `[${c.code}] ` : ''}{c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Estado</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      {Object.entries(QUOTE_STATUS).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Validez (días)</label>
                    <input
                      type="number" min={1} value={validityDays}
                      onChange={(e) => setValidityDays(Number(e.target.value))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick-add */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Agregar rápido</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_PRODUCTS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => addItem({ description: p.description, unit_price: p.unit_price })}
                    className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
                  >
                    + {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Items table */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 w-full">Descripción</th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">Cant.</th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">P. Unitario</th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">Desc. %</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">Total</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map((item) => (
                      <tr key={item._key} className="group hover:bg-slate-50/50">
                        <td className="px-4 py-2.5">
                          <input
                            value={item.description}
                            onChange={(e) => updateItem(item._key, 'description', e.target.value)}
                            placeholder="Producto o servicio…"
                            className="w-full text-sm text-slate-700 bg-transparent focus:outline-none placeholder:text-slate-300"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number" min={0} step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateItem(item._key, 'quantity', e.target.value)}
                            className="w-16 text-right text-sm border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number" min={0} step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateItem(item._key, 'unit_price', e.target.value)}
                            className="w-24 text-right text-sm border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number" min={0} max={100}
                            value={item.discount_pct}
                            onChange={(e) => updateItem(item._key, 'discount_pct', e.target.value)}
                            className="w-16 text-right text-sm border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap">
                          {formatCurrency(item.total)}
                        </td>
                        <td className="pr-2 py-2.5">
                          <button
                            onClick={() => removeItem(item._key)}
                            className="p-1 rounded text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-slate-50">
                <button
                  onClick={() => addItem()}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                  <Plus size={13} /> Agregar línea
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-2">
                Notas / condiciones de pago
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Términos de pago, condiciones especiales, observaciones…"
                className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          {/* ── RIGHT — summary + actions ── */}
          <div className="space-y-4">

            {/* Totals */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Resumen</h3>
              <div className="space-y-3">
                <TotalRow label="Subtotal" value={formatCurrency(subtotal)} />

                {/* Global discount */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Descuento global</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number" min={0} max={100}
                      value={discountPct}
                      onChange={(e) => setDiscountPct(Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="w-14 text-right text-xs border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <span className="text-xs text-slate-400">%</span>
                    {discountAmount > 0 && (
                      <span className="text-xs font-semibold text-red-500">
                        -{formatCurrency(discountAmount)}
                      </span>
                    )}
                  </div>
                </div>

                {/* IVA */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">IVA</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number" min={0}
                      value={taxPct}
                      onChange={(e) => setTaxPct(Math.max(0, Number(e.target.value)))}
                      className="w-14 text-right text-xs border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <span className="text-xs text-slate-400">%</span>
                    <span className="text-xs font-semibold text-slate-600">
                      {formatCurrency(taxAmount)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                  <span className="font-bold text-slate-700">Total</span>
                  <span className="text-2xl font-black text-indigo-600">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            {/* Company chip */}
            {company && (
              <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-4">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Cliente</p>
                <p className="text-sm font-bold text-slate-800">{company.name}</p>
                {company.code && (
                  <span className="inline-block mt-1 text-[10px] font-mono font-bold text-indigo-600 bg-white px-1.5 py-0.5 rounded border border-indigo-100">
                    {company.code}
                  </span>
                )}
                {company.city && (
                  <p className="text-xs text-slate-400 mt-1">{company.city}</p>
                )}
              </div>
            )}

            {/* Code */}
            {quoteCode && (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Código</p>
                <p className="text-2xl font-mono font-black text-slate-800">{quoteCode}</p>
              </div>
            )}

            {/* Status badge */}
            {!isNew && (
              <div
                className="rounded-xl p-3 text-center"
                style={{
                  backgroundColor: QUOTE_STATUS[status]?.bg,
                  color: QUOTE_STATUS[status]?.color,
                }}
              >
                <p className="text-xs font-bold uppercase tracking-widest">
                  {QUOTE_STATUS[status]?.label}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-lg shadow-indigo-200"
              >
                {saving
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Save size={15} />
                }
                {saving ? 'Guardando…' : (isNew ? 'Crear cotización' : 'Guardar cambios')}
              </button>

              {!isNew && (
                <button
                  onClick={() => window.print()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <Printer size={15} /> Imprimir / PDF
                </button>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}

// ── Small helper ─────────────────────────────────────────────────────────────

function TotalRow({ label, value }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-700">{value}</span>
    </div>
  );
}

// ── Printable quote ───────────────────────────────────────────────────────────

function PrintableQuote({ company, code, items, subtotal, discountAmount, discountPct, taxAmount, taxPct, total, validityDays, notes }) {
  const today = new Date().toLocaleDateString('es-SV', { year: 'numeric', month: 'long', day: 'numeric' });
  const expiresAt = new Date(Date.now() + validityDays * 86400000)
    .toLocaleDateString('es-SV', { year: 'numeric', month: 'long', day: 'numeric' });

  const fmt = (n) => Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

  return (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', padding: '48px', maxWidth: '800px', margin: '0 auto', color: '#1e293b' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #6366f1', paddingBottom: '24px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 44, height: 44, background: '#6366f1', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 13 }}>EOS</span>
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 900, fontSize: 18 }}>EOS CRM</p>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: 11 }}>El Salvador</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: '0 0 4px', fontWeight: 900, fontSize: 26, color: '#6366f1' }}>COTIZACIÓN</p>
          {code && <p style={{ margin: 0, fontFamily: 'monospace', fontSize: 13, color: '#64748b' }}>{code}</p>}
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>{today}</p>
        </div>
      </div>

      {/* Client */}
      {company && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ margin: '0 0 6px', fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Para</p>
          <p style={{ margin: '0 0 3px', fontWeight: 800, fontSize: 17 }}>{company.name}</p>
          {company.code && <p style={{ margin: '0 0 3px', fontFamily: 'monospace', fontSize: 12, color: '#6366f1' }}>{company.code}</p>}
          {company.city && <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{company.city}, El Salvador</p>}
        </div>
      )}

      {/* Items */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24, fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            {['Descripción', 'Cant.', 'P. Unitario', 'Desc. %', 'Total'].map((h, i) => (
              <th key={h} style={{ padding: '10px 12px', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: '#64748b', textAlign: i === 0 ? 'left' : 'right', whiteSpace: 'nowrap' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '10px 12px' }}>{item.description}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right' }}>{item.quantity}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmt(item.unit_price)}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right' }}>{item.discount_pct > 0 ? `${item.discount_pct}%` : '—'}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{fmt(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 28 }}>
        <div style={{ minWidth: 260 }}>
          {[
            { label: 'Subtotal', value: fmt(subtotal) },
            ...(discountAmount > 0 ? [{ label: `Descuento (${discountPct}%)`, value: `-${fmt(discountAmount)}`, red: true }] : []),
            { label: `IVA (${taxPct}%)`, value: fmt(taxAmount) },
          ].map(({ label, value, red }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, color: red ? '#ef4444' : '#64748b' }}>
              <span>{label}</span><span style={{ fontWeight: red ? 700 : 400 }}>{value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', borderTop: '2px solid #6366f1', marginTop: 6, fontSize: 17, fontWeight: 900, color: '#6366f1' }}>
            <span>TOTAL</span><span>{fmt(total)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', gap: 24, fontSize: 12, color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
        {notes && (
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#475569' }}>Notas y condiciones</p>
            <p style={{ margin: 0, lineHeight: 1.7 }}>{notes}</p>
          </div>
        )}
        <div style={{ minWidth: 190 }}>
          <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#475569' }}>Validez</p>
          <p style={{ margin: 0 }}>Válida hasta el {expiresAt}</p>
          <p style={{ margin: '3px 0 0', color: '#94a3b8' }}>({validityDays} días calendario)</p>
        </div>
      </div>
    </div>
  );
}
