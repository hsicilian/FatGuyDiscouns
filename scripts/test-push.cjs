// Entirely local: in-memory PostgreSQL, synthetic users, fake push transport.
// Never reads environment files or connects to Supabase/push services.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { PGlite } = require('@electric-sql/pglite');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
function loader(mocks) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    const code = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    vm.runInNewContext(code, { exports, Date, URL, TextDecoder, Intl, Set, Map, console, setTimeout, clearTimeout, process: { env: {
      PUSH_ENABLED: 'true', PUSH_SEND_ENABLED: 'true', VAPID_PUBLIC_KEY: 'synthetic', VAPID_PRIVATE_KEY: 'synthetic', VAPID_SUBJECT: 'mailto:test@example.test',
    } }, require(name) {
      if (name in mocks) return mocks[name];
      if (name === 'server-only') return {};
      if (name.startsWith('.')) {
        const base=path.posix.normalize(path.posix.join(path.posix.dirname(file), name));
        return load(fs.existsSync(path.join(root,base+'.ts')) ? base+'.ts' : fs.existsSync(path.join(root,base+'.tsx')) ? base+'.tsx' : base+'/index.ts');
      }
      if (name.startsWith('node:')) return require(name);
      throw new Error('Unexpected dependency: ' + name);
    } }, { filename: file });
    return exports;
  }
  return load;
}
let checks = 0;
async function check(name, fn) { await fn(); console.log('PASS', name); checks++; }
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const owner = { id: uuid(1), role: 'master_admin', accountState: 'approved' };
const policy = loader({})('apps/web/lib/push/policy.ts');
const core = loader({})('packages/core/src/index.ts');

