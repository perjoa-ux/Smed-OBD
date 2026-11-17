import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

// Isolated, dependency-free extension to the existing Smed OBD bridge.
// No direct Google Nest administration, no router credentials, no LAN writes.
export function createNetVakt(agentToken) {
  if (typeof agentToken !== 'string' || agentToken.length < 24) throw new Error('Agent secret missing');
  const secret = createHmac('sha256', agentToken).update('smed-nettvakt-agent-v1').digest('hex');
  const commands = new Map();
  let report = null;
  let receivedAt = 0;
  const online = () => receivedAt > 0 && Date.now() - receivedAt < 180_000;
  const equal = (a, b) => {
    const x = Buffer.from(a || '', 'utf8');
    const y = Buffer.from(b || '', 'utf8');
    return x.length === y.length && timingSafeEqual(x, y);
  };
  const send = (res, status, value) => {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(JSON.stringify(value));
  };
  const authorized = req => equal((req.headers.authorization || '').replace(/^Bearer /, ''), secret);
  const safeString = (value, max = 80) => typeof value === 'string' ? value.slice(0, max) : '';
  async function readJson(req, max = 131_072) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > max) throw new Error('Request too large');
      chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
  const ipv4 = ip => typeof ip === 'string' && /^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip) && ip.split('.').every(x => +x <= 255);
  const cleanDevice = d => ({
    ip: ipv4(d?.ip) ? d.ip : null,
    mac: safeString(d?.mac, 20),
    name: safeString(d?.name, 90),
    state: ['online', 'offline', 'observed'].includes(d?.state) ? d.state : 'observed',
    latency_ms: typeof d?.latency_ms === 'number' && d.latency_ms >= 0 && d.latency_ms <= 60_000 ? Math.round(d.latency_ms) : null,
    source: safeString(d?.source, 32),
  });
  const cleanAlert = a => ({
    severity: ['info', 'warning', 'critical'].includes(a?.severity) ? a.severity : 'info',
    code: safeString(a?.code, 48),
    message: safeString(a?.message, 250),
  });
  const cleanState = s => ({entity_id: safeString(s?.entity_id, 120), state: safeString(s?.state, 80), friendly_name: safeString(s?.friendly_name, 120)});
  function status() {
    if (!report) return { configured: true, agent_online: false, state: 'awaiting_first_report', message: 'Installer lokal sensor på Mac i Nest-nettverket.' };
    const age = Math.floor((Date.now() - receivedAt) / 1000);
    return {
      configured: true,
      agent_online: online(),
      state: online() ? 'online' : 'stale',
      age_seconds: age,
      last_report: new Date(receivedAt).toISOString(),
      gateway: report.gateway,
      checks: report.checks,
      device_count: report.devices.length,
      alert_count: report.alerts.length,
      smartlife_count: report.smartlife.length,
      smartlife_source: report.smartlife_source,
    };
  }
  function expire() {
    for (const [id, cmd] of commands) {
      if (cmd.expires < Date.now() && cmd.state !== 'done') cmd.state = 'expired';
      if (cmd.created + 600_000 < Date.now()) commands.delete(id);
    }
  }
  async function handleHttp(req, res, path) {
    // Called only for /nettvakt/* routes. Sensor-to-cloud is outbound HTTPS only.
    if (path === '/nettvakt/health' && req.method === 'GET') return send(res, 200, { ok: true, agent_online: online() });
    if (!authorized(req)) return send(res, 401, { error: 'Unauthorized' });
    try {
      expire();
      if (path === '/nettvakt/report' && req.method === 'POST') {
        const data = await readJson(req);
        if (!data || typeof data !== 'object' || !Array.isArray(data.devices) || data.devices.length > 256 ||
            !Array.isArray(data.alerts) || data.alerts.length > 100 ||
            (data.smartlife !== undefined && (!Array.isArray(data.smartlife) || data.smartlife.length > 256)))
          return send(res, 400, { error: 'Invalid report' });
        report = {
          host: safeString(data.host, 80),
          gateway: ipv4(data.gateway) ? data.gateway : null,
          checks: {
            gateway_ms: typeof data.checks?.gateway_ms === 'number' ? data.checks.gateway_ms : null,
            dns_ok: data.checks?.dns_ok === true,
            internet_ok: data.checks?.internet_ok === true,
          },
          devices: data.devices.map(cleanDevice).filter(d => d.ip !== null),
          alerts: data.alerts.map(cleanAlert),
          smartlife: Array.isArray(data.smartlife) ? data.smartlife.map(cleanState) : [],
          smartlife_source: safeString(data.smartlife_source, 40) || 'not_connected',
        };
        receivedAt = Date.now();
        return send(res, 200, { ok: true, devices: report.devices.length, received_at: new Date(receivedAt).toISOString() });
      }
      if (path === '/nettvakt/next' && req.method === 'GET') {
        const cmd = [...commands.values()].find(c => c.state === 'queued');
        if (cmd) cmd.state = 'running';
        return send(res, 200, { command: cmd ? { id: cmd.id, kind: cmd.kind, ip: cmd.ip } : null });
      }
      if (path === '/nettvakt/result' && req.method === 'POST') {
        const data = await readJson(req, 8_192);
        const cmd = commands.get(data?.id);
        if (!cmd || cmd.state !== 'running') return send(res, 404, { error: 'Command not found' });
        cmd.state = 'done';
        cmd.ok = data.ok === true;
        cmd.result = safeString(data.result, 500);
        return send(res, 200, { ok: true });
      }
      return send(res, 404, { error: 'Not found' });
    } catch {
      return send(res, 400, { error: 'Invalid request' });
    }
  }
  const tools = [
    { name: 'nettvakt_status', description: 'Read live local-network health via the Mac sensor. Never claim data is live when the sensor is stale.', annotations: { readOnlyHint: true }, inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
    { name: 'nettvakt_devices', description: 'Read the latest observed local IP/MAC device inventory. A device missing from ARP does not prove it is offline.', annotations: { readOnlyHint: true }, inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
    { name: 'nettvakt_alerts', description: 'Read gateway/DNS/internet alerts and optional Home Assistant SmartLife/Tuya device states.', annotations: { readOnlyHint: true }, inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
    { name: 'nettvakt_probe', description: 'Request a SAFE local ping or refreshed status from the Mac sensor. No device configuration or power changes.', annotations: { readOnlyHint: false }, inputSchema: { type: 'object', properties: { kind: { type: 'string', enum: ['ping', 'refresh'] }, ip: { type: 'string', description: 'Existing inventory IPv4 for ping; omit for refresh.' } }, required: ['kind'], additionalProperties: false } },
    { name: 'nettvakt_probe_result', description: 'Read a previously queued network probe result.', annotations: { readOnlyHint: true }, inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false } },
  ];
  function handleTool(name, args) {
    expire();
    if (name === 'nettvakt_status') return status();
    if (name === 'nettvakt_devices') return { ...status(), devices: report?.devices || [] };
    if (name === 'nettvakt_alerts') return { ...status(), alerts: report?.alerts || [], smartlife: report?.smartlife || [] };
    if (name === 'nettvakt_probe') {
      if (!online()) return { error: 'Local Mac agent offline; cannot probe.' };
      const kind = args?.kind;
      const ip = args?.ip;
      if (!['ping', 'refresh'].includes(kind)) return { error: 'Only ping and refresh are allowed.' };
      if (kind === 'ping' && (!ipv4(ip) || !report.devices.some(d => d.ip === ip)))
        return { error: 'IP must be present in sensor inventory.' };
      if ([...commands.values()].filter(c => ['queued', 'running'].includes(c.state)).length >= 5)
        return { error: 'Too many pending probes.' };
      const id = randomUUID();
      commands.set(id, { id, kind, ip: kind === 'ping' ? ip : null, state: 'queued', created: Date.now(), expires: Date.now() + 90_000 });
      return { id, state: 'queued', kind, ip: kind === 'ping' ? ip : null };
    }
    if (name === 'nettvakt_probe_result') {
      const cmd = commands.get(args?.id);
      return cmd ? { id: cmd.id, state: cmd.state, ok: cmd.ok ?? null, result: cmd.result ?? null } : { error: 'Probe not found or expired.' };
    }
    return { error: 'Unknown tool' };
  }
  return { tools, handleTool, handleHttp };
}
