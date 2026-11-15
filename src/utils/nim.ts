export function normalizeNim(value: string) {
  return value.trim().toUpperCase();
}

export function validateNim(value: string) {
  return /^[A-Z0-9][A-Z0-9._/-]{2,29}$/.test(normalizeNim(value))
    ? null : 'NIM wajib diisi 3–30 karakter, menggunakan huruf, angka, titik, garis miring, garis bawah, atau tanda hubung.';
}