(async () => {
  const db = new PGlite();
  await db.exec(`create schema auth; create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; create table auth.users(id uuid primary key, email text);
    create type public.notification_type as enum ('new_claim');
    create table public.notifications(id uuid primary key default gen_random_uuid(),type public.notification_type,customer_id uuid,payload jsonb,created_at timestamptz default now());
    create role anon; create role authenticated; create role service_role;
    create table public.customer_profiles(user_id uuid primary key, display_name text);
    create table public.user_roles(user_id uuid primary key, role text, account_state text);
    grant usage on schema public,auth to service_role,authenticated,anon;
    grant select on public.user_roles to service_role;
  `);
  await db.exec(read('supabase/migrations/0026_web_push_v1.sql'));
  await db.exec(read('supabase/migrations/20261023053444_customer_notification_inbox.sql'));
  await db.exec(read('supabase/migrations/20261023174058_notification_delivery_modes.sql'));
  await db.exec(read('supabase/migrations/20261024200056_push_failure_alerts.sql'));
  for (let i = 1; i <= 10; i++) {
    await db.query('insert into auth.users(id) values ($1)', [uuid(i)]);
    await db.query('insert into customer_profiles values ($1,$2)', [uuid(i), `Customer ${i}`]);
    await db.query('insert into user_roles values ($1,$2,$3)', [uuid(i), i === 1 ? 'master_admin' : 'customer', 'approved']);
  }
  // Minimal Supabase query adapter over real PostgreSQL, exercising production code.
  class Query {
    constructor(table) { this.table = table; this.filters = []; this.orders = []; this.cols = '*'; this.operation = 'select'; }
    select(cols = '*') { this.cols = cols; return this; }
    is(col, value) { this.filters.push([col,value]); return this; }
    eq(col, value) { this.filters.push([col, value]); return this; }
    order(col, opts) { this.orders.push(`"${col}" ${opts?.ascending === false ? 'desc' : 'asc'}`); return this; }
    range(start, end) { this.offset = start; this.limitValue = end - start + 1; return this; }
    limit(n) { this.limitValue = n; return this; }
    single() { this.one = true; return this; }
    maybeSingle() { this.one = true; return this; }
    insert(data) { this.operation = 'insert'; this.values = data; return this; }
    upsert(data) { this.operation = 'upsert'; this.values = data; return this; }
    update(data) { this.operation = 'update'; this.values = data; return this; }
    async execute() {
      const args = [];
      const bind = val => { args.push(val && typeof val === 'object' ? JSON.stringify(val) : val); return '$' + args.length; };
      const cols = this.cols === '*' ? '*' : this.cols.split(',').map(c => `"${c}"`).join(',');
      let sql;
      if (this.operation === 'insert' || this.operation === 'upsert') {
        const keys = Object.keys(this.values);
        sql = `insert into ${this.table} (${keys.map(k => `"${k}"`).join(',')}) values (${keys.map(k => bind(this.values[k])).join(',')})`;
        if (this.operation === 'upsert') sql += ` on conflict(user_id) do update set ${keys.map(k => `"${k}"=excluded."${k}"`).join(',')}`;
      } else if (this.operation === 'update') sql = `update ${this.table} set ${Object.entries(this.values).map(([k,v]) => `"${k}"=${bind(v)}`).join(',')}`;
      else sql = `select ${cols} from ${this.table}`;
      if (this.filters.length) sql += ' where ' + this.filters.map(([k,v]) => (v===null ? `"${k}" is null` : `"${k}"=${bind(v)}`)).join(' and ');
      if (this.operation === 'select') {
        if (this.orders.length) sql += ' order by ' + this.orders.join(',');
        if (this.limitValue !== undefined) sql += ` limit ${this.limitValue}`;
        if (this.offset) sql += ` offset ${this.offset}`;
      } else sql += ` returning ${cols}`;
      try { const result = await db.query(sql, args); return { data: this.one ? result.rows[0] ?? null : result.rows, error: null }; }
      catch (error) { throw new Error(`Local query failed: ${sql}: ${error.message}`); }
    }
    then(resolve, reject) { return this.execute().then(resolve, reject); }
  }
  const client = { auth: { admin: {
    getUserById: async id => ({ data: { user: (await db.query('select id from auth.users where id=$1',[id])).rows.map(u=>({...u,email:`customer${Number(u.id.slice(-12))}@example.test` }))[0] }, error:null }),
    listUsers: async ({page,perPage}) => ({ data: { users:(await db.query('select id from auth.users order by id limit $1 offset $2',[perPage,(page-1)*perPage])).rows.map(u=>({...u,email:`customer${Number(u.id.slice(-12))}@example.test`})) },error:null })
  } }, from: table => new Query(table), async rpc(name, args) {
    const values = Object.values(args).map(v => Array.isArray(v) ? JSON.stringify(v) : v);
    const result = await db.query(`select * from ${name}(${Object.keys(args).map((_,i) => '$' + (i+1)).join(',')})`, values);
    return { data: result.rows, error: null };
  } };
  let today = '2026-10-25';
  const balances = new Map();
  let billingReads = 0;
  const sent = [];
  let response = async () => ({ statusCode: 201 });
  let auditOk = true;
  let emailCalls=0;
  const server = loader({
    '../admin-email':{sendAdminEmailNotification:async()=>{emailCalls++;throw Error('Push failures must not email');}},
    '../data/supabase-helpers': { getAdminClient: async () => client, siteToday: () => today,
      listActiveCycleContexts: async id => { billingReads++; return (balances.get(id) ?? []).map(summary => ({ summary, due: core.calculateBalanceDue(summary) })); } },
    '../audit': { recordAdminAuditEntry: async () => ({ ok: auditOk }) },
    'web-push': { sendNotification: async (sub, payload, options) => { sent.push({ sub, payload: JSON.parse(payload), options }); return response(); } },
  })('apps/web/lib/push/server.ts');
  const rawPreview = server.preview;
  server.preview = (actor,input) => rawPreview(actor,{recipient:{mode:'all'},delivery:'in_app_push',...input});
  const cycle = (id, dueDate, subtotal, paymentsApplied = 0, creditsApplied = 0) => ({ id, dueDate, subtotal, paymentsApplied, creditsApplied, shipping: 0, adjustments: 0, status: 'active' });
  async function device(user, n) {
    return server.registerSubscription(uuid(user), { endpoint: `https://fcm.googleapis.com/fcm/send/synthetic-${n}`, keys: { p256dh: 'A'.repeat(87), auth: 'B'.repeat(22) } });
  }
  await device(1, 1); await device(2, 2); await device(2, 3); await device(3, 4); await device(4, 5); await device(5, 6);

  await check('Customer search is Owner-only, searches CRM names/email and returns account IDs', async () => {
    await assert.rejects(server.searchPushCustomers({...owner,role:'admin'},'Customer'));
    assert.equal((await server.searchPushCustomers(owner,'CUSTOMER 2')).customers[0].id,uuid(2));
    assert.equal((await server.searchPushCustomers(owner,'customer3@example')).customers[0].id,uuid(3));
    assert.equal((await server.searchPushCustomers(owner,'customer1@example')).customers.length,0);
  });
  await check('Individual sales bind one account, deliver to both devices, and switching to all recalculates', async () => {
    for(const i of [2,3]) await server.savePreferences(uuid(i),{sales:true,invoices:false});
    const p=await server.preview(owner,{category:'sales',title:'Sale',body:'Tonight',recipient:{mode:'customer',customerId:uuid(2)}});
    assert.equal(p.customer.id,uuid(2)); assert.equal(p.customers,1); assert.equal(p.devices,2);
    const stored=(await db.query('select message from push_sends where id=$1',[p.id])).rows[0];
    assert.equal(stored.message.recipient.customerId,uuid(2));
    const result=await server.confirm(owner,p.id,true);assert.equal(result.devices,2);assert.equal(result.attemptedDevices,2);
    assert.equal(sent.length,2);assert.ok(sent.every(s=>/synthetic-[23]$/.test(s.sub.endpoint)));
    assert.ok(sent.every(s=>s.payload.recipient===undefined));
    await server.confirm(owner,p.id,true);assert.equal(sent.length,2);
    const all=await server.preview(owner,{category:'sales',title:'Sale',body:'Tonight',recipient:{mode:'all'}});
    assert.equal(all.customers,2);assert.equal(all.devices,3);
    sent.length=0;
    for(const i of [2,3]) await server.savePreferences(uuid(i),{sales:false,invoices:false});
  });
  await check('Missing, malformed, unavailable or mixed targets never fall back to broadcast', async () => {
    for(const recipient of [undefined,null,{}, {mode:'customer'}, {mode:'customer',customerId:''}, {mode:'customer',customerId:'bad'}, {mode:'all',customerId:uuid(2)}, {mode:'customers',customerId:uuid(2)}]) {
      await assert.rejects(rawPreview(owner,{category:'invoices',delivery:'in_app_push',recipient}));
    }
    await assert.rejects(server.preview(owner,{category:'invoices',recipient:{mode:'customer',customerId:uuid(999)}}));
    await assert.rejects(server.preview(owner,{category:'invoices',recipient:{mode:'customer',customerId:owner.id}}));
    await assert.rejects(server.preview(owner,{category:'invoices',testOnly:true,recipient:{mode:'customer',customerId:uuid(2)}}));
    assert.equal(sent.length,0);
  });
  await check('Individual opt-out, no devices and consent revoked after preview prevent delivery', async () => {
    const request={category:'sales',title:'Sale',body:'Tonight',recipient:{mode:'customer',customerId:uuid(2)}};
    const unsubscribed=await server.preview(owner,request);assert.equal(unsubscribed.devices,0);
    assert.equal((await server.confirm(owner,unsubscribed.id,true)).inAppCustomers,1);
    await server.savePreferences(uuid(6),{sales:true,invoices:true});
    const noDevices=await server.preview(owner,{...request,recipient:{mode:'customer',customerId:uuid(6)}});
    assert.equal(noDevices.devices,0);assert.equal((await server.confirm(owner,noDevices.id,true)).inAppCustomers,1);
    await server.savePreferences(uuid(2),{sales:true,invoices:false});
    const beforeOptOut=await server.preview(owner,request);
    await server.savePreferences(uuid(2),{sales:false,invoices:false});
    assert.equal((await server.confirm(owner,beforeOptOut.id,true)).inAppCustomers,1);assert.equal(sent.length,0);
  });
  await check('Dispatch rejects queued devices outside the saved individual target and malformed metadata', async () => {
    for(const i of [2,3]) await server.savePreferences(uuid(i),{sales:true,invoices:false});
    const p=await server.preview(owner,{category:'sales',title:'Sale',body:'Tonight',recipient:{mode:'customer',customerId:uuid(2)}});
    const wrong=(await db.query('select id from push_subscriptions where user_id=$1',[uuid(3)])).rows[0].id;
    await client.rpc('push_confirm',{p_send:p.id,p_actor:owner.id,p_recipients:[{userId:uuid(3),subscriptionIds:[wrong],cycleIds:[]}]});
    const result=await server.dispatchBatch(owner,p.id);assert.equal(result.counts.skipped,1);assert.equal(sent.length,0);
    await db.query("update push_sends set message=jsonb_set(message,'{recipient}', 'null'::jsonb) where id=$1",[p.id]);
    await assert.rejects(server.dispatchBatch(owner,p.id));
    for(const i of [2,3]) await server.savePreferences(uuid(i),{sales:false,invoices:false});
  });
  await check('Independent opt-ins default off, can enable either/both/neither', async () => {
    const defaults = await server.preferences(uuid(2)); assert.equal(defaults.sales, false); assert.equal(defaults.invoices, false);
    for (const sales of [true,false]) for (const invoices of [true,false]) {
      await server.savePreferences(uuid(2), { sales, invoices });
      const p = await server.preferences(uuid(2)); assert.equal(p.sales,sales); assert.equal(p.invoices,invoices);
    }
    assert.equal(policy.hasConsent(null, 'invoices'), false);
  });
  await check('Sunday due, Monday overdue, paid/credit-covered/future cycles excluded', () => {
    const sample = [cycle(uuid(101),'2026-10-25',100,20,10),cycle(uuid(102),'2026-10-25',100,100),cycle(uuid(103),'2026-10-25',100,0,100),cycle(uuid(104),'2026-11-01',100)];
    const contexts = sample.map(summary => ({ summary, due: core.calculateBalanceDue(summary) }));
    assert.equal(policy.dueCycleIds(contexts, '2026-10-24').length,0);
    assert.equal(policy.dueCycleIds(contexts, '2026-10-25').join(),uuid(101));
    assert.equal(policy.dueCycleIds(contexts, '2026-10-26').join(),uuid(101));
    assert.equal(core.isBalanceOverdue(sample[0], '2026-10-25'),false);
    assert.equal(core.isBalanceOverdue(sample[0], '2026-10-26'),true);
  });
  await check('Invoice preview excludes paid-up, non-opted-in and unsubscribed customers; counts devices separately', async () => {
    for (const i of [2,3,5,6]) await server.savePreferences(uuid(i), { sales: false, invoices: true });
    balances.set(uuid(2), [cycle(uuid(102),'2026-10-25',100,20)]);
    balances.set(uuid(3), [cycle(uuid(103),'2026-10-25',100,100)]);
    balances.set(uuid(4), [cycle(uuid(104),'2026-10-25',100)]); // no consent
    balances.set(uuid(5), [cycle(uuid(105),'2026-11-01',100)]); // not yet due
    balances.set(uuid(6), [cycle(uuid(106),'2026-10-25',100)]); // no subscription
    const p = await server.preview(owner, { category: 'invoices' });
    assert.equal(p.customers,1); assert.equal(p.devices,2); assert.equal(sent.length,0);
  });
  await check('Owner-only authorization and explicit confirmation before any transport', async () => {
    for (const role of ['customer','admin']) {
      const actor = { ...owner, role };
      await assert.rejects(server.preview(actor,{ category:'invoices' }));
      await assert.rejects(server.confirm(actor,uuid(900),true));
      await assert.rejects(server.dispatchBatch(actor,uuid(900)));
    }
    await assert.rejects(server.preview({...owner, accountState:'banned'},{}));
    await assert.rejects(server.confirm(owner,uuid(900),false));
    assert.equal(sent.length,0);
  });
  await check('Paid after preview is excluded at confirmation (fresh billing read)', async () => {
    const p = await server.preview(owner, { category:'invoices' });
    balances.get(uuid(2))[0].paymentsApplied = 100;
    const before = billingReads;
    const result = await server.confirm(owner,p.id,true);
    assert.equal(result.devices,0); assert.equal(sent.length,0); assert.ok(billingReads > before);
    balances.get(uuid(2))[0].paymentsApplied = 20;
  });
  await check('Auditing failure prevents dispatch', async () => {
    const p = await server.preview(owner,{category:'invoices'});
    auditOk = false; await assert.rejects(server.confirm(owner,p.id,true)); auditOk = true;
    assert.equal(sent.length,0);
  });
  await check('Duplicate confirmation and separate sends cannot repeat same invoice cycle', async () => {
    const p1 = await server.preview(owner,{category:'invoices'});
    const p2 = await server.preview(owner,{category:'invoices'});
    await Promise.all([server.confirm(owner,p1.id,true),server.confirm(owner,p2.id,true)]);
    assert.equal(sent.length,2);
    await server.confirm(owner,p1.id,true); assert.equal(sent.length,2);
    assert.equal((await db.query('select * from push_reminder_cycles')).rows.length,3);
    for (const notification of sent) {
      assert.equal(notification.payload.body,policy.PAYMENT_REMINDER.body);
      assert.equal(notification.payload.url,'/account');
      assert.equal(notification.payload.title,policy.PAYMENT_REMINDER.title);
      assert.equal(notification.payload.body.includes('100'),false);
    }
  });
  await check('Sales use independent consent; owner test never targets customers or consumes cycles', async () => {
    const sale = { category:'sales',title:'Live sale tonight',body:'Join our Facebook group sale tonight at 7 PM Eastern.' };
    assert.equal((await server.preview(owner,sale)).customers,0);
    await server.savePreferences(uuid(4),{sales:true,invoices:false});
    const p = await server.preview(owner,sale); assert.equal(p.customers,1); assert.equal(p.devices,1);
    await server.confirm(owner,p.id,true);
    assert.equal(sent.at(-1).payload.url,'');
    assert.equal(sent.at(-1).payload.body,sale.body);
    const test = await server.preview(owner,{category:'invoices',testOnly:true});
    assert.equal(test.customers,1); assert.equal(test.devices,1);
    await server.confirm(owner,test.id,true);
    assert.ok(sent.at(-1).sub.endpoint.endsWith('synthetic-1'));
    assert.equal((await db.query('select * from push_reminder_cycles')).rows.length,3);
  });
  await check('Every claimed delivery rechecks payment and consent, including resumed batches', async () => {
    // Queue through the same transaction, then change authoritative billing before dispatch.
    balances.set(uuid(5),[cycle(uuid(205),'2026-10-25',100)]);
    const p = await server.preview(owner,{category:'invoices'});
    const sub = (await db.query('select id from push_subscriptions where user_id=$1',[uuid(5)])).rows[0].id;
    await client.rpc('push_confirm',{p_send:p.id,p_actor:owner.id,p_recipients:[{userId:uuid(5),cycleIds:[uuid(205)],subscriptionIds:[sub]}]});
    balances.get(uuid(5))[0].paymentsApplied=100;
    const before=sent.length; const result=await server.dispatchBatch(owner,p.id);
    assert.equal(sent.length,before); assert.equal(result.counts.skipped,1);
    const sale=await server.preview(owner,{category:'sales',title:'Test',body:'Store sale',url:'/store'});
    const s4=(await db.query('select id from push_subscriptions where user_id=$1',[uuid(4)])).rows[0].id;
    await client.rpc('push_confirm',{p_send:sale.id,p_actor:owner.id,p_recipients:[{userId:uuid(4),cycleIds:[],subscriptionIds:[s4]}]});
    await server.savePreferences(uuid(4),{sales:false,invoices:false});
    assert.equal((await server.dispatchBatch(owner,sale.id)).counts.skipped,1); assert.equal(sent.length,before);
  });
  await check('404/410 deactivate subscriptions; explicit transient failures back off; timeouts are not retried', async () => {
    await server.savePreferences(uuid(4),{sales:true,invoices:false});
    const sale={category:'sales',title:'Sale',body:'Shop new arrivals.',url:'/store'};
    response=async()=>{throw {statusCode:503,headers:{'retry-after':'120'}};};
    const p=await server.preview(owner,sale); const retry=await server.confirm(owner,p.id,true);
    assert.equal(retry.counts.retry,1);
    const before=sent.length; await server.dispatchBatch(owner,p.id); assert.equal(sent.length,before);
    await db.query("update push_deliveries set ready_at=now()-interval '1 second' where send_id=$1",[p.id]);
    response=async()=>{throw new Error('synthetic timeout');};
    assert.equal((await server.dispatchBatch(owner,p.id)).counts.unknown,1);
    await server.dispatchBatch(owner,p.id); assert.equal(sent.length,before+1);
    response=async()=>{throw {statusCode:410};};
    const expired=await server.preview(owner,sale); assert.equal((await server.confirm(owner,expired.id,true)).counts.expired,1);
    assert.equal((await server.preview(owner,sale)).devices,0);
    assert.equal(policy.deliveryOutcome(503,3),'failed'); assert.equal(policy.deliveryOutcome(429,2),'retry');
    response=async()=>({statusCode:201});
  });
  await check('Subscription ownership cannot transfer and private endpoints/redirects are rejected', async () => {
    await assert.rejects(device(3,2));
    for (const endpoint of ['http://fcm.googleapis.com/a','https://127.0.0.1/a','https://fcm.googleapis.com.evil.test/a','https://fcm.googleapis.com:444/a','https://evil.test/a']) assert.equal(policy.validEndpoint(endpoint),false);
    for (const dest of ['//evil.test','https://evil.test','/account?token=secret','/api/admin','/\\evil']) assert.throws(()=>policy.safeDestination(dest));
  });
  await check('Per-device and account-wide unsubscribe stop delivery without changing category choices', async () => {
    const devices=(await db.query('select id from push_subscriptions where user_id=$1',[uuid(2)])).rows;
    await server.disableSubscription(uuid(3),devices[0].id); // Cannot disable another user's device.
    assert.equal((await db.query('select active from push_subscriptions where id=$1',[devices[0].id])).rows[0].active,true);
    await server.disableSubscription(uuid(2),devices[0].id);
    assert.equal((await db.query('select active from push_subscriptions where id=$1',[devices[0].id])).rows[0].active,false);
    await server.disableSubscription(uuid(2),undefined,true);
    assert.equal((await db.query('select count(*)::int n from push_subscriptions where user_id=$1 and active',[uuid(2)])).rows[0].n,0);
    assert.equal((await server.preferences(uuid(2))).invoices,true);
  });
  await check('RLS/privileges deny browser roles private records and dispatch functions', async () => {
    assert.equal((await db.query("select count(*)::int as n from pg_class where relname like 'push_%' and relkind='r' and relrowsecurity")).rows[0].n,7);
    for (const role of ['anon','authenticated']) {
      assert.equal((await db.query("select has_table_privilege($1,'push_subscriptions','select') as ok",[role])).rows[0].ok,false);
      assert.equal((await db.query("select has_function_privilege($1,'push_claim(uuid)','execute') as ok",[role])).rows[0].ok,false);
    }
    await assert.rejects(client.rpc('push_confirm',{p_send:uuid(999),p_actor:uuid(2),p_recipients:[]}));
    const p=await server.preview(owner,{category:'invoices',testOnly:true});
    const sub=(await db.query('select id from push_subscriptions where user_id=$1 limit 1',[uuid(2)])).rows[0].id;
    await assert.rejects(client.rpc('push_confirm',{p_send:p.id,p_actor:owner.id,p_recipients:[{userId:uuid(2),cycleIds:[],subscriptionIds:[sub]}]}));
  });
  await check('HTTP handlers reject anonymous, customer/admin send attempts and cross-origin requests', async () => {
    let actor=null; let serviceCalls=0;
    const api=loader({
      'next/server':{NextResponse:{json:(data,options)=>new Response(JSON.stringify(data),options)}},
      'next/headers':{cookies:async()=>({get:()=>undefined})},
      '../../../lib/auth/session':{getCurrentSessionUser:async()=>actor},
      '../../../lib/push/server':{preview:async()=>{serviceCalls++;return {};},confirm:async()=>{serviceCalls++;return {};},dispatchBatch:async()=>{serviceCalls++;return {};}}
    })('apps/web/app/api/push/route.ts');
    const request=(op,origin='https://fgd.example')=>new Request('https://fgd.example/api/push',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({op,confirmed:true,id:uuid(500)})});
    assert.equal((await api.POST(request('confirm'))).status,401);
    for (const role of ['customer','admin']) {
      actor={...owner,role};
      for (const op of ['preview','confirm','process','searchCustomers']) assert.equal((await api.POST(request(op))).status,403);
    }
    actor=owner;
    assert.equal((await api.POST(request('confirm','https://evil.example'))).status,403);
    assert.equal(serviceCalls,0);
    const requestPolicy=loader({})('apps/web/lib/push/request-policy.ts');
    assert.equal(requestPolicy.trustedPushRequest(null,'application/json','https://fgd.example'),false);
    assert.equal(requestPolicy.trustedPushRequest('https://fgd.example','text/plain','https://fgd.example'),false);
    await assert.rejects(requestPolicy.readPushBody(new Request('https://fgd.example',{method:'POST',body:'x'.repeat(8193)})));
  });
  await check('Interrupted sending rows become unknown, never silently requeued', async () => {
    const id=(await db.query('select id from push_deliveries limit 1')).rows[0].id;
    await db.query("update push_deliveries set status='sending',updated_at=now()-interval '6 minutes' where id=$1",[id]);
    const send=(await db.query('select send_id from push_deliveries where id=$1',[id])).rows[0].send_id;
    await client.rpc('push_claim',{p_send:send});
    assert.equal((await db.query('select status from push_deliveries where id=$1',[id])).rows[0].status,'unknown');
  });
  await check('Individual invoices preserve paid exclusion, fresh dispatch eligibility and cycle deduplication', async () => {
    await device(7,70); await server.savePreferences(uuid(7),{sales:false,invoices:true});
    const request={category:'invoices',recipient:{mode:'customer',customerId:uuid(7)}};
    const balance=cycle(uuid(707),'2026-10-25',100,100);balances.set(uuid(7),[balance]);
    assert.equal((await server.preview(owner,request)).devices,0);
    balance.paymentsApplied=0;
    const paidLater=await server.preview(owner,request);balance.paymentsApplied=100;
    await assert.rejects(server.confirm(owner,paidLater.id,true));
    balance.paymentsApplied=0;
    const a=await server.preview(owner,request), b=await server.preview(owner,request);
    const before=sent.length;await server.confirm(owner,a.id,true);assert.equal(sent.length,before+1);
    assert.equal(sent.at(-1).payload.url,'/account');assert.equal(sent.at(-1).payload.body,policy.PAYMENT_REMINDER.body);
    await assert.rejects(server.confirm(owner,b.id,true));assert.equal(sent.length,before+1);
    // Simulate a payment after queueing but before the protected transport check.
    balance.id=uuid(708);
    const queued=await server.preview(owner,request);
    const sub=(await db.query('select id from push_subscriptions where user_id=$1',[uuid(7)])).rows[0].id;
    await client.rpc('push_confirm',{p_send:queued.id,p_actor:owner.id,p_recipients:[{userId:uuid(7),subscriptionIds:[sub],cycleIds:[uuid(708)]}]});
    balance.paymentsApplied=100;
    assert.equal((await server.dispatchBatch(owner,queued.id)).counts.skipped,1);assert.equal(sent.length,before+1);
  });
  await check('All push clicks open the protected inbox, including legacy destinations; window reuse and fallback', async () => {
    const handlers={},shown=[],opened=[];let windows=[],focused=0,navigated=0;
    const destination='https://www.fatguydiscounts.com/account/notifications';
    vm.runInNewContext(read('apps/web/public/sw.js'),{URL,self:{addEventListener:(name,fn)=>handlers[name]=fn,registration:{showNotification:async(...args)=>shown.push(args)},location:{origin:'https://www.fatguydiscounts.com'},clients:{matchAll:async()=>windows,openWindow:async url=>{opened.push(url);return {focus:async()=>{focused++;}};}}}});
    async function click(data){let work;handlers.notificationclick({notification:{close(){},data},waitUntil:p=>work=p});await work;}
    for(const url of [undefined,null,'','/account','/store','/events','https://evil.test','//evil.test']){
      let work;handlers.push({data:{json:()=>({title:'FGD',body:'See https://example.test/show',url})},waitUntil:p=>work=p});await work;
      assert.equal(shown.at(-1)[1].data.url,'/account/notifications');
      await click({url});assert.equal(opened.at(-1),destination);
    }
    for(const data of [undefined,{json:()=>null},{json:()=>{throw Error('invalid');}}]){let work;handlers.push({data,waitUntil:p=>work=p});await work;assert.equal(shown.at(-1)[0],'Fat Guy Discounts');}
    assert.equal(shown[0][1].badge,'/notification-badge-fgd-96.png');assert.equal(shown[0][1].icon,'/android-chrome-192x192.png');
    const count=opened.length;
    windows=[{url:destination,focus:async()=>{focused++;}}];await click();assert.equal(opened.length,count);
    windows=[{url:'https://www.fatguydiscounts.com/account',navigate:async url=>{assert.equal(url,destination);navigated++;return {focus:async()=>{focused++;}};}}];await click();assert.equal(navigated,1);assert.equal(opened.length,count);
    windows=[{url:'https://www.fatguydiscounts.com/account',navigate:async()=>{throw Error('closed');}}];await click();assert.equal(opened.length,count+1);
    windows=[{url:'https://www.fatguydiscounts.com/login',navigate:async()=>null}];await click();assert.equal(opened.length,count+2);
    windows=[{url:'https://evil.test/account/notifications',focus:()=>{throw Error('cross origin');},navigate:()=>{throw Error('cross origin');}}];await click();assert.equal(opened.length,count+3);
    assert.equal(handlers.fetch,undefined);assert.equal(handlers.activate,undefined);assert.equal(handlers.install,undefined);
    assert.throws(()=>policy.saleMessage({title:'Sale',body:'Tonight',url:'https://evil.test'}));
    assert.equal(policy.saleMessage({title:'Sale',body:'Join https://example.test/show?a=1&b=2'}).body,'Join https://example.test/show?a=1&b=2');
  });
  await check('Customer and owner UI render separate unchecked preferences and preview/test actions', () => {
    const appRequire=require('node:module').createRequire(path.join(root,'apps/web/package.json'));
    const React=appRequire('react');
    const render=appRequire('react-dom/server').renderToStaticMarkup;
    const ui=loader({'react':React,'react-dom':{createPortal:child=>child},'react/jsx-runtime':appRequire('react/jsx-runtime')});
    const customer=render(React.createElement(ui('apps/web/components/push/notification-settings.tsx').NotificationSettings));
    assert.ok(customer.includes('Checking phone notifications'));
    assert.equal((customer.match(/type="checkbox"/g)||[]).length,0);
    assert.equal(customer.includes('checked=""'),false);
    const admin=render(React.createElement(ui('apps/web/components/push/admin-push.tsx').AdminPush));
    assert.ok(admin.includes('Preview sale announcement')); assert.ok(admin.includes('Preview test to my devices only'));
    assert.ok(admin.includes('Sending is disabled'));
    assert.equal(admin.includes('FGD destination'),false);
    assert.equal(admin.includes('value="/store"'),false);
    assert.ok(admin.includes('No link is needed'));
  });
  await check('Logout/expired session and missing marker preserve browser enrollment; only confirmed switch removes it', async () => {
    let stored=null,unsubscribed=0,switched=false,fail=false,calls=0;
    const exports={};
    const code=ts.transpileModule(read('apps/web/components/push/browser-account.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    vm.runInNewContext(code,{exports,fetch:async()=>{calls++;return {ok:!fail,json:async()=>({switched})};},navigator:{serviceWorker:{getRegistration:async()=>({pushManager:{getSubscription:async()=>({toJSON:()=>({}),unsubscribe:async()=>{unsubscribed++;}})}})}},localStorage:{setItem:(_,value)=>{stored=value;}}});
    await exports.synchronizePushAccount(null);assert.equal(calls,0);assert.equal(unsubscribed,0);
    await exports.synchronizePushAccount('same-account');assert.equal(unsubscribed,0);assert.equal(stored,'same-account');
    await exports.synchronizePushAccount(null);assert.equal(unsubscribed,0);assert.equal(stored,'same-account');
    fail=true;await assert.rejects(exports.synchronizePushAccount('same-account'));assert.equal(unsubscribed,0);
    fail=false;await exports.synchronizePushAccount('same-account');assert.equal(unsubscribed,0);
    switched=true;await exports.synchronizePushAccount('different-account');assert.equal(unsubscribed,1);
  });
  await check('Explicit logout revokes only local auth and never changes device cookie/subscription', async () => {
    let signedOut=false;
    const action=loader({
      'next/headers':{cookies:async()=>({delete(){throw Error('Must preserve device cookie');}})},
      'next/navigation':{redirect:()=>{throw new Error('redirect');}},
      '../../../lib/supabase':{hasSupabaseEnv:()=>true,createServerSupabaseClient:async()=>({auth:{signOut:async options=>{assert.equal(options.scope,'local');signedOut=true;}}})},
      '../../../lib/auth/session':{},
      '../../../lib/push/server':{disableSubscription:async()=>{throw new Error('Must not disable');}}
    })('apps/web/app/actions/session/logout.ts');
    await assert.rejects(action.logoutSessionAction(),/redirect/);assert.equal(signedOut,true);
  });

  const inbox = loader({'../data/supabase-helpers':{getAdminClient:async()=>client}})('apps/web/lib/push/inbox.ts');
  const customerActor = n => ({id:uuid(n),role:'customer',accountState:'approved'});
  const inboxRows = async send => (await db.query('select * from customer_notifications where send_id=$1',[send])).rows;
  await check('Broadcast inbox includes customers without consent/devices; multiple phones create one inbox entry', async () => {
    await device(2,2);await device(2,3);await server.savePreferences(uuid(2),{sales:true,invoices:true});
    await db.query("update user_roles set account_state='banned' where user_id=$1",[uuid(10)]);
    const p=await server.preview(owner,{category:'sales',title:'Inbox broadcast',body:'Sale tonight'});
    assert.equal(p.inAppCustomers,8);
    const result=await server.confirm(owner,p.id,true);
    const entries=await inboxRows(p.id);assert.equal(entries.length,8);
    assert.equal(entries.filter(n=>n.customer_id===uuid(2)).length,1);
    assert.ok(entries.some(n=>n.customer_id===uuid(8))); // no subscription or consent
    assert.ok(!entries.some(n=>n.customer_id===owner.id||n.customer_id===uuid(10)));
    assert.equal(result.inAppCustomers,8);
    assert.equal((await db.query('select count(*)::int n from push_deliveries where send_id=$1 and customer_id=$2',[p.id,uuid(8)])).rows[0].n,0);
    await server.confirm(owner,p.id,true);await server.dispatchBatch(owner,p.id);
    assert.equal((await inboxRows(p.id)).length,8);
  });
  await check('Individual inbox survives provider failure and retries without duplicating or restoring deleted messages', async () => {
    const p=await server.preview(owner,{category:'sales',title:'Individual inbox',body:'Only your account',recipient:{mode:'customer',customerId:uuid(2)}});
    response=async()=>{throw {statusCode:503};};
    const result=await server.confirm(owner,p.id,true);assert.equal(result.counts.retry,2);
    const entries=await inboxRows(p.id);assert.equal(entries.length,1);assert.equal(entries[0].customer_id,uuid(2));
    const actor=customerActor(2),id=entries[0].id;
    await inbox.deleteInboxNotification(customerActor(3),id);
    assert.ok((await inbox.listInbox(actor)).some(n=>n.id===id));
    await inbox.deleteInboxNotification(actor,id);
    assert.ok(!(await inbox.listInbox({...actor})).some(n=>n.id===id)); // new session/device
    await db.query("update push_deliveries set ready_at=now()-interval '1 second' where send_id=$1",[p.id]);
    response=async()=>({statusCode:201});await server.dispatchBatch(owner,p.id);await server.confirm(owner,p.id,true);
    assert.ok(!(await inbox.listInbox({...actor})).some(n=>n.id===id));
    assert.equal((await inboxRows(p.id)).length,1);assert.ok((await inboxRows(p.id))[0].deleted_at);
    assert.equal((await db.query('select count(*)::int n from push_deliveries where send_id=$1',[p.id])).rows[0].n,2);
    assert.ok((await db.query('select id from push_sends where id=$1',[p.id])).rows.length);
  });
  await check('Inbox-only payment reminders require actual due balance and reserve cycles once without phone consent', async () => {
    await server.savePreferences(uuid(8),{sales:false,invoices:false});
    const balance=cycle(uuid(808),'2026-10-25',100,100);balances.set(uuid(8),[balance]);
    const request={category:'invoices',recipient:{mode:'customer',customerId:uuid(8)}};
    const paid=await server.preview(owner,request);assert.equal(paid.inAppCustomers,0);await assert.rejects(server.confirm(owner,paid.id,true));
    balance.paymentsApplied=0;
    const a=await server.preview(owner,request),b=await server.preview(owner,request);assert.equal(a.inAppCustomers,1);assert.equal(a.devices,0);
    const before=sent.length;const result=await server.confirm(owner,a.id,true);assert.equal(result.inAppCustomers,1);assert.equal(sent.length,before);
    assert.equal((await inboxRows(a.id))[0].body,policy.PAYMENT_REMINDER.body);
    await assert.rejects(server.confirm(owner,b.id,true));await server.confirm(owner,a.id,true);assert.equal((await inboxRows(a.id)).length,1);
    balance.id=uuid(809);const changed=await server.preview(owner,request);balance.paymentsApplied=100;
    await assert.rejects(server.confirm(owner,changed.id,true));assert.equal((await inboxRows(changed.id)).length,0);
  });
  await check('Inbox ownership, pagination, newest-first, persistent deletion and RLS isolate customers', async () => {
    const actor=customerActor(2),items=await inbox.listInbox(actor);
    assert.ok(items.length>0);
    assert.ok(items.every((item,i)=>!i||Date.parse(items[i-1].created_at)>=Date.parse(item.created_at)));
    await assert.rejects(inbox.listInbox(null));await assert.rejects(inbox.listInbox(owner));
    await assert.rejects(inbox.deleteInboxNotification({...actor,accountState:'banned'},items[0].id));
    await assert.rejects(inbox.listInbox(actor,-1));await assert.rejects(inbox.deleteInboxNotification(actor,'bad'));
    assert.equal((await db.query("select has_table_privilege('anon','customer_notifications','select') ok")).rows[0].ok,false);
    for(const operation of ['insert','update','delete']) assert.equal((await db.query("select has_table_privilege('authenticated','customer_notifications',$1) ok",[operation])).rows[0].ok,false);
    assert.equal((await db.query("select has_function_privilege('authenticated','push_confirm_inbox(uuid,uuid,jsonb)','execute') ok")).rows[0].ok,false);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uuid(2)]);
    await db.exec('set role authenticated');
    try {const visible=(await db.query('select customer_id,deleted_at from customer_notifications')).rows;assert.ok(visible.length);assert.ok(visible.every(n=>n.customer_id===uuid(2)&&n.deleted_at===null));}
    finally {await db.exec('reset role');}
    const p=await server.preview(owner,{category:'sales',title:'Atomic',body:'Test',recipient:{mode:'customer',customerId:uuid(2)}});
    await assert.rejects(client.rpc('push_confirm_inbox',{p_send:p.id,p_actor:owner.id,p_recipients:[{userId:uuid(2),subscriptionIds:[],cycleIds:[]},{userId:uuid(3),subscriptionIds:[],cycleIds:[]}]}));
    assert.equal((await inboxRows(p.id)).length,0); // mismatch rolls back entire transaction
    await db.query(`with drafts as (
      insert into push_sends(actor_id,category,message)
      select $1,'sales','{"title":"Pagination","body":"Saved"}'::jsonb from generate_series(1,51) returning id
    ) insert into customer_notifications(customer_id,send_id,title,body,category)
      select $2,id,'Pagination','Saved','sales' from drafts`,[owner.id,uuid(9)]);
    const first=await inbox.listInbox(customerActor(9),0),second=await inbox.listInbox(customerActor(9),1);
    assert.equal(first.length,50);assert.ok(second.length>=1);
    assert.ok(!first.some(a=>second.some(b=>a.id===b.id)));
  });
  await check('Inbox API uses session ownership, blocks cross-origin deletes, and is independent of push configuration', async () => {
    let actor=customerActor(2);let removed=null;
    const api=loader({
      'next/server':{NextResponse:{json:(data,options)=>new Response(JSON.stringify(data),options)}},
      '../../../../lib/auth/session':{getCurrentSessionUser:async()=>actor},
      '../../../../lib/push/inbox':{listInbox:async a=>[{customer:a.id}],deleteInboxNotification:async(a,id)=>{removed={actor:a.id,id};}}
    })('apps/web/app/api/account/notifications/route.ts');
    const req=(origin='https://fgd.example')=>new Request('https://fgd.example/api/account/notifications',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({op:'delete',id:uuid(88),customerId:uuid(3)})});
    assert.equal((await api.POST(req())).status,200);assert.equal(removed.actor,uuid(2));
    removed=null;assert.equal((await api.POST(req('https://evil.example'))).status,403);assert.equal(removed,null);
    for(const value of [null,owner,{...customerActor(2),accountState:'banned'}]){actor=value;assert.equal((await api.POST(req())).status,403);}
    actor=customerActor(2);const r=await api.GET({nextUrl:new URL('https://fgd.example/api/account/notifications')});assert.equal(r.status,200);
    assert.equal(r.headers.get('cache-control'),'no-store');
    assert.ok(!read('apps/web/app/api/account/notifications/route.ts').includes('PUSH_ENABLED'));
  });

  await check('In-app-only broadcast persists every eligible inbox with zero phone recipients/jobs/provider calls', async () => {
    const before=sent.length;
    const p=await server.preview(owner,{category:'sales',title:'Inbox only',body:'Store news',delivery:'in_app_only'});
    assert.equal(p.delivery,'in_app_only');assert.equal(p.inAppCustomers,8);assert.equal(p.customers,0);assert.equal(p.devices,0);
    const stored=(await db.query('select message from push_sends where id=$1',[p.id])).rows[0].message;
    assert.equal(stored.delivery,'in_app_only');
    const r=await server.confirm(owner,p.id,true);assert.equal(r.inAppCustomers,8);assert.equal(r.devices,0);assert.equal(sent.length,before);
    await server.confirm(owner,p.id,true);await server.dispatchBatch(owner,p.id);
    assert.equal((await inboxRows(p.id)).length,8);assert.equal(sent.length,before);
    assert.equal((await db.query('select count(*)::int n from push_deliveries where send_id=$1',[p.id])).rows[0].n,0);
    const one=(await inboxRows(p.id)).find(n=>n.customer_id===uuid(2));
    await inbox.deleteInboxNotification(customerActor(2),one.id);await server.confirm(owner,p.id,true);
    assert.ok(!(await inbox.listInbox(customerActor(2))).some(n=>n.id===one.id));
  });
  await check('General Updates are inbox-only, individually bound, and do not require consent or subscriptions', async () => {
    const before=sent.length;
    const p=await server.preview(owner,{category:'general',title:'Website improvements',body:'New features available.',delivery:'in_app_only',recipient:{mode:'customer',customerId:uuid(8)}});
    assert.equal(p.customers,0);assert.equal(p.devices,0);assert.equal(p.inAppCustomers,1);
    await server.confirm(owner,p.id,true);
    const entries=await inboxRows(p.id);assert.equal(entries.length,1);assert.equal(entries[0].category,'general');assert.equal(entries[0].customer_id,uuid(8));
    assert.equal(sent.length,before);
    const broadcast=await server.preview(owner,{category:'general',title:'Website news',body:'More updates',delivery:'in_app_only'});
    await server.confirm(owner,broadcast.id,true);assert.equal((await inboxRows(broadcast.id)).length,8);assert.equal(sent.length,before);
  });
  await check('Missing/invalid delivery modes and General Updates with push fail closed; SQL prevents any inbox-only push job', async () => {
    const input={category:'sales',title:'Mode test',body:'Mode test',recipient:{mode:'all'}};
    for(const delivery of [undefined,null,'',false,'push','IN_APP_ONLY']) await assert.rejects(rawPreview(owner,{...input,delivery}));
    await assert.rejects(server.preview(owner,{...input,category:'general',delivery:'in_app_push'}));
    await assert.rejects(server.preview(owner,{...input,delivery:'in_app_only',testOnly:true}));
    const p=await server.preview(owner,{...input,delivery:'in_app_only'});
    const sub=(await db.query('select id from push_subscriptions where user_id=$1 limit 1',[uuid(2)])).rows[0].id;
    await assert.rejects(db.query('insert into push_deliveries(send_id,subscription_id,customer_id) values ($1,$2,$3)',[p.id,sub,uuid(2)]));
    // Even a caller supplying phone subscriptions to the confirmer cannot queue them.
    await client.rpc('push_confirm_inbox',{p_send:p.id,p_actor:owner.id,p_recipients:[{userId:uuid(2),subscriptionIds:[sub],cycleIds:[]}]});
    assert.equal((await db.query('select count(*)::int n from push_deliveries where send_id=$1',[p.id])).rows[0].n,0);
    await db.query("update push_sends set message=jsonb_set(message,'{delivery}','null'::jsonb) where id=$1",[p.id]);
    await assert.rejects(server.dispatchBatch(owner,p.id));
  });
  await check('Dispatch cannot transport or claim stale work on an inbox-only send', async () => {
    const p=await server.preview(owner,{category:'sales',title:'Stale job',body:'Synthetic test',delivery:'in_app_push',recipient:{mode:'customer',customerId:uuid(2)}});
    const sub=(await db.query('select id from push_subscriptions where user_id=$1 limit 1',[uuid(2)])).rows[0].id;
    await client.rpc('push_confirm_inbox',{p_send:p.id,p_actor:owner.id,p_recipients:[{userId:uuid(2),subscriptionIds:[sub],cycleIds:[]}]});
    await db.query("update push_sends set message=jsonb_set(message,'{delivery}',$2::jsonb) where id=$1",[p.id,JSON.stringify("in_app_only")]);
    const before=sent.length;const r=await server.dispatchBatch(owner,p.id);assert.equal(sent.length,before);assert.equal(r.counts.pending,1);
    assert.equal((await db.query('select attempts from push_deliveries where send_id=$1',[p.id])).rows[0].attempts,0);
  });
  await check('Payment reminders deduplicate across delivery modes and reject paid/not-yet-due balances', async () => {
    const request={category:'invoices',recipient:{mode:'customer',customerId:uuid(2)}};
    const balance=cycle(uuid(920),'2026-10-25',100);balances.set(uuid(2),[balance]);
    const a=await server.preview(owner,{...request,delivery:'in_app_only'});
    const b=await server.preview(owner,{...request,delivery:'in_app_push'});
    const before=sent.length;await server.confirm(owner,a.id,true);assert.equal(sent.length,before);
    await assert.rejects(server.confirm(owner,b.id,true));
    balance.id=uuid(921);
    const c=await server.preview(owner,{...request,delivery:'in_app_push'}),d=await server.preview(owner,{...request,delivery:'in_app_only'});
    await server.confirm(owner,c.id,true);assert.equal(sent.length,before+2);await assert.rejects(server.confirm(owner,d.id,true));
    balance.id=uuid(922);const paid=await server.preview(owner,{...request,delivery:'in_app_only'});balance.paymentsApplied=100;
    await assert.rejects(server.confirm(owner,paid.id,true));assert.equal((await inboxRows(paid.id)).length,0);
    balance.paymentsApplied=0;balance.dueDate='2026-11-01';assert.equal((await server.preview(owner,{...request,delivery:'in_app_only'})).inAppCustomers,0);
  });
  await check('Device proof, same-account reconciliation, account switch and explicit inactive recovery', async () => {
    const id=await device(8,808);const sub={endpoint:'https://fcm.googleapis.com/fcm/send/synthetic-808',keys:{p256dh:'A'.repeat(87),auth:'B'.repeat(22)}};
    assert.equal((await server.reconcileDevice(uuid(8),sub)).active,true);
    assert.equal((await server.reconcileDevice(uuid(8),null,id)).restore,true);
    await assert.rejects(server.reconcileDevice(uuid(9),{...sub,keys:{p256dh:'wrong',auth:'wrong'}}));
    assert.equal((await server.reconcileDevice(uuid(9),sub)).switched,true);
    assert.equal((await server.reconcileDevice(uuid(8),sub,id)).active,false);
    assert.equal((await server.reconcileDevice(uuid(8),null,id)).restore,false);
    await assert.rejects(server.registerSubscription(uuid(9),sub));
    const replacement=await device(9,909);assert.ok(replacement!==id);
    assert.equal((await db.query('select user_id,active from push_subscriptions where id=$1',[id])).rows[0].user_id,uuid(8));
    assert.equal((await server.reconcileDevice(uuid(8),null,replacement)).active,false);
    assert.equal((await db.query('select active from push_subscriptions where id=$1',[replacement])).rows[0].active,false);
  });
  await check('Logged-out customer remains eligible; 410 history remains accurate while preview excludes inactive devices', async () => {
    await device(8,810);await server.savePreferences(uuid(8),{sales:true,invoices:false});
    const p=await server.preview(owner,{category:'sales',title:'Local test',body:'No real transport',recipient:{mode:'customer',customerId:uuid(8)}});
    assert.equal(p.devices,1);response=async()=>{throw {statusCode:410};};
    const result=await server.confirm(owner,p.id,true);assert.equal(result.attemptedDevices,1);assert.equal(result.counts.expired,1);
    const next=await server.preview(owner,{category:'sales',title:'Local preview',body:'No real transport',recipient:{mode:'customer',customerId:uuid(8)}});
    assert.equal(next.devices,0);assert.equal((await server.sendResults(p.id)).devices,1);assert.equal((await server.preferences(uuid(8))).sales,true);
    await db.query("update push_deliveries set status='skipped' where send_id=$1",[p.id]);assert.equal((await server.sendResults(p.id)).attemptedDevices,0);
  });
  async function failureSetup(user, devices, code) {
    await db.query('update push_subscriptions set active=false where user_id=$1',[uuid(user)]);
    for(const n of devices)await device(user,n);
    await db.query('update auth.users set email=$1 where id=$2',[`customer${user}@example.test`,uuid(user)]);
    await server.savePreferences(uuid(user),{sales:true,invoices:true});
    response=async()=>{throw {statusCode:code};};
    return server.preview(owner,{category:'sales',title:'Local failure fixture',body:'Synthetic transport',recipient:{mode:'customer',customerId:uuid(user)}});
  }
  const alertsFor=async id=>(await db.query('select * from push_failure_alerts where send_id=$1',[id])).rows;
  await check('Two 410 devices produce one persistent customer warning, one named Owner alert and no email',async()=>{
    const p=await failureSetup(6,[610,611],410);
    const result=await server.confirm(owner,p.id,true);assert.equal(result.counts.expired,2);assert.equal(result.inAppCustomers,1);
    const a=await alertsFor(p.id);assert.equal(a.length,1);assert.equal(a[0].failed_count,2);assert.equal(a[0].remaining_devices,0);assert.equal(emailCalls,0);

    const notes=await inboxRows(p.id);assert.equal(notes.length,2);const warning=notes.find(n=>n.kind==='push_failure');assert.match(warning.body,/No active registered devices remain/);
    const admin=(await db.query('select * from notifications where id=$1',[a[0].admin_notification_id])).rows[0];assert.equal(admin.customer_id,uuid(6));assert.match(admin.payload.label,/Customer 6/);assert.match(admin.payload.label,/410/);assert.match(admin.payload.label,/customer6@example.test/);assert.match(admin.payload.label,/Failed subscriptions in this send: 2/);assert.ok(!admin.payload.label.includes("fcm.googleapis"));
    await inbox.deleteInboxNotification(customerActor(6),warning.id);await server.confirm(owner,p.id,true);assert.equal(emailCalls,0);assert.equal((await inboxRows(p.id)).filter(n=>n.kind==='push_failure').length,1);assert.ok((await inboxRows(p.id)).find(n=>n.kind==='push_failure').deleted_at);
    assert.deepEqual(await server.preferences(uuid(6)),{sales:true,invoices:true});
  });
  await check('One invalid device retains another active registration; successful recovery can generate a later distinct alert',async()=>{
    const p=await failureSetup(7,[710,711],410);
    response=async sub=>({statusCode:201});
    // Transport mock chooses the endpoint without contacting any provider.
    let seen=0;response=async()=>{if(seen++===0)throw {statusCode:410};return {statusCode:201};};
    await server.confirm(owner,p.id,true);const a=(await alertsFor(p.id))[0];assert.equal(a.failed_count,1);assert.equal(a.remaining_devices,1);
    assert.match((await inboxRows(p.id)).find(n=>n.kind==='push_failure').body,/1 other registered device/);
    const invalid=(await db.query('select * from push_subscriptions where user_id=$1 and not active and endpoint like $2',[uuid(7),'%synthetic-71%'])).rows[0];
    await server.registerSubscription(uuid(7),{endpoint:invalid.endpoint,keys:{p256dh:invalid.p256dh,auth:invalid.auth}});
    assert.equal((await db.query("select count(*)::int n from push_subscription_events where subscription_id=$1 and kind='recovered'",[invalid.id])).rows[0].n,1);
    const again=await server.preview(owner,{category:'sales',title:'New fixture',body:'Later failure',recipient:{mode:'customer',customerId:uuid(7)}});response=async()=>{throw {statusCode:410};};await server.confirm(owner,again.id,true);assert.equal((await alertsFor(again.id)).length,1);assert.notEqual((await alertsFor(again.id))[0].id,a.id);
  });
  await check('Deleted failure warning stays deleted when a later device failure joins the same send',async()=>{
    const p=await failureSetup(6,[612,613],410);
    const subscriptions=(await db.query('select id from push_subscriptions where user_id=$1 and active',[uuid(6)])).rows.map(s=>s.id);
    await client.rpc('push_confirm_inbox',{p_send:p.id,p_actor:owner.id,p_recipients:[{userId:uuid(6),subscriptionIds:subscriptions,cycleIds:[]}]});
    const first=(await client.rpc('push_claim',{p_send:p.id})).data[0];await db.query("update push_deliveries set status='expired',http_status=410 where id=$1",[first.id]);
    const warning=(await inboxRows(p.id)).find(n=>n.kind==='push_failure');await inbox.deleteInboxNotification(customerActor(6),warning.id);
    const second=(await client.rpc('push_claim',{p_send:p.id})).data[0];await db.query("update push_deliveries set status='expired',http_status=410 where id=$1",[second.id]);
    assert.ok((await inboxRows(p.id)).find(n=>n.id===warning.id).deleted_at);assert.equal((await alertsFor(p.id))[0].failed_count,2);
    await db.query("update push_deliveries set status='sending' where id=$1",[first.id]);await db.query("update push_deliveries set status='expired' where id=$1",[first.id]);assert.equal((await alertsFor(p.id))[0].failed_count,2);
  });
  await check('401/403 are grouped system alerts, not customer opt-outs; 503/network failures preserve enrollment',async()=>{
    const p=await failureSetup(6,[614,615],401);await server.confirm(owner,p.id,true);const a=await alertsFor(p.id);assert.equal(a.length,1);assert.equal(a[0].kind,'configuration');assert.equal(a[0].failed_count,2);assert.equal((await inboxRows(p.id)).filter(n=>n.kind==='push_failure').length,0);
    assert.equal((await db.query('select count(*)::int n from push_subscriptions where user_id=$1 and active',[uuid(6)])).rows[0].n,2);
    for(const code of [403,503,undefined]){const next=await failureSetup(6,[616],code);const result=await server.confirm(owner,next.id,true);assert.equal((await alertsFor(next.id)).length,code===403?1:0);assert.equal((await db.query('select active from push_subscriptions where endpoint=$1',['https://fcm.googleapis.com/fcm/send/synthetic-616'])).rows[0].active,true);if(code===503)assert.equal(result.counts.retry,1);if(code===undefined)assert.equal(result.counts.unknown,1);}
  });
  await check('Push failures never depend on SMTP or create email delivery state',async()=>{
    assert.equal(emailCalls,0);
    assert.equal((await db.query("select count(*)::int n from information_schema.columns where table_name='push_failure_alerts' and column_name like 'email_%'")).rows[0].n,0);
    assert.equal((await db.query("select count(*)::int n from pg_proc where proname='push_claim_failure_emails'")).rows[0].n,0);
    assert.ok(!read('apps/web/lib/push/server.ts').includes('flushFailureEmails'));
  });
  await check('Alert records and trigger execution are inaccessible to browser roles; recovery links stay internal',async()=>{
    for(const role of ['anon','authenticated']){for(const table of ['push_failure_alerts','push_subscription_events'])assert.equal((await db.query("select has_table_privilege($1,$2,'select') ok",[role,table])).rows[0].ok,false);assert.equal((await db.query("select has_function_privilege($1,'push_record_failure()','execute') ok",[role])).rows[0].ok,false);}
    assert.ok(read('apps/web/components/push/inbox-list.tsx').includes('/account#phone-notification-status'));
  });
  await db.close();
  console.log(`\n${checks} push checks passed; no network or real notifications.`);
})().catch(error=>{console.error(error);process.exitCode=1;});

