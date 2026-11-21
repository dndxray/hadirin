#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');

function readProjectId() {
  const envPath = path.join(ROOT, '.env');
  if (!existsSync(envPath)) throw new Error('.env tidak ditemukan');
  const line = readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .find((item) => item.startsWith('EXPO_PUBLIC_FIREBASE_PROJECT_ID='));
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
const arr = (field) => (field && field.arrayValue ? (field.arrayValue.values ?? []).map((item) => item.stringValue) : []);

const listRes = await fetch(`${BASE}/users?pageSize=300`, { headers: { Authorization: `Bearer ${token}` } });
if (!listRes.ok) throw new Error(`GET users: ${listRes.status} ${await listRes.text()}`);
const users = (await listRes.json()).documents ?? [];

async function patch(uid, roles, approvalStatus) {
  const mask = 'updateMask.fieldPaths=roles&updateMask.fieldPaths=approvalStatus';
  const res = await fetch(`${BASE}/users/${uid}?${mask}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        roles: { arrayValue: { values: roles.map((role) => ({ stringValue: role })) } },
        approvalStatus: { stringValue: approvalStatus },
      },
    }),
  });
  if (!res.ok) throw new Error(`PATCH users/${uid}: ${res.status} ${await res.text()}`);
}

console.log(`project: ${PROJECT}  mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

const pending = [];

for (const doc of users) {
  const uid = doc.name.split('/').pop();
  const fields = doc.fields ?? {};
  const role = str(fields.role);
  const name = str(fields.name) ?? '-';
  const currentRoles = arr(fields.roles);
  const currentApproval = str(fields.approvalStatus);

  if (role !== 'praktikan' && role !== 'asisten') {
    console.log(`- ${name} (${uid}) : role tidak valid, dilewati`);
    continue;
  }

  const roles = currentRoles.length ? currentRoles : [role];
  const approvalStatus = roles.includes('asisten') ? 'approved' : currentApproval ?? 'approved';

  const same = currentRoles.join(',') === roles.join(',') && currentApproval === approvalStatus;
  console.log(`- ${name} (${uid}) : roles ${currentRoles.join(',') || '(kosong)'} -> ${roles.join(',')} | approval ${currentApproval ?? '(kosong)'} -> ${approvalStatus}`);

  if (!same) pending.push({ uid, roles, approvalStatus });
}

console.log(`\nringkasan: ${users.length} user dibaca, ${pending.length} perlu diubah`);

if (!APPLY) {
  console.log('dry-run selesai, tidak ada data yang ditulis.');
} else {
  for (const item of pending) {
    await patch(item.uid, item.roles, item.approvalStatus);
    console.log(`updated ${item.uid}`);
  }
  console.log(`selesai: ${pending.length} user diperbarui`);
}
