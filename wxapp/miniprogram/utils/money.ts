export function formatMoneyDisplay(value: string | number | null | undefined): string {
  if (value == null || value === '') {
    return '0.00';
  }

  const normalized = Number(String(value).replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(normalized)) {
    return '0.00';
  }

  return normalized.toFixed(2);
}
