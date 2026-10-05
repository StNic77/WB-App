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
function renderRoleFitDeclarations(s){
  const box=document.getElementById('roleFitList');box.replaceChildren();
  document.getElementById('roleFitBasisMessage').textContent='Basic Weight is the starting weight entered or selected on the Accept page. Equipment adjustments are applied to that starting weight to calculate the aircraft’s operating weight.';
  const rows=sortSelectedFirst(roleFitAccountingRows(s),item=>item.current,item=>item.name);
  for(const item of rows){
    const normallyInstalled=roleFitExpectation(s,item.key).installed;

    const row=document.createElement('div');row.className='role-declaration-row';row.dataset.roleKey=item.key;
    row.dataset.fitStatus=(item.origin==='manual'&&!item.locked)||item.custom?'adjusted':!s.preset?'default':normallyInstalled?'fitted':'excluded';
    const descriptions={NEUTRAL:'Confirm the equipment state and Basic Weight inclusion.',ADD:'Fitted. Its weight and moment are added to Basic Weight.',REMOVE:'Not fitted. Its weight and moment are subtracted from Basic Weight.',ACCOUNTED:'Fitted. Already included in Basic Weight; no adjustment.',EXCLUDED:'Not fitted. Already excluded from Basic Weight; no adjustment.',CUSTOM:'Accounting is controlled by the linked Custom Exception.'};
    row.innerHTML=`<div><div class="name">${escapeHtml(item.name)}</div><div class="meta mono">${fmtDecimal(item.itemW)} kg @ ${fmtDecimal(item.arm)} mm</div></div><div class="role-declaration-controls" role="group" aria-label="${escapeHtml(item.name)} declaration"></div>`;
    const controls=row.querySelector('.role-declaration-controls');
    const expected=roleFitExpectation(s,item.key), fit=document.createElement('div');
    fit.className='role-fit-expectation';fit.dataset.expectedFit=expected.installed?'installed':'not-installed';
    const badge=document.createElement('strong');
    badge.textContent=item.locked?'Not fitted · Recorded on Accept':item.custom?'Custom Exception':item.origin==='manual'?(item.current?'Fitted':'Not fitted')+' · Manual override of '+(AC.presets[s.preset]?.name||'aircraft default'):AC.presets[s.preset]?(item.current?'Fitted':'Not fitted')+' for '+expected.configuration:(expected.normal?'Normally fitted':'Not normally fitted')+' · Applies unless the selected configuration specifies otherwise';
    fit.append(badge);row.firstElementChild.querySelector('.meta').after(fit);
    const labels={ACCOUNTED:'Fitted · Included in Basic Weight',EXCLUDED:'Not Fitted · Excluded from Basic Weight',ADD:'Fitted · Added to Basic Weight',REMOVE:'Not Fitted · Subtracted from Basic Weight'};
    for(const action of ['ACCOUNTED','EXCLUDED','ADD','REMOVE']){
      const button=document.createElement('button');button.type='button';button.className='btn small';button.textContent=labels[action];button.dataset.declaration=action;
      button.setAttribute('aria-pressed',String((item.locked?'EXCLUDED':item.declaration)===action));button.disabled=item.locked||item.custom;
      button.onclick=()=>{
        const apply=()=>{const error=setRoleFitDeclaration(s,item.key,action);if(error)alert(error);render();};
        if(action!=='REMOVE'){apply();return;}
        row.querySelector('[data-subtract-confirm]')?.remove();
        const panel=document.createElement('div');panel.dataset.subtractConfirm='';panel.className='callout';panel.setAttribute('role','alert');
        const message=document.createElement('p');message.textContent=item.name+': subtract '+fmtDecimal(item.itemW)+' kg from Basic Weight? Confirm this item is not fitted and its weight is included in the basic weight entered on Accept. If already excluded, choose “Not Fitted · Excluded from Basic Weight” instead.';
        const cancel=document.createElement('button');cancel.type='button';cancel.className='btn';cancel.textContent='Cancel';cancel.onclick=()=>{panel.remove();button.focus();};
        const confirm=document.createElement('button');confirm.type='button';confirm.className='btn bad';confirm.textContent='Confirm Subtraction';confirm.onclick=apply;
        panel.append(message,cancel,confirm);row.append(panel);cancel.focus();
      };controls.append(button);
    }
    const helper=document.createElement('div');helper.className='role-fit-helper small';helper.setAttribute('aria-live','polite');
    helper.textContent=(item.locked?'Already recorded as removed on Accept. This item is locked to prevent subtracting it again.':descriptions[item.declaration]||'Review this declaration.')+` Weight adjustment: ${item.w>0?'+':''}${fmtDecimal(item.w)} kg.`;
    row.append(helper);
    if(item.origin==='manual'&&!item.locked&&!item.custom){
      const reset=document.createElement('button');reset.type='button';reset.className='btn small';reset.textContent='Use configuration default';
      reset.title='Release this manual choice and use the current preset for this item only';
      reset.onclick=()=>{setRoleFitDeclaration(s,item.key,presetRoleFitDeclaration(s,AC.presets[s.preset],item.key),'preset');render();};controls.append(reset);
    }
    box.append(row);
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
      <div class="row" style="margin-top:8px"><div style="flex:1 1 220px"><div class="lbl">Accounting</div><select data-ce-accounting><option value="APPLY" ${item.accounting!=='ACCOUNTED'?'selected':''}>APPLY — adjust accepted weight</option><option value="ACCOUNTED" ${item.accounting==='ACCOUNTED'?'selected':''}>ACCOUNTED — already included</option></select></div><div style="flex:1 1 260px"><div class="lbl">Listed item (prevents duplicate accounting)</div><select data-ce-link><option value="">Separate unlisted item</option>${item.roleFitKeys?.length?'<option value="LEGACY_CASEVAC_RACKS" selected>CASEVAC racks — all four (recorded custom adjustment)</option>':''}${options}</select></div></div>
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
