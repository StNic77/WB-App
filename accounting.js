/* Explicit sortie declarations relative to the accepted aircraft weight/moment.
   Boolean roleFit remains a derived physical-fit view for existing consumers. */
const ROLE_FIT_DECLARATIONS = Object.freeze(['NEUTRAL','ADD','REMOVE','ACCOUNTED','EXCLUDED']);
const ROLE_FIT_LABELS = Object.freeze({NEUTRAL:'No change',ADD:'Add equipment',REMOVE:'Remove equipment',ACCOUNTED:'Already included — fitted',EXCLUDED:'Already excluded — removed',CUSTOM:'Custom exception'});
const ROLE_FIT_ALIASES = Object.freeze({
  RF_CASEVAC_STRETCHER_RACK_4:'RF_SAR_EQUIPMENT_CASEVAC_RACK_SYSTEM',
  RF_SECONDARY_HOIST:'RF_AIRCRAFT_SYSTEMS_SECONDARY_HOIST', RF_TRAKKA:'RF_SENSOR_SYSTEMS_TRAKKA_SRCHLT',
  RF_SEA_TRAY:'RF_AIRCRAFT_SYSTEMS_SEA_TRAY', RF_DIVE_O2_RACK:'RF_SAR_EQUIPMENT_DIVE_O2_BOTTLE_RACK',
  RF_AIR_COOLING:'RF_AIRCRAFT_SYSTEMS_AIR_COOLING_PACK', RF_FLOAT_SYS:'RF_AIRCRAFT_SYSTEMS_FLOATATION_SYSTEM',
  RF_LIFERAFT_SPONSONS:'RF_AIRCRAFT_SYSTEMS_SPONSON_LIFERAFTS', RF_LASHING_KIT:'RF_SERVICING_EQUIPMENT_LASHING_KIT',
  RF_RIPU:'RF_ICE_PROTECTION_RIPU', RF_RIPU_CABLES:'RF_ICE_PROTECTION_RIPU_CABLES',
  RF_MR_SLIP:'RF_ICE_PROTECTION_MR_SLIP_RING', RF_TR_SLIP:'RF_ICE_PROTECTION_TR_SLIP_RING',
  RF_ICE_PROTECTIO_MR_SLIP_RING:'RF_ICE_PROTECTION_MR_SLIP_RING',
  RF_FIELD_TOOLKIT:'RF_SERVICING_EQUIPMENT_FIELD_TOOL_KIT', RF_SERVICING_FIELD_TOOL_KIT:'RF_SERVICING_EQUIPMENT_FIELD_TOOL_KIT',
  RF_CODE_A_EQUIPMENT:'RF_SERVICING_EQUIPMENT_CODE_A_EQUIP', RF_EOIR_MX15:'RF_SENSOR_SYSTEMS_EOIR_TURRET',
  RF_SENSOR_WS:'RF_SENSOR_SYSTEMS_SENSOR_WORKSTATION', RF_PTA_COT:'RF_SAR_EQUIPMENT_CSH_PATIENT_TREATMENT_SYSTEM',
  RF_SAR_CABINET:'RF_SAR_EQUIPMENT_FWD_SAR_CABINET', RF_EOIR_HANDCTRL:'RF_SENSOR_SYSTEMS_EOIR_HAND_CONTROLLER'
});
function canonicalRoleFitKey(key){ return ROLE_FIT_ALIASES[key] || key; }
function normalizeAccountingConfiguration(){
  // Older local editor exports predate the complete rack-system entry.
  const rack='RF_SAR_EQUIPMENT_CASEVAC_RACK_SYSTEM';
  const oldRack='RF_CASEVAC_STRETCHER_RACK_4';
  if (AC.roleFit[oldRack]) {
    AC.roleFit[rack]=AC.roleFit[oldRack];
    delete AC.roleFit[oldRack];
  }
  let overrides=null;
  try { overrides=JSON.parse(localStorage.getItem('ac_config_overrides')||'null'); } catch (_) {}
  // Upgrade older overrides once; subsequent editor deletions are authoritative.
  const upgrade=!!overrides && !overrides.roleFitAccountingVersion;
  if (!AC.roleFit[rack] && AC_ROLE_FIT[rack] && (!overrides || upgrade)) AC.roleFit[rack]=JSON.parse(JSON.stringify(AC_ROLE_FIT[rack]));
  for (const preset of Object.values(AC.presets)){
    for (const field of ['roleFitOn','roleFitOff']){
      preset[field]=[...new Set((preset[field]||[]).map(canonicalRoleFitKey))].filter(key=>!!AC.roleFit[key]);
    }
  }
  if(upgrade && AC.roleFit[rack] && AC.presets.CASEVAC){
    AC.presets.CASEVAC.roleFitOn=[...new Set([...AC.presets.CASEVAC.roleFitOn,rack])];
    AC.presets.CASEVAC.roleFitOff=AC.presets.CASEVAC.roleFitOff.filter(k=>k!==rack);
  }
}
normalizeAccountingConfiguration();
function normalizeRackSessionKey(s){
  const oldKey='RF_CASEVAC_STRETCHER_RACK_4', key='RF_SAR_EQUIPMENT_CASEVAC_RACK_SYSTEM';
  for(const map of [s.roleFit,s.roleFitDeclarations,s.roleFitDeclarationOrigins,s.accepted?.maintenanceBaseline?.roleFit,s.maintenanceDraft?.roleFit]){
    if(map && Object.prototype.hasOwnProperty.call(map,oldKey)){
      if(!Object.prototype.hasOwnProperty.call(map,key)) map[key]=map[oldKey];
      delete map[oldKey];
    }
  }
  if(Array.isArray(s.accepted?.maintenanceExceptions)) s.accepted.maintenanceExceptions=s.accepted.maintenanceExceptions.map(canonicalRoleFitKey);
  for(const item of s.customExceptions||[]) if(item.roleFitKey===oldKey) item.roleFitKey=key;
  pruneStaleRoleFitReferences(s);
}
function pruneStaleRoleFitReferences(s){
  let changed=false;
  for(const map of [s.roleFit,s.roleFitDeclarations,s.roleFitDeclarationOrigins,s.maintenanceDraft?.roleFit]){
    for(const key of Object.keys(map||{})) if(!AC.roleFit[key]) { delete map[key]; changed=true; }
  }
  // Keep accepted snapshots and custom links as evidence; unresolved custom links block certification.
  if(changed){s.accountingReviewRequired=true;invalidateAccountingCertification(s);}
}
function roleFitDeclaration(s,key){ return s.roleFitDeclarations?.[key] || 'NEUTRAL'; }
function resolvedRoleFitDeclaration(s,key){
  const action=roleFitDeclaration(s,key);
  if(action!=='NEUTRAL') return action;
  if(roleFitRemovedInAcceptedRecord(s,key)) return 'EXCLUDED';
  const baseline=s.accepted?.maintenanceBaseline?.roleFit;
  if(s.accepted?.isAccepted && basicWeightBasis(s)==='MAINTENANCE' && Object.prototype.hasOwnProperty.call(baseline||{},key)) return baseline[key]?'ACCOUNTED':'EXCLUDED';
  return 'NEUTRAL'; // unanswered: do not infer inclusion from expected fit
}
function roleFitRemovedInAcceptedRecord(s,key){
  if (!s.accepted?.isAccepted || basicWeightBasis(s)!=='MAINTENANCE') return false;
  if (Array.isArray(s.accepted.maintenanceExceptions)) return s.accepted.maintenanceExceptions.map(canonicalRoleFitKey).includes(key);
  return roleFitMaintenanceDefault(AC.roleFit[key]) && s.accepted.maintenanceBaseline?.roleFit?.[key]===false;
}
function customRoleFitKey(item){
  if (item.roleFitKey) return canonicalRoleFitKey(item.roleFitKey);
  const name=String(item.description||'').trim().toLowerCase().replace(/\s+/g,' ');
  return Object.keys(AC.roleFit).find(key=>AC.roleFit[key].name.trim().toLowerCase().replace(/\s+/g,' ')===name) || '';
}
function customForRoleFit(s,key){ return (s.customExceptions||[]).filter(item=>customRoleFitKey(item)===key); }
function roleFitIsInstalled(s,key){
  if (roleFitRemovedInAcceptedRecord(s,key)) return false;
  const custom=customForRoleFit(s,key);
  if (custom.length) return custom.length===1 && Number(custom[0].w)>0;
  const action=roleFitDeclaration(s,key);
  if (action==='ADD' || action==='ACCOUNTED') return true;
  if (action==='REMOVE' || action==='EXCLUDED') return false;
  // Neutral makes no physical claim: retain a known accepted fit, if available.
  return s.accepted?.isAccepted && basicWeightBasis(s)==='MAINTENANCE' && !!s.accepted.maintenanceBaseline?.roleFit?.[key];
}
function syncRoleFitPhysicalState(s){
  s.roleFit=s.roleFit||{};
  for (const key of Object.keys(AC.roleFit)) s.roleFit[key]=roleFitIsInstalled(s,key);
}
function invalidateAccountingCertification(s){
  if (s.certify) { s.certify.certified=false; s.certify.by=null; s.certify.at=null; }
  s.signedOutBy=null; s.signedOutAt=null;
}
function setRoleFitDeclaration(s,key,action,origin='manual'){
  if (!AC.roleFit[key] || !ROLE_FIT_DECLARATIONS.includes(action)) return 'Invalid equipment declaration.';
  if (roleFitRemovedInAcceptedRecord(s,key) && action!=='NEUTRAL') return 'This removal is already in the accepted aircraft record. It cannot be applied again or reinstalled in this session.';
  if (customForRoleFit(s,key).length && action!=='NEUTRAL') return 'This item is controlled by a Custom Exception. Edit that entry to avoid counting it twice.';
  s.roleFitDeclarations=s.roleFitDeclarations||{}; s.roleFitDeclarationOrigins=s.roleFitDeclarationOrigins||{};
  s.roleFitDeclarations[key]=action; s.roleFitDeclarationOrigins[key]=origin;
  invalidateAccountingCertification(s); syncRoleFitPhysicalState(s); return '';
}
function presetRoleFitDeclaration(s,preset,key){
  const included=basicWeightBasis(s)==='MAINTENANCE' && !!s.accepted?.maintenanceBaseline?.roleFit?.[key];
  if ((preset?.roleFitOff||[]).includes(key)) return included ? 'REMOVE' : 'NEUTRAL';
  if ((preset?.roleFitOn||[]).includes(key)) return included ? 'NEUTRAL' : 'ADD';
  return 'NEUTRAL'; // omission never means REMOVE
}
function roleFitExpectation(s,key){
  const normal=!!AC.roleFit[key]?.normally, preset=AC.presets[s.preset];
  const on=!!preset?.roleFitOn?.includes(key), off=!!preset?.roleFitOff?.includes(key);
  return {normal,installed:off?false:on?true:normal,configuration:preset?.name||'No configuration',inherited:!!preset&&!on&&!off};
}
function applyRoleFitPreset(s,preset){
  for (const key of Object.keys(AC.roleFit)){
    if (roleFitRemovedInAcceptedRecord(s,key)) { setRoleFitDeclaration(s,key,'NEUTRAL','accepted'); continue; }
    if (s.roleFitDeclarationOrigins?.[key]==='manual' || ['ACCOUNTED','EXCLUDED'].includes(roleFitDeclaration(s,key)) || customForRoleFit(s,key).length) continue;
    setRoleFitDeclaration(s,key,presetRoleFitDeclaration(s,preset,key),'preset');
  }
  syncRoleFitPhysicalState(s);
}
function roleFitAccountingRows(s){
  return Object.entries(AC.roleFit).map(([key,item])=>{
    const declaration=resolvedRoleFitDeclaration(s,key), custom=customForRoleFit(s,key).length>0;
    const locked=roleFitRemovedInAcceptedRecord(s,key);
    const factor=locked||custom ? 0 : declaration==='ADD'?1:declaration==='REMOVE'?-1:0;
    return {key,name:item.name,declaration:custom?'CUSTOM':declaration,origin:s.roleFitDeclarationOrigins?.[key]||'none',
      itemW:item.w,arm:item.arm,w:factor*item.w,m:factor*item.w*item.arm,current:roleFitIsInstalled(s,key),locked,custom};
  });
}
function customExceptionAccountingRows(s){
  return (s.customExceptions||[]).map(item=>{
    const key=customRoleFitKey(item), inputW=Number(item.w)||0, arm=Number(item.arm)||0;
    const accounted=item.accounting==='ACCOUNTED';
    const invalidLink=!!key && (!AC.roleFit[key] || customForRoleFit(s,key).length>1 || (!accounted&&roleFitRemovedInAcceptedRecord(s,key)));
    const w=accounted||invalidLink ? 0 : inputW;
    return {...item,key,inputW,arm,w,m:w*arm,accounting:accounted?'ACCOUNTED':'APPLY',invalidLink};
  });
}
function accountingIssues(s){
  const issues=[];
  if (s.accountingReviewRequired) issues.push('Review the migrated Mission Config declarations before certifying.');
  for (const [key,item] of Object.entries(AC.roleFit)){
    const action=roleFitDeclaration(s,key), linked=customForRoleFit(s,key);
    if (!ROLE_FIT_DECLARATIONS.includes(action)) issues.push(item.name+': invalid declaration.');
    if (roleFitRemovedInAcceptedRecord(s,key) && action!=='NEUTRAL') issues.push(item.name+': conflicts with an accepted maintenance removal.');
    if (linked.length>1) issues.push(item.name+': more than one Custom Exception refers to this item. Resolve duplicate accounting.');
    if (linked.length && action!=='NEUTRAL') issues.push(item.name+': use either the listed declaration or the Custom Exception.');
  }
  for (const item of customExceptionAccountingRows(s)){
    if (item.key && !AC.roleFit[item.key]) issues.push((item.description||'Custom Exception')+': linked equipment no longer exists.');
    if (item.invalidLink) issues.push((item.description||'Custom Exception')+': linked accounting is unavailable or duplicated; no adjustment is applied.');
    if (item.accounting==='ACCOUNTED' && item.w!==0) issues.push('Invalid accounted adjustment.');
  }
  return [...new Set(issues)];
}
function migrateRoleFitDeclarations(s){
  const previous=s.roleFit||{}, baseline=s.accepted?.maintenanceBaseline?.roleFit;
  s.roleFitDeclarations={}; s.roleFitDeclarationOrigins={};
  for (const key of Object.keys(AC.roleFit)){
    const current=!!previous[key]; const included=basicWeightBasis(s)==='MAINTENANCE' && !!baseline?.[key];
    s.roleFitDeclarations[key]=roleFitRemovedInAcceptedRecord(s,key)?'NEUTRAL':current?(included?'ACCOUNTED':'ADD'):(included?'REMOVE':'NEUTRAL');
    s.roleFitDeclarationOrigins[key]='manual'; // preserve until deliberately released to presets
  }
  for (const item of (s.customExceptions||[])) { item.accounting=item.accounting||'APPLY'; item.roleFitKey=item.roleFitKey||''; }
  s.accountingReviewRequired=!!(s.accepted?.isAccepted || s.preset || (s.customExceptions||[]).length);
  s.customExceptionsReviewed=false;
  invalidateAccountingCertification(s); syncRoleFitPhysicalState(s);
}
