export function firebaseErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code) : '';
  if (code.includes('permission-denied')) return 'Akses ditolak. Pastikan akun terdaftar sebagai peserta dan hubungi asisten.';
  if (code.includes('unavailable') || code.includes('network-request-failed')) return 'Tidak dapat terhubung. Periksa koneksi internet lalu coba lagi.';
  if (code.includes('unauthenticated')) return 'Sesi login berakhir. Silakan login kembali.';
  if (code.includes('auth/')) return 'Login gagal. Periksa email dan kata sandi, lalu coba lagi.';
  if (error instanceof Error && !code) return error.message;
  return 'Data belum dapat diproses. Silakan coba lagi.';
}
