export type SessionStatusType = 'open' | 'upcoming' | 'closed';

export type SessionSchedule = { start: Date; end: Date };

const MONTHS: Record<string, number> = {
  januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
  juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
};

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

export function normalizeSessionStatus(value: unknown): SessionStatusType | null {
  if (typeof value !== 'string') return null;
  const status = value.trim().toLowerCase();
  if (status === 'open') return 'open';
  if (status === 'upcoming') return 'upcoming';
  if (status === 'closed' || status === 'ended') return 'closed';
  return null;
}

function parseTime(time: string) {
  const match = String(time).match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return null;
  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  if (isNaN(hour) || isNaN(minute)) return null;
  return { hour, minute };
}

function parseDateLabel(dateLabel: string, time: string) {
  const parts = dateLabel.replace(',', '').replace(/\s+/g, ' ').trim().split(' ');
  if (parts.length < 4) return null;

  const day = parseInt(parts[1], 10);
  const month = MONTHS[parts[2].toLowerCase()];
  const year = parseInt(parts[3], 10);
  const clock = parseTime(time);
  if (isNaN(day) || month === undefined || isNaN(year) || !clock) return null;

  const utcMs = Date.UTC(year, month, day, clock.hour, clock.minute);
  return new Date(utcMs - WIB_OFFSET_MS);
}

function parseTimestampDate(value: any, time: string) {
  const date = value?.toDate?.() ?? (value instanceof Date ? value : null);
  if (!date) return null;
  const clock = parseTime(time);
  if (!clock) return null;

  const utcMs = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), clock.hour, clock.minute);
  return new Date(utcMs - WIB_OFFSET_MS);
}

function readTimes(data: any) {
  let start = String(data?.startTime || data?.timeStart || '').trim();
  let end = String(data?.endTime || data?.timeEnd || '').trim();

  if ((!start || !end) && data?.timeRange) {
    const parts = String(data.timeRange).split(/[-–]/);
    if (parts.length === 2) {
      start = start || parts[0].trim();
      end = end || parts[1].replace(/WIB/i, '').trim();
    }
  }

  return { start, end };
}

export function getSessionSchedule(data: any): SessionSchedule | null {
  if (!data) return null;
  const { start, end } = readTimes(data);
  if (!start || !end) return null;

  const dateLabel = String(data.dateLabel || data.date || '');
  let startDate = dateLabel ? parseDateLabel(dateLabel, start) : null;
  let endDate = dateLabel ? parseDateLabel(dateLabel, end) : null;

  if (!startDate || !endDate) {
    const stamp = data.dateTimestamp ?? data.date;
    startDate = parseTimestampDate(stamp, start);
    endDate = parseTimestampDate(stamp, end);
  }

  if (!startDate || !endDate) return null;
  return { start: startDate, end: endDate };
}

/**
 * Satu sumber kebenaran status sesi.
 *
 * - `status === 'closed'` di database = asisten menutup manual → tetap tertutup.
 * - Lewat jam selesai → otomatis tertutup.
 * - Sudah masuk jam mulai → otomatis terbuka.
 * - Sebelum jam mulai hanya terbuka kalau asisten sudah membukanya.
 */
export function getSessionStatus(data: any, now: Date = new Date()): SessionStatusType {
  const stored = normalizeSessionStatus(data?.status);
  const schedule = getSessionSchedule(data);

  if (!schedule) return stored ?? 'upcoming';
  if (stored === 'closed') return 'closed';
  if (now > schedule.end) return 'closed';
  if (now >= schedule.start) return 'open';
  return stored === 'open' ? 'open' : 'upcoming';
}

export function isSessionFinished(data: any, now: Date = new Date()): boolean {
  const schedule = getSessionSchedule(data);
  return !!schedule && now > schedule.end;
}
