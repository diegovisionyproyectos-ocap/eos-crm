import clsx from 'clsx';

const base =
  'inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none';

const variants = {
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-sm',
  secondary:
    'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 focus:ring-indigo-400 shadow-sm',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-300',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm',
  success:
    'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-sm',
  'sidebar':
    'w-full text-left text-slate-400 hover:bg-white/5 hover:text-white focus:ring-white/20',
};

const sizes = {
  xs: 'px-2.5 py-1.5 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  loading = false,
  icon: Icon,
  iconRight: IconRight,
  ...props
}) {
  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : Icon ? (
        <Icon size={size === 'xs' ? 12 : size === 'sm' ? 14 : 16} />
      ) : null}
      {children}
      {IconRight && <IconRight size={14} />}
    </button>
  );
}
