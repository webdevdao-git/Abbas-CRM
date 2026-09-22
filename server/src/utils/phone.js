/// Digits only, for wa.me links and duplicate detection.
export function normalizePhone(raw) {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
}

/// Accepts 7-15 digits with an optional leading +, which covers every
/// international format WhatsApp itself accepts.
export function isValidPhone(raw) {
  const normalized = normalizePhone(raw);
  const digits = normalized.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}
