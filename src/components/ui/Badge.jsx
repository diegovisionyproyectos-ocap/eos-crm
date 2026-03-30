import clsx from 'clsx';

const variants = {
  default: 'bg-slate-100 text-slate-700',
  primary: 'bg-indigo-100 text-indigo-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  cyan: 'bg-cyan-100 text-cyan-700',
  purple: 'bg-violet-100 text-violet-700',
  orange: 'bg-orange-100 text-orange-700',
};

export default function Badge({ children, variant = 'default', dot, className }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant] || variants.default,
        className
      )}
    >
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', dot)} />}
      {children}
    </span>
  );
}

/** Stage-specific badge using stage color */
export function StageBadge({ stage, label, color, bg }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: bg, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
