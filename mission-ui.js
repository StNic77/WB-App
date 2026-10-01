/* Loading view derives from the same allocations used in equipment view and W&B. */
function renderMissionLocationGroups(s,host){
  const rows=missionRows(s).filter(r=>r.group!=='CREW PERSONAL EQUIP'&&r.quantity>0);
  const locations=missionLocations(),groups=new Map();
  for(const [id,loc] of Object.entries(locations)){
    // Linked carrying items appear through the location of their own allocation.
    if(loc.missionKey)continue;
    groups.set(id,{name:loc.name,unavailable:!!resolveMissionLocation(s,{stow:id}).error,rows:[]});
  }
  for(const row of rows){
    const id=row.error?'REQUIRES_STOWAGE':row.stowId==='CUSTOM'?'CUSTOM:'+row.arm:row.stowId;
    if(!groups.has(id))groups.set(id,{name:row.error?'Stowage required':row.stow,rows:[],unavailable:false});
    groups.get(id).rows.push(row);
  }
  const sorted=[...groups.entries()].sort(([a],[b])=>a==='REQUIRES_STOWAGE'?-1:b==='REQUIRES_STOWAGE'?1:0);
  for(const [id,group] of sorted){
    const count=group.rows.reduce((n,r)=>n+r.quantity,0);
    if(group.unavailable){
      const card=document.createElement('div');card.className='card stowage-unavailable';card.setAttribute('aria-disabled','true');
      const title=document.createElement('b');title.textContent=group.name+' — Not fitted';card.append(title);
      const help=document.createElement('div');help.className='small';help.textContent='To use this stowage location, fit it in Role Config.';card.append(help);host.append(card);continue;
    }
    const card=document.createElement('details');card.className='card';card.dataset.stowageGroup=id;
    card.open=!!s.ui.locationGroups?.[id];card.ontoggle=()=>{s.ui.locationGroups??={};s.ui.locationGroups[id]=card.open;};
    const title=document.createElement('summary');title.textContent=group.name+' — '+count+' '+(count===1?'item':'items');card.append(title);
    for(const row of group.rows){
      const item=document.createElement('div');item.className='card';
      const name=document.createElement('b');name.textContent=row.name+' · Qty '+row.quantity;item.append(name);
      const info=document.createElement('div');info.className='small';info.textContent=fmtDecimal(row.unitWeight)+' kg each · '+fmtDecimal(row.w)+' kg total · '+(Number.isFinite(row.arm)?row.arm+' mm':'Stowage required');item.append(info);
      const stow=document.createElement('div');stow.className='small';stow.textContent=row.error?'Fit the required stowage in Role Config, or select another available location.':row.stow;item.append(stow);
      if(row.description){const description=document.createElement('div');description.className='small muted';description.textContent=row.description;item.append(description);}
      if(row.error){const edit=document.createElement('button');edit.className='btn small';edit.textContent='Choose stowage';edit.onclick=()=>{s.ui.missionView='equipment';s.ui.meGroups[row.group]=true;renderMissionEquipment();};item.append(edit);}
      card.append(item);
    }
    if(!count){const empty=document.createElement('p');empty.className='small muted';empty.textContent='No equipment assigned.';card.append(empty);}
    host.append(card);
  }
}
/* Uses the existing cards, toggles, fields and buttons. */
function renderConfigurationButtons(s){
  const first=document.getElementById('btnPresetSAR3')||document.querySelector('[data-configuration-buttons]');
  if(!first)return;
  const host=first.hasAttribute('data-configuration-buttons')?first:first.parentElement;
  host.setAttribute('data-configuration-buttons','');host.innerHTML='';
  for(const [key,p] of Object.entries(AC.presets)){
    if(p.active===false)continue;
    const b=document.createElement('button');b.className='btn'+(s.preset===key?' good':'');b.textContent=p.name;
    b.id='btnPreset'+key;b.dataset.preset=key;b.onclick=()=>{applyPreset(s.tail,key);render();};host.append(b);
  }
}
function missionLocationOptions(s,row,item){
  const esc=escapeHtml;
  let out='<option value="">— Select location —</option>';
  if(true){
    out+=`<option value="BASKET" ${row.stow==='BASKET'&&!row.basketRef?'selected':''}>Follow carrying item (automatic if only one)</option>`;
    for(const b of missionBaskets(s)){
      const value='BASKET:'+b.key+':'+b.id;
      out+=`<option value="${esc(value)}" ${row.stow==='BASKET'&&row.basketRef?.key===b.key&&row.basketRef?.id===b.id?'selected':''}>In ${esc(b.label)}</option>`;
    }
  }
  for(const [id,loc] of Object.entries(missionLocations())){
    const unavailable=(loc.group==='SAR Cabinet'&&!roleFitIsInstalled(s,'RF_SAR_EQUIPMENT_FWD_SAR_CABINET'))||(loc.roleFitKey&&!roleFitIsInstalled(s,loc.roleFitKey))||(loc.missionKey&&!s.mission?.[loc.missionKey]);
    out+=`<option value="${esc(id)}" ${row.stow===id?'selected':''} ${unavailable?'disabled':''}>${esc(loc.name)} ${loc.arm==null?'': '('+loc.arm+' mm)'}${unavailable?' — unavailable':''}</option>`;
  }
  return out+`<option value="CUSTOM" ${row.stow==='CUSTOM'?'selected':''}>Custom arm</option>`;
}
function renderMissionEquipment(){
  const s=STORE.sessions[STORE.selectedTail],host=document.getElementById('missionEquipList');if(!s||!host)return;
  s.ui??={};s.ui.meGroups??={};host.innerHTML='';
  const issues=missionIssues(s);
  if(issues.length||missionConfigNotice){
    const box=document.createElement('div');box.className='callout';box.setAttribute('role','alert');
    box.innerHTML=[missionConfigNotice,...issues].filter(Boolean).map(escapeHtml).join('<br>');
    if(s.missionReviewRequired){const button=document.createElement('button');button.className='btn';button.textContent='Confirm recovered load checked';button.onclick=()=>{s.missionReviewRequired=false;invalidateAccountingCertification(s);render();};box.append(button);}
    host.append(box);
  }
  const view=document.createElement('div');view.className='card';
  view.innerHTML='<div class="row"><b>Group By:</b><button class="btn" data-mission-view="equipment">Equipment Group</button><button class="btn" data-mission-view="location">Stowage Location</button></div><p class="small muted">Select the configuration you are preparing in Role Config. In Mission Equipment, switch Group By to Stowage Location, then open a location to see the equipment and quantities assigned there for the selected configuration.</p>';
  host.append(view);
  const byLocation=s.ui.missionView==='location';
  for(const button of view.querySelectorAll('[data-mission-view]')){
    const selected=(button.dataset.missionView==='location')===byLocation;button.classList.toggle('good',selected);button.setAttribute('aria-pressed',selected);
    button.onclick=()=>{s.ui.missionView=button.dataset.missionView;renderMissionEquipment();};
  }
  if(byLocation)renderMissionLocationGroups(s,host);
  for(const group of [...missionGroupNames(),'Stowage']){
    if(byLocation&&group!=='CREW PERSONAL EQUIP'&&group!=='Stowage')continue;
    const keys=Object.keys(AC.missionEquip).filter(k=>AC.missionEquip[k].group===group&&(AC.missionEquip[k].active!==false||s.mission[k]));if(!keys.length)continue;
    const card=document.createElement('details');card.className='card';card.open=!!s.ui.meGroups[group];
    const selected=keys.filter(k=>s.mission[k]).length;
    card.innerHTML=`<summary><b>${escapeHtml(group==='Stowage'?'Available Stowage Locations':group)}</b> · ${selected} ON</summary>`;
    card.ontoggle=()=>{s.ui.meGroups[group]=card.open;};
    for(const key of keys){
      const item=AC.missionEquip[key],on=!!s.mission[key],marker=group==='Stowage';
      const row=document.createElement('div');row.className='card';row.style.cssText='padding:12px;margin-top:8px;box-shadow:none';row.dataset.missionKey=key;
      const label=document.createElement('label');label.className='row';
      const toggle=document.createElement('input');toggle.type='checkbox';toggle.checked=on;toggle.style.cssText='width:20px;height:20px;flex:0 0 20px';toggle.setAttribute('aria-label','Carry '+item.name);
      const loc=AC.stowage[item.stow],cabinetUnavailable=marker&&loc?.group==='SAR Cabinet'&&!roleFitIsInstalled(s,'RF_SAR_EQUIPMENT_FWD_SAR_CABINET');toggle.disabled=cabinetUnavailable||(!on&&item.active===false);
      toggle.onchange=()=>{
        if(marker&&!toggle.checked&&missionRows(s).some(r=>r.stowId===item.stow&&r.quantity>0)){alert('Relocate equipment from this location before making it unavailable.');toggle.checked=true;return;}
        s.mission[key]=toggle.checked;invalidateAccountingCertification(s);render();
      };
      const title=document.createElement('b');title.textContent=item.name+(item.active===false?' (retired)':'');label.append(toggle,title);row.append(label);
      if(marker){const note=document.createElement('div');note.className='small';note.textContent=loc?.name||item.stow;row.append(note);card.append(row);continue;}
      const detail=document.createElement('div');detail.className='small muted';detail.textContent=`${item.unitWeight} kg each · Default ${item.defaultQuantity}${item.description?' · '+item.description:''}`;row.append(detail);
      if(on){
        const allocations=missionAllocations(s,key),total=allocations.reduce((n,r)=>n+r.quantity,0);
        const changes=()=>{invalidateAccountingCertification(s);render();};
        allocations.forEach((allocation,index)=>{
          const load=document.createElement('div');load.className='row mission-allocation';load.style.cssText='gap:8px;margin-top:10px;align-items:center';
          const adjust=!!item.missionQuantityEditable||!!s.ui['adjust:'+key];
          const qty=document.createElement('div');qty.className='row';qty.style.gap='6px';
          if(adjust){
            for(const delta of [-1,1]){
              const button=document.createElement('button');button.className='btn';button.style.minWidth='44px';button.style.minHeight='44px';button.textContent=delta<0?'−':'+';
              button.setAttribute('aria-label',(delta<0?'Decrease ':'Increase ')+item.name+' quantity at location '+(index+1));
              button.disabled=delta<0?(allocation.quantity<=0||total<=(item.minQuantity??0)):total>=(item.maxQuantity??Infinity);
              button.onclick=()=>{editMissionAllocations(s,key)[index].quantity+=delta;changes();};
              if(delta===1){const count=document.createElement('span');count.className='mono';count.textContent=allocation.quantity;qty.append(count);}
              qty.append(button);
            }
          }else qty.textContent='Qty '+allocation.quantity;
          load.append(qty);
          const location=document.createElement('select');location.setAttribute('aria-label',item.name+' location '+(index+1));location.style.flex='1 1 240px';location.innerHTML=missionLocationOptions(s,allocation,item);
          location.onchange=()=>{
            const r=editMissionAllocations(s,key)[index],value=location.value;
            r.basketRef=null;
            if(value.startsWith('BASKET:')){const [,basketKey,id]=value.split(':');r.stow='BASKET';r.basketRef={key:basketKey,id};}else r.stow=value;
            if(value==='CUSTOM'&&!Number.isFinite(r.customArm))r.customArm=resolveMissionLocation(s,allocation).arm??0;
            changes();
          };load.append(location);
          if(allocation.stow==='CUSTOM'){
            const input=document.createElement('input');input.type='number';input.step='any';input.style.width='110px';input.value=allocation.customArm??'';input.setAttribute('aria-label',item.name+' arm '+(index+1));
            input.onchange=()=>{if(!Number.isFinite(input.valueAsNumber)){input.reportValidity();return;}editMissionAllocations(s,key)[index].customArm=input.valueAsNumber;changes();};load.append(input);
          }
          const mass=document.createElement('span');mass.className='mono small';mass.textContent=`${allocation.quantity} × ${item.unitWeight} = ${fmtDecimal(allocation.quantity*item.unitWeight)} kg`;load.append(mass);
          if(allocation.quantity>1){const split=document.createElement('button');split.className='btn small';split.textContent='Split location';split.onclick=()=>{const arr=editMissionAllocations(s,key);arr[index].quantity--;arr.push({...arr[index],id:crypto.randomUUID(),quantity:1});changes();};load.append(split);}
          if(allocations.length>1){const remove=document.createElement('button');remove.className='btn small';remove.textContent='Remove row';remove.onclick=()=>{if(total-allocation.quantity<(item.minQuantity??0)){alert('This would be below the minimum quantity.');return;}editMissionAllocations(s,key).splice(index,1);changes();};load.append(remove);}
          row.append(load);
          const resolved=resolveMissionLocation(s,allocation);if(resolved.error&&allocation.quantity>0){const note=document.createElement('div');note.className='small';note.style.color='var(--bad)';note.textContent='Stowage required — '+item.name+': '+resolved.error+'. Where will this equipment be carried? Select a location above or split the items between locations.';row.append(note);}
        });
        const controls=document.createElement('div');controls.className='row';controls.style.marginTop='8px';
        if(!item.missionQuantityEditable){const b=document.createElement('button');b.className='btn small';b.textContent=s.ui['adjust:'+key]?'Hide quantity controls':'Adjust mission quantity';b.onclick=()=>{s.ui['adjust:'+key]=!s.ui['adjust:'+key];render();};controls.append(b);}
        const extra=document.createElement('button');extra.className='btn small';extra.textContent='Add at another location';extra.disabled=total>=(item.maxQuantity??Infinity);extra.onclick=()=>{editMissionAllocations(s,key).push({id:crypto.randomUUID(),quantity:1,stow:'',customArm:null});s.ui['adjust:'+key]=true;changes();};controls.append(extra);
        const reset=document.createElement('button');reset.className='btn small';reset.textContent='Use item defaults';reset.onclick=()=>{if(s.missionLoads)delete s.missionLoads[key];changes();};controls.append(reset);row.append(controls);
      }
      card.append(row);
    }
    host.append(card);
  }
  const totals={};for(const row of missionRows(s)){const t=totals[row.stow]??={w:0,m:0};t.w+=row.w;t.m+=row.m;}
  document.getElementById('stowageTotals').innerHTML='<table class="table"><thead><tr><th>Location</th><th>kg</th><th>Arm mm</th></tr></thead><tbody>'+Object.entries(totals).map(([name,t])=>`<tr><td>${escapeHtml(name)}</td><td>${fmtDecimal(t.w)}</td><td>${t.w&&Number.isFinite(t.m)?fmtDecimal(t.m/t.w):'—'}</td></tr>`).join('')+'</tbody></table>';
  const me=computeMissionTotals(s),wb=computeWB(s.tail);
  document.getElementById('missionKpi').innerHTML=`<div class="box"><div class="t">Mission Equipment</div><div class="v">${fmtDecimal(me.w)} kg</div></div><div class="box"><div class="t">Operating Weight / CG</div><div class="v">${wb.opW} kg / ${wb.opCG} mm</div></div>`;
  const canvas=document.getElementById('envCanvasMission'),wrap=document.getElementById('envWrapMission'),notes=document.getElementById('envNotesMission');
  if(canvas?.offsetParent)drawEnvelope(canvas,notes);
  const toggle=document.getElementById('envToggleMission');
  if(toggle&&wrap)toggle.onclick=()=>{const expand=wrap.style.display==='none';wrap.style.display=expand?'':'none';toggle.textContent=expand?'Collapse':'Expand';if(expand)drawEnvelope(canvas,notes);};
}
