import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { signIn } from '../services/authService';
import useAppStore from '../store/useAppStore';

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Already logged in → redirect
  if (isAuthenticated) {
    navigate('/', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      const msg = err.message || 'Error al iniciar sesión';
      if (msg.includes('Invalid login')) {
        setError('Correo o contraseña incorrectos. Verifica tus datos.');
      } else if (msg.includes('Email not confirmed')) {
        setError('Confirma tu correo electrónico antes de ingresar.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl shadow-2xl shadow-indigo-900/50 mb-4">
            <GraduationCap size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">EOS CRM</h1>
          <p className="text-slate-500 text-sm mt-1">Education Operative System — El Salvador</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/60 backdrop-blur border border-white/10 rounded-2xl p-7 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-6">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@eos.com.sv"
                  autoComplete="email"
                  className="w-full bg-slate-900/70 border border-slate-700 text-white text-sm rounded-lg pl-9 pr-3 py-2.5 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-slate-900/70 border border-slate-700 text-white text-sm rounded-lg pl-9 pr-10 py-2.5 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
                <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-xs leading-relaxed">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm py-2.5 rounded-lg transition-colors shadow-lg shadow-indigo-900/30 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Ingresando…
                </>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>
        </div>

        {/* Demo note */}
        <p className="text-center text-slate-600 text-xs mt-5">
          ¿Problemas para ingresar? Contacta al administrador del sistema.
        </p>
      </div>
    </div>
  );
}
