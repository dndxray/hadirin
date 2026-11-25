import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadTypescript } from './helpers/load-typescript.mjs';

const uid = 'caesar';
const token = 'ExpoPushToken[test_device_token_12345]';
const routing = loadTypescript('src/utils/notification-routing.ts');

test('payload notifikasi hanya mengarah ke route yang diizinkan dan pemilik yang cocok', () => {
  assert.deepEqual(routing.notificationTarget({ type: 'session_opened', recipientId: uid, sessionId: 'sesi-a' }, uid),
    { pathname: '/presensi', params: { sessionId: 'sesi-a' } });
  assert.deepEqual(routing.notificationTarget({ type: 'session_updated', recipientId: uid, sessionId: 'sesi-a' }, uid),
    { pathname: '/presensi', params: { sessionId: 'sesi-a' } });
  assert.deepEqual(routing.notificationTarget({ type: 'permission_decided', recipientId: uid }, uid), { pathname: '/explore' });
  for (const data of [undefined, {}, { type: 'session_opened', recipientId: 'other', sessionId: 'sesi-a' },
    { type: 'session_opened', recipientId: uid, sessionId: '../profil' }, { type: 'unknown', recipientId: uid, url: 'https://evil.test' }]) {
    assert.equal(routing.notificationTarget(data, uid), null);
  }
});
test('token Expo tervalidasi dan string sembarang bukan push token', () => {
  assert.equal(routing.validExpoPushToken(token), true);
  assert.equal(routing.validExpoPushToken('ExponentPushToken[test_legacy_token_123]'), true);
  for (const value of [null, '', 'secret', 'ExpoPushToken[]', 'ExpoPushToken[has spaces in token]']) assert.equal(routing.validExpoPushToken(value), false);
});

function registry() {
  const memory = new Map();
  const remote = new Set();
  const auth = { currentUser: { uid } };
  let rejectWrites = false;
  const api = loadTypescript('src/services/push-registration.ts', {
    '@/lib/firebase': { auth, db: {} },
    '@react-native-async-storage/async-storage': {
      getItem: async key => memory.get(key) ?? null,
      setItem: async (key, value) => { memory.set(key, value); },
      removeItem: async key => { memory.delete(key); },
    },
    'firebase/firestore': {
      doc: (_, collection, id) => ({ collection, id }),
      arrayUnion: (...values) => ({ operation: 'add', values }),
      arrayRemove: (...values) => ({ operation: 'remove', values }),
      updateDoc: async (ref, data) => {
        assert.equal(ref.id, auth.currentUser.uid);
        if (rejectWrites) throw new Error('offline');
        for (const value of data.expoPushTokens.values) {
          if (data.expoPushTokens.operation === 'add') remote.add(value); else remote.delete(value);
        }
      },
    },
  });
  return { api, memory, remote, auth, failWrites: value => { rejectWrites = value; } };
}
test('registrasi token bersifat idempoten, rotasi mengganti token, logout mencabut token', async () => {
  const { api, remote, memory } = registry();
  await api.savePushToken(uid, token, api.pushRegistrationGeneration());
  await api.savePushToken(uid, token, api.pushRegistrationGeneration());
  assert.equal(remote.size, 1);
  const replacement = 'ExpoPushToken[test_replacement_token_123]';
  await api.savePushToken(uid, replacement, api.pushRegistrationGeneration());
  assert.deepEqual([...remote], [replacement]);
  await api.unregisterPushTokenForCurrentUser();
  assert.equal(remote.size, 0);
  assert.equal(memory.size, 0);
});
test('akun/generation berubah dan token palsu tidak ditulis ke profil', async () => {
  const { api, auth, remote } = registry();
  await assert.rejects(api.savePushToken(uid, 'bad-token', 0));
  auth.currentUser = { uid: 'other' };
  await assert.rejects(api.savePushToken(uid, token, 0));
  auth.currentUser = { uid };
  await api.unregisterPushTokenForCurrentUser();
  await assert.rejects(api.savePushToken(uid, token, 0));
  assert.equal(remote.size, 0);
});
test('gagal registrasi tetap menyimpan bukti token untuk cleanup; logout gagal tidak menghilangkan cache', async () => {
  const { api, memory, failWrites } = registry();
  failWrites(true);
  await assert.rejects(api.savePushToken(uid, token, 0));
  assert.equal(memory.size, 1);
  await assert.rejects(api.unregisterPushTokenForCurrentUser());
  assert.equal(memory.size, 1);
  failWrites(false);
  await api.unregisterPushTokenForCurrentUser();
  assert.equal(memory.size, 0);
});
test('token akun lama tidak diam-diam didaftarkan ke akun baru', async () => {
  const { api, auth } = registry();
  await api.savePushToken(uid, token, 0);
  auth.currentUser = { uid: 'other' };
  await assert.rejects(api.savePushToken('other', token, 0), /akun lain/);
});

