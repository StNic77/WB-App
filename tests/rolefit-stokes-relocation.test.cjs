const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/sstni/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');let server,browser;
after(async()=>{await browser?.close();if(server)await new Promise(r=>server.close(r));});

test('Role-Fit removal warns and relocates dependent Stokes load',async()=>{
  server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname;const file=path.join(root,name==='/'?'index.html':name);res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'application/octet-stream');res.setHeader('Cache-Control','no-store');try{res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end();}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage({viewport:{width:1100,height:900}});page.on('dialog',dialog=>dialog.accept());
  await page.goto('http://127.0.0.1:'+server.address().port+'/');await page.waitForFunction(()=>typeof STORE!=='undefined');await page.click('#splashAck');
  await page.evaluate(()=>{
    const tail=STORE.tails[0],s=makeNewSession(tail,false);STORE.sessions[tail]=s;STORE.selectedTail=tail;
    Object.assign(s.accepted,{isAccepted:true,by:'TEST',basicW:10000,basicCG:8500,basicWeightBasis:'MAINTENANCE',maintenanceBaseline:fleetMaintenanceBaseline(),maintenanceExceptions:[]});
    s.accepted.maintenanceBaseline.roleFit.RF_STOW_STOKES_RAMP=true;s.ui??={};s.ui.roleFitGroups={'Stowage Fittings':true};
    applyPreset(tail,'SAR3');setTab('CONFIG');render();
  });
  const fit=page.locator('[data-role-key="RF_STOW_STOKES_RAMP"]');
  await page.locator('#roleFitDetails').evaluate(el=>el.open=true);
  assert.match(await fit.locator('.role-fit-helper').textContent(),/Stokes Litter \(Ramp\).*assigned to stowage/);
  await fit.locator('[data-declaration="REMOVE"]').click();await page.getByRole('button',{name:'Confirm Subtraction',exact:true}).click();
  let state=await page.evaluate(()=>{const s=STORE.sessions[STORE.selectedTail],key='ME_SAR_MISSION_EQUIP_STOKES_LITTER_RAMP',allocation=missionAllocations(s,key)[0],row=missionRows(s).find(x=>x.key===key);return {selected:s.mission[key],allocation,installed:roleFitIsInstalled(s,'RF_STOW_STOKES_RAMP'),issues:missionIssues(s).join(' '),cg:computeWB(s.tail).opCG,row};});
  assert.equal(state.selected,true);assert.equal(state.allocation.stow,'');assert.equal(state.allocation.needsRelocationFrom,'RAMP_STOW');assert.equal(state.installed,false);assert.match(state.issues,/remains in the load; select another stowage location/);assert.equal(state.cg,null);assert.match(state.row.error,/previous location is unavailable/);
  await page.evaluate(()=>{const s=STORE.sessions[STORE.selectedTail],allocation=missionAllocations(s,'ME_SAR_MISSION_EQUIP_STOKES_LITTER_RAMP')[0];allocation.stow='CABIN_DEPLOYED';delete allocation.needsRelocationFrom;});
  assert.ok(Number.isFinite(await page.evaluate(()=>computeWB(STORE.selectedTail).opCG)));

  await page.close();
});
