export type SessionStatusType = 'open' | 'upcoming' | 'closed';

export function getSessionStatus(data: any): SessionStatusType {
  let dateLabel = data?.dateLabel || data?.date;
  let timeStart = data?.timeStart || data?.startTime;
  let timeEnd = data?.timeEnd || data?.endTime;
  const timeRange = data?.timeRange;

  if (!timeStart || !timeEnd) {
    if (timeRange) {
      const parts = timeRange.split(/[-–]/);
      if (parts.length === 2) {
        timeStart = parts[0].trim();
        timeEnd = parts[1].replace('WIB', '').trim();
      }
    }
  }

  if (!dateLabel || !timeStart || !timeEnd) return 'closed';

  const MONTHS: Record<string, number> = {
    'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
    'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
  };

  const parseDate = (dateStr: string, timeStr: string) => {
    try {
      const cleanDate = dateStr.replace(',', '').replace(/\s+/g, ' ').trim();
      const parts = cleanDate.split(' ');
      if (parts.length < 4) return null;
      
      const day = parseInt(parts[1], 10);
      const month = MONTHS[parts[2].toLowerCase()];
      const year = parseInt(parts[3], 10);
      
      const timeParts = timeStr.split(/[.:]/);
      const hour = parseInt(timeParts[0], 10);
      const minute = parseInt(timeParts[1] || '0', 10);

      if (isNaN(day) || month === undefined || isNaN(year) || isNaN(hour)) return null;

      const utcMs = Date.UTC(year, month, day, hour, minute);
      return new Date(utcMs - (7 * 60 * 60 * 1000));
    } catch {
      return null;
    }
  };

  const startDate = parseDate(dateLabel, timeStart);
  const endDate = parseDate(dateLabel, timeEnd);
  
  if (!startDate || !endDate) return 'closed';

  const now = new Date();

  if (now < startDate) return 'upcoming';
  if (now >= startDate && now <= endDate) return 'open';
  return 'closed';
}