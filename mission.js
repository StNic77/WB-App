/* Mission catalogue and sortie allocations. No aircraft-baseline accounting here. */
const MISSION_SCHEMA = 2;
const MISSION_GROUPS = ['AIRCRAFT ALSE EQUIP','SAR MEDICAL EQUIP','SAR MISSION EQUIP','CREW PERSONAL EQUIP','CREW COMFORT EQUIP','SERVICING EQUIP'];
function sortSelectedFirst(items,isSelected,displayName=item=>item?.name??''){
  return [...items].sort((a,b)=>Number(!!isSelected(b))-Number(!!isSelected(a))||String(displayName(a)||'').localeCompare(String(displayName(b)||''),undefined,{sensitivity:'base',numeric:true}));
}
function sortConfigurationsByDisplayOrder(entries){
  return [...entries].sort((a,b)=>{
    const ao=Number.isFinite(a[1]?.displayOrder)?a[1].displayOrder:Infinity;
    const bo=Number.isFinite(b[1]?.displayOrder)?b[1].displayOrder:Infinity;
    return ao-bo||String(a[1]?.name||a[0]).localeCompare(String(b[1]?.name||b[0]),undefined,{sensitivity:'base',numeric:true});
  });
}
function nextConfigurationDisplayOrder(presets){
  return Math.max(0,...Object.values(presets||{}).map(p=>Number.isFinite(p.displayOrder)?p.displayOrder:0))+1;
}
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
  if(data.tails){
    const seenTails=new Set();
    for(const listName of ['active','placeholders']){
      if(!Array.isArray(data.tails[listName])){issues.push('Aircraft tail '+listName+' list must be an array.');continue;}
      for(const tail of data.tails[listName]){
        const normalized=String(tail??'').trim().toUpperCase();
        if(!normalized)issues.push('Tail numbers cannot be blank.');
        else if(seenTails.has(normalized))issues.push('Tail number '+normalized+' is duplicated.');
        else seenTails.add(normalized);
      }
    }
  }
  if(data.appOptions&&typeof data.appOptions.allowRfmBasicWeight!=='boolean')issues.push('RFM Basic Weight availability must be enabled or disabled.');
  for(const [id,loc] of Object.entries(data.stowage||{}))if(loc.roleFitKey&&!data.roleFit?.[loc.roleFitKey])issues.push(id+': linked Role Fit item is missing.');
  for(const [key,position] of Object.entries(data.patientPositions||{})){
    if(!/^[A-Z0-9_]+$/.test(key))issues.push(key+': patient position key must use uppercase letters, numbers and underscores.');
    if(!String(position.name||'').trim())issues.push(key+': patient position needs a name.');
    if(!Number.isFinite(position.arm))issues.push(key+': patient position arm must be a number.');
    if(!Number.isFinite(position.weight)||position.weight<0)issues.push(key+': patient weight must be a nonnegative number.');
    if(!['litter','pta'].includes(position.kind))issues.push(key+': patient position type must be litter or PTA.');
    if(position.roleFitKey&&!data.roleFit?.[position.roleFitKey])issues.push(key+': linked Role Fit item is missing.');
    if(position.missionKey){
      if(position.roleFitKey)issues.push(key+': choose either a Role Fit requirement or a Mission Equipment requirement, not both.');
      if(!data.missionEquip?.[position.missionKey]||data.missionEquip[position.missionKey].group==='Stowage')issues.push(key+': linked Mission Equipment item is missing.');
      if(!position.requiredStow||!missionLocations(data)[position.requiredStow])issues.push(key+': choose a valid required stowage location.');
    }else if(!position.roleFitKey&&position.kind!=='pta'){
      issues.push(key+': litter position needs a Role Fit or Mission Equipment availability requirement.');
    }
  }
  for(const [key,it] of Object.entries(data.missionEquip||{})){
    if(it.group==='Stowage') continue;
    if(!/^ME_[A-Z0-9_]+$/.test(key)) issues.push(key+': key must start with ME_ and contain uppercase letters, numbers and underscores.');
    if(typeof it.group!=='string'||!it.group.trim()) issues.push(key+': choose an equipment group.');
    if(!Number.isFinite(it.unitWeight)) issues.push(key+': unit weight must be a number (negative values are permitted).');
    if(!Number.isInteger(it.defaultQuantity)||it.defaultQuantity<0) issues.push(key+': default quantity must be a whole number of zero or more.');
    for(const f of ['minQuantity','maxQuantity']) if(it[f]!=null&&(!Number.isInteger(it[f])||it[f]<0))issues.push(key+': '+f+' must be a nonnegative whole number.');
    if(it.defaultQuantity<(it.minQuantity??0)||it.defaultQuantity>(it.maxQuantity??Infinity)||(it.minQuantity??0)>(it.maxQuantity??Infinity))issues.push(key+': quantity limits conflict with the default.');
    if(it.stow==='CUSTOM' ? !Number.isFinite(it.customArm) : it.stow==='BASKET' ? !it.followBasket : !missionLocations(data)[it.stow])issues.push(key+': select a valid default location or arm.');
    if(it.defaultAllocations!=null){
      if(!Array.isArray(it.defaultAllocations)||!it.defaultAllocations.length)issues.push(key+': default allocations must contain at least one location.');
      else{
        let allocationTotal=0;
        for(const allocation of it.defaultAllocations){
          if(!allocation||typeof allocation!=='object'){issues.push(key+': default allocation entries must be objects.');continue;}
          if(!Number.isInteger(allocation.quantity)||allocation.quantity<0)issues.push(key+': default allocation quantities must be nonnegative whole numbers.');
          else allocationTotal+=allocation.quantity;
          if(allocation.stow==='CUSTOM'?!Number.isFinite(allocation.customArm):allocation.stow==='BASKET'?!it.followBasket:!missionLocations(data)[allocation.stow])issues.push(key+': choose a valid default allocation location.');
        }
        if(allocationTotal!==it.defaultQuantity)issues.push(key+': default allocation quantities must add up to the default quantity.');
      }
    }
    if(it.isBasket && (it.stow==='BASKET'||it.stow==='CARRIER:'+key))issues.push(key+': select a location outside this item.');
  }
  const placement=data.crewEquipmentPlacement;
  if(placement){
    for(const key of [...(placement.seatAssociatedItems||[]),...(placement.pilotFlightEngineerB25||[]),...(placement.sarTechB25||[])])if(!data.missionEquip?.[key])issues.push('Crew equipment placement references missing equipment '+key+'.');
    for(const id of placement.pilotFlightEngineerB25Priority||[])if(!missionLocations(data)[id])issues.push('Crew equipment placement references missing stowage '+id+'.');
    if(new Set(placement.pilotFlightEngineerB25Priority||[]).size!==(placement.pilotFlightEngineerB25Priority||[]).length)issues.push('Pilot / Flight Engineer B25 priority locations must be different.');
    if(placement.sarTechB25Preferred&&!missionLocations(data)[placement.sarTechB25Preferred])issues.push('Crew equipment placement references missing stowage '+placement.sarTechB25Preferred+'.');
  }
  const presetDisplayOrders=new Set();
  for(const [key,p] of Object.entries(data.presets||{})){
    if(!String(p.name||'').trim()) issues.push(key+': configuration needs a name.');
    if(p.displayOrder!=null){
      if(!Number.isInteger(p.displayOrder)||p.displayOrder<1)issues.push(key+': display order must be a whole number greater than zero.');
      else if(presetDisplayOrders.has(p.displayOrder))issues.push(key+': display order is already used by another configuration.');
      else presetDisplayOrders.add(p.displayOrder);
    }
    for(const id of [...(p.missionOn||[]),...(p.missionOff||[])])if(!data.missionEquip[id])issues.push(key+': missing equipment '+id);
    for(const id of [...(p.roleFitOn||[]),...(p.roleFitOff||[])])if(!data.roleFit[id])issues.push(key+': missing role fit '+id);
    for(const id of [...(p.seats?.crew||[]),...(p.seats?.pax||[]),...(p.occupants||[])])if(!data.crewSeats[id]&&!data.paxSeats[id])issues.push(key+': missing seat '+id);
  }
  for(const [tail,configuration] of Object.entries(data.tailConfigurations||{})){
    if(![...(data.tails?.active||[]),...(data.tails?.placeholders||[])].includes(tail))issues.push('Tail configuration references unknown aircraft '+tail+'.');
    if(!configuration||typeof configuration!=='object')issues.push(tail+': tail configuration must be an object.');
    else{
      const tailIssues=missionConfigurationIssues({...data,...configuration,tailConfigurations:{}});
      for(const issue of tailIssues)issues.push(tail+': '+issue);
      if(!Array.isArray(configuration.tailOnlyPresetKeys))issues.push(tail+': tail-only configurations must be a list.');
      else for(const key of configuration.tailOnlyPresetKeys)if(!configuration.presets?.[key])issues.push(tail+': tail-only configuration '+key+' is missing.');
    }
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
      for(const field of ['roleFit','crewSeats','paxSeats','patientPositions'])if(ov[field])AC[field]=ov[field];
      if(ov.referenceDocuments)AC.meta.referenceDocuments=ov.referenceDocuments;
      // Preserve the existing compatibility corrections for unrelated aircraft data.
      for(const [key,seat] of Object.entries(AC.crewSeats))if(seat.occupantArm==null&&AC_CREW_SEATS[key])seat.occupantArm=AC_CREW_SEATS[key].occupantArm;
      if(AC.crewSeats.C3?.arm===4599)AC.crewSeats.C3.arm=4559;
      if(AC.crewSeats.C5?.arm===8444)AC.crewSeats.C5.arm=8440;
      if(AC.roleFit.RF_SAR_EQUIPMENT_FWD_SAR_CABINET?.arm===6275)AC.roleFit.RF_SAR_EQUIPMENT_FWD_SAR_CABINET.arm=5875;
      missionConfigNotice='Previous equipment settings were backed up. The revised mission catalogue and configurations are loaded; review them before use.';
      return;
    }
    // v19 formalizes compatible v18 data, v20 adds default per-location loads,
    // and v21 adds custodian-controlled preset order; preserve Editor edits.
    const migrateV18 = ov.baseConfigVersion===18 && AC.meta.configVersion>=19 && AC.meta.configVersion<=21;
    const migrateV19 = ov.baseConfigVersion===19 && AC.meta.configVersion>=20 && AC.meta.configVersion<=21;
    const migrateV20 = ov.baseConfigVersion===20 && AC.meta.configVersion===21;
    const migrateV22 = ov.baseConfigVersion===22 && AC.meta.configVersion===23;
    const migrateV23 = ov.baseConfigVersion===23 && AC.meta.configVersion===24;
    const migrateV24 = Number(ov.baseConfigVersion)===24 && AC.meta.configVersion>=25 && AC.meta.configVersion<=26;
    const migrateV25 = Number(ov.baseConfigVersion)===25 && AC.meta.configVersion===26;
    const migrateCompatible = migrateV18 || migrateV19 || migrateV20 || migrateV22 || migrateV23 || migrateV24 || migrateV25;
    // Other old complete catalogues must not mask incompatible shipped updates.
    if(ov.baseConfigVersion!==AC.meta.configVersion && !migrateCompatible){
      localStorage.setItem('ac_config_overrides_before_config_update',raw);
      return;
    }
    const candidate={...AC,...ov};
    const issues=missionConfigurationIssues(candidate);
    if(issues.length){missionConfigNotice='Device configuration could not be loaded: '+issues.join(' ');return;}
    if(migrateCompatible){
      localStorage.setItem('ac_config_overrides_before_config_update',raw);
      ov.baseConfigVersion=AC.meta.configVersion;
      localStorage.setItem('ac_config_overrides',JSON.stringify(ov));
    }
    for(const field of ['tails','appOptions','missionEquip','stowage','bayArms','roleFit','crewSeats','paxSeats','patientPositions','presets','crewEquipmentPlacement','tailConfigurations'])if(ov[field]){
      const shipped=AC[field];AC[field]=ov[field];
      if(field==='missionEquip')for(const [key,item] of Object.entries(AC.missionEquip)){
        if(!Object.prototype.hasOwnProperty.call(item,'defaultAllocations')&&Array.isArray(shipped[key]?.defaultAllocations))item.defaultAllocations=JSON.parse(JSON.stringify(shipped[key].defaultAllocations));
      }
      if(field==='presets'){
        for(const [key,preset] of Object.entries(AC.presets))if(!Number.isInteger(preset.displayOrder)&&Number.isInteger(shipped[key]?.displayOrder))preset.displayOrder=shipped[key].displayOrder;
        const missing=Object.entries(AC.presets).filter(([,preset])=>!Number.isInteger(preset.displayOrder)).sort((a,b)=>String(a[1].name||a[0]).localeCompare(String(b[1].name||b[0]),undefined,{sensitivity:'base',numeric:true}));
        let next=nextConfigurationDisplayOrder(AC.presets);for(const [,preset] of missing)preset.displayOrder=next++;
      }
    }
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

