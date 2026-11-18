import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const COOKIE = 'smed_nv_session';
const DURATION_MS = 24 * 60 * 60 * 1000;
const LOGIN_MAX_BYTES = 4096;
const FORM_TTL_MS = 60 * 60 * 1000;
const attempts = new Map();

function securityHeaders(contentType = 'text/html; charset=utf-8') {
  return {
    'Content-Type': contentType,
    'Cache-Control': 'no-store, max-age=0',
    'Pragma': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; script-src 'self'; connect-src 'self'; style-src 'unsafe-inline'",
  };
}

function send(res, status, body, contentType = 'text/html; charset=utf-8', extra = {}) {
  res.writeHead(status, { ...securityHeaders(contentType), ...extra });
  res.end(body);
}

function safeEqual(a, b) {
  const left = Buffer.from(typeof a === 'string' ? a : '');
  const right = Buffer.from(typeof b === 'string' ? b : '');
  return left.length === right.length && timingSafeEqual(left, right);
}

function sign(key, text) {
  return createHmac('sha256', key).update('smed-dashboard-session-v1:').update(text).digest('hex');
}

function readCookie(req) {
  const cookieHeader = req.headers.cookie || '';
  const found = cookieHeader.split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='));
  return found ? found.slice(COOKIE.length + 1) : '';
}

function authorized(req, token) {
  const cookie = readCookie(req);
  const parts = cookie.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') return false;
  const expires = Number(parts[1]);
  if (!Number.isSafeInteger(expires) || expires <= Date.now() || expires > Date.now() + DURATION_MS || !/^[a-f0-9]{32}$/.test(parts[2])) return false;
  return /^[a-f0-9]{64}$/.test(parts[3]) && safeEqual(parts[3], sign(token, parts.slice(0, 3).join('.')));
}

function makeCookie(token) {
  const value = ['v1', Date.now() + DURATION_MS, randomBytes(16).toString('hex')].join('.');
  return COOKIE + '=' + value + '.' + sign(token, value) + '; Path=/nettvakt; Secure; HttpOnly; SameSite=Strict; Max-Age=86400';
}

// A signed form challenge replaces brittle Origin checks on iOS in-app browsers.
// Off-site pages cannot read this form token, even if the request carries Origin: null.
function formChallenge(token) {
  const nonce = randomBytes(16).toString('hex');
  const data = ['c1', Date.now() + FORM_TTL_MS, nonce].join('.');
  return data + '.' + sign(token, 'form:' + data);
}
function validChallenge(value, token) {
  if (typeof value !== 'string') return false;
  const parts = value.split('.');
  if (parts.length !== 4 || parts[0] !== 'c1') return false;
  const expires = Number(parts[1]);
  if (!Number.isSafeInteger(expires) || expires <= Date.now() || expires > Date.now() + FORM_TTL_MS) return false;
  if (!/^[a-f0-9]{32}$/.test(parts[2]) || !/^[a-f0-9]{64}$/.test(parts[3])) return false;
  return safeEqual(parts[3], sign(token, 'form:' + parts.slice(0, 3).join('.'));
}

function loginPage(token, wrong = false) {
  const error = wrong ? '<p class="error" role="alert">Nøkkelen ble ikke godkjent. Kopier SMED_AGENT_TOKEN fra Render.</p>' : '';
  return '<!doctype html><html lang="nb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#101923"><title>SMED-01 · Innlogging</title><style>*{box-sizing:border-box}body{font:16px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:#0b111a;color:#f4f7fb;min-height:100vh;margin:0;display:grid;place-items:center;padding:18px}main{max-width:440px;width:100%;border:1px solid #304354;border-radius:20px;background:#17222e;padding:28px}header{color:#ffad59;font-weight:850;letter-spacing:.13em;font-size:14px}h1{margin:15px 0;font-size:30px}p{line-height:1.55;color:#b8c8d3}label{display:block;margin:22px 0 8px;font-weight:650}input{width:100%;padding:14px;border-radius:10px;background:#0b1520;border:1px solid #607286;color:white;font-size:16px}button{width:100%;padding:14px;border:0;border-radius:10px;background:#ffab57;color:#19140e;font-size:16px;font-weight:800;margin-top:16px;cursor:pointer}.error{color:#ffb4a2}small{display:block;color:#91a5b5;margin-top:18px;line-height:1.5}</style></head><body><main><header>⚒ SMED / NETTVAKT</header><h1>Kontrollpanel</h1><p>Logg inn med <b>SMED_AGENT_TOKEN</b> fra Render. Nøkkelen sendes kryptert over HTTPS. Nettvakt på MacBooken fortsetter å kjøre uten nettleseren.</p>' + error + '<form method="post" action="/nettvakt/login"><input type="hidden" name="csrf" value="' + formChallenge(token) + '"><label for="password">Agentnøkkel</label><input id="password" name="password" type="password" required autocomplete="off" autofocus maxlength="512"><button type="submit">Åpne kontrollpanelet</button></form><small>Ingen ny konto. Innloggingen varer i 24 timer i denne nettleseren. Ikke del nøkkelen i ChatGPT.</small></main></body></html>';
}

async function readForm(req) {
  if (!/^application\/x-www-form-urlencoded(?:\s*;|$)/i.test(req.headers['content-type'] || '')) return null;
  const parts = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > LOGIN_MAX_BYTES) throw new Error('Too large');
    parts.push(chunk);
  }
  const form = new URLSearchParams(Buffer.concat(parts).toString('utf8'));
  return { password: form.get('password') || '', csrf: form.get('csrf') || '' };
}