function device(options = {}) {
  const events = [];
  const allowed = { granted: true, status: 'granted', canAskAgain: true };
  const notifications = {
    AndroidImportance: { HIGH: 4 }, IosAuthorizationStatus: { PROVISIONAL: 3 },
    setNotificationChannelAsync: async () => { events.push('channel'); },
    getPermissionsAsync: async () => options.permission ?? allowed,
    requestPermissionsAsync: async () => { events.push('request'); return options.requestedPermission ?? allowed; },
    getExpoPushTokenAsync: async () => { events.push('token'); if (options.failToken) throw new Error('network-failed'); return { data: token }; },
  };
  const api = loadTypescript('src/services/notification-device.ts', {
    'expo-constants': { appOwnership: options.expoGo ? 'expo' : null, expoConfig: { extra: { eas: { projectId: 'test-project' } } } },
    'react-native': { Platform: { OS: options.platform ?? 'android' } },
    'expo-notifications': notifications,
    '@/lib/firebase': { auth: { currentUser: { uid } } },
    '@/services/push-registration': {
      pushRegistrationGeneration: () => 0,
      savePushToken: async (owner, value) => { assert.equal(owner, uid); assert.equal(value, token); events.push('saved'); },
      unregisterPushTokenForCurrentUser: async () => { events.push('removed'); },
    },
  });
  return { api, events };
}
test('Android membuat channel sebelum token dan siap hanya setelah token tersimpan', async () => {
  const { api, events } = device();
  assert.equal((await api.registerDeviceNotifications(uid, true)).phase, 'ready');
  assert.deepEqual(events, ['channel', 'token', 'saved']);
});
test('izin notifikasi ditolak atau belum diminta tidak menghasilkan token palsu', async () => {
  const denied = device({ permission: { granted: false, status: 'denied', canAskAgain: false } });
  assert.equal((await denied.api.registerDeviceNotifications(uid, true)).phase, 'denied');
  assert.deepEqual(denied.events, ['channel', 'removed']);
  const waiting = device({ permission: { granted: false, status: 'undetermined', canAskAgain: true } });
  assert.equal((await waiting.api.registerDeviceNotifications(uid, false)).phase, 'not-requested');
  assert.deepEqual(waiting.events, ['channel']);
});
test('request eksplisit meminta izin, kegagalan token ditampilkan sebagai belum siap', async () => {
  const request = device({ permission: { granted: false, status: 'undetermined', canAskAgain: true } });
  assert.equal((await request.api.registerDeviceNotifications(uid, true)).phase, 'ready');
  assert.deepEqual(request.events, ['channel', 'request', 'token', 'saved']);
  const failure = device({ failToken: true });
  const status = await failure.api.registerDeviceNotifications(uid, true);
  assert.equal(status.phase, 'error');
  assert.match(status.message, /network-failed/);
  assert.equal(failure.events.includes('saved'), false);
});
test('browser dan Expo Go memberi status tidak didukung tanpa pendaftaran token', async () => {
  for (const options of [{ platform: 'web' }, { expoGo: true }]) {
    const { api, events } = device(options);
    assert.equal((await api.registerDeviceNotifications(uid, true)).phase, 'unsupported');
    assert.deepEqual(events, []);
  }
});

test('penerima push menangani foreground, tap, cold start, dan cleanup subscription', async () => {
  const callbacks = {};
  const removed = [];
  const incoming = { request: { identifier: 'push-a', content: { title: 'Sesi dibuka', body: 'Silakan presensi',
    data: { type: 'session_opened', sessionId: 'sesi-a', recipientId: uid } } } };
  const received = [];
  const responses = [];
  let refreshed = 0;
  const sdk = {
    setNotificationHandler: value => { callbacks.handler = value; },
    addNotificationReceivedListener: callback => { callbacks.receive = callback; return { remove: () => removed.push('received') }; },
    addNotificationResponseReceivedListener: callback => { callbacks.response = callback; return { remove: () => removed.push('response') }; },
    addPushTokenListener: callback => { callbacks.token = callback; return { remove: () => removed.push('token') }; },
    getLastNotificationResponseAsync: async () => ({ notification: incoming }),
    clearLastNotificationResponseAsync: async () => {},
  };
  const api = loadTypescript('src/services/notification-device.ts', {
    'expo-constants': { appOwnership: null }, 'react-native': { Platform: { OS: 'android' } },
    'expo-notifications': sdk, '@/lib/firebase': { auth: { currentUser: { uid } } },
    '@/services/push-registration': {},
  });
  const cleanup = await api.listenDeviceNotifications(value => received.push(value), value => responses.push(value), () => { refreshed += 1; });
  assert.equal(responses.length, 1);
  callbacks.receive(incoming);
  callbacks.response({ notification: incoming });
  callbacks.token({ type: 'android', data: 'native-token' });
  assert.equal(received[0].title, 'Sesi dibuka');
  assert.equal(responses.length, 2);
  assert.equal(refreshed, 1);
  assert.equal((await callbacks.handler.handleNotification(incoming)).shouldShowBanner, true);
  assert.equal((await callbacks.handler.handleNotification({ request: { content: { data: { ...incoming.request.content.data, recipientId: 'other' } } } })).shouldShowBanner, false);
  cleanup();
  assert.deepEqual(removed, ['received', 'response', 'token']);
});
