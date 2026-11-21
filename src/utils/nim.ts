export function normalizeNim(value: string) {
  return value.trim();
}

export function validateNim(value: string) {
  return /^\d{14}$/.test(normalizeNim(value))
    ? null : 'NIM wajib diisi 14 angka.';
}