function sameOrigin(req) {
  // Origin: null is emitted by some privacy-preserving/in-app iOS navigations.
  const origin = req.headers.origin || '';
  const host = req.headers.host || '';
  return !origin || origin === 'null' || origin === 'https://' + host;
}

function attemptsAllowed() {
  const now = Date.now();
  const current = attempts.get('global') || [];
  const recent = current.filter(t => now - t < 5 * 60_000);
  attempts.set('global', recent);
  return recent.length < 30;
}

function recordAttempt() {
  const list = attempts.get('global') || [];
  list.push(Date.now());
  attempts.set('global', list);
}

export function createNetVaktDashboard(agentToken, netwatch) {
  if (typeof agentToken !== 'string' || agentToken.length < 24) throw new Error('Dashboard secret missing');
  if (!netwatch || typeof netwatch.handleTool !== 'function') throw new Error('Nettvakt provider missing');

  async function handleHttp(req, res, path) {
    if (path === '/nettvakt/login' && req.method === 'POST') {
      if (!attemptsAllowed()) return send(res, 429, 'For mange innloggingsforsøk. Prøv senere.', 'text/plain; charset=utf-8');
      try {
        const form = await readForm(req);
        // A fresh, signed token enforces same-site intent without trusting browser Origin headers.
        if (!form || !validChallenge(form.csrf, agentToken))
          return send(res, 403, loginPage(agentToken, false));
        recordAttempt();
        if (safeEqual(form.password, agentToken)) {
          return send(res, 303, '', 'text/plain; charset=utf-8', {
            'Location': '/nettvakt/dashboard',
            'Set-Cookie': makeCookie(agentToken),
          });
        }
        return send(res, 401, loginPage(agentToken, true));
      } catch {
        return send(res, 400, 'Ugyldig forespørsel', 'text/plain; charset=utf-8');
      }
    }
    if (path === '/nettvakt/dashboard' && req.method === 'GET') {
      if (!authorized(req, agentToken)) return send(res, 200, loginPage(agentToken));
      const html = await readFile(new URL('./nettvakt-dashboard.html', import.meta.url), 'utf8');
      return send(res, 200, html);
    }
    if (path === '/nettvakt/dashboard.js' && req.method === 'GET') {
      if (!authorized(req, agentToken)) return send(res, 401, 'Unauthorized', 'text/plain; charset=utf-8');
      const script = await readFile(new URL('./nettvakt-dashboard.js', import.meta.url), 'utf8');
      return send(res, 200, script, 'text/javascript; charset=utf-8');
    }
    if (path === '/nettvakt/dashboard-data' && req.method === 'GET') {
      if (!authorized(req, agentToken)) return send(res, 401, JSON.stringify({error:'Unauthorized'}), 'application/json; charset=utf-8');
      const status = netwatch.handleTool('nettvakt_status', {});
      const mac = netwatch.handleTool('nettvakt_mac_health', {});
      const devices = netwatch.handleTool('nettvakt_devices', {});
      const alerts = netwatch.handleTool('nettvakt_alerts', {});
      return send(res, 200, JSON.stringify({
        status,
        mac_health: mac.mac_health,
        devices: devices.devices,
        alerts: alerts.alerts,
        smartlife: alerts.smartlife,
      }), 'application/json; charset=utf-8');
    }
    if (path === '/nettvakt/logout' && req.method === 'POST') {
      if (!sameOrigin(req)) return send(res, 403, 'Ugyldig opprinnelse', 'text/plain; charset=utf-8');
      return send(res, 303, '', 'text/plain; charset=utf-8', {
        'Location': '/nettvakt/dashboard',
        'Set-Cookie': COOKIE + '=; Path=/nettvakt; Secure; HttpOnly; SameSite=Strict; Max-Age=0',
      });
    }
    return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
  }
  return { handleHttp };
}
