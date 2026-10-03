/* Mission catalogue and sortie allocations. No aircraft-baseline accounting here. */
const MISSION_SCHEMA = 2;
const MISSION_GROUPS = ['AIRCRAFT ALSE EQUIP','SAR MEDICAL EQUIP','SAR MISSION EQUIP','CREW PERSONAL EQUIP','CREW COMFORT EQUIP','SERVICING EQUIP'];
function missionGroupNames(data=AC){
  return [...new Set([...MISSION_GROUPS,...Object.values(data.missionEquip||{}).map(it=>it.group).filter(g=>typeof g==='string'&&g.trim()&&g!=='Stowage')])];
}
const MANUAL_FUEL_ADVISORY = 'Predicted burn trace unavailable in Manual Fuel mode. Departure CG reflects entered tank quantities; landing CG uses the normal mapped fuel distribution at the selected landing fuel.';
let missionConfigNotice = '';
function missionLocations(data=AC){
  const bays=Object.fromEntries(Object.entries(data.bayArms||{}).map(([id,arm])=>[id,{name:id==='BAY55'?'Bay 5.5':id==='REAR'?'Rear Area (Ramp Area)':id.replace('BAY','Bay '),arm,group:'Cabin Bays'}]));
  const carriers={};
  for(const [key,it] of Object.entries(data.roleFit||{}))if(it.isStowage)carriers['ROLEFIT:'+key]={name:'In '+it.name,arm:it.arm,group:'Equipment',roleFitKey:key};
  for(const [key,it] of Object.entries(data.missionEquip||{}))if(it.isBasket)carriers['CARRIER:'+key]={name:'In '+it.name,arm:null,group:'Equipment',missionKey:key};
  return {...data.stowage,...bays,...carriers};
}

function missionConfigurationIssues(data){
  const issues=[];
  for(const [id,loc] of Object.entries(data.stowage||{}))if(loc.roleFitKey&&!data.roleFit?.[loc.roleFitKey])issues.push(id+': linked Role Fit item is missing.');
  for(const [key,it] of Object.entries(data.missionEquip||{})){
    if(it.group==='Stowage') continue;
    if(!/^ME_[A-Z0-9_]+$/.test(key)) issues.push(key+': key must start with ME_ and contain uppercase letters, numbers and underscores.');
    if(typeof it.group!=='string'||!it.group.trim()) issues.push(key+': choose an equipment group.');
    if(!Number.isFinite(it.unitWeight)) issues.push(key+': unit weight must be a number (negative values are permitted).');
    if(!Number.isInteger(it.defaultQuantity)||it.defaultQuantity<0) issues.push(key+': default quantity must be a whole number of zero or more.');
    for(const f of ['minQuantity','maxQuantity']) if(it[f]!=null&&(!Number.isInteger(it[f])||it[f]<0))issues.push(key+': '+f+' must be a nonnegative whole number.');
    if(it.defaultQuantity<(it.minQuantity??0)||it.defaultQuantity>(it.maxQuantity??Infinity)||(it.minQuantity??0)>(it.maxQuantity??Infinity))issues.push(key+': quantity limits conflict with the default.');
    if(it.stow==='CUSTOM' ? !Number.isFinite(it.customArm) : it.stow==='BASKET' ? !it.followBasket : !missionLocations(data)[it.stow])issues.push(key+': select a valid default location or arm.');
    if(it.isBasket && (it.stow==='BASKET'||it.stow==='CARRIER:'+key))issues.push(key+': select a location outside this item.');
  }
  for(const [key,p] of Object.entries(data.presets||{})){
    if(!String(p.name||'').trim()) issues.push(key+': configuration needs a name.');
    for(const id of [...(p.missionOn||[]),...(p.missionOff||[])])if(!data.missionEquip[id])issues.push(key+': missing equipment '+id);
    for(const id of [...(p.roleFitOn||[]),...(p.roleFitOff||[])])if(!data.roleFit[id])issues.push(key+': missing role fit '+id);
    for(const id of [...(p.seats?.crew||[]),...(p.seats?.pax||[]),...(p.occupants||[])])if(!data.crewSeats[id]&&!data.paxSeats[id])issues.push(key+': missing seat '+id);
  }
  return issues;
}

