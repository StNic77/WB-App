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
    if(s.missionReviewRequired){const btn=document.createElement('button');btn.className='btn';btn.textContent='Confirm equipment reviewed';btn.onclick=()=>{s.missionReviewRequired=false;invalidateAccountingCertification(s);render();};box.append(btn);}
    host.append(box);
  }
  for(const group of [...MISSION_GROUPS,'Stowage']){
    const keys=Object.keys(AC.missionEquip).filter(k=>AC.missionEquip[k].group===group&&(AC.missionEquip[k].active!==false||s.mission[k]));if(!keys.length)continue;
    const card=document.createElement('details');card.className='card';card.open=!!s.ui.meGroups[group]||keys.some(k=>s.mission[k]&&missionAllocations(s,k).some(r=>r.quantity>0&&resolveMissionLocation(s,r).error));
    const selected=keys.filter(k=>s.mission[k]).length;
    card.innerHTML=`<summary><b>${escapeHtml(group==='Stowage'?'Available Stowage Locations':group)}</b> · ${selected} ON</summary>`;
    card.ontoggle=()=>{s.ui.meGroups[group]=card.open;persistSession();};
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
