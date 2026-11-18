// Isolated PostgreSQL tests. No network, credentials, or production data are used.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { PGlite } = require('@electric-sql/pglite');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const moduleCache = new Map();
function load(file, mocks = {}) {
  if (moduleCache.has(file)) return moduleCache.get(file);
  const exports = {};
  moduleCache.set(file, exports);
  const code = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, Date, Intl, console, require(name) {
    if (name in mocks) return mocks[name];
    if (name === 'server-only') return {};
    if (name.startsWith('.')) {
      const base = path.posix.join(path.posix.dirname(file), name);
      if (file.startsWith('packages/core/')) return load(fs.existsSync(path.join(root, base + '.ts')) ? base + '.ts' : base + '/index.ts', mocks);
    }
    return {};
  } }, { filename: file });
  return exports;
}
const core = load('packages/core/src/index.ts');
const dates = load('apps/web/lib/date-format.ts');
const helpers = load('apps/web/lib/data/supabase-helpers.ts', { '@fatguydiscounts/core': core, '../date-format': dates });
const migration = read('supabase/migrations/0025_weekly_sunday_billing.sql');
const checks = [];
async function check(name, fn) { await fn(); checks.push(name); console.log('PASS', name); }

(async () => {
  await check('Saturday, Sunday, Monday, year boundary and dates before the old anchor', () => {
    for (const [input, due, next] of [
      ['2026-10-03', '2026-10-04', '2026-10-04'],
      ['2026-10-04', '2026-10-04', '2026-10-11'],
      ['2026-10-05', '2026-10-11', '2026-10-11'],
      ['2025-12-31', '2026-01-04', '2026-01-04'],
      ['2026-03-01', '2026-03-01', '2026-03-08'],
    ]) {
      assert.equal(core.getScheduledDueDateForDate(input), due);
      assert.equal(core.getNextScheduledDueDate(input), next);
    }
  });
  await check('Eastern midnight boundaries and both daylight-saving transitions', () => {
    for (const [instant, day] of [
      ['2026-10-04T03:59:59Z', '2026-10-03'], ['2026-10-04T04:00:00Z', '2026-10-04'],
      ['2026-10-05T03:59:59Z', '2026-10-04'], ['2026-10-05T04:00:00Z', '2026-10-05'],
      ['2026-03-08T04:59:59Z', '2026-03-07'], ['2026-03-08T05:00:00Z', '2026-03-08'],
      ['2026-11-01T04:00:00Z', '2026-11-01'], ['2026-11-02T04:59:59Z', '2026-11-01'],
      ['2026-11-02T05:00:00Z', '2026-11-02'],
    ]) assert.equal(dates.getEasternDateInputValue(new Date(instant)), day);
  });
  const cycle = (dueDate, subtotal, paymentsApplied = 0, creditsApplied = 0) => ({ id: dueDate, status: 'active', dueDate, subtotal, shipping: 0, adjustments: 0, paymentsApplied, creditsApplied });
  await check('Shared customer/CRM summaries preserve overdue, partial payments and credits', () => {
    const rows = [cycle('2026-10-04', 100, 20, 10), cycle('2026-10-11', 40)];
    const summary = helpers.getOpenBalanceSummaryFromSummaries(rows, '2026-10-05');
    assert.equal(summary.totalAmount, 110);
    assert.equal(summary.overdueAmount, 70);
    assert.equal(summary.currentAmount, 40);
    assert.equal(summary.displayDueDate, '2026-10-04');
    assert.equal(summary.currentDueDate, '2026-10-11');
    assert.equal(summary.nextRegularDueDate, '2026-10-11');
    assert.equal(helpers.getOpenBalanceSummaryFromSummaries(rows, '2026-10-04').overdueAmount, 0);
    assert.equal(helpers.getOpenBalanceSummaryFromSummaries([cycle('2026-10-04', 100, 90, 10)], '2026-10-05').totalAmount, 0);
    assert.equal(helpers.buildOpenBalanceCycleSummary([], '2026-12-01').dueDate, '2026-12-06');
    assert.equal(helpers.mapBalanceCycle({ id: 'missing-date', status: 'active', created_at: '2026-10-05T02:00:00Z' }, 10).dueDate, '2026-10-04');
  });
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
    set timezone = 'Pacific/Auckland';
    create schema auth; create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.user_id', true), '')::uuid $$;`);
  for (const file of ['0002_schema_blueprint.sql', '0004_public_launch.sql', '0010_product_sales.sql', '0023_archived_invoice_shipping_totals.sql', '0024_payment_allocation_fields.sql']) {
    await db.exec(read('supabase/migrations/' + file).replace(/create extension if not exists "pgcrypto";/g, ''));
  }
  const customer = '11111111-1111-4111-8111-111111111111';
  const product = '22222222-2222-4222-8222-222222222222';
  await db.query('insert into auth.users (id,email) values ($1, $2)', [customer, 'billing-test@example.invalid']);
  await db.query("update user_roles set account_state='approved' where user_id=$1", [customer]);
  await db.query("insert into products (id,title,price,inventory_quantity,status) values ($1,'Test item',25,100,'active')", [product]);
  const [{today}] = (await db.query("select (now() at time zone 'America/New_York')::date::text as today")).rows;
  const sunday = core.getScheduledDueDateForDate(today);
  async function addCycle(date, status = 'active') {
    return (await db.query('insert into balance_cycles (customer_id,status,due_date,shipping_total,adjustments_total,payments_applied,credits_applied) values ($1,$2,$3,5,2,10,3) returning id', [customer,status,date])).rows[0].id;
  }
  const overdueId = await addCycle('2020-01-05');
  const futureId = await addCycle('2099-01-11');
  const archivedId = await addCycle('2099-01-11', 'archived');
  const historicalId = await addCycle('2099-01-11');
  await db.query("insert into archived_invoices (cycle_id,customer_id,cycle_label,paid_at,total) values ($1,$3,'Historical','2020-01-01',25),($2,$3,'Historical active link','2020-01-01',25)", [archivedId,historicalId,customer]);
  await db.query("insert into balance_line_items(cycle_id,product_id,item_type,description,quantity,unit_price) values ($1,$2,'claim','Existing claim',2,25)", [futureId,product]);
  await db.query('insert into payments(cycle_id,amount,applied_amount) values ($1,10,10)', [futureId]);
  await db.query("insert into credits(customer_id,amount,reason) values ($1,3,'Existing credit')", [customer]);
  await db.query("insert into shipments(cycle_id,customer_id,status) values ($1,$2,'requested')", [futureId,customer]);
  const tables = ['balance_line_items','payments','credits','archived_invoices','shipments','customer_profiles'];
  const snapshot = async () => Promise.all(tables.map(async t => (await db.query(`select * from ${t} order by 1`)).rows));
  const before = await snapshot();
  const financialBefore = (await db.query('select id,status,shipping_total,adjustments_total,payments_applied,credits_applied from balance_cycles order by id')).rows;
  await check('Migration preserves financial records, invoices, claims and shipment links', async () => {
    await db.exec(migration);
    assert.deepEqual(await snapshot(), before);
    assert.deepEqual((await db.query('select id,status,shipping_total,adjustments_total,payments_applied,credits_applied from balance_cycles order by id')).rows, financialBefore);
    const due = async id => (await db.query('select due_date::text as due from balance_cycles where id=$1',[id])).rows[0].due;
    assert.equal(await due(overdueId), '2020-01-05');
    assert.equal(await due(futureId), sunday);
    assert.equal(await due(archivedId), '2099-01-11');
    assert.equal(await due(historicalId), '2099-01-11');
  });
  await check('SQL and app calendar calculations agree across a full year', async () => {
    const rows = (await db.query("select d::date::text as day, weekly_billing_due_date(d::date)::text as due from generate_series('2026-01-01'::date, '2026-12-31'::date, interval '1 day') d")).rows;
    for (const row of rows) assert.equal(core.getScheduledDueDateForDate(row.day), row.due);
  });
  await check('Both claim RPCs reuse current weekly cycle without moving overdue balances', async () => {
    await db.query("select set_config('test.user_id',$1,false)",[customer]);
    const a = (await db.query('select admin_claim_product($1,$2,1) as result',[customer,product])).rows[0].result;
    const b = (await db.query('select app_claim_product($1,1) as result',[product])).rows[0].result;
    assert.equal(a.cycle_id, futureId); assert.equal(b.cycle_id, futureId);
    assert.equal((await db.query('select count(*)::int as n from balance_cycles')).rows[0].n, 4);
    assert.equal((await db.query('select inventory_quantity from products where id=$1',[product])).rows[0].inventory_quantity, 98);
  });

  // Minimal PostgREST transport for executing the actual application payment path
  // against local PostgreSQL. Session/profile lookup is supplied as a test fixture.
  class Query {
    constructor(table) { this.table=table; this.filters=[]; this.orders=[]; this.mode='select'; }
    select() { return this; }
    eq(key,value) { this.filters.push([key,value]); return this; }
    order(key,opts={}) { this.orders.push(`${key} ${opts.ascending===false?'desc':'asc'}`); return this; }
    update(row) { this.mode='update'; this.row=row; return this; }
    insert(row) { this.mode='insert'; this.row=row; return this; }
    upsert(row,opts) { this.mode='insert'; this.row=row; this.conflict=opts.onConflict; return this; }
    single() { this.one=true; return this; }
    async then(resolve,reject) {
      try {
        const params=[]; const bind=v=>{params.push(v); return '$'+params.length;};
        let sql;
        if(this.mode==='insert') {
          const keys=Object.keys(this.row);
          sql=`insert into ${this.table} (${keys.join(',')}) values (${keys.map(k=>bind(this.row[k])).join(',')})`;
          if(this.conflict) sql+=` on conflict (${this.conflict}) do update set `+keys.filter(k=>k!==this.conflict).map(k=>`${k}=excluded.${k}`).join(',');
        } else {
          sql=this.mode==='update'?`update ${this.table} set `+Object.entries(this.row).map(([k,v])=>`${k}=${bind(v)}`).join(','):`select * from ${this.table}`;
          if(this.filters.length) sql+=' where '+this.filters.map(([k,v])=>`${k}=${bind(v)}`).join(' and ');
          if(this.orders.length && this.mode==='select') sql+=' order by '+this.orders.join(',');
        }
        if(this.mode!=='select') sql+=' returning *';
        const result=await db.query(sql,params);
        // PostgREST sends dates as strings; PGlite exposes PostgreSQL dates as Date.
        const rows=result.rows.map(row=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k,v instanceof Date?(k==='due_date'||k==='paid_at'?v.toISOString().slice(0,10):v.toISOString()):v])));
        return resolve({data:this.one?rows[0]:rows,error:null});
      } catch(error) { return resolve({data:null,error}); }
    }
  }
  const admin={from:t=>new Query(t)};
  const customerSummary=async()=>({id:customer,creditBalance:Number((await db.query('select credit_balance from customer_profiles where user_id=$1',[customer])).rows[0].credit_balance)});
  const paymentHelpers={...helpers,getAdminClient:async()=>admin,getCustomerSummaryByUserId:customerSummary,
    getCycleSubtotal:async id=>Number((await db.query('select coalesce(sum(quantity*unit_price),0) as total from balance_line_items where cycle_id=$1',[id])).rows[0].total)};
  const writes=load('apps/web/lib/data/supabase-writes.ts',{'@fatguydiscounts/core':core,'./supabase-helpers':paymentHelpers});
  await check('Actual admin partial payment and credit application retain balance and claims', async()=>{
    await db.query('update customer_profiles set credit_balance=15 where user_id=$1',[customer]);
    const result=await writes.applyPaymentToDatabaseSupabase(20,5,undefined,customer);
    assert.equal(result.ok,true,result.message);
    const summary=helpers.mapBalanceCycle((await db.query('select * from balance_cycles where id=$1',[futureId])).rows[0],100);
    assert.equal(core.calculateBalanceDue(summary),69);
    assert.equal(summary.status,'active');
    assert.equal((await customerSummary()).creditBalance,10);
    assert.equal((await db.query("select count(*)::int as n from balance_line_items where cycle_id=$1 and status!='archived'",[futureId])).rows[0].n,3);
  });
  await check('Actual full payment archives invoice but preserves claims awaiting shipment',async()=>{
    const result=await writes.applyPaymentToDatabaseSupabase(69,0,undefined,customer);
    assert.equal(result.ok,true,result.message);
    assert.equal((await db.query('select status from balance_cycles where id=$1',[futureId])).rows[0].status,'archived');
    assert.equal((await db.query('select count(*)::int as n from archived_invoices where cycle_id=$1',[futureId])).rows[0].n,1);
    assert.equal((await db.query("select count(*)::int as n from balance_line_items where cycle_id=$1 and status!='archived'",[futureId])).rows[0].n,3);
    assert.equal((await db.query('select status from shipments where cycle_id=$1',[futureId])).rows[0].status,'requested');
    const claimed=(await db.query('select admin_claim_product($1,$2,1) as result',[customer,product])).rows[0].result;
    assert.notEqual(claimed.cycle_id,futureId);
    assert.equal((await db.query('select due_date::text as due from balance_cycles where id=$1',[claimed.cycle_id])).rows[0].due,sunday);
  });
  await check('Cycle helper is unavailable to untrusted direct callers',async()=>{
    const rows=(await db.query("select has_function_privilege('authenticated','public.ensure_weekly_balance_cycle(uuid,date)','execute') as customer, has_function_privilege('service_role','public.ensure_weekly_balance_cycle(uuid,date)','execute') as service")).rows;
    assert.equal(rows[0].customer,false); assert.equal(rows[0].service,true);
  });
  await check('Admin payments pay overdue first and never postpone its due date',async()=>{
    await db.query("insert into balance_line_items(cycle_id,item_type,description,quantity,unit_price) values ($1,'claim','Past due item',1,106)",[overdueId]);
    // The fixture has 7 in charges, 3 credits and no payment rows: actual due is 110.
    await db.query('update balance_cycles set payments_applied=0 where id=$1',[overdueId]);
    const result=await writes.applyPaymentToDatabaseSupabase(30,0,undefined,customer);
    assert.equal(result.ok,true,result.message);
    const overdue=(await db.query('select *,due_date::text as due from balance_cycles where id=$1',[overdueId])).rows[0];
    assert.equal(overdue.due,'2020-01-05');
    assert.equal(Number(overdue.payments_applied),30);
    assert.equal(overdue.status,'active');
    const summaries=(await db.query("select bc.*,bc.due_date::text as due_date,coalesce((select sum(quantity*unit_price) from balance_line_items where cycle_id=bc.id),0) as subtotal from balance_cycles bc where status='active'")).rows.map(r=>helpers.mapBalanceCycle(r,Number(r.subtotal)));
    const view=helpers.getOpenBalanceSummaryFromSummaries(summaries,today);
    assert.equal(view.overdueAmount,80);
    assert.equal(view.currentAmount,25);
    assert.equal(view.displayDueDate,'2020-01-05');
  });
  await check('Repeated weekly cycle requests reuse one row; Sunday and Monday select separate weeks',async()=>{
    const get=async day=>(await db.query('select id,due_date::text as due from ensure_weekly_balance_cycle($1,$2)',[customer,day])).rows[0];
    const saturday=await get('2027-02-06');
    const sundayCycle=await get('2027-02-07');
    const monday=await get('2027-02-08');
    assert.equal(saturday.id,sundayCycle.id);
    assert.equal(sundayCycle.due,'2027-02-07');
    assert.equal(monday.due,'2027-02-14');
    assert.notEqual(monday.id,sundayCycle.id);
  });
  await db.close();
  console.log(`${checks.length} billing checks passed.`);
})().catch(error=>{console.error(error);process.exit(1);});
