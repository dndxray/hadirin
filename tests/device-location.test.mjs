import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadTypescript } from './helpers/load-typescript.mjs';

function location(options = {}) {
  let requested = false;
  let removed = false;
  const sdk = {
    Accuracy: { Highest: 5 },
    getForegroundPermissionsAsync: async () => options.permission ?? { granted: true, canAskAgain: true },
    requestForegroundPermissionsAsync: async () => { requested = true; return options.requested ?? { granted: false, canAskAgain: true }; },
    hasServicesEnabledAsync: async () => options.services ?? true,
    watchPositionAsync: async (_, next, onError) => {
      queueMicrotask(() => {
        if (options.fail) onError('unavailable');
        else if (!options.pending) next({ coords: { latitude: -7.05, longitude: 110.44, accuracy: 5 }, timestamp: 123456, mocked: options.mocked });
      });
      return { remove: () => { removed = true; } };
    },
  };
  return { api: loadTypescript('src/services/device-location.ts', { 'expo-location': sdk }), requested: () => requested, removed: () => removed };
}
test('lokasi aktual meneruskan timestamp, akurasi, dan flag mock dari perangkat', async () => {
  const { api, removed } = location();
  assert.deepEqual(await api.acquireDevicePosition(), { latitude: -7.05, longitude: 110.44, accuracy: 5, timestamp: 123456, mocked: false });
  assert.equal((await location({ mocked: true }).api.acquireDevicePosition()).mocked, true);
  assert.equal(removed(), true);
});
test('izin ditolak permanen memberi pesan blocked tanpa prompt berulang', async () => {
  const { api, requested } = location({ permission: { granted: false, canAskAgain: false } });
  await assert.rejects(api.acquireDevicePosition(), error => error.code === 'blocked' && /ditolak/.test(error.message));
  assert.equal(requested(), false);
});
test('izin yang masih dapat ditanya diminta sekali lalu hasil ditangani', async () => {
  const denied = location({ permission: { granted: false, canAskAgain: true } });
  await assert.rejects(denied.api.acquireDevicePosition(), error => error.code === 'denied');
  assert.equal(denied.requested(), true);
  const accepted = location({ permission: { granted: false, canAskAgain: true }, requested: { granted: true } });
  assert.ok(await accepted.api.acquireDevicePosition());
});
test('GPS mati berbeda dari koordinat belum tersedia', async () => {
  await assert.rejects(location({ services: false }).api.acquireDevicePosition(), error => error.code === 'services-off');
  await assert.rejects(location({ fail: true }).api.acquireDevicePosition(), error => error.code === 'unavailable');
});
test('keluar halaman membatalkan lokasi dan membersihkan subscription', async () => {
  const { api, removed } = location({ pending: true });
  const controller = new AbortController();
  const result = api.acquireDevicePosition(controller.signal);
  await new Promise(resolve => setImmediate(resolve));
  controller.abort();
  await assert.rejects(result, /dibatalkan/);
  assert.equal(removed(), true);
});
