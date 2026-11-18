// Local mocks only. No production access, sends, or record writes.
const fs=require('fs'),path=require('path'),vm=require('vm'),ts=require('typescript'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),appRequire=require('module').createRequire(path.join(root,'apps/web/package.json'));
function load(file,mocks={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,Date,require:n=>{if(n==='react/jsx-runtime')return appRequire(n);if(n in mocks)return mocks[n];throw Error(n);}});return exports;}
const model=load('apps/web/lib/push/subscriber-summary.ts');
const now=Date.parse('2026-10-26T12:00:00Z');
const roles=Array.from({length:8},(_,i)=>({user_id:String(i),role:i===7?'master_admin':'customer',account_state:i===6?'banned':'approved'}));
const profiles=roles.map(r=>({user_id:r.user_id,display_name:r.user_id==='0'||r.user_id==='1'?'Same Name':'Customer '+r.user_id}));
const prefs=roles.map(r=>({user_id:r.user_id,sales:r.user_id!=='2'&&r.user_id!=='5',invoices:r.user_id!=='1'&&r.user_id!=='5'}));
const subs=roles.map(r=>({id:'device-'+r.user_id,user_id:r.user_id,active:r.user_id!=='4',expires_at:r.user_id==='3'?new Date(now).toISOString():null}));
subs.push({id:'second',user_id:'0',active:true,expires_at:new Date(now+10000).toISOString()});subs.push(subs[0]);
const summary=model.summarizeSubscribers([...roles,roles[0]],profiles,prefs,subs,now);
assert.equal(summary.total,4);assert.equal(summary.sales,2);assert.equal(summary.invoices,2);assert.equal(summary.recovery,2);
assert.equal(summary.rows.length,7);assert.equal(summary.rows.find(r=>r.id==='0').activeDevices,2);
assert.equal(summary.rows.find(r=>r.id==='3').activeDevices,0);assert.equal(summary.rows.find(r=>r.id==='4').activeDevices,0);
assert.equal(summary.rows.filter(r=>model.matchesSubscriberFilter(r,'sales')).length,2);
assert.equal(summary.rows.filter(r=>model.matchesSubscriberFilter(r,'invoices')).length,2);
assert.equal(summary.rows.filter(r=>model.matchesSubscriberFilter(r,'recovery')).length,2);
assert.ok(model.subscriberStatus(summary.rows.find(r=>r.id==='5')).includes('categories disabled'));
assert.ok(model.subscriberStatus(summary.rows.find(r=>r.id==='6')).includes('banned'));
assert.equal(model.summarizeSubscribers(roles,profiles,[],subs,now).total,0);
assert.equal(model.summarizeSubscribers(roles,profiles,prefs,[{id:'bad',user_id:'0',active:true,expires_at:'invalid'}],now).rows.find(r=>r.id==='0').activeDevices,0);
console.log('PASS Unique customers/devices, same-name accounts, both/one/neither preferences, expired/inactive/invalid registrations, recovery and banned-account eligibility.');

(async()=>{
 let actor={role:'master_admin',accountState:'approved'},reads=0,broken=false;
 const rows={user_roles:roles,customer_profiles:profiles,push_preferences:prefs,push_subscriptions:Array.from({length:501},(_,i)=>({id:String(i),user_id:'0',active:true,expires_at:null}))};
 const requests=[];
 const db={from:table=>{
   let selection,filter;
   const q={select:c=>{selection=c;return q;},order:()=>q,eq:(key,id)=>{filter=id;return q;},range:(start,end)=>{
     reads++;requests.push({table,selection,start,end,filter});
     return Promise.resolve({data:rows[table].filter(r=>!filter||r.user_id===filter).slice(start,end+1),error:broken?{}:null});
   }};return q;
 }};
 const policy=load('apps/web/lib/push/policy.ts');
 const read=load('apps/web/lib/push/subscriber-reads.ts',{'server-only':{},'../auth/session':{getCurrentSessionUser:async()=>actor},'../data/supabase-helpers':{getAdminClient:async()=>db},'./policy':policy,'./subscriber-summary':model}).readNotificationSubscribers;
 for(const value of [null,{role:'customer'},{role:'admin'},{role:'master_admin',accountState:'banned'}]){actor=value;await assert.rejects(read(),/Owner access/);assert.equal(reads,0);}
 actor={role:'master_admin',accountState:'approved'};const all=await read();assert.equal(all.rows.find(r=>r.id==='0').activeDevices,501);assert.ok(requests.some(r=>r.start===500));
 assert.ok(requests.every(r=>!/(endpoint|p256dh|auth|\*)/.test(r.selection)));
 requests.length=0;const one=await read('0');assert.equal(one.rows.length,1);assert.ok(requests.every(r=>r.filter==='0'));
 broken=true;await assert.rejects(read(),/unavailable/);
 console.log('PASS Owner-only read access, pagination beyond 500 devices, minimal fields, customer-scoped queries and explicit error handling; no write methods available.');

 const slots=[];let cursor=0;
 const ui=load('apps/web/components/push/crm-subscribers.tsx',{'react':{useState:v=>{const i=cursor++;if(!(i in slots))slots[i]=v;return [slots[i],v=>slots[i]=v];}},'../../lib/push/subscriber-summary':model});
 function render(){cursor=0;return ui.CrmSubscribers({summary});}
 function nodes(t){if(!t||typeof t!=='object')return [];if(typeof t.type==='function')return nodes(t.type(t.props));return [t,...[t.props?.children].flat(Infinity).flatMap(nodes)];}
 function text(t){if(t==null||typeof t==='boolean')return '';if(typeof t!=='object')return String(t);if(typeof t.type==='function')return text(t.type(t.props));return [t.props?.children].flat(Infinity).map(text).join('');}
 function choose(filter){nodes(render()).find(n=>n.type==='select').props.onChange({target:{value:filter}});}
 assert.equal(nodes(render()).find(n=>n.type==='details').props.open,false);
 nodes(render()).find(n=>n.type==='button'&&text(n).includes('Sale announcement')).props.onClick();
 assert.equal(nodes(render()).find(n=>n.type==='details').props.open,true);assert.equal(nodes(render()).filter(n=>n.type==='article').length,2);
 choose('invoices');assert.equal(nodes(render()).filter(n=>n.type==='article').length,2);
 choose('recovery');assert.equal(nodes(render()).filter(n=>n.type==='article').length,2);assert.ok(text(render()).includes('Needs recovery'));
 choose('all');assert.equal(nodes(render()).filter(n=>n.type==='article').length,7);assert.ok(nodes(render()).some(n=>n.props?.href==='/admin/customers/0'));
 assert.ok(text(ui.CustomerPhoneStatus({row:summary.rows.find(r=>r.id==='0')})).includes('Active registered devices: 2'));
 const panel=load('apps/web/components/push/crm-subscriber-panel.tsx',{'../../lib/auth/session':{getCurrentSessionUser:async()=>actor},'../../lib/push/policy':policy,'../../lib/push/subscriber-reads':{readNotificationSubscribers:read},'./crm-subscribers':ui});
 const error=await panel.CrmSubscriberPanel({});assert.ok(text(error).includes('unavailable'));assert.ok(!text(error).includes('subscribers: 0'));
 actor={role:'admin'};assert.equal(await panel.CrmSubscriberPanel({}),null);
 console.log('PASS CRM summary expansion, all/category/recovery filters, profile links, per-account status, read-error display and non-Owner hiding.');
})().catch(e=>{console.error(e);process.exitCode=1;});
