export function normalizeToE164(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, "");

  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  if (cleaned.startsWith("00")) {
    return `+${cleaned.slice(2)}`;
  }

  if (cleaned.startsWith("05") || cleaned.startsWith("5")) {
    const withoutPrefix = cleaned.replace(/^0?5/, "5");
    return `+966${withoutPrefix}`;
  }

  if (cleaned.startsWith("9665")) {
    return `+${cleaned}`;
  }

  if (/^\d{7,15}$/.test(cleaned)) {
    return `+966${cleaned.replace(/^0/, "")}`;
  }

  return cleaned;
}

export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, "");
  return /^\+?[1-9]\d{6,14}$/.test(cleaned);
}

export function isValidSaudiMobile(phone: string): boolean {
  const normalized = normalizeToE164(phone);
  return /^\+9665\d{8}$/.test(normalized);
}

export function formatPhoneForDisplay(phone: string): string {
  const normalized = normalizeToE164(phone);
  if (/^\+9665\d{8}$/.test(normalized)) {
    const num = normalized.slice(4);
    return `+966 ${num.slice(0, 2)} ${num.slice(2, 5)} ${num.slice(5)}`;
  }
  return normalized;
}

export function buildWaMeLink(phone: string, text?: string): string {
  const normalized = normalizeToE164(phone).replace(/^\+/, "");
  const url = `https://wa.me/${normalized}`;
  if (text) {
    return `${url}?text=${encodeURIComponent(text)}`;
  }
  return url;
}
