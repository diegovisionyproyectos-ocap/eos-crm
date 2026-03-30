import { createPortal } from 'react-dom';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import clsx from 'clsx';
import useAppStore from '../../store/useAppStore';

const icons = {
  success: <CheckCircle size={18} className="text-green-500 flex-shrink-0" />,
  error: <AlertCircle size={18} className="text-red-500 flex-shrink-0" />,
  info: <Info size={18} className="text-blue-500 flex-shrink-0" />,
};

export default function ToastContainer() {
  const { toasts, removeToast } = useAppStore();

  if (!toasts.length) return null;

  return createPortal(
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center gap-3 bg-white border border-slate-200 rounded-xl shadow-modal px-4 py-3 max-w-sm animate-slide-up"
        >
          {icons[toast.type] || icons.info}
          <p className="flex-1 text-sm text-slate-700">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
}
