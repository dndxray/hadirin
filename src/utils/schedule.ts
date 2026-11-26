export const DAY_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const MONTH_FULL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** Rentang minggu berjalan: Senin 00:00 sampai Senin berikutnya 00:00 (waktu perangkat). */
export function getWeekRange(now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

/** Label rentang minggu, contoh: "23 Nov – 29 Nov 2026". */
export function weekRangeLabel(start: Date, end: Date) {
  const lastDay = new Date(end);
  lastDay.setDate(lastDay.getDate() - 1);
  return (
    `${start.getDate()} ${MONTH_SHORT[start.getMonth()]} – ` +
    `${lastDay.getDate()} ${MONTH_SHORT[lastDay.getMonth()]} ${lastDay.getFullYear()}`
  );
}

/** Waktu sesi dalam milidetik (dari field `date` / `dateTimestamp` Firestore), atau null. */
export function sessionMs(s: any): number | null {
  const ts = s.date ?? s.dateTimestamp;
  const ms = ts?.toMillis?.();
  return typeof ms === 'number' ? ms : null;
}

/** Awal hari (00:00) dari sebuah waktu. */
export function dayStartMs(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export const getInitials = (name?: string) => {
  if (!name) return 'MK';
  return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
};