const {test,after}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{execFileSync}=require('node:child_process');
const {chromium}=require('C:/Users/sstni/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../Archive/outputs/dev-scope');
const PEN='ME_SAR_MEDICAL_EQUIP_PENETRATION_KIT',RAFT='ME_AIRCRAFT_ALSE_EQUIP_INTERNAL_LIFE_RAFT';
let browser,server,serveOld=false;const oldFiles=new Map();
after(async()=>{await browser?.close();if(server)await new Promise(r=>server.close(r));});
test('October scope: loading guide, Editor and offline update',async t=>{
 fs.mkdirSync(out,{recursive:true});
 server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname.replace(/^\//,'')||'index.html';try{
  let body;if(serveOld){if(!oldFiles.has(name))oldFiles.set(name,execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'show','88f71b2:'+name],{cwd:root,maxBuffer:10e6}));body=oldFiles.get(name);}else body=fs.readFileSync(path.join(root,name));
  res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':name.endsWith('.html')?'text/html':name.endsWith('.css')?'text/css':'application/octet-stream');res.end(body);
 }catch{res.statusCode=404;res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port+'/';browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:1180,height:900}}),page=await context.newPage(),errors=[];
 page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(url);await page.waitForFunction(()=>document.querySelector('#offlineReadiness')?.textContent.includes('Ready offline'));await page.click('#splashAck');
 async function fresh(preset='SAR3'){
  await page.evaluate(preset=>{const tail=STORE.tails[0];STORE.selectedTail=tail;const s=STORE.sessions[tail]=makeNewSession(tail,false);Object.assign(s.accepted,{isAccepted:true,by:'TEST',at:new Date().toISOString(),basicW:10331,basicCG:8449,basicWeightBasis:'MAINTENANCE',maintenanceBaseline:fleetMaintenanceBaseline(),maintenanceExceptions:[]});s.fuel.total=1000;s.fuel.landing=300;if(preset)applyPreset(tail,preset);setTab('CONFIG');},preset);
 }
 await t.test('location mode is lossless, shows physical units, empty and unavailable locations',async()=>{
  await fresh();await page.evaluate(()=>setTab('MISSION'));
  const before=await page.evaluate(()=>{const s=STORE.sessions[STORE.selectedTail];return {wb:computeWB(s.tail),mission:s.mission,loads:s.missionLoads,saved:localStorage.getItem('wb615_session')};});
  await page.locator('[data-mission-view="location"]').click();
  assert.equal(await page.locator('#missionEquipList details[open]').count(),0);
  assert.match(await page.locator('[data-stowage-group="INT_LIFE_RAFT_B3_STBD_F"]').count().then(String),/^0$/);
  assert.match(await page.locator('.stowage-unavailable').allTextContents().then(x=>x.join(' ')),/fit it in Role Config/);
  assert.match(await page.locator('[data-stowage-group="BAY1"] > summary').textContent(),/0 items/);
  const expected=await page.evaluate(()=>{const totals={};for(const r of missionRows(STORE.sessions[STORE.selectedTail]))if(r.group!=='CREW PERSONAL EQUIP'&&r.quantity>0&&!r.error){const id=r.stowId==='CUSTOM'?'CUSTOM:'+r.arm:r.stowId;totals[id]=(totals[id]||0)+r.quantity;}return totals;});
  for(const [id,count] of Object.entries(expected))assert.match(await page.locator('[data-stowage-group="'+id+'"] > summary').textContent(),new RegExp('— '+count+' items?$'));
  assert.ok(await page.locator('#missionEquipList > details > summary').allTextContents().then(x=>x.some(s=>s.includes('CREW PERSONAL EQUIP'))&&x.some(s=>s.includes('Available Stowage Locations'))));
  const cabinet=page.locator('[data-stowage-group="SAR_CABINET_MIDDLE"]');await cabinet.locator('summary').click();assert.ok((await cabinet.textContent()).includes('kg each'));
  await page.screenshot({path:path.join(out,'stowage-loading-guide.png'),fullPage:true});
  await page.locator('[data-mission-view="equipment"]').click();
  const after=await page.evaluate(()=>{const s=STORE.sessions[STORE.selectedTail];return {wb:computeWB(s.tail),mission:s.mission,loads:s.missionLoads,saved:localStorage.getItem('wb615_session')};});assert.deepEqual(after,before);
 });
 await t.test('dedicated fittings control locations; split quantities, custom arms and carriers follow actual load',async()=>{
  await fresh();const checks=await page.evaluate(({pen,raft})=>{const s=STORE.sessions[STORE.selectedTail],pairs=Object.entries(AC.stowage).filter(([,loc])=>loc.roleFitKey);const result=pairs.map(([id,loc])=>{setRoleFitDeclaration(s,loc.roleFitKey,'EXCLUDED');const absent=!!resolveMissionLocation(s,{stow:id}).error;setRoleFitDeclaration(s,loc.roleFitKey,'ADD');return {absent,present:!resolveMissionLocation(s,{stow:id}).error,arm:resolveMissionLocation(s,{stow:id}).arm,expected:loc.arm};});s.mission={[pen]:true,[raft]:true};s.missionLoads={[pen]:[{id:'a',quantity:2,stow:'BAY1'},{id:'b',quantity:4,stow:'CUSTOM',customArm:8000}]};setRoleFitDeclaration(s,'RF_STOW_LIFERAFT_STBD_B3_F','EXCLUDED');setTab('MISSION');return result;},{pen:PEN,raft:RAFT});for(const r of checks){assert.ok(r.absent&&r.present);assert.equal(r.arm,r.expected);}
  await page.locator('[data-mission-view="location"]').click();assert.match(await page.locator('[data-stowage-group="BAY1"] > summary').textContent(),/2 items/);assert.match(await page.locator('[data-stowage-group="CUSTOM:8000"] > summary').textContent(),/4 items/);
  assert.match(await page.locator('[data-stowage-group="REQUIRES_STOWAGE"] > summary').textContent(),/1 item/);
  await page.evaluate(()=>{const s=STORE.sessions[STORE.selectedTail];setRoleFitDeclaration(s,'RF_STOW_LIFERAFT_STBD_B3_F','ADD');renderMissionEquipment();});assert.equal(await page.locator('[data-stowage-group="REQUIRES_STOWAGE"]').count(),0);assert.match(await page.locator('[data-stowage-group="INT_LIFE_RAFT_B3_STBD_F"] > summary').textContent(),/1 item/);
  await page.evaluate(()=>{const s=STORE.sessions[STORE.selectedTail],basket='ME_SAR_MISSION_EQUIP_RESCUE_BASKET_PORT',guide='ME_SAR_MISSION_EQUIP_GUIDELINE';s.mission={[basket]:true,[guide]:true};s.missionLoads={[basket]:[{id:'basket',quantity:1,stow:'BAY55'}]};renderMissionEquipment();});assert.match(await page.locator('[data-stowage-group="BAY55"] > summary').textContent(),/3 items/);
 });
 await t.test('Editor groups/items and operational panels default closed; charts remain expanded',async()=>{
  await fresh();assert.equal(await page.locator('#roleFitDetails').getAttribute('open'),null);assert.equal(await page.locator('#envWrapConfig').isVisible(),true);
  await page.evaluate(()=>{EDITOR.authed=true;editorInitDraft();setTab('EDITOR');});assert.equal(await page.locator('[data-edsec="ROLEFIT"].active').count(),1);assert.equal(await page.locator('#editorHost details[open]').count(),0);await page.locator('[data-edsec="MISSION"]').click();
  await page.locator('[data-editor-panel="group:SAR MEDICAL EQUIP"] > summary').click();await page.locator('[data-editor-panel="item:'+PEN+'"] > summary').click();
  await page.locator('[data-k="'+PEN+'"][data-f="description"]').fill('Test description');await page.locator('[data-k="'+PEN+'"][data-f="description"]').press('Tab');assert.equal(await page.locator('[data-editor-panel="item:'+PEN+'"]').getAttribute('open'),'');
  await page.screenshot({path:path.join(out,'editor-collapsible.png'),fullPage:true});
  await page.locator('[data-edsec="ROLEFIT"]').click();assert.equal(await page.locator('#roleFitItemList details[open]').count(),0);assert.deepEqual(await page.locator('#roleFitItemList > details > summary').allTextContents(),['Aircraft Systems','Ice Protection','SAR Equipment','Sensor Systems','Servicing Equipment','Stowage Fittings']);await page.screenshot({path:path.join(out,'role-fit-headings.png'),fullPage:false});
  await page.locator('[data-edsec="SEATBASE"]').click();assert.equal(await page.locator('#seatBaselineList details').count(),2);assert.equal(await page.locator('#seatBaselineList details[open]').count(),0);
  await page.evaluate(()=>setTab('MISSION'));await page.locator('#missionEquipList > details > summary').first().click();await page.reload();await page.waitForFunction(()=>STORE.selectedTail);assert.equal(await page.locator('#missionEquipList details[open]').count(),0);assert.equal(await page.locator('#envWrapMission').isVisible(),true);
 });
 await t.test('plain names generate unique keys and keep display names; logout preserves edited data',async()=>{
  await page.evaluate(()=>{EDITOR.authed=true;editorInitDraft();EDITOR.activeSection='MISSION';setTab('EDITOR');});
  await page.click('#missionAddBtn');assert.equal(await page.locator('#missionNewName').count(),0);await page.fill('#missionNewKeyInput','me sar mission equip spare radio');assert.equal(await page.locator('#missionKeyPreview').textContent(),'ME_SAR_MISSION_EQUIP_SPARE_RADIO');await page.click('#missionNewKeyConfirm');assert.equal(await page.evaluate(()=>AC.missionEquip.ME_SAR_MISSION_EQUIP_SPARE_RADIO.name),'New Mission Equipment Item');assert.equal(await page.evaluate(()=>AC.missionEquip.ME_SAR_MISSION_EQUIP_SPARE_RADIO.group),'SAR MISSION EQUIP');await page.locator('[data-k="ME_SAR_MISSION_EQUIP_SPARE_RADIO"][data-f="name"]').fill('Spare radio');await page.locator('[data-k="ME_SAR_MISSION_EQUIP_SPARE_RADIO"][data-f="name"]').press('Tab');
  await page.click('#missionAddBtn');await page.fill('#missionNewKeyInput','me sar mission equip spare radio');await page.click('#missionNewKeyConfirm');assert.match(await page.locator('#missionNewKeyErr').textContent(),/already in use/);
  await page.locator('[data-edsec="ROLEFIT"]').click();await page.click('#roleFitAddBtn');assert.equal(await page.locator('#rfNewName').count(),0);await page.fill('#rfNewKeyInput','aircraft systems spare radio holder');await page.click('#rfNewKeyConfirm');assert.match(await page.locator('#rfNewKeyErr').textContent(),/Start the key with rf/);await page.fill('#rfNewKeyInput','rf aircraft systems spare radio holder');assert.equal(await page.locator('#rfKeyPreview').textContent(),'RF_AIRCRAFT_SYSTEMS_SPARE_RADIO_HOLDER');assert.match(await page.locator('#roleFitAddForm').textContent(),/major system/);assert.ok(await page.locator('#rfNewKeyInput').evaluate(el=>el.getBoundingClientRect().width>600));await page.screenshot({path:path.join(out,'key-helper.png'),fullPage:true});await page.click('#rfNewKeyConfirm');assert.equal(await page.evaluate(()=>AC.roleFit.RF_AIRCRAFT_SYSTEMS_SPARE_RADIO_HOLDER.name),'New Role Fit Item');await page.locator('[data-k="RF_AIRCRAFT_SYSTEMS_SPARE_RADIO_HOLDER"][data-f="name"]').fill('Spare radio holder');await page.locator('[data-k="RF_AIRCRAFT_SYSTEMS_SPARE_RADIO_HOLDER"][data-f="name"]').press('Tab');
  await page.locator('[data-edsec="STOWAGE"]').click();assert.equal(await page.locator('#locationCards details[open]').count(),0);assert.deepEqual(await page.locator('#locationCards > details > summary').allTextContents(),['BAYS','SAR Cabinet','Cabin','Port Fwd Shelves','Ramp']);assert.equal(await page.locator('[data-stowage-editor-group="Cabin"] [data-location-requirement="RAMP_STOW"]').count(),1);assert.equal(await page.locator('[data-stowage-editor-group="Cabin"] [data-location-requirement="OVERHEAD_PORT"]').count(),1);await page.screenshot({path:path.join(out,'stowage-editor-groups.png'),fullPage:false});
  assert.equal(await page.locator('#locationNewName').count(),0);await page.fill('#locationNewKey','cabin spare radio position');assert.equal(await page.locator('#locationKeyPreview').textContent(),'CABIN_SPARE_RADIO_POSITION');await page.click('#locationAdd');assert.equal(await page.evaluate(()=>AC.stowage.CABIN_SPARE_RADIO_POSITION.name),'New Stowage Location');await page.locator('[data-location-key="CABIN_SPARE_RADIO_POSITION"] [data-location="name"]').fill('Spare radio position');await page.locator('[data-location-key="CABIN_SPARE_RADIO_POSITION"] [data-location="name"]').press('Tab');await page.locator('[data-location-requirement="CABIN_SPARE_RADIO_POSITION"]').selectOption('RF_AIRCRAFT_SYSTEMS_SPARE_RADIO_HOLDER');assert.equal(await page.evaluate(()=>AC.stowage.CABIN_SPARE_RADIO_POSITION.roleFitKey),'RF_AIRCRAFT_SYSTEMS_SPARE_RADIO_HOLDER');
  await page.locator('[data-edsec="CONFIGURATIONS"]').click();await page.fill('#configurationNewName','Training role');await page.click('#configurationCreate');assert.equal(await page.evaluate(()=>AC.presets.CONFIG_TRAINING_ROLE.name),'Training role');
  const saved=await page.evaluate(()=>localStorage.getItem('ac_config_overrides'));await page.evaluate(()=>setTab('HOME'));await page.click('#btnEndSession');await page.click('#splashAck');await page.evaluate(()=>setTab('EDITOR'));assert.match(await page.locator('#tab_EDITOR').textContent(),/Custodian Login/);assert.equal(await page.evaluate(()=>EDITOR.authed),false);assert.equal(await page.evaluate(()=>localStorage.getItem('ac_config_overrides')),saved);
 });
 await t.test('explicit double underscore creates new groups; quick entry only resolves existing groups',async()=>{
  await page.evaluate(()=>{EDITOR.authed=true;editorInitDraft();EDITOR.activeSection='ROLEFIT';setTab('EDITOR');});
  await page.click('#roleFitAddBtn');await page.fill('#rfNewKeyInput','rf test group new item');await page.click('#rfNewKeyConfirm');assert.match(await page.locator('#rfNewKeyErr').textContent(),/Group not recognized/);
  await page.fill('#rfNewKeyInput','rf test group__new item');await page.click('#rfNewKeyConfirm');assert.match(await page.locator('#rfNewKeyErr').textContent(),/exactly/);
  await page.fill('#rfNewKeyInput','RF_TEST_GROUP__NEW_ITEM');await page.click('#rfNewKeyConfirm');assert.equal(await page.locator('[data-editor-panel="group:Test Group"]').getAttribute('open'),'');assert.equal(await page.locator('[data-k="RF_TEST_GROUP__NEW_ITEM"][data-f="name"]').inputValue(),'New Role Fit Item');
  await page.click('#roleFitAddBtn');await page.fill('#rfNewKeyInput','rf test group second item');await page.click('#rfNewKeyConfirm');assert.equal(await page.evaluate(()=>AC.roleFit.RF_TEST_GROUP_SECOND_ITEM.group),'Test Group');
  await page.locator('[data-edsec="MISSION"]').click();await page.click('#missionAddBtn');await page.fill('#missionNewKeyInput','ME_TEST_GROUP__RADIO');await page.click('#missionNewKeyConfirm');assert.equal(await page.locator('[data-k="ME_TEST_GROUP__RADIO"][data-f="name"]').inputValue(),'New Mission Equipment Item');assert.equal(await page.locator('[data-editor-panel="group:TEST GROUP"]').getAttribute('open'),'');
  await page.locator('[data-k="ME_TEST_GROUP__RADIO"][data-f="name"]').fill('Test radio');await page.locator('[data-k="ME_TEST_GROUP__RADIO"][data-f="unitWeight"]').fill('2.5');await page.locator('[data-k="ME_TEST_GROUP__RADIO"][data-f="stow"]').selectOption('BAY1');
  await page.locator('[data-edsec="STOWAGE"]').click();await page.fill('#locationNewKey','TEST_STORAGE__POSITION');await page.click('#locationAdd');assert.equal(await page.locator('[data-location-key="TEST_STORAGE__POSITION"] [data-location="name"]').inputValue(),'New Stowage Location');assert.equal(await page.locator('[data-stowage-editor-group="Test Storage"]').getAttribute('open'),'');
  await page.reload();await page.waitForFunction(()=>typeof STORE!=='undefined');
  assert.deepEqual(await page.evaluate(()=>({role:AC.roleFit.RF_TEST_GROUP__NEW_ITEM.group,mission:AC.missionEquip.ME_TEST_GROUP__RADIO.group,stow:AC.stowage.TEST_STORAGE__POSITION.group})),{role:'Test Group',mission:'TEST GROUP',stow:'Test Storage'});
  await fresh();await page.evaluate(()=>{const s=STORE.sessions[STORE.selectedTail];s.mission={ME_TEST_GROUP__RADIO:true};s.missionLoads={};setTab('MISSION');});
  assert.match(await page.locator('#missionEquipList').textContent(),/TEST GROUP/);assert.equal(await page.evaluate(()=>computeMissionTotals(STORE.sessions[STORE.selectedTail]).w),2.5);
  const pdf=await page.evaluate(()=>{const s=STORE.sessions[STORE.selectedTail],doc=new window.jspdf.jsPDF(),texts=[],original=doc.text.bind(doc);doc.text=(value,...args)=>{texts.push(String(value));return original(value,...args);};new PDFContext(doc,s.tail,s,computeWB(s.tail)).drawMissionEquip();return texts.join(' ');});assert.match(pdf,/TEST GROUP/);assert.match(pdf,/Test radio/);
 });
 await t.test('v18 Editor overrides migrate without losing custom roles or deleted roles',async()=>{
  await page.evaluate(()=>{const presets=structuredClone(AC.presets);presets.VERSION_TEST={...structuredClone(presets.CASEVAC),name:'Saved custom role'};delete presets.TRANSPORT;localStorage.setItem('ac_config_overrides',JSON.stringify({missionSchema:MISSION_SCHEMA,baseConfigVersion:18,presets}));});
  await page.reload();await page.waitForFunction(()=>typeof STORE!=='undefined');
  const r=await page.evaluate(()=>({version:AC.meta.configVersion,name:AC.presets.VERSION_TEST?.name,deleted:!AC.presets.TRANSPORT,stored:JSON.parse(localStorage.getItem('ac_config_overrides')).baseConfigVersion,backup:JSON.parse(localStorage.getItem('ac_config_overrides_before_config_update')).baseConfigVersion}));
  assert.deepEqual(r,{version:19,name:'Saved custom role',deleted:true,stored:19,backup:18});
  await page.reload();assert.equal(await page.evaluate(()=>AC.presets.VERSION_TEST.name),'Saved custom role');
 });
 await t.test('ordinary data update needs no review click; direct Role Config to Certify works; PDF uses new wording',async()=>{
  await page.evaluate(()=>{localStorage.removeItem('ac_config_overrides');});await page.reload();await page.waitForFunction(()=>typeof STORE!=='undefined');await fresh();
  await page.evaluate(()=>{const s=STORE.sessions[STORE.selectedTail];persistSession();const snap=JSON.parse(localStorage.getItem('wb615_session'));snap.missionSignature='old';snap.roleFitSignature='old';snap.sessions[s.tail].missionReviewRequired=true;snap.sessions[s.tail].accountingReviewRequired=true;localStorage.setItem('wb615_session',JSON.stringify(snap));localStorage.setItem('ac_config_overrides',JSON.stringify({missionSchema:MISSION_SCHEMA,baseConfigVersion:17,missionEquip:{OLD:{}}}));});
  await page.reload();await page.waitForFunction(()=>STORE.selectedTail);assert.equal(await page.locator('#sessionMigrationWarning').count(),0);
  const state=await page.evaluate(()=>{const s=STORE.sessions[STORE.selectedTail];return {mission:s.missionReviewRequired,accounting:s.accountingReviewRequired,issues:missionIssues(s),backed:!!localStorage.getItem('ac_config_overrides_before_config_update')};});assert.deepEqual(state,{mission:false,accounting:false,issues:[],backed:true});
  await page.evaluate(()=>{const s=STORE.sessions[STORE.selectedTail];setTab('CERTIFY');const wb=computeWB(s.tail);document.getElementById('mcduAUW').value=wb.auw;document.getElementById('mcduCG').value=wb.auwCG;document.getElementById('mcduFuel').value=wb.fuelTotal;document.getElementById('certSvc').value='TEST';document.getElementById('btnCertify').click();});
  assert.equal(await page.evaluate(()=>STORE.sessions[STORE.selectedTail].certify.certified),true);
  const headings=await page.evaluate(()=>{const s=STORE.sessions[STORE.selectedTail],p=new PDFContext(new window.jspdf.jsPDF(),s.tail,s,computeWB(s.tail)),headings=[];p.sectionHeader=title=>headings.push(title);p.drawMissionConfig();return headings;});assert.ok(headings.includes('5 · Role Configuration'));
  const download=page.waitForEvent('download');await page.evaluate(()=>generateWBReport());await (await download).saveAs(path.join(out,'role-config-report.pdf'));
 });
 await t.test('previous installed release updates online, prunes obsolete release and reopens offline with assets',async()=>{
  serveOld=true;const device=await browser.newContext(),tab=await device.newPage();tab.on('dialog',d=>d.accept());await tab.goto(url);await tab.waitForFunction(()=>document.querySelector('#offlineReadiness')?.textContent.includes('Ready offline'));assert.equal(await tab.evaluate(()=>AC.meta.configVersion),16);
  await tab.waitForFunction(()=>navigator.serviceWorker.controller?.state==='activated');
  await tab.evaluate(async()=>{const c=await caches.open('wb615-release-obsolete-test');await c.put('./__offline_release__',new Response(JSON.stringify({releaseId:'obsolete-test',verifiedAt:'2000-01-01'})));});
  serveOld=false;await tab.evaluate(async()=>{
   const registration=await navigator.serviceWorker.getRegistration();await registration.update();const worker=registration.installing||registration.waiting||registration.active;
   if(worker.state!=='activated')await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(new Error('Updated worker did not activate')),15000);
    worker.addEventListener('statechange',()=>{if(worker.state==='activated'){clearTimeout(timeout);resolve();}else if(worker.state==='redundant'){clearTimeout(timeout);reject(new Error('Updated worker failed'));}});
   });
  });
  await tab.reload();const updated=await tab.evaluate(async()=>({version:AC.meta.configVersion,control:await (await (await caches.open('wb615-release-control')).match('./__selected_release__')).text(),status:await new Promise(resolve=>{const channel=new MessageChannel();channel.port1.onmessage=e=>resolve(e.data);navigator.serviceWorker.controller.postMessage({type:'WB615_OFFLINE_STATUS'},[channel.port2]);}),keys:await caches.keys()}));assert.equal(updated.version,20,JSON.stringify(updated));await device.setOffline(true);await tab.reload();assert.equal(await tab.evaluate(()=>AC.meta.configVersion),20);
  const assets=await tab.evaluate(async()=>{const paths=['config.js','images/SAR_3_Pax.png','images/CASEVAC.png','mission-ui.js','pdf.js'];return Promise.all(paths.map(async p=>(await fetch(p)).ok));});assert.ok(assets.every(Boolean));
  assert.equal(await tab.evaluate(async()=>(await caches.keys()).filter(k=>k.startsWith('wb615-release-')&&k!=='wb615-release-control').length),2);
  await tab.click('#splashAck');await tab.evaluate(()=>{EDITOR.authed=true;editorInitDraft();endPersistedSession();});assert.equal(await tab.evaluate(()=>EDITOR.authed),false);await device.close();
 });
 await t.test('actual legacy-format recovery still requires checking after a second reload',async()=>{
  await fresh();await page.evaluate(()=>{const s=STORE.sessions[STORE.selectedTail];delete s.roleFitDeclarations;delete s.roleFitDeclarationOrigins;localStorage.setItem('wb615_session',JSON.stringify({schema:4,selectedTail:s.tail,activeTab:'CONFIG',sessions:{[s.tail]:s}}));});
  await page.reload();await page.waitForFunction(()=>STORE.selectedTail);await page.reload();await page.waitForFunction(()=>STORE.selectedTail);
  assert.equal(await page.evaluate(()=>STORE.sessions[STORE.selectedTail].accountingReviewRequired),true);assert.equal(await page.evaluate(()=>STORE.sessions[STORE.selectedTail].missionReviewRequired),true);
 });
 assert.deepEqual(errors,[]);await context.close();
});
