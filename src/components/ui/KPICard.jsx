import clsx from 'clsx';

export default function KPICard({ title, value, subtitle, icon: Icon, trend, color = 'indigo', className }) {
  const colors = {
    indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', ring: 'ring-indigo-100' },
    green: { bg: 'bg-green-50', icon: 'text-green-600', ring: 'ring-green-100' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', ring: 'ring-amber-100' },
    red: { bg: 'bg-red-50', icon: 'text-red-600', ring: 'ring-red-100' },
    cyan: { bg: 'bg-cyan-50', icon: 'text-cyan-600', ring: 'ring-cyan-100' },
  };

  const c = colors[color] || colors.indigo;

  return (
    <div className={clsx('bg-white rounded-xl border border-slate-100 p-5 shadow-card hover:shadow-card-hover transition-shadow', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-500 truncate">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 tracking-tight truncate">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-500 truncate">{subtitle}</p>}
          {trend !== undefined && (
            <div className={clsx('mt-2 inline-flex items-center gap-1 text-xs font-medium',
              trend >= 0 ? 'text-green-600' : 'text-red-600')}>
              <span>{trend >= 0 ? '↑' : '↓'}</span>
              <span>{Math.abs(trend)}% vs mes anterior</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={clsx('flex-shrink-0 w-11 h-11 rounded-xl ring-1 flex items-center justify-center', c.bg, c.ring)}>
            <Icon size={22} className={c.icon} />
          </div>
        )}
      </div>
    </div>
  );
}
