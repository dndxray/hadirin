import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadTypescript } from './helpers/load-typescript.mjs';

const api = loadTypescript('src/utils/attendance-location.ts');
const lab = { id: 'lab-a', name: 'Lab A', latitude: -7.05, longitude: 110.44, radiusMeters: 100 };
const now = 1_800_000_000_000;
const position = { latitude: lab.latitude, longitude: lab.longitude, accuracy: 5, timestamp: now };
const session = { id: 'sesi-a', status: 'open', qrToken: '0123456789abcdef' };
const evidence = { position, method: 'location' };

test('Haversine: pusat lab nol, jarak satu derajat dan antimeridian benar', () => {
  assert.equal(api.distanceMeters(position, lab), 0);
  assert.ok(Math.abs(api.distanceMeters({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }) - 111194.93) < 1);
  assert.ok(api.distanceMeters({ latitude: 0, longitude: 179.999 }, { latitude: 0, longitude: -179.999 }) < 223);
});
test('koordinat/radius invalid ditolak', () => {
  for (const [latitude, longitude] of [[NaN, 0], [0, Infinity], [91, 0], [0, 181], ['0', 0]]) {
    assert.equal(api.validCoordinates(latitude, longitude), false);
    assert.throws(() => api.readLab('lab-a', { ...lab, latitude, longitude }));
  }
  for (const radiusMeters of [0, -1, 1001, NaN, Infinity, '100']) assert.throws(() => api.readLab('lab-a', { ...lab, radiusMeters }));
  assert.equal(api.readLab('lab-a', lab).name, 'Lab A');
});
test('radius sesi mengoverride radius lab; nilai invalid gagal tertutup', () => {
  assert.equal(api.sessionRadius({}, lab), 100);
  assert.equal(api.sessionRadius({ attendanceRadiusMeters: 25 }, lab), 25);
  for (const value of [0, -2, NaN, 1001]) assert.throws(() => api.sessionRadius({ attendanceRadiusMeters: value }, lab));
});
test('di dalam/di luar radius memakai jarak penuh, bukan pembulatan label', () => {
  assert.equal(api.assessPosition(position, lab, 100, now).inside, true);
  assert.equal(api.assessPosition({ ...position, latitude: lab.latitude + 0.001 }, lab, 100, now).inside, false);
  assert.equal(api.assessPosition({ ...position, latitude: lab.latitude + 0.0009 }, lab, 100, now).inside, false);
});
test('lokasi lama, masa depan, akurasi buruk, null, dan mock ditolak', () => {
  for (const changes of [{ timestamp: now - 30001 }, { timestamp: now + 5001 }, { accuracy: null },
    { accuracy: 51 }, { accuracy: NaN }, { accuracy: -1 }, { mocked: true }, { latitude: 99 }]) {
    assert.throws(() => api.assessPosition({ ...position, ...changes }, lab, 100, now));
  }
  assert.throws(() => api.assessPosition({ ...position, accuracy: 26 }, lab, 25, now));
});
test('presensi mensyaratkan open dan evidence lokasi', () => {
  assert.equal(api.validateCheckIn(session, lab, evidence, now).inside, true);
  for (const status of ['closed', 'upcoming', 'OPEN', undefined]) assert.throws(() => api.validateCheckIn({ ...session, status }, lab, evidence, now));
  assert.throws(() => api.validateCheckIn(session, lab, undefined, now));
  assert.throws(() => api.validateCheckIn(session, lab, { ...evidence, position: { ...position, latitude: 1 } }, now));
});
test('parser QR hanya menerima kontrak version 1 yang valid', () => {
  const qr = { type: 'hadirin.attendance', version: 1, sessionId: session.id, token: session.qrToken };
  assert.deepEqual(api.parseAttendanceQr(JSON.stringify(qr)), qr);
  for (const raw of ['https://evil.test', 'null', '[]', '1', '{}', JSON.stringify({ ...qr, version: 2 }),
    JSON.stringify({ ...qr, sessionId: '../sessions' }), JSON.stringify({ ...qr, token: 'short' }), 'x'.repeat(2049)]) assert.throws(() => api.parseAttendanceQr(raw));
});
test('QR tidak membypass lokasi dan harus cocok dengan sesi/token terkini', () => {
  const qr = { type: 'hadirin.attendance', version: 1, sessionId: session.id, token: session.qrToken };
  assert.equal(api.validateCheckIn(session, lab, { ...evidence, method: 'qr', qr }, now).inside, true);
  for (const changes of [{ sessionId: 'other' }, { token: 'another_valid_token' }]) {
    assert.throws(() => api.validateCheckIn(session, lab, { ...evidence, method: 'qr', qr: { ...qr, ...changes } }, now));
  }
  assert.throws(() => api.validateCheckIn(session, lab, { ...evidence, method: 'qr' }, now));
  assert.throws(() => api.validateCheckIn(session, lab, { ...evidence, method: 'qr', qr, position: { ...position, latitude: 0 } }, now));
});
