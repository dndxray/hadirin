import type { AttendanceQr, CheckInEvidence, DevicePosition, Lab } from '@/types/sprint-three';

export const MAX_POSITION_AGE_MS = 30_000;
export const MAX_POSITION_ACCURACY_METERS = 50;
export const MAX_LAB_RADIUS_METERS = 1000;

export function isDocumentId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

export function validCoordinates(latitude: unknown, longitude: unknown): boolean {
  return typeof latitude === 'number' && Number.isFinite(latitude) && Math.abs(latitude) <= 90
    && typeof longitude === 'number' && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
}

export function readLab(id: string, data: Record<string, unknown>): Lab {
  if (!isDocumentId(id) || typeof data.name !== 'string' || !data.name.trim()
    || !validCoordinates(data.latitude, data.longitude)
    || typeof data.radiusMeters !== 'number' || !Number.isFinite(data.radiusMeters)
    || data.radiusMeters < 1 || data.radiusMeters > MAX_LAB_RADIUS_METERS) {
    throw new Error('Data laboratorium belum lengkap atau tidak valid. Hubungi asisten.');
  }
  return { id, name: data.name.trim(), latitude: data.latitude as number,
    longitude: data.longitude as number, radiusMeters: data.radiusMeters };
}

export function sessionRadius(session: { attendanceRadiusMeters?: number }, lab: Lab): number {
  const radius = session.attendanceRadiusMeters === undefined ? lab.radiusMeters : session.attendanceRadiusMeters;
  if (!Number.isFinite(radius) || radius < 1 || radius > MAX_LAB_RADIUS_METERS) {
    throw new Error('Radius presensi sesi harus antara 1 dan 1.000 meter. Hubungi asisten.');
  }
  return radius;
}

export function distanceMeters(from: Pick<DevicePosition, 'latitude' | 'longitude'>,
  to: Pick<Lab, 'latitude' | 'longitude'>): number {
  if (!validCoordinates(from.latitude, from.longitude) || !validCoordinates(to.latitude, to.longitude)) {
    throw new Error('Koordinat lokasi tidak valid. Periksa lokasi kembali.');
  }
  const rad = (degrees: number) => degrees * Math.PI / 180;
  const latitude = rad(to.latitude - from.latitude);
  const longitude = rad(to.longitude - from.longitude);
  const a = Math.sin(latitude / 2) ** 2
    + Math.cos(rad(from.latitude)) * Math.cos(rad(to.latitude)) * Math.sin(longitude / 2) ** 2;
  return 6_371_000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}

export function assessPosition(position: DevicePosition, lab: Lab, radius: number, now = Date.now()) {
  if (!validCoordinates(position.latitude, position.longitude) || !Number.isFinite(position.timestamp)) {
    throw new Error('Koordinat belum tersedia. Periksa lokasi kembali.');
  }
  if (position.mocked) throw new Error('Lokasi simulasi terdeteksi. Matikan lokasi simulasi sebelum presensi.');
  if (position.timestamp > now + 5000 || now - position.timestamp > MAX_POSITION_AGE_MS) {
    throw new Error('Lokasi sudah kedaluwarsa atau jam perangkat tidak sesuai. Periksa lokasi kembali.');
  }
  if (position.accuracy === null || !Number.isFinite(position.accuracy)
    || position.accuracy < 0 || position.accuracy > Math.min(MAX_POSITION_ACCURACY_METERS, radius)) {
    throw new Error('Akurasi lokasi belum memadai. Aktifkan lokasi presisi, pindah ke area terbuka, lalu coba lagi.');
  }
  const distance = distanceMeters(position, lab);
  return { distance, radius, inside: distance <= radius };
}

export function parseAttendanceQr(raw: string): AttendanceQr {
  if (typeof raw !== 'string' || raw.length > 2048) throw new Error('QR bukan kode presensi Hadirin yang valid.');
  let value: Partial<AttendanceQr>;
  try { value = JSON.parse(raw); } catch { throw new Error('QR bukan kode presensi Hadirin yang valid.'); }
  if (!value || typeof value !== 'object' || value.type !== 'hadirin.attendance' || value.version !== 1
    || !isDocumentId(value.sessionId) || typeof value.token !== 'string'
    || !/^[A-Za-z0-9_-]{16,128}$/.test(value.token)) {
    throw new Error('QR bukan kode presensi Hadirin yang valid.');
  }
  return { type: value.type, version: value.version, sessionId: value.sessionId, token: value.token };
}

export function validateCheckIn(session: { id: string; status: unknown; attendanceRadiusMeters?: number; qrToken?: string },
  lab: Lab, evidence: CheckInEvidence, now = Date.now()) {
  if (session.status !== 'open') throw new Error('Sesi belum dibuka atau sudah ditutup oleh asisten.');
  if (!evidence?.position || !['location', 'qr'].includes(evidence.method)) {
    throw new Error('Lokasi perangkat wajib diperiksa sebelum presensi.');
  }
  const result = assessPosition(evidence.position, lab, sessionRadius(session, lab), now);
  if (!result.inside) throw new Error(`Kamu di luar radius lab (${Math.ceil(result.distance)} m; batas ${result.radius} m). Mendekatlah ke lab lalu coba lagi.`);
  if (evidence.method === 'qr') {
    const qr = evidence.qr && parseAttendanceQr(JSON.stringify(evidence.qr));
    if (!qr || qr.sessionId !== session.id) throw new Error('QR tidak sesuai dengan sesi yang dipilih.');
    if (!session.qrToken || qr.token !== session.qrToken) throw new Error('QR sudah tidak berlaku. Pindai QR terbaru dari asisten.');
  }
  return result;
}
