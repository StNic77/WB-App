const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/sstni/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'), output=path.resolve(root,'../Archive/outputs/mission-accounting-review');
const WS='RF_SENSOR_SYSTEMS_SENSOR_WORKSTATION', HOIST='RF_AIRCRAFT_SYSTEMS_SECONDARY_HOIST', CAB='RF_SAR_EQUIPMENT_FWD_SAR_CABINET', RACK='RF_SAR_EQUIPMENT_CASEVAC_RACK_FWD_STBD';
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);
let server,browser;after(async()=>{await browser?.close();if(server)await new Promise(r=>server.close(r));});
test('Mission Config accounting built on restored baseline',async t=>{
  fs.mkdirSync(output,{recursive:true});
  server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname;const file=path.join(root,name==='/'?'index.html':name);res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'application/octet-stream');res.setHeader('Cache-Control','no-store');try{res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end();}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/';
  browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:1100,height:900}});const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(url);await page.waitForFunction(()=>document.querySelector('#offlineReadiness')?.textContent.includes('Ready offline'));
  await page.click('#splashAck');
  assert.equal(await page.locator('#roleFitDetails').getAttribute('open'),null);
  await page.evaluate(()=>document.getElementById('roleFitDetails').open=true);
  async function fresh(basis='MAINTENANCE'){
    await page.evaluate(basis=>{const tail=STORE.tails[0];STORE.sessions[tail]=makeNewSession(tail,false);STORE.selectedTail=tail;const s=STORE.sessions[tail];s.mission={};Object.assign(s.accepted,{isAccepted:true,by:'TEST',at:new Date().toISOString(),basicW:10000.25,basicCG:8500,basicWeightBasis:basis,maintenanceBaseline:basis==='MAINTENANCE'?fleetMaintenanceBaseline():null,maintenanceExceptions:[]});for(const key of Object.keys(s.seats))s.seats[key]=basis==='MAINTENANCE'?!!s.accepted.maintenanceBaseline.seats[key]:!!(AC.crewSeats[key]||AC.paxSeats[key]).includedInRfmBasic;s.customExceptionsReviewed=true;setTab('CONFIG');render();},basis);
  }
  await t.test('ordinary opening, baseline worker and corrected equipment identifiers',async()=>{
    assert.equal(await page.evaluate(()=>location.pathname),'/');assert.equal(await page.evaluate(()=>typeof window.WBStorage),'undefined');
    assert.equal(await page.evaluate(()=>APP_VERSION),'0.2.17-dev');assert.equal(await page.evaluate(()=>AC.meta.configVersion),21);
    assert.deepEqual(await page.evaluate(()=>Object.values(AC.presets).flatMap(p=>[...p.roleFitOn,...p.roleFitOff]).filter(key=>!AC.roleFit[key])),[]);
  });
  async function isolateDefaults(){await page.evaluate(()=>{const s=STORE.sessions[STORE.selectedTail];for(const key of Object.keys(AC.roleFit))s.roleFitDeclarationOrigins[key]='manual';});}
  await t.test('every catalogue item separates fit, weight inclusion, preset removal and manual overrides',async()=>{
    await fresh();const failures=await page.evaluate(()=>{const failures=[];for(const [key,item] of Object.entries(AC.roleFit))for(const included of [false,true])for(const normally of [false,true]){
      const old=item.normally;item.normally=normally;const s=makeNewSession(STORE.selectedTail,false);Object.assign(s.accepted,{isAccepted:true,basicWeightBasis:'MAINTENANCE',maintenanceBaseline:{roleFit:{[key]:included}},maintenanceExceptions:[]});
      const check=(fit,factor,label)=>{const row=roleFitAccountingRows(s).find(x=>x.key===key);if(row.current!==fit||Math.abs(row.w-factor*item.w)>1e-8||Math.abs(row.m-factor*item.w*item.arm)>1e-6)failures.push(key+' '+label);};
      check(normally||included,!included&&normally?1:0,'default');
      for(const on of [false,true]){const preset={roleFitOn:on?[key]:[],roleFitOff:on?[]:[key]};s.preset='TEST_MATRIX';AC.presets.TEST_MATRIX=preset;applyRoleFitPreset(s,preset);check(on,on?(included?0:1):(included?-1:0),'preset');}
      setRoleFitDeclaration(s,key,'ACCOUNTED');applyRoleFitPreset(s,{roleFitOff:[key]});check(true,0,'manual');
      s.accepted.maintenanceExceptions=[key];s.roleFitDeclarations[key]='NEUTRAL';check(false,0,'maintenance removal');delete AC.presets.TEST_MATRIX;item.normally=old;
    }return failures;});assert.deepEqual(failures,[]);
  });
  await t.test('neutral, ADD, REMOVE and ACCOUNTED apply exact deltas once',async()=>{
    await fresh();await isolateDefaults();
    for(const [state,factor] of [['NEUTRAL',0],['ADD',1],['REMOVE',-1],['ACCOUNTED',0]]){
      const value=await page.evaluate(({key,state})=>{const s=STORE.sessions[STORE.selectedTail];setRoleFitDeclaration(s,key,state);const wb=computeWB(s.tail);return {w:wb.opWExact,m:wb.opM,delta:wb.roleFitAdjustmentW,fit:roleFitIsInstalled(s,key),item:AC.roleFit[key]};},{key:WS,state});
      near(value.delta,factor*46.69);near(value.w,10000.25+factor*46.69);near(value.m,10000.25*8500+factor*46.69*5830);
      assert.equal(value.fit,state==='ADD'||state==='ACCOUNTED');
    }
  });
  await t.test('RFM corrections use separate crew seat and occupant arms',async()=>{
    await fresh();const expected=[['C1',24.12,3673,3473],['C2',24.12,3673,3473],['C3',17.84,4559,4459],['C4',26.8,6469,6262],['C5',26.8,8440,8244],['C6',26.8,9434,9234]];
    for(const [key,weight,arm,personArm] of expected){const r=await page.evaluate(key=>{const s=STORE.sessions[STORE.selectedTail];s.occupants={};s.seats[key]=true;s.occupants[key]={type:'crew',label:'TEST'};return {seat:AC.crewSeats[key],totals:computeSeatTotals(s)};},key);near(r.seat.wSeat,weight);assert.equal(r.seat.arm,arm);assert.equal(r.seat.occupantArm,personArm);near(r.totals.occupantW,90.7);near(r.totals.occupantM,90.7*personArm);}
    assert.equal(await page.evaluate(()=>AC.roleFit.RF_SAR_EQUIPMENT_FWD_SAR_CABINET.arm),5875);
    assert.equal(await page.evaluate(()=>formatReferenceDocument(currentReferenceDocument())),'DLTP 101C-615-RFM Issue 1 Draft 2 Internal Preview (Built 04/09/2026)');
    await page.evaluate(()=>{const s=STORE.sessions[STORE.selectedTail];s.occupants={P2:{type:'pax'}};s.seats.P2=true;});near(await page.evaluate(()=>computeSeatTotals(STORE.sessions[STORE.selectedTail]).occupantM),90*11762);
  });
  await t.test('RFM has explicit additive accounting; ACCOUNTED is zero',async()=>{
    await fresh('RFM');await isolateDefaults();const values=await page.evaluate(key=>{const s=STORE.sessions[STORE.selectedTail];setRoleFitDeclaration(s,key,'ADD');const a=computeWB(s.tail);setRoleFitDeclaration(s,key,'ACCOUNTED');return [a.roleFitAdjustmentW,computeWB(s.tail).roleFitAdjustmentW];},WS);near(values[0],46.69);near(values[1],0);
  });
  await t.test('manual choices including neutral survive repeated presets',async()=>{
    await fresh();const result=await page.evaluate(key=>{const s=STORE.sessions[STORE.selectedTail];const out=[];for(const declaration of ['ACCOUNTED','ADD','REMOVE','NEUTRAL']){setRoleFitDeclaration(s,key,declaration);for(const preset of ['SAR3','CASEVAC','SAR10','TRANSPORT','SAR3'])applyPreset(s.tail,preset);out.push(roleFitDeclaration(s,key));}return out;},WS);assert.deepEqual(result,['ACCOUNTED','ADD','REMOVE','NEUTRAL']);
    const untouched=await page.evaluate(key=>{const s=STORE.sessions[STORE.selectedTail];s.roleFitDeclarations={};s.roleFitDeclarationOrigins={};applyPreset(s.tail,'SAR3');const a=computeRoleFitAdjustment(s);applyPreset(s.tail,'SAR3');const b=computeRoleFitAdjustment(s);applyPreset(s.tail,'TRANSPORT');return [a.w,b.w,roleFitDeclaration(s,key)];},RACK);near(untouched[0],untouched[1]);assert.equal(untouched[2],'NEUTRAL');
  });
  await t.test('expected-fit guidance follows none and all presets without changing declarations',async()=>{
    await fresh();const checks=await page.evaluate(key=>{const s=STORE.sessions[STORE.selectedTail];setRoleFitDeclaration(s,key,'ACCOUNTED');return ['',...Object.keys(AC.presets)].map(p=>{s.preset=p;const before=JSON.stringify(s.roleFitDeclarations);renderRoleFitDeclarations(s);const expected=roleFitExpectation(s,key),preset=AC.presets[p];return {expected,unchanged:before===JSON.stringify(s.roleFitDeclarations),want:preset?.roleFitOff.includes(key)?false:preset?.roleFitOn.includes(key)?true:!!AC.roleFit[key].normally,text:document.querySelector(`[data-role-key="${key}"] .role-fit-expectation`).textContent};});},RACK);assert.equal(checks.length,5);for(const check of checks){assert.equal(check.expected.installed,check.want);assert.equal(check.unchanged,true);assert.ok(check.text.includes(check.expected.configuration==='No configuration'?'aircraft default':check.expected.configuration));}assert.ok(checks.some(c=>c.expected.configuration==='CASEVAC'&&c.expected.installed));assert.equal(checks[0].expected.installed,false);
  });
  await t.test('already excluded removes physical fit without subtracting accepted weight and survives presets/reload',async()=>{
    await fresh();await isolateDefaults();const key='RF_AIRCRAFT_SYSTEMS_AIR_COOLING_PACK';
    await page.locator('#roleFitDetails').evaluate(el=>el.open=true);
    await page.locator(`[data-role-key="${key}"] [data-declaration="EXCLUDED"]`).click();assert.match(await page.locator(`[data-role-key="${key}"] .role-fit-helper`).textContent(),/Weight adjustment: 0 kg/);
    const result=await page.evaluate(key=>{const s=STORE.sessions[STORE.selectedTail];const before=computeWB(s.tail);for(const p of Object.keys(AC.presets))applyPreset(s.tail,p);const row=roleFitAccountingRows(s).find(x=>x.key===key);persistSession();return {before:before.roleFitAdjustmentW,row,issues:accountingIssues(s)};},key);near(result.before,0);near(result.row.w,0);near(result.row.m,0);assert.equal(result.row.current,false);assert.equal(result.row.declaration,'EXCLUDED');assert.deepEqual(result.issues,[]);
    await page.reload();await page.waitForFunction(()=>STORE.selectedTail);assert.equal(await page.evaluate(key=>roleFitDeclaration(STORE.sessions[STORE.selectedTail],key),key),'EXCLUDED');
    await page.evaluate(()=>setTab('CONFIG'));assert.equal(await page.locator('#roleFitList').isVisible(),false);await page.evaluate(()=>render());assert.equal(await page.locator('#roleFitList').isVisible(),false);await page.locator('#roleFitDetails > summary').click();assert.equal(await page.locator('#roleFitList').isVisible(),true);
  });
  await t.test('four buttons select accepted fit or preset adjustment for every item in all configurations',async()=>{
    for(const preset of ['', 'SAR3','SAR10','CASEVAC','TRANSPORT']){
      await fresh();const result=await page.evaluate(preset=>{const s=STORE.sessions[STORE.selectedTail];if(preset)applyPreset(s.tail,preset);renderRoleFitDeclarations(s);return Object.keys(AC.roleFit).map(key=>({key,normal:!!AC.roleFit[key].normally,baseline:s.accepted.maintenanceBaseline.roleFit[key],on:!!AC.presets[preset]?.roleFitOn.includes(key),off:!!AC.presets[preset]?.roleFitOff.includes(key),selected:document.querySelector(`[data-role-key="${key}"] [data-declaration][aria-pressed="true"]`)?.dataset.declaration,count:document.querySelectorAll(`[data-role-key="${key}"] [data-declaration]`).length}));},preset);
      for(const row of result){assert.equal(row.count,4);assert.equal(row.selected,row.off?(row.baseline?'REMOVE':'EXCLUDED'):(row.on||row.normal)?(row.baseline?'ACCOUNTED':'ADD'):row.baseline?'ACCOUNTED':'EXCLUDED',preset+': '+row.key);}
    }
    await fresh('RFM');const unknown=await page.evaluate(key=>{const s=STORE.sessions[STORE.selectedTail];renderRoleFitDeclarations(s);return {selected:document.querySelectorAll(`[data-role-key="${key}"] [data-declaration][aria-pressed="true"]`).length,helper:document.querySelector(`[data-role-key="${key}"] .role-fit-helper`).textContent};},WS);assert.equal(unknown.selected,1);assert.match(unknown.helper,/removed|fitted/);
  });
  await t.test('accepted maintenance removals stay locked at zero',async()=>{
    await fresh();const r=await page.evaluate(key=>{const s=STORE.sessions[STORE.selectedTail];s.accepted.maintenanceExceptions=[key];s.accepted.maintenanceBaseline.roleFit[key]=false;const error=setRoleFitDeclaration(s,key,'ADD');applyPreset(s.tail,'SAR3');return {error,state:roleFitDeclaration(s,key),row:roleFitAccountingRows(s).find(x=>x.key===key)};},HOIST);assert.match(r.error,/already/);assert.equal(r.state,'NEUTRAL');near(r.row.w,0);assert.equal(r.row.current,false);
  });
  await t.test('ACCOUNTED cabinet permits physical stowage without adding cabinet mass',async()=>{
    await fresh();const r=await page.evaluate(key=>{const s=STORE.sessions[STORE.selectedTail];setRoleFitDeclaration(s,key,'ACCOUNTED');applyPreset(s.tail,'SAR3');setTab('CARGO');return {fit:roleFitIsInstalled(s,key),row:roleFitAccountingRows(s).find(x=>x.key===key),markers:s.zones.map((z,i)=>({z,i})).filter(({z})=>AC.stowage[z.id]?.group==='SAR Cabinet').map(({i})=>!document.querySelector(`input[data-zone="w"][data-i="${i}"]`).disabled)};},CAB);assert.equal(r.fit,true);near(r.row.w,0);assert.ok(r.markers.length);assert.ok(r.markers.every(Boolean));
  });
  await t.test('CASEVAC adds four independent quarter-mass racks once at their patient arms',async()=>{
    await fresh();const r=await page.evaluate(()=>{const s=STORE.sessions[STORE.selectedTail];applyPreset(s.tail,'CASEVAC');applyPreset(s.tail,'CASEVAC');return CASEVAC_RACK_KEYS.map(key=>({item:AC.roleFit[key],count:AC.presets.CASEVAC.roleFitOn.filter(k=>k===key).length,row:roleFitAccountingRows(s).find(x=>x.key===key)}));});for(const row of r){assert.equal(row.count,1);near(row.item.w,30.0225);near(row.row.w,30.0225);near(row.row.m,30.0225*row.item.arm);}near(r.reduce((n,row)=>n+row.row.w,0),120.09);near(r.reduce((n,row)=>n+row.row.m,0),30.0225*(7898+6120+10235+10057));
    await page.evaluate(()=>render());assert.match(await page.locator('[data-role-key="RF_SAR_EQUIPMENT_CASEVAC_RACK_FWD_STBD"]').textContent(),/30.0225/);
  });
  await t.test('legacy complete rack settings split while a custom adjustment remains single and retains its original moment',async()=>{
    await fresh();const r=await page.evaluate(()=>{const old='RF_CASEVAC_STRETCHER_RACK_4',s=STORE.sessions[STORE.selectedTail];AC.roleFit={...AC.roleFit};for(const key of CASEVAC_RACK_KEYS){delete s.roleFitDeclarations[key];delete AC.roleFit[key];}s.roleFitDeclarations[old]='ACCOUNTED';s.roleFitDeclarationOrigins[old]='manual';s.customExceptions=[{roleFitKey:old,description:'Legacy rack',accounting:'APPLY',w:121.25,arm:8577}];AC.roleFit[old]={w:121.25,arm:8577,normally:false,maintenanceIncluded:false};AC.presets.CASEVAC.roleFitOn=[old];normalizeAccountingConfiguration();normalizeRackSessionKey(s);const custom=computeCustomExceptionTotals(s);return {racks:CASEVAC_RACK_KEYS.map(key=>({key,weight:AC.roleFit[key].w,state:roleFitDeclaration(s,key),row:roleFitAccountingRows(s).find(r=>r.key===key)})),links:s.customExceptions[0].roleFitKeys,custom,preset:AC.presets.CASEVAC.roleFitOn,oldPresent:!!AC.roleFit[old]};});assert.equal(r.oldPresent,false);assert.equal(r.links.length,4);assert.equal(r.preset.length,4);near(r.custom.w,121.25);near(r.custom.m,121.25*8577);for(const rack of r.racks){near(rack.weight,121.25/4);assert.equal(rack.state,'NEUTRAL');near(rack.row.w,0);}await page.reload();await page.waitForFunction(()=>STORE.selectedTail);
  });
  await t.test('legacy accepted rack inclusion and maintenance removals migrate to each installation without changing accepted weight',async()=>{
    await fresh();const r=await page.evaluate(()=>{const s=STORE.sessions[STORE.selectedTail],old='RF_SAR_EQUIPMENT_CASEVAC_RACK_SYSTEM';for(const key of CASEVAC_RACK_KEYS){delete s.accepted.maintenanceBaseline.roleFit[key];delete s.roleFitDeclarations[key];}s.accepted.maintenanceBaseline.roleFit[old]=true;s.roleFitDeclarations[old]='NEUTRAL';normalizeRackSessionKey(s);const included=CASEVAC_RACK_KEYS.map(key=>({fit:roleFitIsInstalled(s,key),w:roleFitAccountingRows(s).find(r=>r.key===key).w}));s.accepted.maintenanceExceptions=[old];normalizeRackSessionKey(s);const removed=CASEVAC_RACK_KEYS.map(key=>roleFitRemovedInAcceptedRecord(s,key));return {included,removed,basicW:s.accepted.basicW};});assert.ok(r.included.every(row=>row.fit&&row.w===0));assert.ok(r.removed.every(Boolean));near(r.basicW,10000.25);
  });
  await t.test('custom signed adjustments versus already included and preset protection',async()=>{
    await fresh();await isolateDefaults();const r=await page.evaluate(()=>{const s=STORE.sessions[STORE.selectedTail];s.customExceptions=[{id:'duct',description:'ECS ducting packaging',w:-3.6,arm:9500,accounting:'APPLY',source:'Test reference'}];const a=computeWB(s.tail);s.customExceptions[0].accounting='ACCOUNTED';const b=computeWB(s.tail);applyPreset(s.tail,'CASEVAC');return {a:{w:a.opWExact,m:a.opM},b:{w:b.opWExact,m:b.opM},state:s.customExceptions[0].accounting};});near(r.a.w,9996.65);near(r.a.m,10000.25*8500-34200);near(r.b.w,10000.25);assert.equal(r.state,'ACCOUNTED');
  });
  await t.test('linked or exact-name custom equipment cannot be counted twice',async()=>{
    await fresh();const r=await page.evaluate(key=>{const s=STORE.sessions[STORE.selectedTail];s.customExceptions=[{description:AC.roleFit[key].name,w:46.69,arm:5830,accounting:'APPLY'}];applyPreset(s.tail,'SAR3');const declarations=computeRoleFitAdjustment(s);const custom=computeCustomExceptionTotals(s);const actionError=setRoleFitDeclaration(s,key,'ADD');s.roleFitDeclarations[key]='ADD';const conflict=accountingIssues(s);const standard=roleFitAccountingRows(s).find(x=>x.key===key);s.customExceptions.push({...s.customExceptions[0]});return {row:standard,custom:custom.w,error:actionError,conflict,duplicates:computeCustomExceptionTotals(s).w,issues:accountingIssues(s)};},WS);near(r.row.w,0);near(r.custom,46.69);assert.match(r.error,/Custom Exception/);assert.ok(r.conflict.length);near(r.duplicates,0);assert.ok(r.issues.some(x=>x.includes('more than one')));
  });
  await t.test('UI buttons, custom accounting and invalidation are wired',async()=>{
    await fresh();await page.locator('#roleFitDetails').evaluate(el=>el.open=true);await page.locator(`[data-role-key="${WS}"] [data-declaration="ACCOUNTED"]`).click();assert.equal(await page.evaluate(key=>roleFitDeclaration(STORE.sessions[STORE.selectedTail],key),WS),'ACCOUNTED');
    await page.locator('#customExceptionsCard > summary').click();await page.click('#btnAddCustomException');await page.locator('[data-ce="description"]').fill('Duct packaging');await page.locator('[data-ce="w"]').fill('-3.6');await page.locator('[data-ce="arm"]').fill('9500');await page.locator('[data-ce="arm"]').press('Tab');
    await page.locator('[data-ce="w"]').fill('3.6');await page.locator('[data-ce-sign]').click();assert.equal(await page.locator('[data-ce="w"]').inputValue(),'-3.6');near(await page.evaluate(()=>computeCustomExceptionTotals(STORE.sessions[STORE.selectedTail]).m),-34200);
    await page.locator('[data-ce-sign]').click();assert.equal(await page.locator('[data-ce="w"]').inputValue(),'3.6');await page.locator('[data-ce-sign]').click();
    await page.locator('[data-ce-accounting]').selectOption('ACCOUNTED');assert.match(await page.locator('[data-ce-applied]').textContent(),/^0 kg/);assert.equal(await page.evaluate(()=>computeCustomExceptionTotals(STORE.sessions[STORE.selectedTail]).w),0);
    await page.evaluate(()=>{const s=STORE.sessions[STORE.selectedTail];s.certify.certified=true;});await page.locator(`[data-role-key="${WS}"] [data-declaration="REMOVE"]`).click();assert.equal(await page.evaluate(()=>STORE.sessions[STORE.selectedTail].certify.certified),true);await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await page.evaluate(()=>STORE.sessions[STORE.selectedTail].certify.certified),true);await page.locator(`[data-role-key="${WS}"] [data-declaration="REMOVE"]`).click();await page.getByRole('button',{name:'Confirm Subtraction',exact:true}).click();assert.equal(await page.evaluate(()=>STORE.sessions[STORE.selectedTail].certify.certified),false);
    assert.equal(await page.locator('#customExceptionsCard').getAttribute('data-reviewed'),'false');
    assert.ok(await page.evaluate(()=>!!(document.getElementById('customExceptionsCard').compareDocumentPosition(document.getElementById('roleFitDetails'))&Node.DOCUMENT_POSITION_FOLLOWING)));
    await page.locator('#customExceptionsReviewed').check();assert.equal(await page.locator('#customExceptionsCard').getAttribute('data-reviewed'),'true');assert.match(await page.locator('#documentationReviewStatus').textContent(),/review confirmed/);
    await page.locator('[data-ce="description"]').fill('Updated duct packaging');assert.equal(await page.locator('#customExceptionsCard').getAttribute('data-reviewed'),'false');assert.equal(await page.locator('#customExceptionsReviewed').isChecked(),false);
    await page.screenshot({path:path.join(output,'mission-config.png'),fullPage:true});
  });
  await t.test('save/reopen offline preserves declarations and custom accounting',async()=>{
    await page.evaluate(()=>persistSession());await context.setOffline(true);await page.reload();await page.waitForFunction(()=>STORE.selectedTail);assert.equal(await page.evaluate(key=>roleFitDeclaration(STORE.sessions[STORE.selectedTail],key),WS),'REMOVE');assert.equal(await page.evaluate(()=>STORE.sessions[STORE.selectedTail].customExceptions[0].accounting),'ACCOUNTED');await context.setOffline(false);
  });
  await t.test('legacy schema4 is preserved and migrated with review required',async()=>{
    await fresh();const legacy=await page.evaluate(key=>{const s=STORE.sessions[STORE.selectedTail];s.roleFit[key]=true;delete s.roleFitDeclarations;delete s.roleFitDeclarationOrigins;s.certify.certified=true;const raw=JSON.stringify({schema:4,appVersion:'0.2.10',selectedTail:s.tail,activeTab:'CONFIG',sessions:{[s.tail]:s}});localStorage.setItem('wb615_session',raw);return raw;},WS);
    await page.reload();await page.waitForSelector('#confirmAccountingReview');assert.equal(await page.evaluate(()=>localStorage.getItem('wb615_session_before_accounting_v5')),legacy);assert.equal(await page.evaluate(key=>roleFitDeclaration(STORE.sessions[STORE.selectedTail],key),WS),'ADD');assert.equal(await page.evaluate(()=>STORE.sessions[STORE.selectedTail].certify.certified),false);assert.ok(await page.evaluate(()=>accountingIssues(STORE.sessions[STORE.selectedTail]).length));await page.click('#confirmAccountingReview');assert.equal(await page.evaluate(()=>STORE.sessions[STORE.selectedTail].accountingReviewRequired),false);
  });
  await t.test('PDF contains accounted/custom calculation trail and exact rack value',async()=>{
    await fresh();await page.evaluate(({ws,rack})=>{const s=STORE.sessions[STORE.selectedTail];setRoleFitDeclaration(s,ws,'ACCOUNTED');setRoleFitDeclaration(s,rack,'ADD');s.customExceptions=[{description:'Duct packaging already reflected',w:-3.6,arm:9500,accounting:'ACCOUNTED',source:'Local test reference'},{description:'Test addition',w:2.35,arm:8400,accounting:'APPLY',source:'Local test reference'}];s.fuel.total=1000;s.customExceptionsReviewed=true;s.certify={certified:true,by:'LOCAL TEST',at:new Date().toISOString(),mcdu:{}};persistSession();}, {ws:WS,rack:RACK});
    const captured=await page.evaluate(()=>{const s=STORE.sessions[STORE.selectedTail];const doc=new window.jspdf.jsPDF();const p=new PDFContext(doc,s.tail,s,computeWB(s.tail));const tables=[];p.table=(headers,rows,widths)=>tables.push({headers,rows,widths});p.drawAccountingTrail();if(tables.length)throw new Error("Acceptance must not repeat equipment tables");p.drawRoleFitAppendix();p.drawCustomExceptionsAppendix();return tables;});
    const text=JSON.stringify(captured);assert.ok(captured[0].rows.length>2);assert.ok(!JSON.stringify(captured[0]).includes("already reflected"));assert.match(text,/30.0225/);assert.match(text,/-3.6/);assert.ok(captured.every(t=>t.widths.reduce((a,b)=>a+b,0)===188));
    await page.evaluate(()=>{const s=STORE.sessions[STORE.selectedTail];for(const key of Object.keys(AC.crewSeats)){s.seats[key]=true;s.occupants[key]={type:'crew',label:'TEST'};}});
    const seats=await page.evaluate(()=>{const s=STORE.sessions[STORE.selectedTail],p=new PDFContext(new window.jspdf.jsPDF(),s.tail,s,computeWB(s.tail)),rows=[];p.table=(h,r)=>rows.push(...r);p.drawSeats();return JSON.stringify(rows);});assert.match(seats,/90.7 kg @ 4459 mm/);assert.match(seats,/4559 mm/);
    const download=page.waitForEvent('download');await page.evaluate(()=>generateWBReport());await (await download).saveAs(path.join(output,'Mission_Config_LOCAL_TEST.pdf'));
  });
  await t.test('deleted editor role-fit stays deleted after reload and stale references are removed',async()=>{
    await fresh();await page.evaluate(key=>{const s=STORE.sessions[STORE.selectedTail];setRoleFitDeclaration(s,key,'ADD');EDITOR.draft={missionEquip:AC.missionEquip,stowage:AC.stowage,roleFit:{...AC.roleFit},crewSeats:AC.crewSeats,paxSeats:AC.paxSeats,presets:JSON.parse(JSON.stringify(AC.presets)),referenceDocuments:AC.meta.referenceDocuments};delete EDITOR.draft.roleFit[key];editorSaveDraft();},RACK);
    await page.reload();await page.waitForFunction(()=>STORE.selectedTail);const r=await page.evaluate(key=>({exists:!!AC.roleFit[key],preset:AC.presets.CASEVAC.roleFitOn.includes(key),saved:Object.hasOwn(STORE.sessions[STORE.selectedTail].roleFitDeclarations,key)}),RACK);assert.deepEqual(r,{exists:false,preset:false,saved:false});
  });
  await t.test('return to available clears per-sortie accounting',async()=>{
    await page.evaluate(()=>returnToAvailable(STORE.selectedTail,'Test'));assert.equal(await page.evaluate(()=>STORE.sessions[STORE.selectedTail].customExceptions.length),0);assert.ok(await page.evaluate(()=>Object.values(STORE.sessions[STORE.selectedTail].roleFitDeclarations).every(x=>x==='NEUTRAL')));
  });
  assert.deepEqual(errors,[]);await context.close();
});
