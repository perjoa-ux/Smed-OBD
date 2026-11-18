import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { PassThrough } from 'node:stream';
import { createNetVakt } from './nettvakt.mjs';

const root = '0'.repeat(36);
const token = createHmac('sha256', root).update('smed-nettvakt-agent-v1').digest('hex');
async function call(svc, path, method='GET', body=null, authorization='Bearer '+token) {
  const req = new PassThrough();
  req.method = method; req.headers = {authorization};
  const res = new PassThrough();
  let status = 0; const chunks = [];
  res.writeHead = code => {status = code;};
  res.on('data', x => chunks.push(x));
  const pending = svc.handleHttp(req, res, path);
  req.end(body ? JSON.stringify(body) : '');
  await pending;
  return {status, data:JSON.parse(Buffer.concat(chunks).toString())};
}

test('not yet connected: no invented devices', () => {
  const app=createNetVakt(root);
  assert.equal(app.handleTool('nettvakt_status',{}).agent_online,false);
  assert.deepEqual(app.handleTool('nettvakt_devices',{}).devices,[]);
});

test('secure ingestion and safe ping queue', async () => {
  const app=createNetVakt(root);
  const report={host:'Mac',gateway:'192.168.86.1',
    checks:{gateway_ms:2,dns_ok:true,internet_ok:true},
    devices:[{ip:'192.168.86.23',mac:'aa:bb:cc:dd:ee:ff',source:'arp'}],alerts:[],smartlife:[]};
  assert.equal((await call(app,'/nettvakt/report','POST',report,'Bearer no')).status,401);
  assert.equal((await call(app,'/nettvakt/report','POST',report)).status,200);
  assert.equal(app.handleTool('nettvakt_devices',{}).devices.length,1);
  assert.ok(app.handleTool('nettvakt_probe',{kind:'ping',ip:'192.168.4.4'}).error);
  const pending=app.handleTool('nettvakt_probe',{kind:'ping',ip:'192.168.86.23'});
  assert.equal(pending.state,'queued');
  const next=(await call(app,'/nettvakt/next')).data.command;
  assert.equal(next.id,pending.id);
  assert.equal((await call(app,'/nettvakt/result','POST',{id:next.id,ok:true,result:'latency_ms=2'})).status,200);
  assert.equal(app.handleTool('nettvakt_probe_result',{id:pending.id}).ok,true);
});

test('reject invalid reports or unsafe commands', async () => {
  const app=createNetVakt(root);
  assert.equal((await call(app,'/nettvakt/report','POST',{devices:[],alerts:[],smartlife:Array(257).fill({})})).status,400);
  assert.ok(app.handleTool('nettvakt_probe',{kind:'restart_router'}).error);
});

test('Mac health telemetry is sanitized and retrievable', async () => {
  const app=createNetVakt(root);
  const report={devices:[],alerts:[],smartlife:[],
    mac_health:{os_name:'Darwin',os_version:'10.15.8',cpu_load_1m:0.5,
      cpu_logical_cores:4,battery_percent:1,battery_is_charging:false,
      disk_smart_status:'Verified',serial:'hidden'}};
  assert.equal((await call(app,'/nettvakt/report','POST',report)).status,200);
  const health=app.handleTool('nettvakt_mac_health',{});
  assert.equal(health.agent_online,true);
  assert.equal(health.mac_health.battery_percent,1);
  assert.equal(health.mac_health.disk_smart_status,'Verified');
  assert.equal(health.mac_health.serial,undefined);
});


test('retains bounded network failure and recovery history', async () => {
  const app = createNetVakt(root);
  const base = {host:'SMED-01',gateway:'192.168.86.1',devices:[],alerts:[],smartlife:[]};
  const send = checks => call(app, '/nettvakt/report', 'POST', {...base,checks});
  assert.equal((await send({gateway_ms:2,dns_ok:true,internet_ok:true})).status,200);
  assert.equal(app.handleTool('nettvakt_alerts',{}).events.length,0);
  assert.equal((await send({gateway_ms:null,dns_ok:false,internet_ok:false})).status,200);
  const fail = app.handleTool('nettvakt_alerts',{}).events;
  assert.equal(fail.length,3);
  assert.ok(fail.every(event => event.kind === 'warning'));
  assert.equal((await send({gateway_ms:2,dns_ok:true,internet_ok:true})).status,200);
  const recovery = app.handleTool('nettvakt_alerts',{}).events;
  assert.equal(recovery.length,6);
  assert.equal(recovery[0].kind,'recovery');
  assert.equal(app.handleTool('nettvakt_status',{}).report_sequence,3);
});
