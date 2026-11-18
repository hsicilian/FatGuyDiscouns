const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
const appRequire=require('node:module').createRequire(path.join(root,'apps/web/package.json'));
const jsx=appRequire('react/jsx-runtime');
const code=ts.transpileModule(fs.readFileSync(path.join(root,'apps/web/components/push/notification-settings.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const flush=async()=>{for(let i=0;i<12;i++)await new Promise(r=>setImmediate(r));};
function harness(options={}) {
 const persisted=options.persisted??{sales:false,invoices:false};
 let subscribed=!!options.active,serverActive=options.serverActive??!!options.active,permission=options.permission??'default',permissionCalls=0;
 const calls=[],slots=[],effects=[];let cursor=0,first=true;
 const sub={endpoint:'https://fcm.googleapis.com/test',toJSON:()=>({endpoint:'https://fcm.googleapis.com/test'}),unsubscribe:async()=>{subscribed=false;return true;}};
 const registration={pushManager:{getSubscription:async()=>subscribed?sub:null,subscribe:async()=>{subscribed=true;return sub;}}};
 const notification={get permission(){return permission;},requestPermission:async()=>{permissionCalls++;permission=options.result??'granted';return permission;}};
 const exports={};
 vm.runInNewContext(code,{document:{getElementById:()=>({})},exports,Uint8Array,atob,Notification:notification,navigator:options.unsupported?{userAgent:""}:{userAgent:options.ios?"iPhone":"Android",standalone:!!options.standalone,serviceWorker:{register:async()=>registration,ready:Promise.resolve(registration)}},window:options.unsupported?{}:{PushManager:{},Notification:notification},fetch:async(_,init)=>{
  if(!init?.method)return {ok:true,json:async()=>({enabled:true,userId:'test',publicKey:'AQ',preferences:{...persisted}})};
  const input=JSON.parse(init.body);calls.push(input);
  if(options.failSave&&input.op==='preferences')return {ok:false,json:async()=>({error:'Could not save preferences.'})};
  if(options.failRegister&&input.op==='subscribe')return {ok:false,json:async()=>({error:'Registration failed. Try again.'})};
  if(input.op==='preferences')Object.assign(persisted,{sales:input.sales,invoices:input.invoices});
  if(input.op==='subscribe')serverActive=true;
  if(input.op==='unsubscribe')serverActive=false;
  return {ok:true,json:async()=>input.op==='device'||input.op==='reconcile'?{active:serverActive,restore:!!options.restore}:{ok:true}};
 },require(name){if(name==='react')return {useRef(value){const i=cursor++;if(!(i in slots))slots[i]={current:value};return slots[i];},useState(value){const i=cursor++;if(!(i in slots))slots[i]=value;return [slots[i],v=>slots[i]=v];},useEffect(fn){if(first)effects.push(fn);}};if(name==='react-dom')return {createPortal:child=>child};if(name==='react/jsx-runtime')return jsx;if(name==='./browser-account')return {synchronizePushAccount:async()=>{}};throw Error(name);}});
 function render(){cursor=0;const tree=exports.NotificationSettings({collapsible:!!options.collapsible});first=false;return tree;}
 function nodes(tree=render()){if(!tree||typeof tree!=='object')return [];const children=tree.props?.children;return [tree,...[children].flat(Infinity).flatMap(c=>c == null ? [] : nodes(c))];}
 function text(node){if(node==null||typeof node==='boolean')return '';if(typeof node!=='object')return String(node);return [node.props?.children].flat(Infinity).map(text).join('');}
 function button(label){const n=nodes().find(n=>n.type==='button'&&text(n)===label);assert.ok(n,'Missing button '+label);return n;}
 render();
 return {render,nodes,text,button,calls,persisted,get permissionCalls(){return permissionCalls;},async start(){effects.forEach(fn=>fn());await flush();},async click(label){const n=button(label);assert.ok(!n.props.disabled);n.props.onClick();await flush();},async choose(label,checked){nodes().find(n=>n.type==='input'&&n.props['aria-label']===label).props.onChange({target:{checked}});await flush();}};
}
async function checkAdminRecipients() {
 const source=ts.transpileModule(fs.readFileSync(path.join(root,'apps/web/components/push/admin-push.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const slots=[],effects=[],calls=[];let cursor=0,first=true,deviceCount=2;
 const customer={id:'00000000-0000-4000-8000-000000000002',displayName:'Same Name',email:'selected@example.test'};
 const exports={};
 vm.runInNewContext(source,{exports,fetch:async()=>({ok:true,json:async()=>({sends:[],sendingEnabled:true})}),require(name){
  if(name==='react')return {useState(value){const i=cursor++;if(!(i in slots))slots[i]=value;return [slots[i],v=>slots[i]=v];},useEffect(fn){if(first)effects.push(fn);}};
  if(name==='react/jsx-runtime')return jsx;
  if(name==='../../lib/push/policy')return {PAYMENT_REMINDER:{title:'Reminder',body:'Generic reminder',url:'/account'},saleMessage:()=>({})};
  if(name==='./notification-settings')return {NotificationSettings:()=>null,pushRequest:async input=>{
   calls.push(input);
   if(input.op==='searchCustomers')return {customers:[customer,{...customer,id:'00000000-0000-4000-8000-000000000003',email:'other@example.test'}],more:false};
   if(input.op==='preview')return {id:'preview-id',delivery:input.delivery,recipient:input.recipient,customer:input.recipient.mode==='customer'?customer:null,testOnly:input.testOnly,message:{title:'Sale',body:'Tonight',url:''},inAppCustomers:1,customers:input.delivery==='in_app_only'?0:deviceCount?1:0,devices:input.delivery==='in_app_only'?0:deviceCount};
   throw Error('No send operation permitted in this UI test');
  }};
  throw Error(name);
 }});
 function render(){cursor=0;const tree=exports.AdminPush();first=false;return tree;}
 function nodes(tree=render()){if(!tree||typeof tree!=='object')return [];return [tree,...[tree.props?.children].flat(Infinity).flatMap(c=>c == null ? [] : nodes(c))];}
 function text(n){return n==null||typeof n==='boolean'?'':typeof n!=='object'?String(n):[n.props?.children].flat(Infinity).map(text).join('');}
 function button(label){return nodes().find(n=>n.type==='button'&&text(n)===label);}
 async function click(label){const b=button(label);assert.ok(b&&!b.props.disabled,label);b.props.onClick();await flush();}
 async function change(label,value){const l=nodes().find(n=>n.type==='label'&&text(n).startsWith(label));const field=nodes(l).find(n=>['input','select'].includes(n.type));field.props.onChange({target:{value}});await flush();}
 render();effects.forEach(fn=>fn());await flush();
 assert.ok(!nodes().some(n=>n.type==='section'&&n.props['aria-label']==='Owner test device'));
 assert.ok(!text(render()).includes('Owner test device'));assert.ok(!text(render()).includes('Enable notifications'));
 assert.ok(!fs.readFileSync(path.join(root,'apps/web/components/push/admin-push.tsx'),'utf8').includes('<NotificationSettings'));
 assert.ok(!fs.readFileSync(path.join(root,'apps/web/components/push/notification-settings.tsx'),'utf8').includes('Owner test device'));
 assert.ok(text(nodes().find(n=>n.type==='section')).startsWith('Send customer notifications'));
 assert.equal(nodes().find(n=>n.type==='select'&&n.props.value==='all').props.value,'all');
 assert.ok(nodes().some(n=>n.type==='select'&&n.props.value==='in_app_only'));
 assert.equal(button('Preview test to my devices only').props.disabled,true);
 await change('Recipients','customer');assert.equal(button('Preview sale announcement').props.disabled,true);
 await change('Customer name or email','Same');await click('Search customers');await change('Choose one customer',customer.id);
 await click('Preview sale announcement');assert.equal(calls.at(-1).recipient.customerId,customer.id);
 assert.ok(text(render()).includes(customer.email));assert.ok(text(render()).includes(customer.id));
 assert.equal(button('Confirm and send').props.disabled,true);
 nodes().find(n=>n.type==='input'&&n.props.type==='checkbox').props.onChange({target:{checked:true}});
 assert.equal(button('Confirm and send').props.disabled,false);
 await change('Recipients','all');assert.equal(button('Confirm and send'),undefined);
 await click('Preview sale announcement');assert.equal(calls.at(-1).recipient.mode,'all');assert.equal(button('Confirm and send').props.disabled,true);
 await change('Recipients','customer');await change('Customer name or email','selected');await click('Search customers');await change('Choose one customer',customer.id);
 deviceCount=0;await click('Preview sale announcement');assert.ok(text(render()).includes('In-app notifications will still be delivered.'));
 nodes().find(n=>n.type==='input'&&n.props.type==='checkbox').props.onChange({target:{checked:true}});
 assert.equal(button('Confirm and send').props.disabled,false);
 await change('Notification type','invoices');assert.equal(button('Confirm and send'),undefined);
 await click('Send Payment Reminders — Preview');assert.equal(calls.at(-1).category,'invoices');assert.equal(calls.at(-1).recipient.customerId,customer.id);
 assert.equal(calls.at(-1).delivery,'in_app_only');assert.ok(text(render()).includes('In-app only (no phone push)'));
 await change('Delivery','in_app_push');assert.equal(button('Confirm and send'),undefined);
 assert.equal(button('Preview test to my devices only').props.disabled,false);
 deviceCount=2;await click('Send Payment Reminders — Preview');assert.equal(calls.at(-1).delivery,'in_app_push');
 assert.equal(button('Confirm and send').props.disabled,true);
 await change('Notification type','general');assert.equal(button('Confirm and send'),undefined);
 const deliverySelect=nodes().find(n=>n.type==='select'&&n.props.value==='in_app_only');assert.ok(deliverySelect.props.disabled);
 assert.equal(button('Preview test to my devices only').props.disabled,true);
 await click('Preview general update');assert.equal(calls.at(-1).category,'general');assert.equal(calls.at(-1).delivery,'in_app_only');
 await change('Notification type','sales');assert.equal(button('Confirm and send'),undefined);
 assert.ok(nodes().some(n=>n.type==='select'&&n.props.value==='in_app_only'));
 assert.ok(!calls.some(c=>['confirm','process'].includes(c.op)));
 console.log('PASS Owner recipient search/selection, duplicate-name identity, explicit confirmation, preview invalidation on audience/category change, in-app-only confirmation with no phone devices. Mock API only.');
}
function messageLinks() {
 const exports={};
 const source=ts.transpileModule(fs.readFileSync(path.join(root,'apps/web/components/push/notification-message-links.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(source,{exports,URL,require:name=>{if(name==='react/jsx-runtime')return jsx;throw Error(name);}});
 return exports;
}
function checkMessageLinks() {
 const {NotificationMessageLinks}=messageLinks();
 const text='Join (https://example.test/show?a=1&b=2). Next https://example.test/a_(b)!\nhttp://example.test/end. <script>alert(1)</script> javascript:alert(1) https://name:secret@example.test/ https://';
 const tree=NotificationMessageLinks({text});
 const anchors=tree.props.children.filter(x=>x&&typeof x==='object'&&x.type==='a');
 assert.equal(anchors.length,3);
 assert.deepEqual(Array.from(anchors,a=>a.props.href),['https://example.test/show?a=1&b=2','https://example.test/a_(b)','http://example.test/end']);
 for(const a of anchors){assert.equal(a.props.target,'_blank');assert.equal(a.props.rel,'noopener noreferrer');}
 assert.equal(tree.props.children.map(x=>typeof x==='object'?x.props.children:x).join(''),text);
 const html=appRequire('react-dom/server').renderToStaticMarkup(tree);
 assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('href="javascript:'));assert.ok(!html.includes('href="https://name:secret'));
 assert.ok(html.includes('white-space:pre-wrap'));assert.ok(html.includes('overflow-wrap:anywhere'));
 console.log('PASS Clickable HTTP(S) links, punctuation, query strings, preserved text, inert HTML/unsafe schemes/credential URLs, safe external tabs and mobile wrapping.');
}
async function checkInboxUI() {
 const source=ts.transpileModule(fs.readFileSync(path.join(root,'apps/web/components/push/inbox-list.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const slots=[],calls=[];let cursor=0,refreshes=0,fail=false;
 const entries=[{id:'one',title:'Sale <script>',body:'Tonight\nSecond line',created_at:'2026-10-23T05:00:00Z',category:'sales'}];
 const exports={};
 vm.runInNewContext(source,{exports,Intl,Date,fetch:async(url,options)=>{calls.push({url,input:JSON.parse(options.body)});return {ok:!fail};},require(name){
  if(name==='react')return {useState(value){const i=cursor++;if(!(i in slots))slots[i]=value;return [slots[i],v=>slots[i]=v];}};
  if(name==='react/jsx-runtime')return jsx;
  if(name==='next/navigation')return {useRouter:()=>({refresh:()=>{refreshes++;}})};
  if(name==='./notification-message-links')return messageLinks();
  throw Error(name);
 }});
 function render(notifications=entries){cursor=0;return exports.InboxList({notifications});}
 function nodes(tree){if(!tree||typeof tree!=='object')return [];return [tree,...[tree.props?.children].flat(Infinity).flatMap(c=>c==null?[]:nodes(c))];}
 const html=appRequire('react-dom/server').renderToStaticMarkup(render());
 assert.ok(html.includes('Sale &lt;script&gt;'));assert.ok(html.includes('Eastern Time'));assert.ok(html.includes('min-height:44px'));
 assert.equal(nodes(render()).find(n=>n.type==='time').props.dateTime,entries[0].created_at);
 const button=()=>nodes(render()).find(n=>n.type==='button');
 fail=true;button().props.onClick();await flush();assert.equal(refreshes,0);assert.ok(nodes(render()).some(n=>n.props.role==='alert'));
 fail=false;button().props.onClick();await flush();assert.equal(refreshes,1);
 assert.deepEqual(calls.at(-1),{url:'/api/account/notifications',input:{op:'delete',id:'one'}});
 const linked=appRequire('react-dom/server').renderToStaticMarkup(render([{...entries[0],body:'Join https://example.test/show',kind:'push_failure'}]));
 assert.ok(linked.includes('href="https://example.test/show"'));assert.ok(linked.includes('href="/account#phone-notification-status"'));
 const empty=appRequire('react-dom/server').renderToStaticMarkup(render([]));assert.ok(empty.includes('No notifications here yet.'));
 assert.ok(!html.includes('Notification.requestPermission'));
 console.log('PASS Inbox title/message/time, escaped content, accessible Delete, error handling, refresh after deletion, and empty state.');
}
(async()=>{
 checkMessageLinks();
 await checkInboxUI();
 await checkAdminRecipients();
 const h=harness();assert.ok(h.text(h.render()).includes('Checking phone notifications'));assert.ok(!h.text(h.render()).includes('Phone notifications are off.'));await h.start();
 assert.ok(h.text(h.render()).includes('Phone notifications are off.'));assert.equal(h.nodes().filter(n=>n.type==='input').length,0);
 await h.click('Turn on phone notifications');assert.ok(h.text(h.render()).includes('Phone notifications are on.'));assert.deepEqual(h.persisted,{sales:false,invoices:false});
 await h.choose('Sale announcements',true);await h.choose('Payment reminders',true);assert.deepEqual(h.persisted,{sales:true,invoices:true});
 await h.choose('Sale announcements',false);assert.deepEqual(h.persisted,{sales:false,invoices:true});
 await h.click('Turn off on this phone');assert.deepEqual(h.persisted,{sales:false,invoices:true});assert.ok(h.button('Turn on phone notifications'));assert.equal(h.nodes().filter(n=>n.type==='input').length,0);
 await h.click('Turn on phone notifications');assert.deepEqual(h.persisted,{sales:false,invoices:true});assert.ok(h.text(h.render()).includes('Selected alerts: Payment reminders'));
 const rejected=harness({active:true,serverActive:false,permission:'granted',persisted:{sales:true,invoices:true},collapsible:true});await rejected.start();
 assert.ok(rejected.text(rejected.render()).includes('Phone notifications are off.'));assert.equal(rejected.nodes().filter(n=>n.type==='input').length,0);assert.equal(rejected.nodes().filter(n=>n.props?.['aria-label']==='Phone notification status').length,1);
 assert.equal(rejected.nodes().find(n=>n.type==='details'&&n.props.id==='phone-notification-settings').props.open,undefined);
 await rejected.click('Turn on phone notifications');assert.deepEqual(rejected.persisted,{sales:true,invoices:true});assert.ok(rejected.text(rejected.render()).includes('Phone notifications are on.'));
 const denied=harness({permission:'denied',persisted:{sales:true,invoices:true}});await denied.start();assert.ok(denied.text(denied.render()).includes('Phone notifications are blocked'));assert.equal(denied.nodes().filter(n=>n.type==='input').length,0);assert.equal(denied.permissionCalls,0);
 const unsupported=harness({unsupported:true});await unsupported.start();assert.ok(unsupported.text(unsupported.render()).includes('not supported here'));
 const ios=harness({ios:true});await ios.start();assert.ok(ios.text(ios.render()).includes('Open FGD from your Home Screen'));assert.equal(ios.permissionCalls,0);
 const installed=harness({ios:true,standalone:true});await installed.start();await installed.click('Turn on phone notifications');await installed.choose('Payment reminders',true);assert.deepEqual(installed.persisted,{sales:false,invoices:true});
 const opts={failRegister:true,persisted:{sales:true,invoices:false}};const failed=harness(opts);await failed.start();await failed.click('Turn on phone notifications');assert.ok(failed.text(failed.render()).includes('Registration failed'));assert.ok(failed.text(failed.render()).includes('Phone notifications are off.'));assert.deepEqual(failed.persisted,opts.persisted);
 opts.failRegister=false;await failed.click('Turn on phone notifications');assert.ok(failed.text(failed.render()).includes('Phone notifications are on.'));
 const save=harness({active:true,permission:'granted',failSave:true});await save.start();await save.choose('Sale announcements',true);assert.deepEqual(save.persisted,{sales:false,invoices:false});assert.ok(save.text(save.render()).includes('Could not save preferences'));
 const dismissed=harness({result:'default'});await dismissed.start();await dismissed.click('Turn on phone notifications');assert.ok(!dismissed.calls.some(c=>c.op==='subscribe'));assert.ok(dismissed.text(dismissed.render()).includes('Phone notifications are off.'));
 const recover=harness({restore:true,permission:'granted',persisted:{sales:true,invoices:false}});await recover.start();assert.ok(recover.calls.some(c=>c.op==='subscribe'));
 const noConsent=harness({restore:true,permission:'granted'});await noConsent.start();assert.ok(!noConsent.calls.some(c=>c.op==='subscribe'));
 await h.click('Turn off all notifications');assert.deepEqual(h.persisted,{sales:false,invoices:false});assert.ok(h.calls.some(c=>c.op==='unsubscribe'&&c.all));
 console.log('PASS Neutral checking, direct off-state enrollment/recovery, no misleading switches, consent preservation, registered status, account-wide preferences versus device disable, permission/platform guidance, failure/retry, collapsed secondary controls and single status panel.');
 if(process.env.FGD_UI_PREVIEW){const render=appRequire('react-dom/server').renderToStaticMarkup;const ready=harness();await ready.start();fs.writeFileSync(process.env.FGD_UI_PREVIEW,'<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>FGD local notification preview</title><style>:root{--panel:#fff8ef;--line:#e8d6c3;--muted:#75665b;--accent-strong:#8e3200;--shadow:0 14px 40px #45251112}*{box-sizing:border-box}body{font-family:Arial,sans-serif;background:#fff3e1;color:#241d18;margin:0;padding:24px}main{max-width:880px;margin:auto}button:disabled{cursor:not-allowed;opacity:.55}button:focus-visible,summary:focus-visible,input:focus-visible{outline:3px solid #087b70;outline-offset:3px}</style><main>'+render(ready.render())+'</main></html>');}
})().catch(e=>{console.error(e);process.exitCode=1;});


