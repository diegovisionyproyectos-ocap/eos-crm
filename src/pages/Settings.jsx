import { useState } from 'react';
import { Database, Download, Upload, RefreshCw, Trash2, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { testConnection, isSupabaseConfigured } from '../services/supabase';
import useCRMStore from '../store/useCRMStore';
import useAppStore from '../store/useAppStore';

export default function Settings() {
  const { companies, opportunities, activities, loadSeedData, initialize } = useCRMStore();
  const { addToast } = useAppStore();
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const handleTestConnection = async () => {
    setTesting(true);
    setConnectionStatus(null);
    const result = await testConnection();
    setConnectionStatus(result);
    setTesting(false);
    if (result.ok) addToast('Conexión exitosa con Supabase');
    else addToast(result.error, 'error');
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await initialize();
      addToast('Datos sincronizados correctamente');
    } catch (err) {
      addToast('Error al sincronizar: ' + err.message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = () => {
    const data = { companies, opportunities, activities, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eos-crm-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Datos exportados correctamente');
  };

  const handleLoadDemo = () => {
    loadSeedData();
    addToast('Datos demo cargados');
  };

  const handleReset = () => {
    if (!confirm('¿Borrar todos los datos locales? Esta acción no se puede deshacer.')) return;
    localStorage.clear();
    window.location.reload();
  };

  return (
    <Layout title="Ajustes">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Supabase status */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Database size={18} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Conexión Supabase</h2>
              <p className="text-xs text-slate-500">Backend de datos en tiempo real</p>
            </div>
            <div className="ml-auto">
              {isSupabaseConfigured ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                  <CheckCircle2 size={12} />
                  Configurado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                  <AlertCircle size={12} />
                  Sin configurar
                </span>
              )}
            </div>
          </div>

          {!isSupabaseConfigured && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
              <p className="font-medium mb-1">Configura Supabase para activar la persistencia</p>
              <p className="text-xs text-amber-700">
                Crea un archivo <code className="bg-amber-100 px-1 rounded">.env</code> en la raíz del proyecto con:
              </p>
              <pre className="mt-2 text-xs bg-amber-100 p-2 rounded font-mono leading-relaxed">
{`VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-key`}
              </pre>
              <p className="text-xs mt-2">Luego ejecuta el SQL de <code>eos-crm-v2.sql</code> en tu proyecto de Supabase.</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="secondary"
              icon={RefreshCw}
              loading={testing}
              onClick={handleTestConnection}
              disabled={!isSupabaseConfigured}
            >
              Probar conexión
            </Button>
            <Button
              loading={syncing}
              onClick={handleSync}
              disabled={!isSupabaseConfigured}
            >
              Sincronizar datos
            </Button>
          </div>

          {connectionStatus && (
            <div className={`mt-3 flex items-center gap-2 text-sm p-3 rounded-lg ${
              connectionStatus.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {connectionStatus.ok
                ? <><CheckCircle2 size={14} /> Conexión exitosa</>
                : <><AlertCircle size={14} /> {connectionStatus.error}</>
              }
            </div>
          )}
        </div>

        {/* Data management */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center">
              <Info size={18} className="text-slate-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Gestión de datos</h2>
              <p className="text-xs text-slate-500">Exportar, importar y resetear</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" icon={Download} onClick={handleExport}>
              Exportar JSON
            </Button>
            <Button variant="secondary" onClick={handleLoadDemo}>
              Cargar datos demo
            </Button>
          </div>

          <div className="mt-3 pt-4 border-t border-slate-100">
            <Button
              variant="secondary"
              icon={Trash2}
              onClick={handleReset}
              className="text-red-500 border-red-200 hover:bg-red-50"
            >
              Resetear todos los datos
            </Button>
            <p className="text-xs text-slate-400 mt-2">Esta acción borra el estado local del navegador y recarga la app.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Estadísticas</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { label: 'Colegios', value: companies.length },
              { label: 'Oportunidades', value: opportunities.length },
              { label: 'Actividades', value: activities.length },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 bg-slate-50 rounded-xl">
                <p className="text-2xl font-bold text-slate-900">{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
