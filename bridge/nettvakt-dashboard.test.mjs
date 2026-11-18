import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { createNetVaktDashboard } from './nettvakt-dashboard.mjs';
import { createNetVakt } from './nettvakt.mjs';

const agentToken = 'a'.repeat(40);
const app = createNetVaktDashboard(agentToken, createNetVakt(agentToken));

async function send(path, method = 'GET', body = '', cookie = '', origin = '') {
  const req = new PassThrough();
  req.method = method;
  req.headers = {
    host: 'smed-obd-i2kp.onrender.com',
    cookie,
    ...(origin ? {origin} : {}),
    'content-type': 'application/x-www-form-urlencoded',
  };
  const res = new PassThrough();
  let status = 0;
  let headers = {};
  const chunks = [];
  res.writeHead = (s, h) => { status = s; headers = h; };
  res.on('data', chunk => chunks.push(chunk));
  const pending = app.handleHttp(req, res, path);
  req.end(body);
  await pending;
  return {status, headers, body: Buffer.concat(chunks).toString('utf8')};
}

async function loginBody(password = agentToken) {
  const page = await send('/nettvakt/dashboard');
  const challenge = page.body.match(/name="csrf" value="([^"]+)"/)?.[1];
  assert.ok(challenge, 'Signed CSRF challenge rendered');
  return new URLSearchParams({ password, csrf: challenge }).toString();
}

test('dashboard login is private and has restrictive headers', async () => {
  const page = await send('/nettvakt/dashboard');
  assert.equal(page.status, 200);
  assert.match(page.body, /SMED_AGENT_TOKEN/);
  assert.match(page.headers['Content-Security-Policy'], /default-src 'none'/);
  assert.equal((await send('/nettvakt/dashboard-data')).status, 401);
  assert.equal((await send('/nettvakt/dashboard.js')).status, 401);
});

test('invalid dashboard token is rejected without cookie', async () => {
  const result = await send('/nettvakt/login', 'POST', await loginBody('wrong-key'));
  assert.equal(result.status, 401);
  assert.equal(result.headers['Set-Cookie'], undefined);
});

test('valid token creates secure cookie and grants read-only status', async () => {
  const login = await send('/nettvakt/login', 'POST', await loginBody());
  assert.equal(login.status, 303);
  assert.match(login.headers['Set-Cookie'], /Secure; HttpOnly; SameSite=Strict/);
  assert.ok(!login.headers['Set-Cookie'].includes(agentToken));
  const cookie = login.headers['Set-Cookie'].split(';')[0];
  const data = await send('/nettvakt/dashboard-data', 'GET', '', cookie);
  assert.equal(data.status, 200);
  assert.equal(JSON.parse(data.body).status.agent_online, false);
  assert.deepEqual(JSON.parse(data.body).devices, []);
  const html = await send('/nettvakt/dashboard', 'GET', '', cookie);
  assert.equal(html.status, 200);
  assert.match(html.body, /SMED \/ NETTVAKT/);
  const script = await send('/nettvakt/dashboard.js', 'GET', '', cookie);
  assert.equal(script.status, 200);
  assert.match(script.body, /fetch\('\/nettvakt\/dashboard-data'/);
  const logout = await send('/nettvakt/logout', 'POST', '', cookie);
  assert.equal(logout.status, 303);
  assert.match(logout.headers['Set-Cookie'], /Max-Age=0/);
});

test('tampered cookies cannot read local-network inventory', async () => {
  const login = await send('/nettvakt/login', 'POST', await loginBody());
  const cookie = login.headers['Set-Cookie'].split(';')[0] + 'a';
  assert.equal((await send('/nettvakt/dashboard-data', 'GET', '', cookie)).status, 401);
});

test('iOS null Origin can submit a signed login form', async () => {
  const response = await send('/nettvakt/login', 'POST', await loginBody(), '', 'null');
  assert.equal(response.status, 303);
  assert.match(response.headers['Set-Cookie'], /Secure; HttpOnly/);
});

test('a browser-supplied Origin differing from public host does not break a valid signed form', async () => {
  const response = await send('/nettvakt/login', 'POST', await loginBody(), '', 'https://other.example');
  assert.equal(response.status, 303);
});

test('missing or forged signed form challenges are rejected', async () => {
  assert.equal((await send('/nettvakt/login', 'POST', 'password=' + agentToken)).status, 403);
  const body = await loginBody();
  assert.equal((await send('/nettvakt/login', 'POST', body.replace(/csrf=[^&]+/, 'csrf=forged'))).status, 403);
});

test('cross-site login is rejected', async () => {
  const req = new PassThrough();
  req.method = 'POST';
  req.headers = {origin:'https://evil.example',host:'smed-obd-i2kp.onrender.com','content-type':'application/x-www-form-urlencoded'};
  const res = new PassThrough();
  let status = 0;
  res.writeHead = code => {status = code;};
  const pending = app.handleHttp(req,res,'/nettvakt/login');
  req.end(await loginBody());
  await pending;
  assert.equal(status,403);
});
