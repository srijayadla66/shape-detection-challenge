/**
 * Minimal utility helpers used by UI components.
 * - cn: join class names (truthy only)
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function toKebabCase(str = '') {
  return String(str)
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
}