function loadEquipmentOverrides(){
  try{
    const raw=localStorage.getItem('ac_config_overrides');if(!raw)return;
    const ov=JSON.parse(raw);
    if(ov.missionSchema!==MISSION_SCHEMA){
      // Keep the full previous file recoverable. Preserve unrelated custodian data.
      if(!localStorage.getItem('ac_config_overrides_before_mission_v2'))localStorage.setItem('ac_config_overrides_before_mission_v2',raw);
      for(const field of ['roleFit','crewSeats','paxSeats'])if(ov[field])AC[field]=ov[field];
      if(ov.referenceDocuments)AC.meta.referenceDocuments=ov.referenceDocuments;
      // Preserve the existing compatibility corrections for unrelated aircraft data.
      for(const [key,seat] of Object.entries(AC.crewSeats))if(seat.occupantArm==null&&AC_CREW_SEATS[key])seat.occupantArm=AC_CREW_SEATS[key].occupantArm;
      if(AC.crewSeats.C3?.arm===4599)AC.crewSeats.C3.arm=4559;
      if(AC.crewSeats.C5?.arm===8444)AC.crewSeats.C5.arm=8440;
      if(AC.roleFit.RF_SAR_EQUIPMENT_FWD_SAR_CABINET?.arm===6275)AC.roleFit.RF_SAR_EQUIPMENT_FWD_SAR_CABINET.arm=5875;
      missionConfigNotice='Previous equipment settings were backed up. The revised mission catalogue and configurations are loaded; review them before use.';
      return;
    }
    // v19 formalizes the compatible v18 development data; preserve saved Editor edits.
    const migrateV18 = ov.baseConfigVersion===18 && AC.meta.configVersion===19;
    // Other old complete catalogues must not mask incompatible shipped updates.
    if(ov.baseConfigVersion!==AC.meta.configVersion && !migrateV18){
      localStorage.setItem('ac_config_overrides_before_config_update',raw);
      return;
    }
    const candidate={...AC,...ov};
    const issues=missionConfigurationIssues(candidate);
    if(issues.length){missionConfigNotice='Device configuration could not be loaded: '+issues.join(' ');return;}
    if(migrateV18){
      localStorage.setItem('ac_config_overrides_before_config_update',raw);
      ov.baseConfigVersion=AC.meta.configVersion;
      localStorage.setItem('ac_config_overrides',JSON.stringify(ov));
    }
    for(const field of ['missionEquip','stowage','bayArms','roleFit','crewSeats','paxSeats','presets'])if(ov[field])AC[field]=ov[field];
    if(ov.referenceDocuments)AC.meta.referenceDocuments=ov.referenceDocuments;
  }catch(e){missionConfigNotice='Device configuration could not be restored. Original settings are preserved. '+e.message;}
}
loadEquipmentOverrides();
// Older saved role catalogues predate occupant roles. Preserve their edits while
// supplying the shipped crew identities for seats used by SAR techs.
for (const [key,preset] of Object.entries(AC.presets)){
  if (preset.occupantRoles == null && AC_PRESETS[key]?.occupantRoles){
    preset.occupantRoles = {...AC_PRESETS[key].occupantRoles};
  }
}