const TAIL_CONFIGURATION_FIELDS=['missionEquip','stowage','bayArms','roleFit','crewSeats','paxSeats','patientPositions','presets','crewEquipmentPlacement'];
function cloneConfigurationData(data){return JSON.parse(JSON.stringify(data));}
function currentConfigurationData(){
  const data={};
  for(const field of TAIL_CONFIGURATION_FIELDS)data[field]=AC[field];
  data.referenceDocuments=AC.meta.referenceDocuments||{currentId:null,history:[]};
  return cloneConfigurationData(data);
}
let AC_FLEET_CONFIGURATION=currentConfigurationData();
function activateTailConfiguration(tail){
  for(const field of TAIL_CONFIGURATION_FIELDS)AC[field]=AC_FLEET_CONFIGURATION[field];
  AC.meta.referenceDocuments=AC_FLEET_CONFIGURATION.referenceDocuments;
  const configuration=AC.tailConfigurations?.[tail];
  if(configuration){
    for(const field of TAIL_CONFIGURATION_FIELDS)if(configuration[field])AC[field]=configuration[field];
    if(configuration.referenceDocuments)AC.meta.referenceDocuments=configuration.referenceDocuments;
  }
  AC.activeTailConfigurationTail=configuration?tail:null;
  AC.tailOnlyPresetKeys=configuration?.tailOnlyPresetKeys||[];
  return configuration||null;
}

