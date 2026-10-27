const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const monthNames = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const twoDigits = (value: number) => value.toString().padStart(2, '0');

export function formatAttendanceTime(timestamp: number) {
  const date = new Date(timestamp);
  return `${twoDigits(date.getHours())}.${twoDigits(date.getMinutes())} WIB`;
}

export function formatAttendanceDate(timestamp: number) {
  const date = new Date(timestamp);
  return `${dayNames[date.getDay()]}, ${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}