function missionCatalogueSignature(){
  return JSON.stringify([AC.missionEquip,AC.stowage,AC.bayArms,AC.presets,AC.patientPositions]);
}
function missionDefaultAllocation(key){
  const it=AC.missionEquip[key];
  return {id:'base',quantity:it.defaultQuantity??1,stow:it.stow,customArm:it.customArm??null,basketRef:null};
}
function missionAllocations(s,key){
  const rows=s.missionLoads?.[key];
  return rows===undefined?[missionDefaultAllocation(key)]:rows;
}
function editMissionAllocations(s,key){
  s.missionLoads??={};
  return s.missionLoads[key]??=(missionAllocations(s,key).map(x=>({...x})));
}
function missionBaskets(s){
  return Object.entries(AC.missionEquip).filter(([key,it])=>s.mission?.[key]&&it.isBasket&&it.active!==false)
    .flatMap(([key,it])=>missionAllocations(s,key).filter(r=>r.quantity>0).map(r=>({key,id:r.id,label:it.name+' · '+(missionLocations()[r.stow]?.name||r.stow)})));
}
function resolveMissionLocation(s,row,seen=new Set()){
  if(row.stow?.startsWith('CARRIER:')){
    const key=row.stow.slice(8),it=AC.missionEquip[key];
    if(!it?.isBasket||!s.mission?.[key])return {arm:null,stow:'Unavailable carrying item',error:'carrying item is unavailable; choose another stowage location'};
    const rows=missionAllocations(s,key).filter(r=>r.quantity>0);
    if(rows.length!==1)return {arm:null,stow:'Select carrying item location',error:'carrying item has multiple locations; select a specific carrying item'};
    return resolveMissionLocation(s,{stow:'BASKET',basketRef:{key,id:rows[0].id}},seen);
  }
  if(row.stow==='BASKET'){
    const baskets=missionBaskets(s), link=row.basketRef;
    const basket=link?baskets.find(b=>b.key===link.key&&b.id===link.id):baskets.length===1?baskets[0]:null;
    if(!basket)return {arm:null,stowId:'BASKET',stow:'Select carrying basket or location',error:'select the carrying basket or a separate stowage location'};
    const token=basket.key+':'+basket.id;
    if(seen.has(token))return {arm:null,stow:'Invalid basket link',error:'basket location cycle'};
    seen.add(token);
    const target=missionAllocations(s,basket.key).find(r=>r.id===basket.id);
    const loc=resolveMissionLocation(s,target,seen);
    return {...loc,stow:'In '+AC.missionEquip[basket.key].name+' · '+loc.stow};
  }
  if(row.stow==='CUSTOM')return {arm:Number.isFinite(row.customArm)?row.customArm:null,stowId:'CUSTOM',stow:'Custom ('+row.customArm+' mm)',error:Number.isFinite(row.customArm)?null:'enter a custom arm'};
  const loc=missionLocations()[row.stow];
  if(!loc)return {arm:null,stowId:row.stow,stow:'Missing location',error:'select a valid location'};
  if(loc.roleFitKey&&!roleFitIsInstalled(s,loc.roleFitKey))return {arm:null,stow:loc.name,error:'carrying item is not fitted; choose another stowage location'};
  const unavailable=loc.group==='SAR Cabinet'&&!roleFitIsInstalled(s,'RF_SAR_EQUIPMENT_FWD_SAR_CABINET');
  return {arm:loc.arm,stowId:row.stow,stow:loc.name,stowGroup:loc.group,error:unavailable?'cabinet is unavailable; select another location':null};
}
function missionRows(s){
  const rows=[];
  for(const [key,on] of Object.entries(s.mission||{})){
    if(!on)continue;const it=AC.missionEquip[key];
    if(!it||it.group==='Stowage')continue;
    for(const row of missionAllocations(s,key)){
      const loc=resolveMissionLocation(s,row),quantity=row.quantity,unitWeight=it.unitWeight;
      rows.push({...it,...loc,key,allocationId:row.id,quantity,unitWeight,w:unitWeight*quantity,m:quantity===0?0:loc.arm==null?NaN:unitWeight*quantity*loc.arm});
    }
  }
  return rows;
}
function missionIssues(s){
  const issues=[];
  if(s.missionReviewRequired)issues.push('This saved load used an older file format and could not be restored in full. Check the load before continuing.');
  if(s.preset&&(!AC.presets[s.preset]||AC.presets[s.preset].active===false))issues.push('Selected configuration is missing or retired. Select an active configuration.');
  for(const [key,on] of Object.entries(s.mission||{})){
    if(!on)continue;const it=AC.missionEquip[key];
    if(!it){issues.push('Selected equipment no longer exists: '+key);continue;}
    if(it.active===false)issues.push(it.name+': retired equipment; remove or replace explicitly.');
    if(it.group==='Stowage')continue;
    const allocations=missionAllocations(s,key),q=allocations.reduce((n,r)=>n+r.quantity,0);
    if(allocations.some(r=>!Number.isInteger(r.quantity)||r.quantity<0)||q<(it.minQuantity??0)||q>(it.maxQuantity??Infinity))issues.push(it.name+': quantity is outside its limits.');
  }
  for(const row of missionRows(s))if(row.quantity>0&&row.error)issues.push(row.name+': '+row.error+'.');
  return [...new Set(issues)];
}
function missionAutomaticDefault(s,key,it){
  return it.active!==false && !!it.alwaysInclude;
}
function applyMissionPreset(s,p){
  s.mission={};s.missionLoads={};
  // Keep retired references visible and blocking review rather than silently dropping mass.
  for(const [key,it] of Object.entries(AC.missionEquip))s.mission[key]=missionAutomaticDefault(s,key,it)||((p.missionOn||[]).includes(key)&&!(p.missionOff||[]).includes(key));
  for(const key of p.missionOn||[])if(!AC.missionEquip[key])s.mission[key]=true;
  s.missionReviewRequired=false;
}
