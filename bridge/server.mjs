import { createServer } from 'node:http';
import { randomUUID, timingSafeEqual } from 'node:crypto';

const PORT = Number(process.env.PORT || 8080);
const DEVICE_TOKEN = process.env.SMED_DEVICE_TOKEN || '';
const AGENT_TOKEN = process.env.SMED_AGENT_TOKEN || '';
const ALLOWED_ORIGIN = process.env.SMED_ALLOWED_ORIGIN || '*';
const MAX_BODY = 8192;
const TTL_MS = 60000;
const ALLOWED = new Set(['ATI','0100','0105','010C','03','2115','2117',
  'ATE0','ATL0','ATSP6','ATSH7E0']);
for (const hex of ['01','02','03','04','08','09','10','11','12','13','14',
  '15','16','17','18','19','1A','1B','1C','1D','1E','1F','20','21','22',
  '23','24','25','26','27','28','29','2A','2B','2C','2D','2E','2F',
  '30','31','32','33','34','35','36','37','38','39','3A','3B','3C',
  '3D','3E','3F','40','41','42','43','44','45','46','47','48','49',
  '4A','4B','4C','4D','4E','4F','50','51','52','53','54','55','56',
  '57','58','59','5A','5B','5C','5D','5E','5F','60','61','62','63',
  '64','65','66','67']) ALLOWED.add('21'+hex);

if (DEVICE_TOKEN.length < 24 || AGENT_TOKEN.length < 24 || DEVICE_TOKEN === AGENT_TOKEN) {
  console.error('Set different SMED_DEVICE_TOKEN and SMED_AGENT_TOKEN (at least 24 characters each).');
  process.exit(1);
}
let lastHello = 0;
let queue = [];
const tasks = new Map();

function equal(actual, expected) {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a,b);
}
function authorized(req, role) {
  const raw = req.headers.authorization || '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7) : '';
  return equal(token, role === 'device' ? DEVICE_TOKEN : AGENT_TOKEN);
}
function reply(res, status, data) {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(data));
}
async function body(req) {
  let data = '';
  for await (const chunk of req) {
    data += chunk.toString();
    if (data.length > MAX_BODY) throw new Error('Request too large');
  }
  return data ? JSON.parse(data) : {};
}
function expire() {
  const now = Date.now();
  queue = queue.filter(id => {
    const task = tasks.get(id);
    return task && task.expires > now && task.state === 'queued';
  });
  for (const [id, task] of tasks) {
    if (task.expires <= now && task.state !== 'done') {
      task.state = 'expired';
      task.response = 'Timeout waiting for iPhone';
    }
    if (task.created + 300000 < now) tasks.delete(id);
  }
}
const server = createServer(async (req,res) => {
  const origin = req.headers.origin || '';
  if (origin && (ALLOWED_ORIGIN === '*' || ALLOWED_ORIGIN.split(',').map(s=>s.trim()).includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary','Origin');
    res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers','Authorization,Content-Type');
  } else if (origin) {
    return reply(res,403,{error:'Origin not allowed'});
  }
  if (req.method === 'OPTIONS') {res.writeHead(204);return res.end();}
  const path = new URL(req.url,'http://localhost').pathname;
  if (path === '/health' && req.method === 'GET')
    return reply(res,200,{status:'ok', bridge:'smed-obd',device_online:Date.now()-lastHello<15000});
  const role = path.startsWith('/device/') ? 'device' : path.startsWith('/agent/') ? 'agent' : null;
  if (!role) return reply(res,404,{error:'Not found'});
  if (!authorized(req,role)) return reply(res,401,{error:'Unauthorized'});
  try {
    expire();
    if (path === '/device/hello' && req.method === 'POST') {
      const data = await body(req);
      if (data.device !== 'KONNWEI KDIAG') return reply(res,400,{error:'Unknown device'});
      lastHello=Date.now();
      return reply(res,200,{ok:true,read_only:true});
    }
    if (path === '/device/next' && req.method === 'GET') {
      lastHello=Date.now();
      const id=queue.shift();
      const task=id && tasks.get(id);
      if (!task) return reply(res,200,{task:null});
      task.state='running';
      return reply(res,200,{task:{id:task.id,command:task.command}});
    }
    if (path === '/device/result' && req.method === 'POST') {
      const data=await body(req);
      const task=tasks.get(data.id);
      if (!task || task.state!=='running') return reply(res,404,{error:'Unknown task'});
      if (typeof data.response!=='string' || data.response.length>4096 || typeof data.ok!=='boolean')
        return reply(res,400,{error:'Invalid result'});
      task.response=data.response;
      task.ok=data.ok;
      task.state='done';
      return reply(res,200,{ok:true});
    }
    if (path === '/agent/command' && req.method === 'POST') {
      const data=await body(req);
      const command=String(data.command || '').trim().toUpperCase();
      if (!ALLOWED.has(command)) return reply(res,400,{error:'Read command not on allowlist'});
      if (Date.now()-lastHello>15000) return reply(res,409,{error:'iPhone bridge offline'});
      const active=[...tasks.values()].some(t=>t.state==='running'||t.state==='queued');
      if (active) return reply(res,409,{error:'A task is already pending'});
      const id=randomUUID();
      const task={id,command,created:Date.now(),expires:Date.now()+TTL_MS,state:'queued'};
      tasks.set(id,task);queue.push(id);
      return reply(res,202,{id,state:'queued'});
    }
    if (path === '/agent/result' && req.method === 'GET') {
      const id=new URL(req.url,'http://localhost').searchParams.get('id');
      const task=tasks.get(id);
      return task ? reply(res,200,{id:task.id,state:task.state,command:task.command,
        ok:task.ok ?? null,response:task.response ?? null}) : reply(res,404,{error:'Unknown task'});
    }
    return reply(res,404,{error:'Not found'});
  } catch (err) {
    return reply(res,400,{error:err instanceof SyntaxError ? 'Invalid JSON' : String(err.message)});
  }
});
server.listen(PORT,'0.0.0.0',()=>console.log('SMED OBD read-only bridge listening on '+PORT));
