import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';

// Opt-in: this check leaves one clearly named test account and character in D1.
// Credentials stay in memory; sessions are revoked before exiting.
const origin = process.argv[2];
if (!origin || !process.argv.includes('--create-test-account')) {
  throw Error('Usage: node scripts/smoke-online.mjs https://your-worker --create-test-account');
}
assert.equal(new URL(origin).origin, origin, 'Supply an exact origin without a trailing slash');
let cookie = '';
async function request(path, data, session = cookie) {
  const response = await fetch(origin + path, {
    method: data ? 'POST' : 'GET',
    headers: { Origin: origin, ...(session ? { Cookie: session } : {}), ...(data ? { 'Content-Type': 'application/json' } : {}) },
    body: data ? JSON.stringify(data) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  assert.ok(response.ok, `${path}: HTTP ${response.status}`);
  return response;
}
const health = await (await request('/api/health')).json();
assert.equal(health.ok, true);
for (const path of ['/', '/style.css', '/game.js', '/network.js', '/renderer3d.js', '/emblem.svg']) {
  const response = await request(path);
  const text = await response.text();
  assert.ok(text.length > 100, `${path}: empty asset`);
  if (path === '/') assert.match(text, /GAYA/);
}
const foreign = await fetch(origin + '/api/register', { method: 'POST', headers: { Origin: 'https://foreign.invalid', 'Content-Type': 'application/json' }, body: '{}' });
assert.equal(foreign.status, 403);
const credentials = { email: `qa-gaya-${randomUUID()}@example.invalid`, password: randomUUID() + randomUUID() };
try {
  const registered = await request('/api/register', credentials);
  const session = registered.headers.get('set-cookie');
  assert.match(session, /HttpOnly/);
  assert.match(session, /Secure/);
  assert.match(session, /SameSite=Strict/);
  cookie = session.split(';')[0];
  await request('/api/logout', {});
  cookie = '';
  const login = await request('/api/login', credentials);
  cookie = login.headers.get('set-cookie').split(';')[0];
  await request('/api/characters', { name: 'Centelha QA', continent: 'América do Sul', animal: 'Onça' });
  const { characters } = await (await request('/api/characters')).json();
  assert.equal(characters.length, 1);
  const { ticket } = await (await request('/api/ticket', { character_id: characters[0].id })).json();
  const url = new URL('/api/ws', origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('ticket', ticket);
  await new Promise((resolve, reject) => {
    const socket = new WebSocket(url, { origin, headers: { Cookie: cookie } });
    const timeout = setTimeout(() => { socket.terminate(); reject(Error('Snapshot timed out')); }, 20000);
    socket.on('error', error => { clearTimeout(timeout); reject(error); });
    socket.on('message', raw => {
      try {
        const snapshot = JSON.parse(String(raw));
        assert.equal(snapshot.type, 'snapshot');
        assert.equal(snapshot.self, characters[0].id);
        assert.equal(snapshot.nodes.length, 64);
        assert.equal(snapshot.inventory.hp, 100);
        clearTimeout(timeout);
        socket.close();
        resolve();
      } catch (error) { clearTimeout(timeout); socket.terminate(); reject(error); }
    });
  });
  console.log('PASS: health, 6 assets, Origin protection, registration, secure cookie, login, character, ticket and WebSocket snapshot (64 resources).');
} finally {
  if (cookie) await request('/api/logout', {});
}
