const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

export function formatTime(
  val: string | number | { toDate: () => Date } | null | undefined
): string {
  if (!val) return '--:--:--';
  let date: Date;

  if (typeof val === 'number') {
    date = new Date(val);
  } else if (typeof val === 'object' && typeof (val as any).toDate === 'function') {
    date = (val as any).toDate();
  } else if (typeof val === 'string') {
    date = new Date(val);
    if (isNaN(date.getTime())) {
      const timePart = val.split('T')[1];
      return timePart ? timePart.substring(0, 8) : val;
    }
  } else {
    return '--:--:--';
  }

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    return dateStr;
  }
  const year = parts[0];
  const monthIndex = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10).toString();
  const monthName = MONTHS[monthIndex] ?? parts[1];
  return `${day} ${monthName} ${year}`;
}
