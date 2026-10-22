const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/sstni/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../Archive/outputs/role-stowage');
const RAFT='ME_AIRCRAFT_ALSE_EQUIP_INTERNAL_LIFE_RAFT',B3='INT_LIFE_RAFT_B3_STBD_F',B4='INT_LIFE_RAFT_B4_STBD_A';
let server,browser;
after(async()=>{await browser?.close();if(server)await new Promise(r=>server.close(r));});
test('Role installation defaults, dependencies, Editor and actual-load output',async t=>{
  fs.mkdirSync(out,{recursive:true});
  server=http.createServer((req,res)=>{const file=path.join(root,new URL(req.url,'http://localhost').pathname.replace(/^\/$/,'/index.html'));res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'application/octet-stream');try{res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end();}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage({viewport:{width:1100,height:900},acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto('http://127.0.0.1:'+server.address().port+'/');await page.waitForFunction(()=>typeof STORE!=='undefined');await page.click('#splashAck');
  async function fresh(){await page.evaluate(()=>{const tail=STORE.tails[0];STORE.selectedTail=tail;STORE.sessions[tail]=makeNewSession(tail,false);const s=STORE.sessions[tail];Object.assign(s.accepted,{isAccepted:true,basicW:10000,basicCG:8500,basicWeightBasis:'MAINTENANCE',maintenanceBaseline:fleetMaintenanceBaseline(),maintenanceExceptions:[]});s.ui??={};});}
  await t.test('release identifiers agree and the installed release reopens offline',async()=>{
    await page.waitForFunction(()=>document.querySelector('#offlineReadiness')?.textContent.includes('Ready offline'));
    await page.reload();await page.waitForFunction(()=>navigator.serviceWorker.controller);
    await page.context().setOffline(true);
    try{await page.reload();await page.waitForFunction(()=>typeof STORE!=='undefined');const release=await page.evaluate(async()=>({app:APP_VERSION,config:AC.meta.configVersion,cache:(await caches.keys()).filter(key=>key.startsWith('wb615-release-v'))}));assert.equal(release.app,'0.6.0-dev');assert.equal(release.config,30);assert.ok(release.cache.includes('wb615-release-v0.6.0-dev-c30-r1'));}finally{await page.context().setOffline(false);}
  });
  await t.test('full configurations reset locations in both directions',async()=>{
    await fresh();const rows=await page.evaluate(key=>['TRANSPORT','CASEVAC','TRANSPORT','CASEVAC'].map(role=>{applyPreset(STORE.selectedTail,role);const s=STORE.sessions[STORE.selectedTail],row=missionRows(s).find(r=>r.key===key);return {role,w:row.w,arm:row.arm,stow:row.stowId,error:row.error,issues:missionConfigurationIssues(AC)};}),RAFT);
    for(const row of rows){assert.equal(row.w,50);assert.equal(row.stow,row.role==='TRANSPORT'?B3:B4);assert.equal(row.arm,row.role==='TRANSPORT'?7100:8600);assert.equal(row.error,null);assert.deepEqual(row.issues,[]);}
  });
  await t.test('manual move changes moment and CG while retaining mass, and full apply clears it',async()=>{
    await fresh();const result=await page.evaluate(({key,b3,b4})=>{const s=STORE.sessions[STORE.selectedTail];applyPreset(s.tail,'TRANSPORT');setRoleFitDeclaration(s,'RF_STOW_LIFERAFT_STBD_B4_A','ADD');setTab('MISSION');const before=computeWB(s.tail);return {before:{w:before.opWExact,m:before.opM,cg:before.opCG}};},{key:RAFT,b3:B3,b4:B4});
    const location=page.getByLabel('Internal 10 Pers Life Raft location 1',{exact:true});await location.evaluate(el=>{for(let node=el.parentElement;node;node=node.parentElement)if(node.tagName==='DETAILS')node.open=true;});await location.selectOption(B4);
    const after=await page.evaluate(key=>{const s=STORE.sessions[STORE.selectedTail],wb=computeWB(s.tail);return {w:wb.opWExact,m:wb.opM,cg:wb.opCG,stow:missionAllocations(s,key)[0].stow};},RAFT);
    assert.equal(after.w,result.before.w);assert.equal(after.m-result.before.m,75000);assert.ok(after.cg>result.before.cg);assert.equal(after.stow,B4);
    await page.evaluate(()=>applyPreset(STORE.selectedTail,'TRANSPORT'));assert.equal(await page.evaluate(key=>missionAllocations(STORE.sessions[STORE.selectedTail],key)[0].stow,RAFT),B3);
  });
  await t.test('role-fit-only retains mission selections and allocations, even when fitting becomes unavailable',async()=>{
    const result=await page.evaluate(key=>{const s=STORE.sessions[STORE.selectedTail];applyPreset(s.tail,'TRANSPORT');const before=JSON.stringify([s.mission,s.missionLoads]);applyRoleFitOnly(s.tail,'CASEVAC');const after=JSON.stringify([s.mission,s.missionLoads]);return {same:before===after,location:missionAllocations(s,key)[0].stow,error:resolveMissionLocation(s,missionAllocations(s,key)[0]).error};},RAFT);
    assert.equal(result.same,true);assert.equal(result.location,B3);assert.match(result.error,/unavailable/);
  });
  await t.test('manual and accepted fitting restrictions remain authoritative',async()=>{
    await fresh();const result=await page.evaluate(key=>{const s=STORE.sessions[STORE.selectedTail];setRoleFitDeclaration(s,'RF_STOW_LIFERAFT_STBD_B4_A','EXCLUDED');applyPreset(s.tail,'CASEVAC');const manual=missionRows(s).find(r=>r.key===key);s.accepted.maintenanceExceptions=['RF_STOW_LIFERAFT_STBD_B4_A'];applyPreset(s.tail,'CASEVAC');const accepted=missionRows(s).find(r=>r.key===key);return {manual:manual.error,accepted:accepted.error,w:accepted.w,cg:computeWB(s.tail).opCG,issues:missionIssues(s)};},RAFT);
    assert.match(result.manual,/unavailable/);assert.match(result.accepted,/unavailable/);assert.equal(result.w,50);assert.equal(result.cg,null);assert.ok(result.issues.some(x=>x.includes('Life Raft')));
  });
  await t.test('other roles, multi-location loads and carrier/patient behaviour retain their defaults',async()=>{
    await fresh();const result=await page.evaluate(()=>{const s=STORE.sessions[STORE.selectedTail],snapshots=[];for(const role of ['SAR3','SAR10']){applyPreset(s.tail,role);snapshots.push(Object.entries(s.mission).filter(([key,on])=>on&&AC.missionEquip[key]?.group!=='Stowage').every(([key])=>JSON.stringify(missionAllocations(s,key))===JSON.stringify(missionDefaultAllocations(key))));}
      const basket='ME_SAR_MISSION_EQUIP_RESCUE_BASKET_PORT',stokes='ME_SAR_MISSION_EQUIP_STOKES_LITTER_CABIN';setRoleFitDeclaration(s,'RF_STOW_BASKET_PORT','ADD');setRoleFitDeclaration(s,'RF_STOW_BASKET_STBD','ADD');setRoleFitDeclaration(s,'RF_STOW_STOKES_CABIN','ADD');setRoleFitDeclaration(s,'RF_STOW_STOKES_RAMP','ADD');s.mission[basket]=true;s.mission[stokes]=true;s.missionLoads[basket]=[{id:'one',quantity:1,stow:'CABIN_PORT_STOW'},{id:'two',quantity:1,stow:'CABIN_STBD_STOW'}];s.missionLoads[stokes]=[{id:'one',quantity:1,stow:'CABIN_DEPLOYED'},{id:'two',quantity:1,stow:'RAMP_STOW'}];return {snapshots,basket:missionRows(s).filter(r=>r.key===basket).map(r=>({w:r.w,error:r.error})),stokes:missionRows(s).filter(r=>r.key===stokes).map(r=>({w:r.w,error:r.error})),patient:patientPositionAvailable(s,AC.patientPositions.STOKES_CABIN)};});
    assert.deepEqual(result.snapshots,[true,true]);assert.equal(result.basket.length,2);assert.equal(result.stokes.length,2);assert.ok(result.basket.every(r=>r.w===31.8&&!r.error));assert.ok(result.stokes.every(r=>r.w===49&&!r.error));assert.equal(result.patient,true);
  });
  await t.test('generic overrides preserve split default quantities and reject broken configuration references',async()=>{
    await fresh();const result=await page.evaluate(()=>{const s=STORE.sessions[STORE.selectedTail],key='ME_TEST_SPLIT_INSTALLATION';
      AC.missionEquip[key]={name:'Split installation test',group:'SAR MISSION EQUIP',unitWeight:2,defaultQuantity:3,stow:'BAY1',defaultAllocations:[{quantity:1,stow:'BAY1'},{quantity:2,stow:'BAY2'}]};
      const p={missionOn:[key],missionStowageOverrides:{[key]:'BAY4'}};applyMissionPreset(s,p);const moved=missionRows(s).filter(r=>r.key===key);applyMissionPreset(s,{missionOn:[key]});const fallback=missionAllocations(s,key).map(r=>r.stow);
      const invalid=[[],{ME_MISSING:'BAY1'},{[key]:'MISSING'},{[key]:'BASKET'}].map(overrides=>missionConfigurationIssues({...AC,presets:{TEST:{name:'Test',missionStowageOverrides:overrides}}}));delete AC.missionEquip[key];return {weights:moved.map(r=>r.w),moments:moved.map(r=>r.m),arms:moved.map(r=>r.arm),expectedArm:AC.bayArms.BAY4,fallback,invalid};});
    assert.deepEqual(result.weights,[2,4]);assert.deepEqual(result.arms,[result.expectedArm,result.expectedArm]);assert.equal(result.moments.reduce((a,b)=>a+b,0),6*result.expectedArm);assert.deepEqual(result.fallback,['BAY1','BAY2']);assert.ok(result.invalid.every(issues=>issues.length>0));
  });
  await t.test('older saved role definitions keep their equipment defaults without being overwritten',async()=>{
    const original=await page.evaluate(()=>{EDITOR.authed=true;editorInitDraft();delete EDITOR.draft.presets.CASEVAC.missionStowageOverrides;editorSaveDraft();const ov=JSON.parse(localStorage.getItem('ac_config_overrides'));ov.baseConfigVersion=29;ov.presets.CASEVAC.name='Saved medical role';const raw=JSON.stringify(ov);localStorage.setItem('ac_config_overrides',raw);return raw;});
    await page.reload();await page.waitForFunction(()=>typeof STORE!=='undefined');
    const migration=await page.evaluate(()=>({name:AC.presets.CASEVAC.name,stored:JSON.parse(localStorage.getItem('ac_config_overrides')).baseConfigVersion,backup:localStorage.getItem('ac_config_overrides_before_config_update')}));assert.equal(migration.name,'Saved medical role');assert.equal(migration.stored,30);assert.equal(migration.backup,original);
    const result=await page.evaluate(key=>({override:AC.presets.CASEVAC.missionStowageOverrides,defaultLocation:missionDefaultAllocations(key)[0].stow}),RAFT);assert.equal(result.override,undefined);assert.equal(result.defaultLocation,B3);
    await page.evaluate(key=>{EDITOR.authed=true;editorInitDraft();EDITOR.draft.presets.CASEVAC.missionStowageOverrides={[key]:'INT_LIFE_RAFT_B4_STBD_A'};editorSaveDraft();},RAFT);
  });
  await t.test('Editor chooses a location, warns about fittings, and saves/reloads',async()=>{
    await fresh();await page.evaluate(()=>{EDITOR.authed=true;editorInitDraft();EDITOR.activeSection='CONFIGURATIONS';setTab('EDITOR');});
    const card=page.locator('[data-configuration-key="CASEVAC"]');await card.locator('summary').first().click();
    const select=card.locator('[data-config-mission-location="'+RAFT+'"]');await select.evaluate(el=>el.closest('details').open=true);await select.selectOption(B3);
    const note=card.locator('[data-config-mission-location-warning="'+RAFT+'"]');assert.match(await note.textContent(),/Requires.*Bay 3 Fwd/);
    const fit=card.locator('.config-rolefit-row').filter({hasText:'Stowage - Internal Life Raft Stbd Bay 3 Fwd'}).locator('select');await fit.evaluate(el=>el.closest('details').open=true);await fit.selectOption('on');assert.equal(await note.isHidden(),true);
    await select.selectOption(B4);await page.screenshot({path:path.join(out,'role-editor.png'),fullPage:true});
    await page.reload();await page.waitForFunction(()=>typeof STORE!=='undefined');
    assert.equal(await page.evaluate(key=>AC.presets.CASEVAC.missionStowageOverrides[key],RAFT),B4);
  });
  await t.test('saved actual location survives reload and PDF reports actual load',async()=>{
    await fresh();await page.evaluate(({key,b3})=>{const s=STORE.sessions[STORE.selectedTail];applyPreset(s.tail,'CASEVAC');setRoleFitDeclaration(s,'RF_STOW_LIFERAFT_STBD_B3_F','ADD');editMissionAllocations(s,key)[0].stow=b3;persistSession();},{key:RAFT,b3:B3});
    await page.reload();await page.waitForFunction(()=>STORE.selectedTail);
    const result=await page.evaluate(key=>{const s=STORE.sessions[STORE.selectedTail],pdf=new PDFContext(new window.jspdf.jsPDF(),s.tail,s,computeWB(s.tail)),rows=[];const original=pdf.table.bind(pdf);pdf.table=(h,r,...args)=>{rows.push(...r);return original(h,r,...args);};pdf.drawMissionEquip();return {stow:missionAllocations(s,key)[0].stow,rows,pdf:pdf.doc.output('datauristring')};},RAFT);
    assert.equal(result.stow,B3);assert.ok(result.rows.some(r=>String(r[0]).includes('Internal 10 Pers Life Raft')&&parseFloat(r[1])===50&&r[2]==='7100 mm'&&r[3].includes('B3 F')),JSON.stringify(result.rows));
    fs.writeFileSync(path.join(out,'actual-load.pdf'),Buffer.from(result.pdf.split(',')[1],'base64'));
  });
  await t.test('fleet and tail overrides round-trip through the supported config export',async()=>{
    await page.evaluate(key=>{EDITOR.authed=true;editorInitDraft();const tail=STORE.selectedTail;AC.tailConfigurations[tail]={...currentConfigurationData(),tailOnlyPresetKeys:[]};AC.tailConfigurations[tail].presets.CASEVAC.missionStowageOverrides[key]='INT_LIFE_RAFT_B3_STBD_F';editorSaveDraft();},RAFT);
    await page.reload();await page.waitForFunction(()=>STORE.selectedTail);
    const actual=await page.evaluate(key=>{applyPreset(STORE.selectedTail,'CASEVAC');const row=missionRows(STORE.sessions[STORE.selectedTail]).find(r=>r.key===key);EDITOR.authed=true;editorInitDraft();return {stow:row.stowId,error:row.error};},RAFT);assert.equal(actual.stow,B3);assert.equal(actual.error,null);
    const downloadPromise=page.waitForEvent('download');await page.evaluate(()=>editorExportConfig());const download=await downloadPromise;const file=path.join(out,'exported-config.js');await download.saveAs(file);
    const context=vm.createContext({});vm.runInContext(fs.readFileSync(file,'utf8'),context);
    assert.equal(vm.runInContext('AC.presets.CASEVAC.missionStowageOverrides.'+RAFT,context),B4);
    assert.equal(vm.runInContext('Object.values(AC.tailConfigurations)[0].presets.CASEVAC.missionStowageOverrides.'+RAFT,context),B3);
    assert.equal(vm.runInContext('AC.missionEquip.'+RAFT+'.unitWeight',context),50);
  });
  assert.deepEqual(errors,[]);await page.close();
});
