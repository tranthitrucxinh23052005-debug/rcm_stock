/**
 * Vietnamese number formatting utilities.
 * Convention: "." for thousands separator, "," for decimal separator.
 * Example: 1234567.89 -> "1.234.567,89"
 */

/** Format a number with Vietnamese thousands (.) and decimal (,) separators. */
export function formatVN(value: number, decimals = 2): string {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Format a price with the "đ" suffix. */
export function formatPrice(value: number, decimals = 2): string {
  return `${formatVN(value, decimals)}đ`;
}

/** Format a percentage with sign. */
export function formatPct(value: number, decimals = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${formatVN(value, decimals)}%`;
}

/** Format an integer (no decimals). */
export function formatInt(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return value.toLocaleString('de-DE');
}

/** Format volume with appropriate suffix (N, Nghìn, Tr, Tỷ). */
export function formatVolume(value: number): string {
  if (value >= 1_000_000_000) return `${formatVN(value / 1_000_000_000, 2)} tỷ`;
  if (value >= 1_000_000) return `${formatVN(value / 1_000_000, 2)} tr`;
  if (value >= 1_000) return `${formatVN(value / 1_000, 1)}N`;
  return formatInt(value);
}
