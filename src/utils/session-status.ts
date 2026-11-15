export type SessionStatusType = 'open' | 'upcoming' | 'closed';

export function getSessionStatus(kelas: any): SessionStatusType {
  // Kalau data belum lengkap di Firebase, anggap tutup
  if (!kelas?.dateLabel || !kelas?.timeStart || !kelas?.timeEnd) {
    return 'closed';
  }

  const MONTHS: Record<string, number> = {
    'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
    'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
  };

  const parseDate = (dateStr: string, timeStr: string) => {
    try {
      // Format dateLabel: "Senin, 09 November 2026"
      const parts = dateStr.replace(',', '').split(' ');
      if (parts.length < 4) return null;
      
      const day = parseInt(parts[1], 10);
      const month = MONTHS[parts[2].toLowerCase()];
      const year = parseInt(parts[3], 10);
      const [hour, minute] = timeStr.split('.').map(Number);

      if (isNaN(day) || month === undefined || isNaN(year) || isNaN(hour)) return null;

      // Paksa pakai GMT+7 (WIB). 
      // Date.UTC bikin waktunya GMT, kita kurangi 7 jam biar pas di WIB.
      const utcMs = Date.UTC(year, month, day, hour, minute || 0);
      return new Date(utcMs - (7 * 60 * 60 * 1000));
    } catch {
      return null;
    }
  };

  const startDate = parseDate(kelas.dateLabel, kelas.timeStart);
  const endDate = parseDate(kelas.dateLabel, kelas.timeEnd);
  
  if (!startDate || !endDate) return 'closed';

  const now = new Date(); // Waktu sekarang

  if (now < startDate) return 'upcoming'; // Belum mulai
  if (now >= startDate && now <= endDate) return 'open'; // Sedang berlangsung
  return 'closed'; // Udah lewat
}