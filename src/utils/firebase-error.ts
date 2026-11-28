const AUTH_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Email atau kata sandi salah.',
  'auth/wrong-password': 'Email atau kata sandi salah.',
  'auth/user-not-found': 'Email atau kata sandi salah.',
  'auth/invalid-email': 'Format email tidak valid.',
  'auth/email-already-in-use': 'Email sudah terdaftar. Silakan masuk atau gunakan email lain.',
  'auth/weak-password': 'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.',
  'auth/too-many-requests': 'Terlalu banyak percobaan. Tunggu beberapa saat lalu coba lagi.',
  'auth/requires-recent-login': 'Demi keamanan, silakan login ulang lalu ulangi tindakan ini.',
  'auth/user-disabled': 'Akun ini dinonaktifkan. Hubungi pengelola.',
  'auth/network-request-failed': 'Tidak dapat terhubung. Periksa koneksi internet lalu coba lagi.',
};

function codeOf(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code)
    : '';
}

export function firebaseErrorMessage(error: unknown): string {
  const code = codeOf(error);

  if (AUTH_MESSAGES[code]) return AUTH_MESSAGES[code];
  if (code.includes('permission-denied')) return 'Akses ditolak oleh Firestore. Periksa Security Rules dan kewenangan akun.';
  if (code.includes('unavailable') || code.includes('network-request-failed')) return 'Tidak dapat terhubung. Periksa koneksi internet lalu coba lagi.';
  if (code.includes('unauthenticated')) return 'Sesi login berakhir. Silakan login kembali.';
  if (code.includes('not-found')) return 'Data tidak ditemukan atau sudah dihapus.';
  if (code.includes('aborted') || code.includes('failed-precondition')) return 'Data berubah saat diproses. Silakan coba lagi.';
  if (code.includes('deadline-exceeded')) return 'Permintaan terlalu lama. Periksa koneksi lalu coba lagi.';
  if (code.includes('resource-exhausted')) return 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.';
  if (code.startsWith('auth/')) return 'Autentikasi gagal. Silakan coba lagi.';
  if (error instanceof Error && !code) return error.message;
  return 'Data belum dapat diproses. Silakan coba lagi.';
}