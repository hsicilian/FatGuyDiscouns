// Local mocks only: no Auth, database, browser or push network requests.
const fs = require('fs'), vm = require('vm'), ts = require('typescript'), assert = require('assert/strict');
const path = require('path');
const root = path.resolve(__dirname, '..');
function load(file, mocks) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, URL, Date, process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://example.test', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test', PUSH_ENABLED: 'true' } }, require: name => {
    if (name in mocks) return mocks[name];
    throw Error('Unexpected dependency: ' + name);
  } });
  return exports;
}
(async () => {
  let refresh = false, invalid = false, writes = 0;
  const requestValues = new Map([['session', 'old']]);
  const request = { headers: new Headers(), cookies: { getAll: () => [...requestValues].map(([name,value]) => ({name,value})), set: (name,value) => requestValues.set(name,value) } };
  const lib = load('apps/web/lib/supabase.ts', {
    '@supabase/ssr': { createServerClient: (_,__,options) => ({ auth: { getUser: async () => {
      if (refresh) { writes++; options.cookies.setAll([{name:'session',value:'rotated',options:{httpOnly:true}}]); }
      return {data:{user:invalid?null:{id:'customer'}}};
    } } }) },
    '@supabase/supabase-js': {}, 'next/headers': {},
    'next/server': { NextResponse: { next: () => { const values = new Map(); return { values, cookies: {set:(name,value)=>values.set(name,value)} }; } } }
  });
  const normal = await lib.updateSupabaseSession(request);
  assert.equal(writes,0);assert.equal(normal.values.size,0);
  refresh=true;const renewed=await lib.updateSupabaseSession(request);
  assert.equal(requestValues.get('session'),'rotated');assert.equal(renewed.values.get('session'),'rotated');
  refresh=false;invalid=true;await lib.updateSupabaseSession(request);assert.equal(writes,1);
  const middleware=load('apps/web/middleware.ts',{'next/server':{},'./lib/supabase':{}});
  const matcher=new RegExp('^'+middleware.config.matcher[0]+'$');
  for(const url of ['/','/store','/store/item','/events','/account','/admin/push','/api/push','/login']) assert.ok(matcher.test(url),url);
  for(const url of ['/sw.js','/manifest.webmanifest','/_next/static/chunk.js','/logo.png']) assert.ok(!matcher.test(url),url);
  console.log('PASS Normal session, refresh request/response cookies, expired session, all authenticated-layout routes, static exclusions.');

  let authResult={data:{user:null},error:null};
  const session=load('apps/web/lib/auth/session.ts',{'next/headers':{},'../supabase':{
    assertProductionSupabaseReady(){},hasSupabaseEnv:()=>true,
    createServerSupabaseClient:async()=>({auth:{getUser:async()=>authResult}}),
    createSupabaseAdminClient:()=>({from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{role:'customer',account_state:'approved',display_name:'Test'}})})})})})
  }});
  assert.equal(await session.getCurrentSessionAccount(),null);
  authResult={data:{user:{id:'customer',email:'test@example.test',user_metadata:{}}},error:null};
  assert.equal((await session.getCurrentSessionAccount()).id,'customer');
  authResult={data:{user:null},error:{name:'AuthRetryableFetchError',status:503}};
  await assert.rejects(session.getCurrentSessionAccount(),/temporarily unavailable/);
  authResult={data:{user:null},error:{name:'AuthSessionMissingError',status:400}};
  assert.equal(await session.getCurrentSessionAccount(),null);
  console.log('PASS Verified signed-in user, absent session, and transient Auth failure distinguished from sign-out.');

  let reconciled,signoutScope,fail=false,role="customer",destination;
  const login=load('apps/web/app/actions/session/login.ts',{
    'zod':require('zod'),'next/headers':{cookies:async()=>({get:()=>({value:'previous-device'})})},
    'next/navigation':{redirect:url=>{destination=url;throw Error('redirect');}},
    '../../../lib/push/server':{reconcileDevice:async(...args)=>{reconciled=args;if(fail)throw Error('unavailable');}},
    '../../../lib/supabase':{assertProductionSupabaseReady(){},normalizeInternalRedirect:x=>x,createServerSupabaseClient:async()=>({
      auth:{signInWithPassword:async()=>({error:null}),getUser:async()=>({data:{user:{id:'new-customer'}}}),signOut:async options=>{signoutScope=options.scope;}},
      from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{role}})})})})
    })}
  });
  const form=new FormData();form.set('email','test@example.test');form.set('password','local-test');form.set('redirectTo','/account');
  await assert.rejects(login.loginWithLocalAccountAction({},form),/redirect/);
  assert.equal(reconciled[0],'new-customer');assert.equal(reconciled[2],'previous-device');
  for (const selectedRole of ['customer','master_admin','admin']) {
    role=selectedRole;form.set('redirectTo','/account/notifications');
    await assert.rejects(login.loginWithLocalAccountAction({},form),/redirect/);
    assert.equal(destination,role==='customer'?'/account/notifications':'/admin/notifications');
    form.set('redirectTo','/account');await assert.rejects(login.loginWithLocalAccountAction({},form),/redirect/);
    assert.equal(destination,role==='master_admin'?'/admin/reports':role==='admin'?'/admin':'/account');
  }
  console.log('PASS Notification login destination is customer inbox or authorized admin inbox; ordinary login defaults unchanged.');
  fail=true;assert.equal((await login.loginWithLocalAccountAction({},form)).ok,false);assert.equal(signoutScope,'local');
  console.log('PASS Login reconciles the installation before redirect and fails safely on switch-check failure.');
})().catch(error=>{console.error(error);process.exitCode=1;});
