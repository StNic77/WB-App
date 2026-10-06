function extraCrewStowageCheck(s,gear){
  const loads=assignedShelfLoads(s),added={};
  for(const zone of s.zones||[])if(zone.id in STOW_MAX)loads[zone.id]+=(Number(zone.w)||0);
  for(const {key,allocation} of gear){
    const loc=resolveMissionLocation(s,allocation),weight=Math.max(0,AC.missionEquip[key]?.unitWeight||0);
    if(!loc.error&&loc.stowId in STOW_MAX)added[loc.stowId]=(added[loc.stowId]||0)+weight;
  }
  return Object.entries(added).filter(([id,w])=>shelfLoadState(loads[id]||0,w,STOW_MAX[id]).over).map(([id,w])=>({id,message:(AC.stowage[id]?.name||id)+' would carry '+fmtDecimal((loads[id]||0)+w)+' kg; limit '+fmtDecimal(STOW_MAX[id])+' kg. Choose another location.'}));
}
function extraCrewCapacityAllows(s,gear,id){
  if(!(id in STOW_MAX))return true;
  const loads=assignedShelfLoads(s);for(const zone of s.zones||[])if(zone.id in STOW_MAX)loads[zone.id]+=(Number(zone.w)||0);
  const pending=gear.filter(g=>resolveMissionLocation(s,g.allocation).stowId===id).reduce((sum,g)=>sum+Math.max(0,AC.missionEquip[g.key]?.unitWeight||0),0);
  return !shelfLoadState(loads[id]||0,pending,STOW_MAX[id]).over;
}
function extraCrewPreferredAllocation(s,role,key,seat,selectedGear){
  const rule=AC.crewEquipmentPlacement||{},isSeat=(rule.seatAssociatedItems||[]).includes(key);
  if(isSeat)return {id:'base',quantity:1,stow:'CREW_SEAT',crewSeat:seat};
  let preferred=null;
  if(role==='SAR Tech'&&(rule.sarTechB25||[]).includes(key))preferred=rule.sarTechB25Preferred;
  if(['Pilot','Flight Engineer'].includes(role)&&(rule.pilotFlightEngineerB25||[]).includes(key)){
    const existing=Object.entries(s.missionLoads||{}).reduce((n,[itemKey,rows])=>n+((rule.pilotFlightEngineerB25||[]).includes(itemKey)?rows.filter(r=>r.crewId).length:0),0);
    const priority=rule.pilotFlightEngineerB25Priority||[];preferred=priority[existing]||null;
  }
  const allocation=missionDefaultAllocation(key);
  if(preferred){const candidate={...allocation,stow:preferred};if(!resolveMissionLocation(s,candidate).error&&extraCrewCapacityAllows(s,[...selectedGear,{key,allocation:candidate}],preferred))return candidate;}
  if((role==='SAR Tech'&&(rule.sarTechB25||[]).includes(key))||(['Pilot','Flight Engineer'].includes(role)&&(rule.pilotFlightEngineerB25||[]).includes(key))){
    return {...allocation,stow:'',bayOnlyFallback:true};
  }
  return allocation;
}
function extraCrewLocationOptions(s,choice){
  if(!choice.allocation.bayOnlyFallback)return missionLocationOptions(s,choice.allocation,AC.missionEquip[choice.key]||{});
  const selected=choice.allocation.stow;
  return '<option value="">— Select available cabin bay —</option>'+Object.entries(AC.bayArms||{}).filter(([id])=>id!=='REAR').map(([id,arm])=>`<option value="${escapeHtml(id)}" ${id===selected?'selected':''}>${escapeHtml(missionLocations()[id]?.name||id)} (${arm} mm)</option>`).join('');
}
function renderAddedCrew(s,host){
  const section=document.createElement('div');section.id='addedCrewSummary';
  const heading=document.createElement('h3');heading.textContent='Additional Crew and Equipment';section.append(heading);
  const crew=Object.entries(s.occupants||{}).filter(([,person])=>person?.crewId);
  if(!crew.length){const empty=document.createElement('p');empty.className='small';empty.textContent='No extra crew added.';section.append(empty);}
  for(const [seat,person] of crew){
    const card=document.createElement('div');card.className='card';const title=document.createElement('strong');title.textContent=person.label+' · '+seat+' · '+(AC.crewSeats[seat]||AC.paxSeats[seat])?.name+(s.seats[seat]?'':' — seat not installed');card.append(title);
    let count=0;
    for(const [key,rows] of Object.entries(s.missionLoads||{}))for(const row of rows)if(row.crewId===person.crewId){
      const line=document.createElement('div'),loc=resolveMissionLocation(s,row);line.className='small';line.textContent=(AC.missionEquip[key]?.name||key)+' · Qty '+row.quantity+' · '+(s.mission[key]?loc.stow:'Not carried')+(loc.error?' — Stowage required':'');card.append(line);count++;
    }
    if(!count){const line=document.createElement('div');line.textContent='No associated equipment.';card.append(line);}
    const remove=document.createElement('button');remove.type='button';remove.className='btn bad small';remove.textContent='Remove crew member';remove.setAttribute('aria-label','Remove '+person.label+' from '+seat);remove.onclick=()=>{clearSeatOccupant(s,seat);persistSession();render();};card.append(remove);
    section.append(card);
  }
  host.insertBefore(section,host.querySelector('#extraCrewForm'));
}
/* Extra crew and their separately stowed equipment belong to this sortie only. */
function crewEquipmentChoices(role){
  const person=role==='Pilot'?'AIRCRAFT_COMMANDER':role==='Flight Engineer'?'FLIGHT_ENGINEER':'ST_TEAM_LEAD';
  const items=role==='Pilot'?['B25','EFB_BAG','RON_BAG']:role==='Flight Engineer'?['B25','HELMET_BAG','RON_BAG']:['B25','HOIST_BAG','RON_BAG'];
  return items.map(item=>({key:'ME_CREW_PERSONAL_EQUIP_'+person+'_'+item,checked:item!=='RON_BAG'}));
}
function addExtraCrew(s,role,seat,gear){
  if(!s.seats[seat]||s.occupants[seat])return 'Select an available installed seat.';
  if(!['Pilot','Flight Engineer','SAR Tech'].includes(role))return 'Select a crew role.';
  const crewId=crypto.randomUUID();
  for(const {key,allocation} of gear){
    const item=AC.missionEquip[key];
    if(!item||item.active===false)return 'Equipment is unavailable. Review the catalogue.';
    const resolved=resolveMissionLocation(s,{...allocation,crewId});if(resolved.error)return 'Choose a valid stowage location for '+item.name+'.';
    const quantity=s.mission[key]?missionAllocations(s,key).reduce((n,r)=>n+r.quantity,0):0;
    if(quantity+1>(item.maxQuantity??Infinity)||quantity+1<(item.minQuantity??0))return item.name+': quantity is outside its limits.';
  }
  const overloads=extraCrewStowageCheck(s,gear);if(overloads.length)return overloads.map(x=>x.message).join(' ');
  assignCrewOccupant(s,role,seat,gear,'extra crew',crewId);
  invalidateAccountingCertification(s);persistSession();return '';
}
function assignCrewOccupant(s,role,seat,gear=[],source='role crew',crewId=crypto.randomUUID()){
  s.occupants[seat]={type:'crew',label:role+' ('+source+')',crewId};
  for(const {key,allocation} of gear){
    if(!s.mission[key]){s.missionLoads??={};s.missionLoads[key]=[];}
    const rows=editMissionAllocations(s,key);rows.push({...allocation,id:crypto.randomUUID(),quantity:1,crewId});s.mission[key]=true;
  }
  return crewId;
}
function removeCrewEquipment(s,crewId){
  for(const [key,rows] of Object.entries(s.missionLoads||{})){
    s.missionLoads[key]=rows.filter(r=>r.crewId!==crewId);
    if(!s.missionLoads[key].length)s.mission[key]=false;
  }
}
function clearSeatOccupant(s,key){
  const person=s.occupants[key];
  if(person?.crewId){
    const hasGear=Object.values(s.missionLoads||{}).some(rows=>rows.some(r=>r.crewId===person.crewId));
    if(hasGear&&confirm('Also remove the equipment added with this crew member? Choose Cancel to keep the equipment aboard.'))removeCrewEquipment(s,person.crewId);
    else for(const rows of Object.values(s.missionLoads||{}))for(const r of rows)if(r.crewId===person.crewId)delete r.crewId;
  }
  s.occupants[key]=null;invalidateAccountingCertification(s);
}
function renderExtraCrew(s){
  const host=document.getElementById('extraCrewHost');
  if(!host)return;
  host.className='extra-crew-summary';
  host.innerHTML='<button class="btn" id="openExtraCrew">Add Crew and Equipment</button><div id="extraCrewForm" hidden></div>';
  renderAddedCrew(s,host);
  host.querySelector('button').onclick=()=>{
    const form=host.querySelector('#extraCrewForm');form.hidden=false;
    form.innerHTML='<h3>Add Crew and Equipment</h3><div class="row"><label>Crew role<select id="extraCrewRole"><option>Pilot</option><option>Flight Engineer</option><option>SAR Tech</option></select></label><label>Seat<select id="extraCrewSeat"></select></label></div><div id="extraCrewGear"></div><p id="extraCrewError" role="alert"></p><button class="btn good" id="extraCrewApply">Add to Mission</button> <button class="btn" id="extraCrewCancel">Cancel</button>';
    const seat=form.querySelector('#extraCrewSeat');
    for(const [key,it] of Object.entries({...AC.crewSeats,...AC.paxSeats}))if(s.seats[key]&&!s.occupants[key]){const opt=document.createElement('option');opt.value=key;opt.textContent=key+' · '+it.name;seat.append(opt);}
    if(!seat.options.length)form.querySelector('#extraCrewError').textContent='No available installed seats. Install or clear a seat first.';
    const gearHost=form.querySelector('#extraCrewGear');let choices=[],updates=[];
    const refresh=()=>{const overloads=extraCrewStowageCheck(s,choices.filter(c=>c.checked));for(const update of updates)update(overloads);form.querySelector('#extraCrewApply').disabled=overloads.length>0||!seat.options.length||choices.some(c=>c.checked&&resolveMissionLocation(s,{...c.allocation,crewId:'pending'}).error);};
    const showGear=()=>{
      gearHost.replaceChildren();updates=[];const role=form.querySelector('#extraCrewRole').value;choices=[];for(const choice of crewEquipmentChoices(role)){const allocation=AC.missionEquip[choice.key]?extraCrewPreferredAllocation(s,role,choice.key,seat.value,choices.filter(c=>c.checked)):{stow:''};choices.push({...choice,allocation});}
      for(const choice of choices){
        const item=AC.missionEquip[choice.key],row=document.createElement('div');row.className='card';
        const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.style.width='auto';check.checked=choice.checked;check.disabled=!item||item.active===false;choice.checked=check.checked&&!check.disabled;
        label.append(check,document.createTextNode(' '+(item?.name?.split(' — ')[0]||choice.key)));row.append(label);
        const location=document.createElement('select');location.setAttribute('aria-label',(item?.name||choice.key)+' extra crew stowage');location.innerHTML=extraCrewLocationOptions(s,choice);const armLabel=document.createElement('label');armLabel.textContent='Custom arm (mm)';
        const armInput=document.createElement('input');armInput.type='number';armInput.step='any';armInput.setAttribute('aria-label',(item?.name||choice.key)+' extra crew custom arm');armInput.value=Number.isFinite(choice.allocation.customArm)?choice.allocation.customArm:'';armLabel.append(armInput);
        armInput.oninput=()=>{choice.allocation.customArm=Number.isFinite(armInput.valueAsNumber)?armInput.valueAsNumber:null;refresh();};
        const note=document.createElement('div');note.className='small';
        const update=(overloads=[])=>{location.disabled=!choice.checked;armLabel.hidden=choice.allocation.stow!=='CUSTOM';armInput.disabled=!choice.checked;const loc=resolveMissionLocation(s,{...choice.allocation,crewId:'pending'}),over=choice.checked&&overloads.find(x=>x.id===loc.stowId);note.textContent=!choice.checked?'':choice.allocation.bayOnlyFallback?'Preferred location unavailable or at capacity. Select an available cabin bay.':loc.error?'Stowage unavailable. Where will this item be carried?':over?over.message:loc.stowId in STOW_MAX?'Within the defined stowage limit.':'No capacity limit is defined for this location; capacity has not been checked.';note.setAttribute('role',over?'alert':'status');note.style.color=over?'var(--bad)':'';};
        updates.push(update);
        check.onchange=()=>{choice.checked=check.checked;refresh();};
        location.onchange=()=>{const v=location.value;choice.allocation={...choice.allocation,stow:v,basketRef:null};delete choice.allocation.bayOnlyFallback;if(v.startsWith('BASKET:')){const [,key,id]=v.split(':');choice.allocation.stow='BASKET';choice.allocation.basketRef={key,id};}refresh();};
        row.append(location,armLabel,note);gearHost.append(row);
      }
      refresh();
    };
    form.querySelector('#extraCrewRole').onchange=showGear;seat.onchange=showGear;showGear();
    form.querySelector('#extraCrewCancel').onclick=()=>{form.hidden=true;};
    form.querySelector('#extraCrewApply').onclick=()=>{const error=addExtraCrew(s,form.querySelector('#extraCrewRole').value,seat.value,choices.filter(c=>c.checked));if(error){form.querySelector('#extraCrewError').textContent=error;return;}render();};
  };
}