function missionCatalogueSignature(){
  return JSON.stringify([AC.missionEquip,AC.stowage,AC.bayArms,AC.presets,AC.patientPositions,AC.crewEquipmentPlacement]);
}
function missionDefaultAllocation(key){
  const it=AC.missionEquip[key];
  return {id:'base',quantity:it.defaultQuantity??1,stow:it.stow,customArm:it.customArm??null,basketRef:null};
}
function missionDefaultAllocations(key){
  const it=AC.missionEquip[key];
  if(!Array.isArray(it.defaultAllocations)||!it.defaultAllocations.length)return [missionDefaultAllocation(key)];
  return it.defaultAllocations.map((allocation,index)=>({id:'base'+index,quantity:allocation.quantity,stow:allocation.stow,customArm:allocation.customArm??null,basketRef:null}));
}
function missionAllocations(s,key){
  const rows=s.missionLoads?.[key];
  return rows===undefined?missionDefaultAllocations(key):rows;
}
function editMissionAllocations(s,key){
  s.missionLoads??={};
  return s.missionLoads[key]??=(missionAllocations(s,key).map(x=>({...x})));
}
function missionBaskets(s){
  return Object.entries(AC.missionEquip).filter(([key,it])=>s.mission?.[key]&&it.isBasket&&it.active!==false)
    .flatMap(([key,it])=>missionAllocations(s,key).filter(r=>r.quantity>0).map(r=>({key,id:r.id,label:it.name+' · '+(missionLocations()[r.stow]?.name||r.stow)})));
}
function missionDefaultBasket(s,baskets=missionBaskets(s)){
  const preset=AC.presets?.[s.preset];
  const excluded=preset?.missionOff||[];
  const defaults=(preset?.missionOn||[]).filter(key=>!excluded.includes(key)&&AC.missionEquip[key]?.isBasket&&s.mission?.[key]);
  if(defaults.length!==1)return null;
  const matches=baskets.filter(b=>b.key===defaults[0]);
  return matches.length===1?matches[0]:null;
}
function resolveMissionLocation(s,row,seen=new Set()){
  if(row.stow==='CREW_SEAT'){
    const crewId=row.crewId,seat=Object.entries(s.occupants||{}).find(([,person])=>person?.crewId===crewId)?.[0]||row.crewSeat;
    const loc=seat&&(AC.crewSeats[seat]||AC.paxSeats[seat]);
    if(!loc)return {arm:null,stowId:'CREW_SEAT',stow:'Crew member seat',error:'associated crew seat is unavailable; choose another stowage location'};
    const arm=loc.occupantArm??loc.arm;
    return {arm,stowId:'CREW_SEAT:'+seat,stow:'With crew member · '+seat+' · '+loc.name,stowGroup:'Crew Seat',error:Number.isFinite(arm)?null:'crew seat arm is unavailable'};
  }
  if(row.stow?.startsWith('CARRIER:')){
    const key=row.stow.slice(8),it=AC.missionEquip[key];
    if(!it?.isBasket||!s.mission?.[key])return {arm:null,stow:'Unavailable carrying item',error:'carrying item is unavailable; choose another stowage location'};
    const rows=missionAllocations(s,key).filter(r=>r.quantity>0);
    if(rows.length!==1)return {arm:null,stow:'Select carrying item location',error:'carrying item has multiple locations; select a specific carrying item'};
    return resolveMissionLocation(s,{stow:'BASKET',basketRef:{key,id:rows[0].id}},seen);
  }
  if(row.stow==='BASKET'){
    const baskets=missionBaskets(s), link=row.basketRef;
    const basket=link?baskets.find(b=>b.key===link.key&&b.id===link.id):baskets.length===1?baskets[0]:missionDefaultBasket(s,baskets);
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
