import { createServer } from 'node:http';
import { randomUUID, timingSafeEqual, createHmac, createHash, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const PORT = Number(process.env.PORT || 8080);
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STATIC_FILES = new Map([['/', 'index.html'], ['/index.html', 'index.html'], ['/4n14-egr-dpf.html', '4n14-egr-dpf.html']]);
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
      if(task.githubId) logGithub('RESULT',{id:task.githubId,task_id:task.id,
        command:task.command,operation:task.operation||'read',ok:false,response:task.response});
    }
    if (task.created + 300000 < now) tasks.delete(id);
  }
}

// Stateless OAuth 2.1 (PKCE) and Streamable HTTP MCP for SMED-OBD.
// No agent credential is returned to the browser or embedded in application HTML.
// Rotate SMED_AGENT_TOKEN after any suspected credential exposure.
const b64 = value => (Buffer.isBuffer(value) ? value : Buffer.from(typeof value === 'string' ? value : JSON.stringify(value))).toString('base64url');
const unb64 = value => Buffer.from(value, 'base64url').toString('utf8');
function signed(payload) {
  const data=b64(payload);
  const mac=createHmac('sha256',AGENT_TOKEN).update(data).digest('base64url');
  return data+'.'+mac;
}
function verifySigned(value,kind) {
  if (typeof value!=='string'||value.length>8192) return null;
  const [data,mac,extra]=value.split('.');
  if (!data||!mac||extra!==undefined) return null;
  const expected=createHmac('sha256',AGENT_TOKEN).update(data).digest('base64url');
  if (!equal(mac,expected)) return null;
  try {
    const item=JSON.parse(unb64(data));
    if (item.kind!==kind||typeof item.exp!=='number'||item.exp<Date.now())return null;
    return item;
  } catch {return null;}
}
function json(res,status,value,headers={}) {
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});
  res.end(JSON.stringify(value));
}
function baseUrl(req) {
  // Render forwards external TLS. A fixed configured public origin prevents Host poisoning.
  return process.env.SMED_PUBLIC_URL || 'https://smed-obd-i2kp.onrender.com';
}
function oauthMetadata(req) {
  const base=baseUrl(req);
  return {issuer:base,authorization_endpoint:base+'/oauth/authorize',token_endpoint:base+'/oauth/token',
    registration_endpoint:base+'/oauth/register',response_types_supported:['code'],
    grant_types_supported:['authorization_code','refresh_token'],
    code_challenge_methods_supported:['S256'],token_endpoint_auth_methods_supported:['none'],
    scopes_supported:['smed:read'],client_id_metadata_document_supported:false};
}
function htmlEscape(x) {
  return String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function oauthError(res,status,error){return json(res,status,{error});}
async function oauthRoute(req,res,path,url) {
  const base=baseUrl(req);
  if (req.method==='GET' && (path==='/.well-known/oauth-authorization-server'||path==='/.well-known/openid-configuration'))
    return json(res,200,oauthMetadata(req));
  if (req.method==='GET' && (path==='/.well-known/oauth-protected-resource'||path==='/.well-known/oauth-protected-resource/mcp'))
    return json(res,200,{resource:base+'/mcp',authorization_servers:[base],scopes_supported:['smed:read'],bearer_methods_supported:['header']});
  if (path==='/oauth/register' && req.method==='POST') {
    const data=await body(req);
    if (!Array.isArray(data.redirect_uris)||data.redirect_uris.length<1||data.redirect_uris.length>8||
      !data.redirect_uris.every(x=>typeof x==='string'&&x.length<1024&&
        (/^https:\/\//.test(x)||/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(x))))
      return oauthError(res,400,'invalid_redirect_uri');
    const client_id=signed({kind:'client',uris:data.redirect_uris,exp:Date.now()+365*86400000});
    return json(res,201,{client_id,client_id_issued_at:Math.floor(Date.now()/1000),
      redirect_uris:data.redirect_uris,token_endpoint_auth_method:'none',
      grant_types:['authorization_code','refresh_token'],response_types:['code']});
  }
  if (path==='/oauth/authorize' && req.method==='GET') {
    const client=verifySigned(url.searchParams.get('client_id'),'client');
    const redirect=url.searchParams.get('redirect_uri');
    const challenge=url.searchParams.get('code_challenge');
    const state=url.searchParams.get('state')||'';
    if (!client||!client.uris.includes(redirect)||url.searchParams.get('response_type')!=='code'||
      url.searchParams.get('code_challenge_method')!=='S256'||!challenge||!/^[a-zA-Z0-9_-]{43,128}$/.test(challenge))
      return oauthError(res,400,'invalid_request');
    const request=signed({kind:'request',client_id:url.searchParams.get('client_id'),redirect,challenge,state,exp:Date.now()+600000});
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store',
      'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'",
      'X-Frame-Options':'DENY'});
    return res.end('<!doctype html><html lang="no"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Smed OBD – tilgang</title>'+
      '<body style="font-family:system-ui;max-width:32rem;margin:3rem auto;padding:1rem"><h1>Smed OBD – godkjenn MCP</h1>'+
      '<p>Dette gir ChatGPT-klienten tilgang til lesekommandoer fra din tilkoblede ECU. Ingen sletting eller nullstilling er aktivert.</p>'+
      '<form method="post" action="/oauth/authorize"><input type="hidden" name="request" value="'+htmlEscape(request)+'">'+
      '<label>Privat agentnøkkel (SMED_AGENT_TOKEN)<input required type="password" autocomplete="off" name="token" style="display:block;width:100%;padding:.7rem;margin:.5rem 0"></label>'+
      '<button style="padding:.8rem" type="submit">Godkjenn lesetilgang</button></form>'+
      '<p>Nøkkelen finnes i Render → Environment. Ikke skriv den i ChatGPT-chatten.</p></body></html>');
  }
  if(path==='/oauth/authorize' && req.method==='POST') {
    const fields=new URLSearchParams(await textBody(req));
    const request=verifySigned(fields.get('request'),'request');
    if(!request)return oauthError(res,400,'invalid_request');
    if(!equal(fields.get('token')||'',AGENT_TOKEN))return oauthError(res,403,'access_denied');
    const code=signed({kind:'code',client_id:request.client_id,redirect:request.redirect,
      challenge:request.challenge,exp:Date.now()+180000,nonce:randomUUID()});
    const callback=new URL(request.redirect);
    callback.searchParams.set('code',code);
    if(request.state)callback.searchParams.set('state',request.state);
    res.writeHead(302,{'Location':callback.toString(),'Cache-Control':'no-store'});
    return res.end();
  }
  if(path==='/oauth/token' && req.method==='POST') {
    const fields=new URLSearchParams(await textBody(req));
    const grant=fields.get('grant_type');
    const client_id=fields.get('client_id');
    const client=verifySigned(client_id,'client');
    if(!client)return oauthError(res,401,'invalid_client');
    if(grant==='authorization_code') {
      const code=verifySigned(fields.get('code'),'code');
      const verifier=fields.get('code_verifier')||'';
      if(!code||code.client_id!==client_id||!client.uris.includes(fields.get('redirect_uri'))||
        code.redirect!==fields.get('redirect_uri')||!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)||
        b64(createHash('sha256').update(verifier).digest())!==code.challenge)
        return oauthError(res,400,'invalid_grant');
    } else if(grant==='refresh_token') {
      const refresh=verifySigned(fields.get('refresh_token'),'refresh');
      if(!refresh||refresh.client_id!==client_id)return oauthError(res,400,'invalid_grant');
    } else return oauthError(res,400,'unsupported_grant_type');
    return json(res,200,{token_type:'Bearer',expires_in:3600,scope:'smed:read',
      access_token:signed({kind:'access',client_id,exp:Date.now()+3600000}),
      refresh_token:signed({kind:'refresh',client_id,exp:Date.now()+30*86400000})});
  }
  return oauthError(res,404,'not_found');
}
async function textBody(req) {
  let value='';
  for await(const chunk of req) {value+=chunk.toString();if(value.length>MAX_BODY)throw new Error('Request too large');}
  return value;
}
function mcpAuthorization(req) {
  const auth=req.headers.authorization||'';
  const token=auth.startsWith('Bearer ')?auth.slice(7):'';
  return equal(token,AGENT_TOKEN)||!!verifySigned(token,'access');
}
const mcpTools=[
  {name:'smed_bridge_status',description:'Read the live status of the SMED OBD iPhone bridge (no car writes).',
    annotations:{readOnlyHint:true},inputSchema:{type:'object',properties:{},additionalProperties:false}},
  {name:'smed_ecu_command',description:'Queue an allowlisted read-only ELM327/4N14 ECU diagnostic command. Requires active Bluefy bridge. Returns a task ID for polling. Never sends ECU reset, clear, DPF regeneration or actuator-write commands.',
    annotations:{readOnlyHint:true},inputSchema:{type:'object',properties:{
      command:{type:'string',description:'Allowed diagnostic command, such as ATI, 010C, 03, ATSH7E0 or 2115.'}},required:['command'],additionalProperties:false}},
  {name:'smed_command_result',description:'Fetch the outcome of a previously queued ECU diagnostic command by task ID.',
    annotations:{readOnlyHint:true},inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id'],additionalProperties:false}}
];
function toolResponse(obj,error=false){return {content:[{type:'text',text:JSON.stringify(obj)}],isError:error};}
function mcpHandle(request) {
  const id=request?.id??null;
  const ok=result=>({jsonrpc:'2.0',id,result});
  const err=(code,message)=>({jsonrpc:'2.0',id,error:{code,message}});
  if(!request||request.jsonrpc!=='2.0'||typeof request.method!=='string')return err(-32600,'Invalid Request');
  if(request.method==='initialize')return ok({protocolVersion:'2025-06-18',capabilities:{tools:{listChanged:false}},
    serverInfo:{name:'smed-obd',version:'0.16.0'}});
  if(request.method==='ping')return ok({});
  if(request.method==='tools/list')return ok({tools:mcpTools});
  if(request.method==='tools/call') {
    const name=request.params?.name, args=request.params?.arguments||{};
    expire();
    if(name==='smed_bridge_status')return ok(toolResponse({online:Date.now()-lastHello<15000,
      pending:[...tasks.values()].filter(x=>['running','queued'].includes(x.state)).length,read_only:true}));
    if(name==='smed_ecu_command') {
      const command=typeof args.command==='string'?args.command.trim().toUpperCase():'';
      if(!ALLOWED.has(command))return ok(toolResponse({error:'Command not on read allowlist'},true));
      if(Date.now()-lastHello>15000)return ok(toolResponse({error:'iPhone bridge offline'},true));
      if([...tasks.values()].some(t=>t.state==='running'||t.state==='queued'))
        return ok(toolResponse({error:'Another command is pending'},true));
      const task={id:randomUUID(),command,created:Date.now(),expires:Date.now()+TTL_MS,state:'queued'};
      tasks.set(task.id,task);queue.push(task.id);
      return ok(toolResponse({id:task.id,state:'queued',command}));
    }
    if(name==='smed_command_result') {
      const task=tasks.get(args.id);
      if(!task)return ok(toolResponse({error:'Task not found or expired'},true));
      return ok(toolResponse({id:task.id,command:task.command,state:task.state,ok:task.ok??null,response:task.response??null}));
    }
    return err(-32602,'Unknown tool');
  }
  return err(-32601,'Method not found');
}


// GitHub-connector command transport. The command branch does not trigger Render redeploy.
// Only the repository owner can update queue/command.json; data in this branch is public,
// so NEVER include credentials, VIN, private notes or ECU responses in the command file.
const GITHUB_QUEUE_URL='https://raw.githubusercontent.com/perjoa-ux/Smed-OBD/smed-command-queue/queue/command.json';
let githubLastJob = '';
let githubBusy = false;
let githubPollError = '';
let githubEverFetched = false;
function logGithub(kind, fields={}) {
  console.log('SMED_GITHUB_'+kind+' '+JSON.stringify(fields));
}
async function pollGithubQueue() {
  if(githubBusy) return;
  githubBusy=true;
  try {
    const response=await fetch(GITHUB_QUEUE_URL+'?cache='+Date.now(), {
      headers:{'Accept':'application/json','Cache-Control':'no-cache','User-Agent':'SmedOBD-RenderBridge/0.17'},
      signal:AbortSignal.timeout(6500)
    });
    if(!response.ok) throw new Error('GitHub queue HTTP '+response.status);
    const raw=await response.text();
    if(raw.length>2048) throw new Error('GitHub queue too large');
    const job=JSON.parse(raw);
    if (!githubEverFetched) { githubEverFetched=true;logGithub('QUEUE_FETCHED',{id:String(job.id||'').slice(0,80)}); }
    if(typeof job.id!=='string'||typeof job.expires_at!=='string')
      throw new Error('Invalid GitHub queue schema');
    if(githubPollError){logGithub('QUEUE_RECOVERED');githubPollError='';}
    if(!job.id||job.id===githubLastJob||!job.command) return;
    if(!/^[a-zA-Z0-9_-]{1,80}$/.test(job.id)) return;
    const expires=Date.parse(job.expires_at);
    if(!Number.isFinite(expires)||expires<Date.now()||expires>Date.now()+15*60*1000) {
      githubLastJob=job.id;
      logGithub('SKIPPED',{id:job.id,reason:'expired_or_invalid_expiration'});
      return;
    }
    // Explicit named operations only: generic ECU writes are never accepted.
    const isWrite=job.operation==='clear_obd_dtc';
    const command=isWrite ? '04' : (typeof job.command==='string'?job.command.trim().toUpperCase():'');
    if ((job.operation && !isWrite) || (!isWrite && !ALLOWED.has(command)) ||
        (isWrite && job.confirmation!=='REQUEST_ON_DEVICE_CONFIRMATION')) {
      githubLastJob=job.id;
      logGithub('REJECTED',{id:job.id,reason:'not_on_command_allowlist'});
      return;
    }
    if(Date.now()-lastHello>=15000) return;
    expire();
    if([...tasks.values()].some(t=>t.state==='running'||t.state==='queued')) return;
    const task={id:randomUUID(),githubId:job.id,command,
      operation:isWrite?'clear_obd_dtc':'read',
      created:Date.now(),expires:Math.min(Date.now()+TTL_MS,expires),state:'queued'};
    tasks.set(task.id,task);
    queue.push(task.id);
    githubLastJob=job.id;
    logGithub('QUEUED',{id:job.id,task_id:task.id,command,operation:task.operation});
  }catch(err){
    const message=String(err.message||err).slice(0,160);
    if(message!==githubPollError) {githubPollError=message;logGithub('POLL_ERROR',{message});}
  }finally {githubBusy=false;}
}
// Raw GitHub branch may cache new commits briefly; each job must expire within 15 minutes.
setInterval(pollGithubQueue,10000);
setTimeout(pollGithubQueue,2000);
logGithub('QUEUE_CONFIGURED',{branch:'smed-command-queue',mode:'read_and_confirmed_obd_clear'});

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
  const url = new URL(req.url,'http://localhost');
  const path = url.pathname;
  if (path.startsWith('/oauth/') || path.startsWith('/.well-known/')) {
    try { return await oauthRoute(req,res,path,url); }
    catch(e) {return oauthError(res,400,'invalid_request');}
  }
  if (path === '/mcp') {
    if (!mcpAuthorization(req)) return json(res,401,{error:'Unauthorized'},
      {'WWW-Authenticate':'Bearer resource_metadata="'+baseUrl(req)+'/.well-known/oauth-protected-resource/mcp"'});
    if(req.method==='GET') return json(res,405,{error:'SSE not supported; use Streamable HTTP POST'});
    if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
    try {
      const input=await body(req);
      if(input.method?.startsWith('notifications/')){res.writeHead(202);return res.end();}
      return json(res,200,mcpHandle(input),{'Mcp-Session-Id':'smed-stateless'});
    } catch(e){return json(res,400,{error:'Invalid MCP request'});}
  }
  if (req.method === 'GET' && STATIC_FILES.has(path)) {
    try {
      const file = await readFile(resolve(PROJECT_ROOT, STATIC_FILES.get(path)));
      res.writeHead(200, {'Content-Type':'text/html; charset=utf-8',
        'Cache-Control':'no-cache', 'X-Content-Type-Options':'nosniff',
        'Referrer-Policy':'no-referrer'});
      return res.end(file);
    } catch {
      return reply(res,500,{error:'Web application unavailable'});
    }
  }
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
      return reply(res,200,{task:{id:task.id,command:task.command,operation:task.operation||'read'}});
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
      if (task.githubId) logGithub('RESULT',{id:task.githubId,task_id:task.id,
        command:task.command,operation:task.operation||'read',ok:task.ok,response:task.response.slice(0,2048)});
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
server.listen(PORT,'0.0.0.0',()=>console.log('SMED OBD bridge listening on '+PORT));
