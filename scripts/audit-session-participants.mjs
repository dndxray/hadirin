#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');

function readProjectId() {
  const envPath = path.join(ROOT, '.env');
  if (!existsSync(envPath)) throw new Error('.env tidak ditemukan');
  const line = readFileSync(envPath, 'utf8').split(/\r?\n/).find((item) => item.startsWith('EXPO_PUBLIC_FIREBASE_PROJECT_ID='));
  if (!line) throw new Error('EXPO_PUBLIC_FIREBASE_PROJECT_ID tidak ada di .env');
  return line.split('=')[1].trim();
}

const PROJECT = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || readProjectId();
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

async function accessToken() {
  const confPath = path.join(homedir(), '.config', 'configstore', 'firebase-tools.json');
  const conf = JSON.parse(readFileSync(confPath, 'utf8'));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: conf.tokens.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`gagal refresh token: ${res.status}`);
  return (await res.json()).access_token;
}

const token = await accessToken();

const str = (field) => (field && field.stringValue !== undefined ? field.stringValue : undefined);
const list = (field) => (field && field.arrayValue ? (field.arrayValue.values ?? []) : []);

async function readCollection(name) {
  const items = [];
  let pageToken = '';
  do {
    const url = `${BASE}/${name}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`GET ${name}: ${res.status} ${await res.text()}`);
    const body = await res.json();
    for (const doc of body.documents ?? []) items.push({ id: doc.name.split('/').pop(), fields: doc.fields ?? {} });
    pageToken = body.nextPageToken ?? '';
  } while (pageToken);
  return items;
}

async function patchSession(sessionId, classId, participantIds) {
  const mask = `updateMask.fieldPaths=classId&updateMask.fieldPaths=participantIds`;
  const res = await fetch(`${BASE}/sessions/${sessionId}?${mask}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        classId: { stringValue: classId },
        participantIds: { arrayValue: { values: participantIds.map((id) => ({ stringValue: id })) } },
      },
    }),
  });
  if (!res.ok) throw new Error(`PATCH sessions/${sessionId}: ${res.status} ${await res.text()}`);
}

const [users, classes, sessions, attendance, permissions] = await Promise.all([
  readCollection('users'),
  readCollection('classes'),
  readCollection('sessions'),
  readCollection('attendance'),
  readCollection('permissionRequests'),
]);

const directory = users
  .map((doc) => ({
    uid: doc.id,
    role: str(doc.fields.role),
    nim: (str(doc.fields.nim) ?? '').trim(),
    name: (str(doc.fields.name) ?? '').trim(),
  }))
  .filter((user) => user.role === 'praktikan' && user.nim);

const history = new Map();
for (const doc of [...attendance, ...permissions]) {
  const sessionId = str(doc.fields.sessionId);
  const uid = str(doc.fields.practitionerId);
  if (!sessionId || !uid) continue;
  if (!history.has(sessionId)) history.set(sessionId, new Set());
  history.get(sessionId).add(uid);
}

const classRows = classes.map((doc) => ({
  id: doc.id,
  course: (str(doc.fields.course) ?? '').trim(),
  name: (str(doc.fields.name) ?? '').trim(),
  roster: list(doc.fields.participants).map((item) => ({
    nim: (str(item.mapValue?.fields?.nim) ?? '').trim(),
    name: (str(item.mapValue?.fields?.name) ?? '').trim(),
  })),
}));

function classOf(session) {
  const explicit = str(session.fields.classId);
  if (explicit) {
    const found = classRows.find((item) => item.id === explicit);
    if (found) return found;
  }
  const courseName = (str(session.fields.courseName) ?? '').trim().toLowerCase();
  const className = (str(session.fields.className) ?? '').trim().toLowerCase();
  return classRows.find(
    (item) => item.course.toLowerCase() === courseName && item.name.toLowerCase() === className,
  ) ?? null;
}

function resolveRoster(roster) {
  const uids = new Set();
  const unmatched = [];
  for (const entry of roster) {
    const matches = directory.filter((user) => user.nim === entry.nim);
    if (matches.length === 1) uids.add(matches[0].uid);
    else unmatched.push(entry);
  }
  return { uids: Array.from(uids), unmatched };
}

console.log(`project: ${PROJECT}  mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

const pendingWrites = [];

for (const session of sessions) {
  const cls = classOf(session);
  const label = `${str(session.fields.courseName) ?? '-'} / ${str(session.fields.className) ?? '-'}`;
  const currentIds = list(session.fields.participantIds).map((item) => item.stringValue).filter(Boolean);

  if (!cls) {
    console.log(`- ${label} (${session.id}) : kelas tidak ditemukan, dilewati`);
    continue;
  }

  const { uids, unmatched } = resolveRoster(cls.roster);
  const next = Array.from(new Set([...uids, ...(history.get(session.id) ?? [])]));
  const same =
    next.length === currentIds.length &&
    next.every((id) => currentIds.includes(id)) &&
    str(session.fields.classId) === cls.id;

  console.log(`- ${label} (${session.id})`);
  console.log(`    classId: ${str(session.fields.classId) ?? '(kosong)'} -> ${cls.id}`);
  console.log(`    roster kelas: ${cls.roster.length} | di sesi sekarang: ${currentIds.length} | setelah sync: ${next.length}`);
  if (unmatched.length) {
    console.log(`    belum punya akun (${unmatched.length}): ${unmatched.map((item) => `${item.name || '?'} (${item.nim})`).join(', ')}`);
  }
  if (!same) {
    const added = next.filter((id) => !currentIds.includes(id));
    const removed = currentIds.filter((id) => !next.includes(id));
    if (added.length) console.log(`    + ditambah: ${added.join(', ')}`);
    if (removed.length) console.log(`    - dikeluarkan (tanpa presensi/izin): ${removed.join(', ')}`);
    pendingWrites.push({ id: session.id, classId: cls.id, participantIds: next });
  } else {
    console.log('    sudah sinkron');
  }
}

console.log(`\nringkasan: ${sessions.length} sesi dibaca, ${pendingWrites.length} sesi perlu diubah`);

if (!APPLY) {
  console.log('dry-run selesai, tidak ada data yang ditulis. Jalankan dengan --apply kalau sudah yakin.');
} else {
  for (const item of pendingWrites) {
    await patchSession(item.id, item.classId, item.participantIds);
    console.log(`updated ${item.id}`);
  }
  console.log(`selesai: ${pendingWrites.length} sesi diperbarui`);
}
