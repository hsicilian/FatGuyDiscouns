// Read-only local mocks: no browser, authentication network or database calls.
const fs=require('fs'),path=require('path'),vm=require('vm'),ts=require('typescript'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const appRequire=require('module').createRequire(path.join(root,'apps/web/package.json'));
function load(file,mocks){const exports={};const code=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(code,{exports,require:n=>{if(n==='react/jsx-runtime')return appRequire(n);if(n in mocks)return mocks[n];throw Error(n);}});return exports;}
const redirect=url=>{throw Error('REDIRECT '+url);};
function nodes(t){if(!t||typeof t!=='object')return [];return [t,...[t.props?.children].flat(Infinity).flatMap(nodes)];}
(async()=>{
 const core=load('packages/core/src/auth/guards.ts',{});let user=null,reads=0;
 const page=load('apps/web/app/account/notifications/page.tsx',{
  'next/navigation':{redirect},'../../../lib/auth/session':{getCurrentSessionUser:async()=>user},
  '../../../lib/auth/guards':{ensureCustomerAccess:async()=>{const r=core.requireCustomerSession(user);if(!r.allowed)redirect(r.redirectTo);}},
  '../../../lib/push/inbox':{listInbox:async actor=>{assert.equal(actor.role,'customer');reads++;return [];}},
  '../../../components/push/inbox-list':{InboxList:()=>null}
 }).default;
 await assert.rejects(page({}),/REDIRECT \/login\?redirectTo=%2Faccount%2Fnotifications/);assert.equal(reads,0);
 for(const role of ['master_admin','admin']){user={role,accountState:'approved'};await assert.rejects(page({}),/REDIRECT \/admin\/notifications/);assert.ok(core.requireAdminSession(user).allowed);assert.equal(reads,0);}
 for(const role of ['customer','master_admin','admin']){user={role,accountState:'banned'};await assert.rejects(page({}),/REDIRECT/);assert.equal(reads,0);}
 user={role:'customer',accountState:'approved'};await page({});assert.equal(reads,1);assert.equal(core.requireAdminSession(user).allowed,false);
 const LoginForm=()=>null;
 const login=load('apps/web/app/login/page.tsx',{
  '../../components/forms/login-form':{LoginForm},'../../components/forms/resend-confirmation-form':{ResendConfirmationForm:()=>null},
  '../../components/forms/sign-out-form':{SignOutForm:()=>null},'../../lib/auth/session':{getCurrentSessionAccount:async()=>user}
 }).default;
 user=null;
 for(const target of ['/account/notifications',undefined,'https://evil.test','//evil.test','/\\evil.test','/admin/notifications','/account/notifications?next=https://evil.test',['/account/notifications']]){
  const tree=await login({searchParams:Promise.resolve({redirectTo:target})});
  assert.equal(nodes(tree).find(n=>n.type===LoginForm).props.redirectTo,target==='/account/notifications'?target:'/account');
 }
 for(const role of ['customer','master_admin']){user={role};const tree=await login({searchParams:Promise.resolve({redirectTo:'/account/notifications'})});assert.ok(nodes(tree).some(n=>n.type==='a'&&n.props.href===(role==='customer'?'/account/notifications':'/admin/notifications')));}
 console.log('PASS Notification route/login handoff, Owner/admin inbox access, customer isolation, banned/anonymous denial, exact destination allowlist and already-signed-in links.');
})().catch(e=>{console.error(e);process.exitCode=1;});
