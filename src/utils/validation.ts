export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return /^\+?\d{10,15}$/.test(cleaned);
}

export function isRequired(value: string): boolean {
  return value.trim().length > 0;
}

export function isMinLength(value: string, min: number): boolean {
  return value.trim().length >= min;
}

export function isValidPostcode(value: string): boolean {
  return /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(value.trim());
}

export function isValidCompanyNumber(value: string): boolean {
  const trimmed = value.trim();
  return /^\d{8}$/.test(trimmed) || /^[A-Za-z]{2}\d{6}$/.test(trimmed);
}

export function isValidUrl(value: string): boolean {
  return /^https?:\/\/.+\..+/.test(value.trim());
}

export function isPositiveNumber(value: string): boolean {
  const num = parseFloat(value);
  return !isNaN(num) && num > 0;
}

export function validateField(
  value: string,
  rules: { required?: boolean; email?: boolean; phone?: boolean; minLength?: number }
): string | null {
  if (rules.required && !isRequired(value)) return 'This field is required';
  if (rules.email && value.trim() && !isValidEmail(value)) return 'Invalid email address';
  if (rules.phone && value.trim() && !isValidPhone(value)) return 'Invalid phone number';
  if (rules.minLength && !isMinLength(value, rules.minLength))
    return `Must be at least ${rules.minLength} characters`;
  return null;
}
