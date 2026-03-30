import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale/es';

/**
 * Format currency in US Dollars (USD — El Salvador official currency)
 * @param {number} value
 * @param {boolean} compact - Use compact notation (1.2M, 500K)
 */
export function formatCurrency(value, compact = false) {
  if (value == null || isNaN(value)) return '—';
  if (compact) {
    if (Math.abs(value) >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1_000) {
      return `$${(value / 1_000).toFixed(0)}K`;
    }
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a number with locale separators
 */
export function formatNumber(value) {
  if (value == null || isNaN(value)) return '—';
  return new Intl.NumberFormat('es-CO').format(value);
}

/**
 * Format a date string or Date object
 */
export function formatDate(date, fmt = 'dd MMM yyyy') {
  if (!date) return '—';
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return '—';
  return format(parsed, fmt, { locale: es });
}

/**
 * Relative time: "hace 3 días", "en 2 semanas"
 */
export function formatRelativeTime(date) {
  if (!date) return '—';
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return '—';
  return formatDistanceToNow(parsed, { addSuffix: true, locale: es });
}

/**
 * Capitalize first letter
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncate string to max length
 */
export function truncate(str, max = 40) {
  if (!str) return '';
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

/**
 * Get initials from a name (up to 2 chars)
 */
export function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/**
 * Format student count with "estudiantes" suffix
 */
export function formatStudents(count) {
  if (!count) return '—';
  return `${formatNumber(count)} est.`;
}

/**
 * Calculate weighted pipeline value
 * @param {Array} opportunities
 */
export function calcWeightedPipeline(opportunities = []) {
  return opportunities
    .filter((o) => o.stage !== 'perdido')
    .reduce((sum, o) => sum + (o.value || 0) * ((o.probability || 0) / 100), 0);
}

/**
 * Get color class for probability value
 */
export function getProbabilityColor(prob) {
  if (prob >= 80) return 'text-green-600';
  if (prob >= 50) return 'text-amber-600';
  if (prob >= 25) return 'text-orange-600';
  return 'text-red-600';
}
