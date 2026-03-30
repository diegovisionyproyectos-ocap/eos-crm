import clsx from 'clsx';

const inputBase =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500';

export function Input({ label, error, hint, className, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-slate-700">{label}</label>
      )}
      <input className={clsx(inputBase, error && 'border-red-400 focus:ring-red-400', className)} {...props} />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Textarea({ label, error, hint, className, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-slate-700">{label}</label>
      )}
      <textarea
        className={clsx(inputBase, 'resize-none', error && 'border-red-400', className)}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Select({ label, error, hint, children, className, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-slate-700">{label}</label>
      )}
      <select className={clsx(inputBase, 'cursor-pointer', error && 'border-red-400', className)} {...props}>
        {children}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
