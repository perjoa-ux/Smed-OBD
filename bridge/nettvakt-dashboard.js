(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const put = (id, value) => { $(id).textContent = value == null ? '—' : String(value); };
  const isNum = value => typeof value === 'number' && Number.isFinite(value);
  const num = (value, digits = 0) => isNum(value) ? value.toLocaleString('nb-NO', {maximumFractionDigits:digits}) : '—';
  const state = $('state');
  let busy = false;
  const ALIASES_KEY = 'smed_nettvakt_device_names_v1';
  const aliases = (() => {
    try {
      const data = JSON.parse(localStorage.getItem(ALIASES_KEY) || '{}');
      return data && typeof data === 'object' && !Array.isArray(data) ? Object.assign(Object.create(null), data) : Object.create(null);
    } catch { return Object.create(null); }
  })();
  const deviceKey = d => String(d.mac || d.ip || '').toLowerCase();
  function renameDevice(d) {
    const key = deviceKey(d);
    if (!key) return;
    const existing = typeof aliases[key] === 'string' ? aliases[key] : '';
    const entered = window.prompt('Navn på enheten (tomt felt sletter navnet):', existing);
    if (entered === null) return;
    const name = entered.trim().slice(0, 40);
    if (name) aliases[key] = name;
    else delete aliases[key];
    try { localStorage.setItem(ALIASES_KEY, JSON.stringify(aliases)); }
    catch { window.alert('Kunne ikke lagre navnet i denne nettleseren.'); }
    update();
  }

  const textClass = (element, kind) => {
    element.classList.remove('good', 'bad', 'warn', 'muted');
    if (kind) element.classList.add(kind);
  };

  function addItem(list, title, detail, kind) {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = title;
    if (kind) strong.className = kind;
    li.append(strong);
    if (detail) {
      const div = document.createElement('div');
      div.className = 'minor';
      div.textContent = detail;
      li.append(div);
    }
    list.append(li);
  }

  function formatUptime(seconds) {
    if (!isNum(seconds) || seconds < 0) return '—';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor(seconds % 86400 / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    return (days ? days + ' d ' : '') + hours + ' t ' + minutes + ' min';
  }

  function render(input) {
    const st = input && input.status || {};
    const online = st.agent_online === true;
    const health = input && input.mac_health || {};
    const checks = st.checks || {};
    state.className = 'state ' + (online ? 'online' : 'offline');
    put('state-text', online ? 'SMED-01 ONLINE' : 'SMED-01 IKKE ONLINE');

    let last = 'Ingen rapport mottatt ennå.';
    if (st.last_report) {
      const d = new Date(st.last_report);
      if (!Number.isNaN(d.getTime())) {
        last = 'Siste rapport ' + d.toLocaleString('nb-NO') + ' · ' + num(st.age_seconds) + ' sekunder siden';
      }
    }
    put('last-update', last + (online ? ' · Oppdateres automatisk' : ' · Viser eventuelt eldre data'));

    put('device-count', isNum(st.device_count) ? num(st.device_count) : '—');
    put('gateway', st.gateway || 'Ukjent');
    put('gateway-ping', isNum(checks.gateway_ms) ? 'Ruteren svarte på ' + num(checks.gateway_ms, 1) + ' ms' : 'Ingen målt ping');
    put('dns', st.last_report ? (checks.dns_ok ? 'OK' : 'Feil') : '—');
    put('internet', st.last_report ? (checks.internet_ok ? 'OK' : 'Feil') : '—');
    textClass($('dns'), st.last_report ? (checks.dns_ok ? 'good' : 'bad') : 'muted');
    textClass($('internet'), st.last_report ? (checks.internet_ok ? 'good' : 'bad') : 'muted');

    put('cpu', num(health.cpu_load_1m, 2));
    put('cpu-hint', isNum(health.cpu_logical_cores) ? '1-minutt load · ' + num(health.cpu_logical_cores) + ' logiske kjerner' : '1 minutts load average');
    // Catalina does not always expose memory_pressure -Q; show measured total instead of a misleading unknown.
    const freePct = health.memory_free_percent;
    put('ram', isNum(freePct) ? num(freePct) + ' %' : isNum(health.memory_total_mb) ? num(health.memory_total_mb / 1024, 1) + ' GB' : 'Ikke målt');
    put('ram-hint', isNum(freePct)
      ? 'Estimert tilgjengelig · totalt ' + num(health.memory_total_mb) + ' MB'
      : isNum(health.memory_total_mb) ? 'Installert RAM · tilgjengelig minne ikke målt' : 'Minneverdier mangler');
    put('disk', isNum(health.disk_free_gb) ? num(health.disk_free_gb, 1) + ' GB' : 'Ukjent');
    put('disk-hint', isNum(health.disk_total_gb) ? 'Av ' + num(health.disk_total_gb, 1) + ' GB totalt' : 'Lokal harddisk');
    put('battery', isNum(health.battery_percent) ? num(health.battery_percent) + ' %' : 'Ukjent');
    const ac = health.battery_ac_power === true ? 'Strømadapter' : health.battery_ac_power === false ? 'Batteridrift' : 'Strøm ukjent';
    const charge = health.battery_is_charging === true ? 'lader' : health.battery_is_charging === false ? 'lader ikke' : 'ladestatus ukjent';
    put('battery-hint', ac + ' · ' + charge);
    textClass($('battery'), isNum(health.battery_percent) && health.battery_percent < 10 && health.battery_is_charging !== true ? 'warn' : '');
    put('smart', health.disk_smart_status || 'Ukjent');
    put('uptime', formatUptime(health.uptime_seconds));
    put('os-version', health.os_version ? 'macOS ' + health.os_version : 'Ukjent');
    put('temperature', isNum(health.temperature_c) ? num(health.temperature_c, 1) + ' °C' : 'Ikke målt');
    const smartlife = Array.isArray(input.smartlife) ? input.smartlife : [];
    put('smartlife-status', st.smartlife_source === 'home_assistant' ? smartlife.length + ' enheter' : 'Ikke tilkoblet');

    const alerts = $('alerts');
    alerts.replaceChildren();
    if (!online) addItem(alerts, 'Ingen ferske data', 'SMED-01 er ikke registrert som online. Eldre målinger kan være utdaterte.', 'warn');
    const warningList = Array.isArray(input.alerts) ? input.alerts : [];
    for (const item of warningList.slice(0, 30)) {
      const kind = item.severity === 'critical' ? 'bad' : item.severity === 'warning' ? 'warn' : 'muted';
      addItem(alerts, item.message || item.code || 'Ukjent varsel', item.code || '', kind);
    }
    if (!warningList.length && online) addItem(alerts, 'Ingen varsler fra siste rapport', 'Dette utelukker ikke alle typer nettverksproblemer.', 'good');

    const eventList = $('events');
    eventList.replaceChildren();
    const events = Array.isArray(input.events) ? input.events : [];
    if (!events.length) addItem(eventList, 'Ingen endringer registrert', 'Hendelser vises ved endring i DNS-, gateway- eller internettilstand.', 'muted');
    for (const event of events.slice(0, 30)) {
      const date = new Date(event.at);
      addItem(eventList, event.message || 'Nettverkshendelse', Number.isNaN(date.getTime()) ? '' : date.toLocaleString('nb-NO'), event.kind === 'warning' ? 'warn' : event.kind === 'recovery' ? 'good' : 'muted');
    }

    const list = $('devices');
    list.replaceChildren();
    const devices = Array.isArray(input.devices) ? input.devices : [];
    if (!devices.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      td.textContent = 'Ingen enheter observert i siste rapport.';
      tr.append(td);
      list.append(tr);
    }
    const sorted = devices.slice(0, 256).sort((a,b) => {
      const ipParts = value => String(value || '').split('.').map(Number);
      const x = ipParts(a.ip), y = ipParts(b.ip);
      for (let i = 0; i < 4; i++) if (x[i] !== y[i]) return (x[i] || 0) - (y[i] || 0);
      return 0;
    });
    for (const device of sorted) {
      const tr = document.createElement('tr');
      const nameCell = document.createElement('td');
      const knownName = aliases[deviceKey(device)] || (device.ip === st.gateway ? 'Ruter / gateway' : '') || device.name || 'Ukjent enhet';
      const nameLabel = document.createElement('span');
      nameLabel.className = 'device-name';
      nameLabel.textContent = knownName;
      const aliasButton = document.createElement('button');
      aliasButton.type = 'button';
      aliasButton.className = 'alias-button';
      aliasButton.textContent = aliases[deviceKey(device)] ? 'Endre navn' : 'Navngi';
      aliasButton.addEventListener('click', () => renameDevice(device));
      nameCell.append(nameLabel, aliasButton);
      const ip = document.createElement('td');
      ip.textContent = device.ip || 'Ukjent';
      const mac = document.createElement('td');
      mac.textContent = device.mac || '—';
      const observed = document.createElement('td');
      const text = document.createElement('strong');
      text.textContent = device.state === 'online' ? 'Svarte på ping' : device.state === 'offline' ? 'Ingen pingrespons' : 'Observert (ARP)';
      text.className = device.state === 'online' ? 'good' : device.state === 'offline' ? 'warn' : '';
      observed.append(text);
      if (isNum(device.latency_ms)) {
        const latency = document.createElement('span');
        latency.textContent = num(device.latency_ms, 1) + ' ms';
        observed.append(latency);
      }
      tr.append(nameCell, ip, mac, observed);
      list.append(tr);
    }

    // Remembered devices do not imply an online status; only recent observations do.
    const inventory = Array.isArray(input.inventory) ? input.inventory : [];
    put('inventory-count', inventory.length + ' tidligere oppdagede enheter · opptil 7 dager');
    const history = $('inventory');
    history.replaceChildren();
    if (!inventory.length) {
      const tr = document.createElement('tr'), td = document.createElement('td');
      td.colSpan = 4;
      td.textContent = 'Ingen historikk ennå. Nye enheter registreres etter hvert.';
      tr.append(td); history.append(tr);
    }
    const localTime = value => {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('nb-NO', {dateStyle:'short',timeStyle:'short'});
    };
    for (const device of inventory.slice(0,512)) {
      const tr = document.createElement('tr');
      const name = document.createElement('td');
      const strong = document.createElement('strong');
      strong.textContent = aliases[deviceKey(device)] || device.name || device.ip || 'Ukjent';
      const address = document.createElement('span');
      address.textContent = device.ip || '—';
      name.append(strong, address);
      const first = document.createElement('td');
      first.textContent = localTime(device.first_seen);
      const last = document.createElement('td');
      last.textContent = localTime(device.last_seen);
      const presence = document.createElement('td');
      const current = online && device.currently_observed === true;
      presence.textContent = current ? 'Observert i siste rapport' : 'Ikke observert nå';
      presence.className = current ? 'good' : 'muted';
      tr.append(name,first,last,presence);
      history.append(tr);
    }
  }

  async function update() {
    if (busy) return;
    busy = true;
    $('refresh').disabled = true;
    try {
      const res = await fetch('/nettvakt/dashboard-data', {credentials:'same-origin', cache:'no-store'});
      if (res.status === 401) {
        window.location.assign('/nettvakt/dashboard');
        return;
      }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      render(await res.json());
    } catch (err) {
      state.className = 'state offline';
      put('state-text', 'KAN IKKE OPPDATERE');
      put('last-update', 'Ingen kontakt med serveren: ' + String(err.message || err));
    } finally {
      busy = false;
      $('refresh').disabled = false;
    }
  }

  $('refresh').addEventListener('click', update);
  document.addEventListener('visibilitychange', () => {if (!document.hidden) update();});
  update();
  setInterval(() => {if (!document.hidden) update();}, 30000);
})();
