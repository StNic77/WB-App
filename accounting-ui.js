function renderAccountingWarnings(s){
  const notice=document.getElementById('accountingReviewNotice');
  notice.hidden=!s.accountingReviewRequired;
  if(s.accountingReviewRequired){
    notice.innerHTML='<b>Review required.</b> Role-fit data or accounting rules have changed. Check the fitted equipment and weight adjustments against the accepted aircraft record before certifying. <button class="btn" id="confirmAccountingReview" type="button">I have reviewed these declarations</button>';
    notice.querySelector('button').onclick=()=>{s.accountingReviewRequired=false;render();};
  }
  const issues=[...accountingIssues(s),...missionIssues(s),...patientIssues(s)], host=document.getElementById('accountingIssues');
  host.hidden=!issues.length; host.textContent=issues.join(' ');
}
function roleFitAffectedMissionLoads(s,key){
  if(typeof missionRows!=='function'||typeof missionLocations!=='function')return [];
  const byKey=new Map();
  for(const [missionKey,on] of Object.entries(s.mission||{}))if(on&&AC.missionEquip[missionKey]){
    for(const allocation of missionAllocations(s,missionKey)||[]){
      if(missionLocations()[allocation.stow]?.roleFitKey===key)byKey.set(missionKey,AC.missionEquip[missionKey].name);
    }
  }
  for(const row of missionRows(s))if(missionLocations()[row.stowId]?.roleFitKey===key)byKey.set(row.key,row.name);
  return [...byKey].map(([missionKey,name])=>({key:missionKey,name}));
}
function roleFitStowageRemovalNotice(s,key){
  const pending=s.roleFitStowageNotices?.[key];
  if(!pending?.length)return '';
  if(roleFitIsInstalled(s,key)){delete s.roleFitStowageNotices[key];return '';}
  const stillPending=pending.filter(missionKey=>{
    if(!s.mission?.[missionKey])return true;
    const allocations=missionAllocations(s,missionKey).filter(row=>row.quantity>0);
    if(!allocations.length)return false;
    return !allocations.every(row=>{
      const location=resolveMissionLocation(s,row),definition=missionLocations()[location.stowId];
      return !location.error&&definition?.roleFitKey!==key;
    });
  });
  if(stillPending.length)s.roleFitStowageNotices[key]=stillPending;
  else delete s.roleFitStowageNotices[key];
  return stillPending.map(missionKey=>AC.missionEquip[missionKey]?.name||missionKey).join(', ');
}
function applyRoleFitDeclarationFromUI(s,item,action){
  const affected=action==='EXCLUDED'?roleFitAffectedMissionLoads(s,item.key):[];
  if(affected.length){
    const names=[...new Set(affected.map(row=>row.name))].join(', ');
    const message=item.name+' stowage will become unavailable. '+names+' will be removed from the Mission Equipment load. If still being carried, add it again in the Mission Equipment tab and choose another available stowage location. Continue?';
    if(!confirm(message))return;
  }
  const error=setRoleFitDeclaration(s,item.key,action);
  if(error){alert(error);return;}
  if(affected.length){
    s.roleFitStowageNotices??={};s.roleFitStowageNotices[item.key]=affected.map(row=>row.key);
    for(const {key} of affected){s.mission[key]=false;if(s.missionLoads)delete s.missionLoads[key];}
    if(typeof clearUnavailableCabinPatient==='function')clearUnavailableCabinPatient(s);
  }else if(roleFitIsInstalled(s,item.key)&&s.roleFitStowageNotices){
    delete s.roleFitStowageNotices[item.key];
  }
  render();
}
function roleFitWeightHelper(s,item){
  const name=item.name, arm=fmtDecimal(item.arm), weight=fmtDecimal(item.itemW), expected=roleFitExpectation(s,item.key);
  if(item.locked)return 'Already recorded as removed on Accept. This item is locked to prevent subtracting it again. Current aircraft weight adjustment: 0 kg.';
  if(item.declaration==='ADD')return item.itemW>=0?`${name} is fitted. Added to the current aircraft weight: +${weight} kg at ${arm} mm arm.`:`${name} is fitted. Current aircraft weight adjustment: −${fmtDecimal(Math.abs(item.itemW))} kg at ${arm} mm arm.`;
  if(item.declaration==='ACCOUNTED')return 'This item is fitted and included in the accepted recorded aircraft basic weight. Current aircraft weight adjustment: 0 kg.';
  if(item.declaration==='REMOVE'||(item.declaration==='EXCLUDED'&&!item.current&&expected.installed)){
    const delta=-Number(item.itemW||0),signed=delta<0?'−'+fmtDecimal(Math.abs(delta)):'+'+fmtDecimal(delta);
    return `${name} is not fitted. Current aircraft weight adjusted by ${signed} kg at ${arm} mm arm.`;
  }
  if(item.declaration==='EXCLUDED')return `${name} is not fitted. No current aircraft weight adjustment was required (0 kg).`;
  if(item.declaration==='CUSTOM')return 'Accounting is controlled by the linked Custom Exception. Review its current aircraft weight adjustment in Custom Exceptions.';
  return 'Choose whether this item is fitted and review its current aircraft weight adjustment.';
}
function renderRoleFitDeclarations(s){
  const box=document.getElementById('roleFitList');box.replaceChildren();
  document.getElementById('roleFitBasisMessage').textContent=basicWeightBasis(s)==='RFM'
    ? 'RFM Basic Weight is the starting value. It excludes Role Fit equipment; fitted items are added to calculate the aircraft total.'
    : 'Recorded Aircraft Basic Weight is the starting value. Role Fit choices account for listed equipment not represented in that recorded weight.';
  const rows=sortSelectedFirst(roleFitAccountingRows(s),item=>item.current,item=>item.name);
  const groupFor=item=>{
    const definition=AC.roleFit[item.key];if(definition.group)return definition.group;
    const groups=[['RF_AIRCRAFT_SYSTEMS_','Aircraft Systems'],['RF_ICE_PROTECTION_','Ice Protection'],['RF_SAR_EQUIPMENT_','SAR Equipment'],['RF_SENSOR_SYSTEMS_','Sensor Systems'],['RF_SERVICING_EQUIPMENT_','Servicing Equipment'],['RF_STOW_','Stowage Fittings']];
    return groups.find(([prefix])=>item.key.startsWith(prefix))?.[1]||'Other Equipment';
  };
  s.ui??={};s.ui.roleFitGroups??={};
  const groupOrder=['Aircraft Systems','Ice Protection','SAR Equipment','Sensor Systems','Servicing Equipment','Stowage Fittings','Other Equipment'];
  const grouped=new Map();
  for(const item of rows){const group=groupFor(item);if(!grouped.has(group))grouped.set(group,[]);grouped.get(group).push(item);}
  const ordered=[...grouped.entries()].sort((a,b)=>{const ai=groupOrder.indexOf(a[0]),bi=groupOrder.indexOf(b[0]);return (ai<0?groupOrder.length:ai)-(bi<0?groupOrder.length:bi)||a[0].localeCompare(b[0]);});
  for(const [group,items] of ordered){
    const panel=document.createElement('details');panel.className='role-fit-group';panel.open=!!s.ui.roleFitGroups[group];
    const summary=document.createElement('summary');summary.textContent=group+' ('+items.length+')';
    const content=document.createElement('div');content.className='role-fit-group-content';
    panel.append(summary,content);panel.ontoggle=()=>{s.ui.roleFitGroups[group]=panel.open;};box.append(panel);
    for(const item of items){
    const normallyInstalled=roleFitExpectation(s,item.key).installed;

    const row=document.createElement('div');row.className='role-declaration-row';row.dataset.roleKey=item.key;
    row.dataset.fitStatus=(item.origin==='manual'&&!item.locked)||item.custom?'adjusted':!s.preset?'default':normallyInstalled?'fitted':'excluded';
    const basis=basicWeightBasis(s);
    row.innerHTML=`<div><div class="name">${escapeHtml(item.name)}</div><div class="meta mono">${fmtDecimal(item.itemW)} kg @ ${fmtDecimal(item.arm)} mm</div></div><div class="role-declaration-controls" role="group" aria-label="${escapeHtml(item.name)} declaration"></div>`;
    const controls=row.querySelector('.role-declaration-controls');
    const expected=roleFitExpectation(s,item.key), fit=document.createElement('div');
    fit.className='role-fit-expectation';fit.dataset.expectedFit=expected.installed?'installed':'not-installed';
    const badge=document.createElement('strong');
    badge.textContent=item.locked?'Not fitted · Recorded on Accept':item.custom?'Custom Exception':item.origin==='manual'?(item.current?'Fitted':'Not fitted')+' · Manual override of '+(AC.presets[s.preset]?.name||'aircraft default'):expected.aircraftLevel?'Normally fitted to this aircraft':AC.presets[s.preset]?(item.current?'Fitted':'Not fitted')+' for '+expected.configuration:(expected.normal?'Normally fitted to this aircraft':'Not normally fitted');
    fit.append(badge);row.firstElementChild.querySelector('.meta').after(fit);
    const labels={ACCOUNTED:'Fitted · No weight adjustment',ADD:'Fitted · Add item weight to aircraft total',EXCLUDED:'Not fitted · adjust current weight as required'};
    const storedDeclaration=roleFitDeclaration(s,item.key);
    const resolvedForButton=storedDeclaration==='NEUTRAL'?item.declaration:storedDeclaration;
    const selected=item.locked||resolvedForButton==='REMOVE'?'EXCLUDED':resolvedForButton;
    for(const action of ['ACCOUNTED','ADD','EXCLUDED']){
      const button=document.createElement('button');button.type='button';button.className='btn small';button.textContent=labels[action];button.dataset.declaration=action;
      button.setAttribute('aria-pressed',String(selected===action));button.disabled=item.locked||item.custom;
      if(action==='ACCOUNTED'&&basis==='RFM'){button.disabled=true;button.title='RFM Basic Weight excludes Role Fit equipment; fitted items must be added to the aircraft total.';}
      button.onclick=()=>{
        applyRoleFitDeclarationFromUI(s,item,action);
      };controls.append(button);
    }
    const helper=document.createElement('div');helper.className='role-fit-helper small';helper.setAttribute('aria-live','polite');
    const stowageRemoved=roleFitStowageRemovalNotice(s,item.key);
    const missionReminder=stowageRemoved?` ${stowageRemoved} was removed from the Mission Equipment load because this stowage is unavailable. If still being carried, manage it in the Mission Equipment tab: add it again and choose another available stowage location.`:'';
    helper.textContent=roleFitWeightHelper(s,item)+(item.declaration==='EXCLUDED'&&!roleFitIsInstalled(s,item.key)?' Stowage locations provided by this item are unavailable.':'')+missionReminder;
    row.append(helper);
    if(item.origin==='manual'&&!item.locked&&!item.custom){
      const reset=document.createElement('button');reset.type='button';reset.className='btn small';reset.textContent='Use configuration default';
      reset.title='Release this manual choice and use the current preset for this item only';
      reset.onclick=()=>{setRoleFitDeclaration(s,item.key,presetRoleFitDeclaration(s,AC.presets[s.preset],item.key),'preset');render();};controls.append(reset);
    }
    content.append(row);
    }
  }
}
function updateDocumentationReview(s){
  document.getElementById('customExceptionsCard').dataset.empty=String(!(s.customExceptions||[]).length);
  document.querySelector('.custom-review-check').style.display=(s.customExceptions||[]).length?'flex':'none';
  document.getElementById('customExceptionsCard').dataset.reviewed=String(!(s.customExceptions||[]).length || !!s.customExceptionsReviewed);
  document.getElementById('documentationReviewStatus').textContent=!(s.customExceptions||[]).length?'None recorded':s.customExceptionsReviewed?'✓ Aircraft documentation review confirmed':'Review required before certification';
}
function renderCustomExceptions(s){
  const host=document.getElementById('customExceptionsList'), add=document.getElementById('btnAddCustomException'), reviewed=document.getElementById('customExceptionsReviewed');
  if(!host||!add||!reviewed)return;
  updateDocumentationReview(s);
  s.customExceptions=s.customExceptions||[];host.innerHTML=s.customExceptions.length?'':'<div class="small muted">No custom exceptions recorded.</div>';
  for(const [index,item] of s.customExceptions.entries()){
    const row=document.createElement('div');row.className='custom-exception-row';
    const options=Object.entries(AC.roleFit).sort((a,b)=>a[1].name.localeCompare(b[1].name)).map(([key,value])=>`<option value="${key}" ${customRoleFitKey(item)===key?'selected':''}>${escapeHtml(value.name)}</option>`).join('');
    row.innerHTML=`<div class="row"><div style="flex:2 1 220px"><div class="lbl">Description</div><input data-ce="description" value="${escapeHtml(item.description)}"></div><div style="flex:1 1 125px"><div class="lbl">Signed item weight (kg)</div><div class="custom-weight-input"><input data-ce="w" type="number" inputmode="decimal" step="any" aria-label="Signed item weight in kilograms" value="${fmtDecimal(item.w)}"><button class="btn" type="button" data-ce-sign aria-label="Switch weight between positive and negative">+/−</button></div><div class="small muted">Enter the weight, then tap +/− to make it an addition or removal.</div></div><div style="flex:1 1 125px"><div class="lbl">Arm (mm)</div><input data-ce="arm" type="number" step="any" value="${fmtDecimal(item.arm)}"></div></div>
      <div class="row" style="margin-top:8px"><div style="flex:1 1 220px"><div class="lbl">Accounting</div><select data-ce-accounting><option value="APPLY" ${item.accounting!=='ACCOUNTED'?'selected':''}>APPLY — adjust calculated aircraft total</option><option value="ACCOUNTED" ${item.accounting==='ACCOUNTED'?'selected':''}>ACCOUNTED — already included in selected value</option></select></div><div style="flex:1 1 260px"><div class="lbl">Listed item (prevents duplicate accounting)</div><select data-ce-link><option value="">Separate unlisted item</option>${item.roleFitKeys?.length?'<option value="LEGACY_CASEVAC_RACKS" selected>CASEVAC racks — all four (recorded custom adjustment)</option>':''}${options}</select></div></div>
      <div class="row" style="margin-top:8px"><div style="flex:2 1 240px"><div class="lbl">Source / reference</div><input data-ce="source" value="${escapeHtml(item.source)}"></div><div style="flex:1 1 190px"><div class="lbl">Applied adjustment</div><div class="mono" data-ce-applied></div></div><button class="btn bad small" data-ce-remove type="button">Delete entry</button></div>`;
    const refreshApplied=()=>{const applied=customExceptionAccountingRows(s)[index];row.querySelector('[data-ce-applied]').textContent=`${fmtDecimal(applied.w)} kg · ${fmtDecimal(applied.m,2)} kg·mm`;};
    const changed=()=>{s.customExceptionsReviewed=false;reviewed.checked=false;updateDocumentationReview(s);invalidateAccountingCertification(s);syncRoleFitPhysicalState(s);refreshApplied();updateConfigSummary(s);renderAccountingWarnings(s);persistSession();};
    row.querySelectorAll('input[data-ce]').forEach(input=>{
      input.oninput=()=>{const field=input.dataset.ce;if(field==='w')item.w=clamp(Number(input.value)||0,-6000,6000);else if(field==='arm')item.arm=clamp(Number(input.value)||0,0,20000);else item[field]=input.value;changed();};
      input.onchange=()=>render();
    });
    row.querySelector('[data-ce-accounting]').onchange=event=>{item.accounting=event.target.value;changed();render();};
    const signButton=row.querySelector('[data-ce-sign]');
    // Keep the weight field focused: its blur handler otherwise rebuilds this button before click.
    signButton.onpointerdown=event=>event.preventDefault();
    signButton.onclick=()=>{
      const input=row.querySelector('[data-ce="w"]');
      item.w=clamp(-(Number(input.value)||0),-6000,6000);
      input.value=fmtDecimal(item.w);changed();
    };
    row.querySelector('[data-ce-link]').onchange=event=>{
      const key=event.target.value;
      if(key==='LEGACY_CASEVAC_RACKS')return;
      if(key&&s.customExceptions.some(other=>other!==item&&customRoleFitKeys(other).includes(key))){alert('Another Custom Exception already represents this item. Edit that entry instead.');render();return;}
      if(key&&roleFitDeclaration(s,key)!=='NEUTRAL'&&!confirm('Move this item’s accounting to this Custom Exception? Its listed declaration will become neutral so it is not counted twice.')){render();return;}
      item.roleFitKey=key;
      delete item.roleFitKeys;
      if(key){
        const equipment=AC.roleFit[key];if(!String(item.description||'').trim())item.description=equipment.name;
        if(!Number(item.w))item.w=equipment.w;if(!Number(item.arm))item.arm=equipment.arm;
        setRoleFitDeclaration(s,key,'NEUTRAL','manual');
      }
      changed();render();
    };
    row.querySelector('[data-ce-remove]').onclick=()=>{s.customExceptions.splice(index,1);s.customExceptionsReviewed=false;invalidateAccountingCertification(s);syncRoleFitPhysicalState(s);render();};
    host.append(row);refreshApplied();
  }
  add.onclick=()=>{s.customExceptions.push({id:'CE-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),description:'',w:0,arm:0,source:'',accounting:'APPLY',roleFitKey:''});s.customExceptionsReviewed=false;invalidateAccountingCertification(s);render();};
  reviewed.disabled=!s.customExceptions.length;reviewed.checked=!!s.customExceptionsReviewed;reviewed.onchange=()=>{s.customExceptionsReviewed=reviewed.checked;invalidateAccountingCertification(s);render();};
}
