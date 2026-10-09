/*
 * editor.js — CH-149 - 615 W&B App
 *
 * Password-protected config editor for the custodian.
 *
 * Features:
 *   - Login screen (shared password from AC.auth.password)
 *   - Tabbed editor: Mission Equipment / Stowage Locations / Role-Fit
 *   - Full CRUD on each section (add, edit, delete)
 *   - Changes save to localStorage under "ac_config_overrides"
 *   - Mission equipment items pick stowage from dropdown (arm auto-resolves)
 *   - "Export config.js" button — downloads an updated config.js file
 *     for the custodian to publish to the fleet when cloud hosting is ready
 *   - "Reset to factory defaults" button — clears all overrides
 *
 * State:
 *   EDITOR.authed   — true once the custodian has logged in this session
 *   EDITOR.activeSection — "MISSION" | "ROLEFIT"
 *   EDITOR.draft    — working copy of AC data being edited; saved on each commit
 *
 * Called from app.js renderEditor() when the Editor tab is opened.
 */

const EDITOR = {
  authed: false,
  activeSection: "ROLEFIT",
  draft: null,
  mode: "fleet",
  tailConfigTails: []
};

function editorItemKey(name,prefix=''){
  const key=name.trim().toUpperCase().replace(/[^A-Z0-9_]+/g,'_').replace(/^_+|_+$/g,'');
  return key?(prefix&&!key.startsWith(prefix)?prefix+key:key):'';
}
const ROLE_EDITOR_GROUPS=[['RF_AIRCRAFT_SYSTEMS_','Aircraft Systems'],['RF_ICE_PROTECTION_','Ice Protection'],['RF_SAR_EQUIPMENT_','SAR Equipment'],['RF_SENSOR_SYSTEMS_','Sensor Systems'],['RF_SERVICING_EQUIPMENT_','Servicing Equipment'],['RF_STOW_','Stowage Fittings']];
function editorRoleGroupNames(){return [...new Set([...ROLE_EDITOR_GROUPS.map(([,name])=>name),...Object.values(EDITOR.draft.roleFit).map(it=>it.group).filter(Boolean)])];}
function editorStowageGroupNames(){return [...new Set(['SAR Cabinet','Cabin','Port Fwd Shelves','Ramp','Cabin Bays',...Object.values(EDITOR.draft.stowage).map(loc=>loc.group).filter(Boolean)])];}
function editorKeyDefinition(value,kind){
  const key=editorItemKey(value),prefix=kind==='role'?'RF_':kind==='mission'?'ME_':'';
  if(!key||prefix&&!key.startsWith(prefix))return {error:'Start the key with '+(prefix?prefix.slice(0,-1).toLowerCase()+', then enter ':'')+'the group and item description.'};
  const names=kind==='role'?editorRoleGroupNames():kind==='mission'?missionGroupNames(EDITOR.draft):editorStowageGroupNames();
  if(key.includes('__')){
    // New groups require an explicit separator; never guess from free text.
    if(!/^[A-Z0-9]+(?:_[A-Z0-9]+)*__[A-Z0-9]+(?:_[A-Z0-9]+)*$/.test(value.trim()))return {error:'For a new group, type '+prefix+'NEW_GROUP__NEW_ITEM exactly, using capitals and a double underscore before the item.'};
    const groupPart=key.split('__')[0].slice(prefix.length);if(!groupPart)return {error:'Enter a group before the double underscore.'};
    const group=names.find(g=>editorItemKey(g)===groupPart)||(kind==='mission'?groupPart.replaceAll('_',' '):groupPart.toLowerCase().replace(/(^|_)([a-z])/g,(_,space,c)=>(space?' ':'')+c.toUpperCase()));
    if(group.toLowerCase()==='stowage'&&kind==='mission')return {error:'Stowage is reserved for location entries. Use a different equipment group.'};
    return {key,group};
  }
  const aliases=names.map(group=>[prefix+editorItemKey(group)+'_',group]);
  if(kind==='role')aliases.push(...ROLE_EDITOR_GROUPS);
  const match=aliases.sort((a,b)=>b[0].length-a[0].length).find(([start])=>key.startsWith(start)&&key.length>start.length);
  return match?{key,group:match[1]}:{error:'Group not recognized. For a new group, use '+prefix+'NEW_GROUP__NEW_ITEM (double underscore before the item).'};
}
function editorOrganizePanels(host){
  const mission=host.querySelector('#missionItemList'),role=host.querySelector('#roleFitItemList'),seats=host.querySelector('#seatBaselineList');
  const list=mission||role||seats;if(!list)return;
  const groups=new Map();
  const roleGroups=ROLE_EDITOR_GROUPS;
  for(const row of [...list.children]){
    const input=row.querySelector('[data-k], [data-seat]');if(!input)continue;
    const key=input.dataset.k||input.dataset.seat;
    const item=mission?EDITOR.draft.missionEquip[key]:role?EDITOR.draft.roleFit[key]:null;
    const group=mission?item.group:role?(item.group||roleGroups.find(([prefix])=>key.startsWith(prefix))?.[1]||'Aircraft Systems'):input.dataset.group==='crew'?'Crew Seats':'Passenger Seats';
    if(!groups.has(group)){
      const panel=document.createElement('details');panel.className='card';panel.dataset.editorPanel='group:'+group;
      const title=document.createElement('summary');title.textContent=group;panel.append(title);list.append(panel);groups.set(group,panel);
    }
    if(seats){groups.get(group).append(row);continue;}
    const panel=document.createElement('details');panel.className='card';panel.dataset.editorPanel='item:'+key;
    const title=document.createElement('summary');title.textContent=item.name;panel.append(title,row);groups.get(group).append(panel);
    row.querySelector('[data-f="name"]')?.addEventListener('change',()=>{title.textContent=item.name;});
    if(role){
      const label=document.createElement('label');label.className='small';label.textContent='Equipment group';
      const select=document.createElement('select');select.dataset.roleEditorGroup=key;
      for(const name of editorRoleGroupNames()){const option=document.createElement('option');option.value=name;option.textContent=name;select.append(option);}select.value=group;
      select.onchange=()=>{item.group=select.value;EDITOR.openPanels??={};EDITOR.openPanels['group:'+item.group]=true;EDITOR.openPanels['item:'+key]=true;editorSaveDraft();renderEditor();};label.append(select);row.prepend(label);
    }
  }
  if(role)for(const name of editorRoleGroupNames())if(groups.has(name))list.append(groups.get(name));
  for(const panel of list.querySelectorAll('[data-editor-panel]')){
    panel.open=!!EDITOR.openPanels?.[panel.dataset.editorPanel];
    panel.ontoggle=()=>{EDITOR.openPanels??={};EDITOR.openPanels[panel.dataset.editorPanel]=panel.open;};
  }
}


/* =========================
   SAVE / LOAD / RESET
   ========================= */

function editorSaveDraft() {
  // Persist current draft to localStorage and mutate AC so the rest
  // of the app immediately sees the changes without a reload.
  try {
    EDITOR.draft.bayArms ??= JSON.parse(JSON.stringify(AC.bayArms));
    for(const preset of Object.values(EDITOR.draft.presets)){
      for(const field of ['roleFitOn','roleFitOff']) preset[field]=[...new Set((preset[field]||[]).filter(k=>!!EDITOR.draft.roleFit[k]))];
    }
    const issues=missionConfigurationIssues(EDITOR.draft);
    if(issues.length){alert(issues.join("\n"));return false;}
    if(EDITOR.mode==='tail'){
      if(!EDITOR.tailConfigTails.length){alert('Select at least one tail before saving a tail-specific configuration.');return false;}
      const tailOnlyPresetKeys=Object.keys(EDITOR.draft.presets).filter(key=>!AC_FLEET_CONFIGURATION.presets[key]);
      const configuration={};
      for(const field of TAIL_CONFIGURATION_FIELDS)configuration[field]=JSON.parse(JSON.stringify(EDITOR.draft[field]));
      configuration.referenceDocuments=JSON.parse(JSON.stringify(EDITOR.draft.referenceDocuments));
      configuration.tailOnlyPresetKeys=tailOnlyPresetKeys;
      const tailConfigurations=JSON.parse(JSON.stringify(AC.tailConfigurations||{}));
      for(const tail of EDITOR.tailConfigTails)tailConfigurations[tail]=JSON.parse(JSON.stringify(configuration));
      const payload=JSON.parse(localStorage.getItem('ac_config_overrides')||'{}');
      payload.missionSchema=MISSION_SCHEMA;payload.baseConfigVersion=AC_META.configVersion;payload.roleFitAccountingVersion=2;
      payload.tailConfigurations=tailConfigurations;
      localStorage.setItem('ac_config_overrides',JSON.stringify(payload));
      AC.tailConfigurations=tailConfigurations;
      for(const tail of EDITOR.tailConfigTails){
        const session=STORE.sessions[tail];if(session)invalidateAccountingCertification(session);
        if(tail===STORE.selectedTail)activateTailConfigurationForSession(tail);
      }
      persistSession();
      return true;
    }
    const payload = {
      missionSchema: MISSION_SCHEMA,
      baseConfigVersion: AC_META.configVersion,
      roleFitAccountingVersion: 2,
      tails: EDITOR.draft.tails,
      appOptions: EDITOR.draft.appOptions,
      missionEquip: EDITOR.draft.missionEquip,
      stowage:      EDITOR.draft.stowage,
      bayArms:      EDITOR.draft.bayArms || AC.bayArms,
      roleFit:      EDITOR.draft.roleFit,
      crewSeats:    EDITOR.draft.crewSeats,
      paxSeats:     EDITOR.draft.paxSeats,
      patientPositions: EDITOR.draft.patientPositions,
      presets:      EDITOR.draft.presets,
      crewEquipmentPlacement: EDITOR.draft.crewEquipmentPlacement,
      referenceDocuments: EDITOR.draft.referenceDocuments,
      tailConfigurations: AC.tailConfigurations||{}
    };
    localStorage.setItem("ac_config_overrides", JSON.stringify(payload));

    // Mutate live AC so the app sees changes immediately
    AC.tails = EDITOR.draft.tails;
    AC.appOptions = EDITOR.draft.appOptions;
    AC.missionEquip = EDITOR.draft.missionEquip;
    AC.stowage      = EDITOR.draft.stowage;
    AC.bayArms      = EDITOR.draft.bayArms || AC.bayArms;
    AC.roleFit      = EDITOR.draft.roleFit;
    AC.crewSeats    = EDITOR.draft.crewSeats;
    AC.paxSeats     = EDITOR.draft.paxSeats;
    AC.patientPositions = EDITOR.draft.patientPositions;
    AC.meta.referenceDocuments = EDITOR.draft.referenceDocuments;

    AC.presets = EDITOR.draft.presets;
    AC.crewEquipmentPlacement = EDITOR.draft.crewEquipmentPlacement;
    AC_FLEET_CONFIGURATION=currentConfigurationData();
    syncEditorTailRegistry();

    // Also update the live session's roleFit state for any tail currently loaded —
    // "normally installed" changes should take effect immediately without a reload.
    for (const tail of Object.keys(STORE.sessions || {})) {
      const s = STORE.sessions[tail];
      if (!s || !s.roleFit) continue;
      pruneStaleRoleFitReferences(s);
      invalidateAccountingCertification(s);
      for (const k of Object.keys(EDITOR.draft.roleFit)) {
        // Only update keys that don't already have an explicit session value set
        // by a preset (i.e. the user hasn't deliberately toggled it off).
        // We update ALL keys that don't yet exist in the session (new items),
        // and re-sync the `normally` default for existing ones.
        if (!(k in s.roleFit)) {
          s.roleFit[k] = false;
          s.roleFitDeclarations=s.roleFitDeclarations||{};
          s.roleFitDeclarations[k]="NEUTRAL";
        }
      }
    }
    if(STORE.selectedTail)activateTailConfigurationForSession(STORE.selectedTail);
    persistSession();
    return true;
  } catch (e) {
    alert("Failed to save changes: " + e.message);
  }
}

function syncEditorTailRegistry(){
  if(typeof STORE==='undefined'||!Array.isArray(EDITOR.draft?.tails?.active)||!Array.isArray(EDITOR.draft?.tails?.placeholders))return;
  const active=EDITOR.draft.tails.active,placeholders=EDITOR.draft.tails.placeholders;
  STORE.tails=[...active,...placeholders];
  for(const tail of active)if(!STORE.sessions[tail])STORE.sessions[tail]=makeNewSession(tail,false);else STORE.sessions[tail].isPlaceholder=false;
  for(const tail of placeholders)if(!STORE.sessions[tail])STORE.sessions[tail]=makeNewSession(tail,true);else STORE.sessions[tail].isPlaceholder=true;
}

function editorResetDefaults() {
  if (!confirm("Discard all local Editor changes?\n\nThis returns this device to the configuration provided by its current config.js.")) return;
  if (!confirm("Confirm discard of local Editor changes?\n\nChanges made directly to config.js will not be undone.")) return;
  try {
    localStorage.removeItem("ac_config_overrides");
    alert("Local Editor changes discarded. The page will now reload.");
    location.reload();
  } catch (e) {
    alert("Reset failed: " + e.message);
  }
}

function editorInitDraft() {
  // Deep-clone current AC state into an editable draft.
  // Presets carry missionOn/Off AND roleFitOn/Off so the editor
  // can manage both mission equipment and role-fit preset membership.
  const source=EDITOR.mode==='tail'&&EDITOR.tailConfigTails.length
    ? AC.tailConfigurations?.[EDITOR.tailConfigTails[0]] || AC_FLEET_CONFIGURATION
    : AC_FLEET_CONFIGURATION||AC;
  const presetsDraft = JSON.parse(JSON.stringify(source.presets));

  EDITOR.draft = {
    missionEquip: JSON.parse(JSON.stringify(source.missionEquip)),
    stowage:      JSON.parse(JSON.stringify(source.stowage)),
    bayArms:      JSON.parse(JSON.stringify(source.bayArms)),
    roleFit:      JSON.parse(JSON.stringify(source.roleFit)),
    crewSeats:    JSON.parse(JSON.stringify(source.crewSeats)),
    paxSeats:     JSON.parse(JSON.stringify(source.paxSeats)),
    patientPositions: JSON.parse(JSON.stringify(source.patientPositions||AC.patientPositions||{})),
    presets:      presetsDraft,
    tails:        JSON.parse(JSON.stringify(AC_FLEET_CONFIGURATION.tails||AC.tails)),
    appOptions:   JSON.parse(JSON.stringify(AC_FLEET_CONFIGURATION.appOptions||AC.appOptions||{allowRfmBasicWeight:true})),
    crewEquipmentPlacement: JSON.parse(JSON.stringify(source.crewEquipmentPlacement||{})),
    referenceDocuments: JSON.parse(JSON.stringify(source.referenceDocuments || {currentId:null,history:[]}))
  };
  for (const it of Object.values(EDITOR.draft.roleFit)){
    if (it.maintenanceIncluded === undefined) it.maintenanceIncluded = !!it.normally;
  }
}

// Deleting an equipment definition must also remove its preset references.
// Otherwise the exported config retains IDs that no longer have weights/arms.
function editorRemovePresetItem(key, fields) {
  for (const preset of Object.values(EDITOR.draft.presets)) {
    for (const field of fields) {
      if (Array.isArray(preset[field])) {
        preset[field] = preset[field].filter(id => id !== key);
      }
    }
  }
}


/* =========================
   ENTRY POINT — called by app.js renderEditor()
   ========================= */

function renderEditor() {
  const scrollY=window.scrollY;
  renderEditorContent();
  window.scrollTo({top:scrollY,left:0,behavior:'instant'});
}
function renderEditorContent() {
  const host = document.getElementById("editorHost");
  if (!host) return;

  if (!EDITOR.authed) {
    renderEditorLogin(host);
    return;
  }

  if (!EDITOR.draft) editorInitDraft();
  renderEditorMain(host);
}


/* =========================
   LOGIN SCREEN
   ========================= */

function renderEditorLogin(host) {
  host.innerHTML = `
    <div class="card" style="max-width:420px; margin:40px auto;">
      <h2>Custodian Login</h2>
      <div class="callout" style="margin-bottom:14px;">
        The editor allows the designated custodian to manage Mission Equipment,
        Stowage Locations, and Role-Fit items without editing code.
        Changes are saved to this device and take effect immediately.
      </div>

      <div class="lbl">Password</div>
      <input type="password" id="editorPwd" autocomplete="off"
             placeholder="Enter custodian password"
             style="margin-bottom:12px;">

      <div id="editorLoginMsg" class="small" style="margin-bottom:10px; min-height:16px;"></div>

      <button class="btn good" id="editorLoginBtn">Sign In</button>
    </div>
  `;

  const pwd = document.getElementById("editorPwd");
  const msg = document.getElementById("editorLoginMsg");
  const btn = document.getElementById("editorLoginBtn");

  const tryLogin = () => {
    if (pwd.value === AC.auth.password) {
      EDITOR.authed = true;
      editorInitDraft();
      renderEditor();
    } else {
      msg.innerHTML = '<span class="badge bad">Incorrect password</span>';
      pwd.value = "";
      pwd.focus();
    }
  };

  btn.onclick = tryLogin;
  pwd.addEventListener("keydown", (e) => {
    if (e.key === "Enter") tryLogin();
  });
  pwd.focus();
}


/* =========================
   MAIN EDITOR UI
   ========================= */

function renderEditorMain(host) {
  const tabs = [
    { id: "ROLEFIT",  label: "Role Fit Equipment" },
    { id: "MISSION",  label: "Mission Equipment" },
    { id: "SEATBASE", label: "Crew, Pax, Patients & Seating" },
    { id: "STOWAGE",  label: "Stowage Locations" },
    { id: "REFERENCE", label: "Reference Documents" },
    { id: "CONFIGURATIONS", label: "Aircraft Roles" },
    ... (EDITOR.mode==='tail' ? [] : [{ id: "AIRCRAFT", label: "App Settings" }]),
    { id: "TAILCONFIG", label: EDITOR.mode==='tail' ? "Change Tail Selection" : "Create Tail-Specific Configuration" }
  ];

  host.innerHTML = `
    <div class="card">
      <h2>
        Custodian Editor
        <small>Signed in · changes saved locally to this device</small>
      </h2>

      <div class="tabs" style="margin-bottom:14px; justify-content:flex-start;">
        ${tabs.map(t => `
          <button class="tabbtn ${EDITOR.activeSection === t.id ? "active" : ""}"
                  data-edsec="${t.id}">${t.label}</button>
        `).join("")}
      </div>

      <div class="callout">
        <b>Maintain the configuration data used by the W&amp;B application.</b> Use the Editor to manage the application configuration and operational data available to users. <b>Changes made in the Editor take effect immediately on this device.</b> Verify that changes produce the expected results before publishing them. Use <b>Discard Local Editor Changes</b> or <b>Export config.js</b> below to manage or publish your changes.
      </div>
      ${EDITOR.mode==='fleet'?`<div class="callout"><b>Fleet configuration</b><div class="small">You’re editing the defaults used across the fleet.</div></div>`:''}
      ${EDITOR.mode==='tail'?`<div class="callout"><b>Tail-specific configuration · ${EDITOR.tailConfigTails.map(escHtml).join(', ')}</b><div class="small">Changes in these Editor sections apply only to the selected tails. Their other fleet configurations remain available. Saving makes the same edited setup available to each selected tail.</div></div>`:''}

      <div id="editorSectionHost"></div>

      <div class="hr"></div>
      <div class="editor-actions">
        <div class="editor-action-card">
          <button class="btn" id="editorExportBtn">Export config.js</button>
          <div class="small muted">Exports the current Editor configuration for publication. <b>The exported <code>.txt</code> file must be renamed to <code>config.js</code>, placed in the application directory, and uploaded to the host before the changes become available to all users.</b></div>
        </div>
        <div class="editor-action-card">
          <button class="btn bad" id="editorResetBtn">Discard Local Editor Changes</button>
          <div class="small muted">Removes changes made locally through the Editor and returns this device to the configuration provided by the application's current <code>config.js</code>. <b>It does not undo changes made directly to <code>config.js</code>.</b></div>
        </div>
        <button class="btn warn editor-sign-out" id="editorSignOutBtn">Sign Out</button>
      </div>
    </div>
  `;

  // Wire tab buttons
  host.querySelectorAll("[data-edsec]").forEach(b => {
    b.onclick = () => {
      if(b.dataset.edsec==='TAILCONFIG'){
        if(EDITOR.mode==='tail'){EDITOR.mode='fleet';EDITOR.tailConfigTails=[];EDITOR.draft=null;}
        EDITOR.activeSection='TAILCONFIG';
      }else EDITOR.activeSection = b.dataset.edsec;
      EDITOR.openPanels={};
      renderEditor();
      window.scrollTo({top:0,left:0,behavior:'instant'});
    };
  });

  // Wire footer buttons
  document.getElementById("editorExportBtn").onclick = editorExportConfig;
  document.getElementById("editorResetBtn").onclick  = editorResetDefaults;
  document.getElementById("editorSignOutBtn").onclick = () => {
    EDITOR.authed = false;
    EDITOR.draft = null;
    EDITOR.mode = 'fleet';EDITOR.tailConfigTails=[];
    renderEditor();
  };

  // Render active section
  const secHost = document.getElementById("editorSectionHost");
  if (EDITOR.activeSection === "TAILCONFIG" && EDITOR.mode==='fleet') renderEditorTailConfigurationSelection(secHost);
  if (EDITOR.activeSection === "CONFIGURATIONS") renderEditorConfigurations(secHost);
  if (EDITOR.activeSection === "AIRCRAFT") renderEditorAircraftManagement(secHost);
  if (EDITOR.activeSection === "MISSION")  renderEditorMission(secHost);
  if (EDITOR.activeSection === "STOWAGE")  renderEditorStowage(secHost);
  if (EDITOR.activeSection === "ROLEFIT")  renderEditorRoleFit(secHost);
  if (EDITOR.activeSection === "SEATBASE" || EDITOR.activeSection === "PATIENTPOS") {
    EDITOR.activeSection = "SEATBASE";
    renderEditorSeatBaseline(secHost);
  }
  if (EDITOR.activeSection === "REFERENCE") renderEditorReference(secHost);
  if (EDITOR.activeSection === "TAILCONFIG" && EDITOR.mode==='tail') renderEditorTailConfigurationSelection(secHost);
  editorOrganizePanels(secHost);
}

function renderEditorTailConfigurationSelection(host){
  const tails=AC.tails.active||[];
  host.innerHTML='<section class="card"><h3>Create Tail-Specific Configuration</h3><p class="small muted">Select one or more operational tails. The Editor will open with a copy of the fleet configuration, or an existing tail configuration if one is already saved. The selected tails will share the edits made in this editing session.</p><div class="row" id="tailConfigSelectList"></div><div class="small muted" id="tailConfigSelectionNote" style="margin-top:10px"></div><button class="btn good" id="tailConfigBegin" type="button">Open Editor for Selected Tails</button></section>';
  const list=host.querySelector('#tailConfigSelectList'),note=host.querySelector('#tailConfigSelectionNote');
  if(!tails.length){list.textContent='No operational tails are available.';return;}
  for(const tail of tails){
    const label=document.createElement('label');label.className='toggle';label.style.cssText='display:flex;align-items:center;gap:8px;padding:8px 12px';
    const input=document.createElement('input');input.type='checkbox';input.value=tail;input.style.width='auto';input.dataset.tailConfigSelect='';
    const title=document.createElement('span');title.textContent=tail+(AC.tailConfigurations?.[tail]?' · tail-specific setup saved':' · fleet setup');label.append(input,title);list.append(label);
  }
  const updateNote=()=>{
    const selected=[...host.querySelectorAll('[data-tail-config-select]:checked')].map(el=>el.value);
    const existing=selected.filter(t=>AC.tailConfigurations?.[t]);
    note.textContent=existing.length?`Saved tail setup will be used as the starting point: ${existing.join(', ')}. If selected tails have different saved setups, the first selected tail's setup will be copied to all selected tails when the next edit is saved.`:'';
  };
  list.onchange=updateNote;
  host.querySelector('#tailConfigBegin').onclick=()=>{
    const selected=[...host.querySelectorAll('[data-tail-config-select]:checked')].map(el=>el.value);
    if(!selected.length){alert('Select at least one tail.');return;}
    EDITOR.mode='tail';EDITOR.tailConfigTails=selected;EDITOR.draft=null;editorInitDraft();EDITOR.activeSection='ROLEFIT';EDITOR.openPanels={};renderEditor();window.scrollTo({top:0,left:0,behavior:'instant'});
  };
}

function renderEditorAircraftManagement(host){
  const tails=EDITOR.draft.tails;
  host.innerHTML=`<section class="card"><h3>Aircraft / Tail Numbers</h3><p class="small muted">Manage the aircraft shown on Home. Removing a tail clears any local session data for that tail; accepted or signed-out aircraft must be returned before removal.</p><div class="twoCol"><div><h4>Operational Aircraft</h4><div data-tail-list="active"></div></div><div><h4>Placeholders</h4><div data-tail-list="placeholders"></div></div></div><div class="row" style="align-items:flex-end;margin-top:12px"><label>Tail number<input id="editorNewTail" autocomplete="off" placeholder="e.g. 149941"></label><label>List as<select id="editorNewTailType"><option value="active">Operational aircraft</option><option value="placeholders">Placeholder</option></select></label><button class="btn good" id="editorAddTail" type="button">Add Tail Number</button></div></section><section class="card"><h3>Accept Page Options</h3><label class="small"><input id="editorAllowRfmBasis" type="checkbox" style="width:auto" ${EDITOR.draft.appOptions.allowRfmBasicWeight?'checked':''}> Offer <b>RFM Basic Weight (Beta Testing)</b> on Accept</label><p class="small muted">When disabled, the RFM basis cannot be selected for a new acceptance. An existing session retains its recorded basis.</p></section>`;
  for(const type of ['active','placeholders']){
    const list=host.querySelector(`[data-tail-list="${type}"]`),values=tails[type];
    if(!values.length){const empty=document.createElement('div');empty.className='small muted';empty.textContent='No tail numbers.';list.append(empty);}
    for(const [index,tail] of values.entries()){
      const row=document.createElement('div');row.className='tail-editor-row';
      const value=document.createElement('span');value.className='mono';value.textContent=tail;
      const remove=document.createElement('button');remove.type='button';remove.className='btn bad small';remove.textContent='Remove';remove.setAttribute('aria-label','Remove tail '+tail);
      remove.onclick=()=>{
        const session=STORE.sessions[tail];
        if(session?.accepted?.isAccepted||(session?.signedOutBy&&!session?.returnedAt)){alert('Return this aircraft to Available before removing it.');return;}
        if(!confirm('Remove tail '+tail+' from the aircraft list? Any local session data for this tail will also be cleared.'))return;
        const before=JSON.parse(JSON.stringify(tails)),tailConfigBefore=JSON.parse(JSON.stringify(AC.tailConfigurations||{}));tails[type].splice(index,1);delete AC.tailConfigurations?.[tail];
        if(!editorSaveDraft()){EDITOR.draft.tails=before;AC.tailConfigurations=tailConfigBefore;renderEditor();return;}
        delete STORE.sessions[tail];if(STORE.selectedTail===tail)STORE.selectedTail=null;
        persistSession();render();
      };
      row.append(value,remove);list.append(row);
    }
  }
  host.querySelector('#editorAddTail').onclick=()=>{
    const input=host.querySelector('#editorNewTail'),value=input.value.trim(),type=host.querySelector('#editorNewTailType').value;
    if(!value){alert('Enter a tail number.');input.focus();return;}
    if([...tails.active,...tails.placeholders].some(tail=>String(tail).trim().toUpperCase()===value.toUpperCase())){alert('That tail number is already listed.');input.focus();return;}
    tails[type].push(value);
    if(!editorSaveDraft()){tails[type].pop();return;}
    renderEditor();
  };
  host.querySelector('#editorAllowRfmBasis').onchange=event=>{
    const before=EDITOR.draft.appOptions.allowRfmBasicWeight;EDITOR.draft.appOptions.allowRfmBasicWeight=event.target.checked;
    if(!editorSaveDraft()){EDITOR.draft.appOptions.allowRfmBasicWeight=before;renderEditor();}
  };
}

function renderEditorConfigurations(host){
  const presets=EDITOR.draft.presets;
  host.innerHTML='<div class="small muted">Configurations reference catalogue items. Weights and arms stay in the equipment catalogue. Use Move up and Move down to set the button order shown in Role Config; selecting a configuration does not change its position. Changes save locally.</div><div id="configurationCards"></div><div class="card"><div class="row"><label>New configuration name<input id="configurationNewName"></label><button class="btn good" id="configurationCreate">Create configuration</button></div></div>';
  const list=host.querySelector('#configurationCards');
  const newKey=name=>editorItemKey(name,'CONFIG_');
  const refresh=(expanded=[])=>{editorSaveDraft();renderEditor();for(const id of expanded){const card=document.querySelector(`[data-configuration-key="${id}"]`);if(card)card.open=true;}};
  host.querySelector('#configurationCreate').onclick=()=>{
    const name=host.querySelector('#configurationNewName').value.trim();if(!name){alert('Enter a configuration name.');return;}
    const key=newKey(name);if(!key||presets[key]){alert('Enter a unique configuration name.');return;}
    presets[key]={name,displayOrder:nextConfigurationDisplayOrder(presets),notes:'',active:true,seats:{crew:[],pax:[]},occupants:[],roleFitOn:[],roleFitOff:[],missionOn:[],missionOff:[]};refresh();
  };
  const orderedPresets=sortConfigurationsByDisplayOrder(Object.entries(presets));
  for(const [position,[key,p]] of orderedPresets.entries()){
    const card=document.createElement('details');card.className='card';card.dataset.configurationKey=key;
    card.innerHTML=`<summary><b>${escHtml(p.name)}</b>${p.active===false?' · Retired':''}</summary>
      <div class="row" style="margin-top:10px"><label style="flex:1">Name<input data-config-field="name" value="${escHtml(p.name)}"></label><label style="flex:2">Description<input data-config-field="notes" value="${escHtml(p.notes||'')}"></label></div>
      <div class="row" style="margin-top:10px"><label><input type="checkbox" style="width:auto" data-config-active ${p.active!==false?'checked':''}> Available for use<small>Uncheck to retire this item. Its definition is retained; existing configurations and mission loads may need review.</small></label><button class="btn small" data-config-move="up" ${position===0?'disabled':''} aria-label="Move ${escHtml(p.name)} earlier">Move up</button><button class="btn small" data-config-move="down" ${position===orderedPresets.length-1?'disabled':''} aria-label="Move ${escHtml(p.name)} later">Move down</button><button class="btn" data-config-duplicate>Duplicate</button><button class="btn bad" data-config-delete>Delete</button></div>
      <section class="aircraft-role-section"><h3>Role-Fit Equipment</h3><div data-config-rolefit></div></section>
      <section class="aircraft-role-section"><h3>Mission Equipment</h3><div data-config-equipment></div></section>
      <section class="aircraft-role-section"><h3>Standard Seats</h3><details class="aircraft-role-seat-group"><summary>Crew Seats</summary><div class="config-seat-row config-fit-heading"><span>Seat</span><span>Installed</span></div><div data-config-seats-crew></div></details><details class="aircraft-role-seat-group"><summary>Passenger Seats</summary><div class="config-seat-row config-fit-heading"><span>Seat</span><span>Installed</span></div><div data-config-seats-pax></div></details></section>
      <section class="aircraft-role-section"><h3>Standard Crew</h3><p class="small muted">Set the standard occupants and crew assignments for this role.</p><details class="aircraft-role-seat-group"><summary>Crew Seats</summary><div class="config-seat-row config-occupant-row config-fit-heading"><span>Seat</span><span>Occupied</span><span>Crew</span></div><div data-config-crew-occupants></div></details><details class="aircraft-role-seat-group"><summary>Passenger Seats</summary><div class="config-seat-row config-occupant-row config-fit-heading"><span>Seat</span><span>Occupied</span><span>Crew</span></div><div data-config-pax-occupants></div></details></section>`;
    card.querySelectorAll('[data-config-field]').forEach(input=>input.onchange=()=>{
      const field=input.dataset.configField;if(field==='name'&&!input.value.trim()){input.value=p.name;return;}
      p[field]=input.value.trim();editorSaveDraft();card.querySelector('summary b').textContent=p.name;
    });
    card.querySelector('[data-config-active]').onchange=e=>{p.active=e.target.checked;editorSaveDraft();};
    card.querySelectorAll('[data-config-move]').forEach(button=>button.onclick=()=>{
      const order=sortConfigurationsByDisplayOrder(Object.entries(presets)).map(([id])=>id),from=order.indexOf(key),to=from+(button.dataset.configMove==='up'?-1:1);
      if(to<0||to>=order.length)return;const expanded=[...list.querySelectorAll('[data-configuration-key][open]')].map(item=>item.dataset.configurationKey);[order[from],order[to]]=[order[to],order[from]];order.forEach((id,index)=>presets[id].displayOrder=index+1);refresh(expanded);
    });
    card.querySelector('[data-config-duplicate]').onclick=()=>{let name=p.name+' Copy',n=2;while(presets[newKey(name)])name=p.name+' Copy '+n++;presets[newKey(name)]={...JSON.parse(JSON.stringify(p)),name,active:true,displayOrder:nextConfigurationDisplayOrder(presets)};refresh();};
    card.querySelector('[data-config-delete]').onclick=()=>{
      if(Object.values(STORE.sessions).some(s=>s.preset===key)){alert('This configuration is used by a session. Retire it or select another configuration first.');return;}
      if(!confirm('Delete configuration "'+p.name+'"?'))return;delete presets[key];refresh();
    };
    const equipment=card.querySelector('[data-config-equipment]');
    for(const group of missionGroupNames(EDITOR.draft)){
      const section=document.createElement('details');section.innerHTML='<summary>'+escHtml(group)+'</summary>';
      const equipmentRows=sortSelectedFirst(Object.entries(EDITOR.draft.missionEquip).filter(([,it])=>it.group===group),([id])=>(p.missionOn||[]).includes(id)||!!EDITOR.draft.missionEquip[id].alwaysInclude,([,it])=>it.name);
      for(const [id,it] of equipmentRows){
        const label=document.createElement('label');label.className='small';label.style.cssText='display:block;margin:8px 0';
        const check=document.createElement('input');check.type='checkbox';check.style.width='auto';check.checked=(p.missionOn||[]).includes(id)||!!it.alwaysInclude;check.disabled=!!it.alwaysInclude||(it.active===false&&!check.checked);
        check.onchange=()=>{p.missionOn=(p.missionOn||[]).filter(k=>k!==id);p.missionOff=(p.missionOff||[]).filter(k=>k!==id);if(check.checked)p.missionOn.push(id);editorSaveDraft();};
        label.append(check,document.createTextNode(' '+it.name+(it.active===false?' (retired)':'')+(it.alwaysInclude?' · Every configuration':'')));section.append(label);
      }
      equipment.append(section);
    }
    const roleFitHost=card.querySelector('[data-config-rolefit]');
    const roleFitGroups=new Map();
    for(const [id,it] of Object.entries(EDITOR.draft.roleFit)){
      const group=it.group||ROLE_EDITOR_GROUPS.find(([prefix])=>id.startsWith(prefix))?.[1]||'Aircraft Systems';
      if(!roleFitGroups.has(group))roleFitGroups.set(group,[]);roleFitGroups.get(group).push([id,it]);
    }
    const roleFitOrder=[...ROLE_EDITOR_GROUPS.map(([,name])=>name),... [...roleFitGroups.keys()].filter(name=>!ROLE_EDITOR_GROUPS.some(([,known])=>known===name)).sort()];
    for(const group of roleFitOrder){
      const entries=roleFitGroups.get(group);if(!entries?.length)continue;
      const section=document.createElement('details');section.className='config-fit-section';
      const summary=document.createElement('summary');summary.textContent=group;section.append(summary);
      const list=sortSelectedFirst(entries,([id])=>(p.roleFitOn||[]).includes(id)||(!(p.roleFitOff||[]).includes(id)&&!!EDITOR.draft.roleFit[id].normally),([,it])=>it.name);
      for(const [id,it] of list){
        const label=document.createElement('label');label.className='config-rolefit-row small';
        const name=document.createElement('span');name.textContent=it.name;label.append(name);
        const select=document.createElement('select');select.innerHTML=`<option value="">Aircraft Default — ${it.normally?'Installed':'Not Installed'}</option><option value="on">Installed</option><option value="off">Removed</option>`;select.value=(p.roleFitOn||[]).includes(id)?'on':(p.roleFitOff||[]).includes(id)?'off':'';
        select.onchange=()=>{p.roleFitOn=(p.roleFitOn||[]).filter(k=>k!==id);p.roleFitOff=(p.roleFitOff||[]).filter(k=>k!==id);if(select.value==='on')p.roleFitOn.push(id);if(select.value==='off')p.roleFitOff.push(id);editorSaveDraft();};label.append(select);section.append(label);
      }
      roleFitHost.append(section);
    }
    const seatsHosts={crew:card.querySelector('[data-config-seats-crew]'),pax:card.querySelector('[data-config-seats-pax]')};
    const installedControls=new Map(),occupantControls=new Map();
    for(const [kind,catalogue] of [['crew',EDITOR.draft.crewSeats],['pax',EDITOR.draft.paxSeats]])for(const [id,it] of Object.entries(catalogue)){
      const label=document.createElement('label');label.className='config-seat-row small';
      const name=document.createElement('span');name.textContent=it.name;label.append(name);
      const installed=document.createElement('input');installed.type='checkbox';installed.style.width='auto';installed.checked=(p.seats?.[kind]||[]).includes(id);installed.setAttribute('aria-label',it.name+' installed');
      installedControls.set(id,installed);
      installed.onchange=()=>{p.seats??={crew:[],pax:[]};const list=p.seats[kind]??=([]);const index=list.indexOf(id);if(index>=0)list.splice(index,1);if(installed.checked)list.push(id);else p.occupants=(p.occupants||[]).filter(key=>key!==id);const controls=occupantControls.get(id);if(controls){const active=(p.occupants||[]).includes(id);controls.occupied.checked=active;controls.crew.disabled=kind==='crew'||!active;controls.crew.checked=active&&(kind==='crew'||!!p.occupantRoles?.[id]);}editorSaveDraft();};
      label.append(installed);seatsHosts[kind].append(label);
    }
    const occupantHosts={crew:card.querySelector('[data-config-crew-occupants]'),pax:card.querySelector('[data-config-pax-occupants]')};
    for(const [kind,catalogue] of [['crew',EDITOR.draft.crewSeats],['pax',EDITOR.draft.paxSeats]])for(const [id,it] of Object.entries(catalogue)){
      const label=document.createElement('div');label.className='config-seat-row config-occupant-row small';
      const name=document.createElement('span');name.textContent=it.name;label.append(name);
      const occupied=document.createElement('input');occupied.type='checkbox';occupied.style.width='auto';occupied.checked=(p.occupants||[]).includes(id);occupied.setAttribute('aria-label',it.name+' occupied');
      occupied.onchange=()=>{p.occupants??=[];const index=p.occupants.indexOf(id);if(index>=0)p.occupants.splice(index,1);if(occupied.checked){p.occupants.push(id);p.seats??={crew:[],pax:[]};p.seats[kind]??=[];if(!p.seats[kind].includes(id))p.seats[kind].push(id);const installed=installedControls.get(id);if(installed)installed.checked=true;}crew.disabled=kind==='crew'||!occupied.checked;crew.checked=occupied.checked&&(kind==='crew'||!!p.occupantRoles?.[id]);editorSaveDraft();};
      const crew=document.createElement('input');crew.type='checkbox';crew.style.width='auto';crew.checked=occupied.checked&&(kind==='crew'||!!p.occupantRoles?.[id]);crew.disabled=kind==='crew'||!occupied.checked;crew.setAttribute('aria-label',it.name+' occupied by crew');crew.title=kind==='crew'?'Crew seat':occupied.checked?'Checked: crew. Unchecked: passenger.':'Occupy the seat to choose crew.';
      crew.onchange=()=>{p.occupantRoles??={};if(crew.checked)p.occupantRoles[id]=p.occupantRoles[id]||'Crew';else delete p.occupantRoles[id];editorSaveDraft();};
      occupantControls.set(id,{occupied,crew});
      label.append(occupied,crew);occupantHosts[kind].append(label);
    }
    list.append(card);
  }
}

function renderEditorReference(host){
  const rd = EDITOR.draft.referenceDocuments || (EDITOR.draft.referenceDocuments={currentId:null,history:[]});
  const current = rd.history.find(x=>x.id===rd.currentId) || rd.history[0] || {};
  host.innerHTML=`
    <div class="callout" style="margin-bottom:12px;">Reference document information identifies the source represented by this application. Before updating it, confirm whether the new version changes any W&amp;B data, limits or calculation requirements used by the application. Changes to underlying source data require application review and may require code or configuration changes.</div>
    <h3>Current Reference Document</h3>
    <div class="twoCol">
      <div><div class="lbl">Document Designation</div><input id="refDesignation" value="${escHtml(current.designation||"")}"></div>
      <div><div class="lbl">Version Type</div><input id="refVersionType" value="${escHtml(current.versionType||"")}" placeholder="Issue / Revision / Amendment"></div>
      <div><div class="lbl">Version</div><input id="refVersion" value="${escHtml(current.version||"")}"></div>
      <div><div class="lbl">Version Date</div><input id="refVersionDate" value="${escHtml(current.versionDate||"")}" placeholder="as printed on document"></div>
      <div><div class="lbl">Document Status</div><input id="refStatus" value="${escHtml(current.status||"")}"></div>
    </div>
    <label class="small" style="display:block;margin:12px 0;"><input id="refAck" type="checkbox" style="width:auto;"> I have reviewed this document version for changes affecting application data or calculations.</label>
    <button class="btn good" id="refMakeCurrent">Save as New Current Reference</button>
    <div class="hr"></div>
    <h3>Reference Document History</h3>
    <div id="refHistory"></div>`;
  const hist=host.querySelector('#refHistory');
  if(!rd.history.length) hist.innerHTML='<div class="small muted">No reference-document history.</div>';
  else hist.innerHTML=`<table class="table"><thead><tr><th>Effective</th><th>Document</th><th>Version</th><th>Version Date</th><th>Status</th></tr></thead><tbody>${rd.history.map(x=>`<tr><td>${escHtml(x.effectiveAt?new Date(x.effectiveAt).toLocaleString():"—")}</td><td>${escHtml(x.designation||"")}</td><td>${escHtml([x.versionType,x.version].filter(Boolean).join(" "))}</td><td>${escHtml(x.versionDate||"")}</td><td>${escHtml(x.status||"")}</td></tr>`).join('')}</tbody></table>`;
  host.querySelector('#refMakeCurrent').onclick=()=>{
    if(!host.querySelector('#refAck').checked){ alert('Confirm that you reviewed the new document version for changes affecting application data or calculations.'); return; }
    const rec={
      id:'ref-'+Date.now(), designation:host.querySelector('#refDesignation').value.trim(), versionType:host.querySelector('#refVersionType').value.trim(), version:host.querySelector('#refVersion').value.trim(), versionDate:host.querySelector('#refVersionDate').value.trim(), status:host.querySelector('#refStatus').value.trim(), effectiveAt:new Date().toISOString(), appVersion:(typeof APP_VERSION!=="undefined"?APP_VERSION:"?"), configVersion:AC.meta.configVersion
    };
    if(!rec.designation){ alert('Enter the document designation.'); return; }
    rd.history.unshift(rec); rd.currentId=rec.id; editorSaveDraft(); renderEditor();
  };
}

function renderEditorSeatBaseline(host){
  const entries=[...Object.entries(EDITOR.draft.crewSeats).map(x=>[...x,"crew"]),...Object.entries(EDITOR.draft.paxSeats).map(x=>[...x,"pax"])];
  host.innerHTML=`<div class="small muted" style="margin-bottom:10px;">Define seat structures that are normally installed and those included in Recorded Aircraft Basic Weight. C1/C2 are fixed because the RFM includes them in Basic Weight.</div><div id="seatBaselineList"></div>`;
  const list=host.querySelector("#seatBaselineList");
  for(const [k,it,group] of entries){
    const fixed=!!it.includedInRfmBasic;
    const row=document.createElement("div"); row.className="toggle seat-baseline-row";
    row.innerHTML=`<div class="left"><div class="name">${k} · ${escHtml(it.name)}</div><div class="meta mono">${it.wSeat} kg @ ${it.arm} mm${group==="crew"?" · Occupant 90.7 kg @ "+(it.occupantArm ?? it.arm)+" mm":""}${fixed?" · included in RFM Basic Weight":" · variable Role Equipment"}</div></div><label class="small"><input type="checkbox" data-seat="${k}" data-group="${group}" data-field="normallyInstalled" ${it.normallyInstalled||fixed?"checked":""} ${fixed?"disabled":""} style="width:auto;"> Normally installed</label><label class="small"><input type="checkbox" data-seat="${k}" data-group="${group}" data-field="maintenanceIncluded" ${it.maintenanceIncluded||fixed?"checked":""} ${fixed?"disabled":""} style="width:auto;"> Included in Recorded Aircraft Basic Weight</label>`;
    list.appendChild(row);
  }
  list.querySelectorAll("input[data-seat]").forEach(el=>el.onchange=()=>{
    const set=el.dataset.group==="crew"?EDITOR.draft.crewSeats:EDITOR.draft.paxSeats;
    set[el.dataset.seat][el.dataset.field]=el.checked;
    editorSaveDraft();
  });
  renderEditorPatientPositions(host);
}

function editorPatientPositionGate(position){
  if(position.missionKey)return 'mission';
  if(position.roleFitKey)return 'roleFit';
  return position.kind==='pta'?'pta':'roleFit';
}
function editorPatientPositionOptions(select,entries,selected,emptyLabel){
  select.replaceChildren();
  const empty=document.createElement('option');empty.value='';empty.textContent=emptyLabel;select.append(empty);
  for(const [key,label] of entries){const option=document.createElement('option');option.value=key;option.textContent=label;select.append(option);}
  select.value=selected||'';
}
function editorPatientPositionLocations(){
  return Object.entries(missionLocations(EDITOR.draft)).map(([key,location])=>[key,`${location.name||key}${Number.isFinite(location.arm)?` (${location.arm} mm)`:''}`]);
}
function editorPatientPositionMissions(){
  return Object.entries(EDITOR.draft.missionEquip).filter(([,item])=>item.group!=='Stowage').map(([key,item])=>[key,item.name||key]);
}
function editorPatientPositionRoleFit(){
  return Object.entries(EDITOR.draft.roleFit).map(([key,item])=>[key,item.name||key]);
}
function editorPatientPositionRequirementControls(position,gate,scope){
  const wrapper=document.createElement('div');wrapper.className='row';wrapper.style.cssText='align-items:flex-end;gap:8px;flex-wrap:wrap';
  const modeLabel=document.createElement('label');modeLabel.className='small';modeLabel.textContent='Available when';
  const mode=document.createElement('select');mode.dataset.positionGate='';
  for(const [value,label] of [['roleFit','Role-Fit item is fitted'],['mission','Mission item is carried at a location'],['pta','PTA treatment system is fitted']]){const option=document.createElement('option');option.value=value;option.textContent=label;mode.append(option);}
  mode.value=gate;modeLabel.append(mode);wrapper.append(modeLabel);
  const roleLabel=document.createElement('label');roleLabel.className='small';roleLabel.textContent='Required Role-Fit item';
  const roleSelect=document.createElement('select');roleSelect.dataset.positionRoleFit='';editorPatientPositionOptions(roleSelect,editorPatientPositionRoleFit(),position.roleFitKey,'Choose Role-Fit item');roleLabel.append(roleSelect);wrapper.append(roleLabel);
  const missionLabel=document.createElement('label');missionLabel.className='small';missionLabel.textContent='Required Mission Equipment';
  const missionSelect=document.createElement('select');missionSelect.dataset.positionMission='';editorPatientPositionOptions(missionSelect,editorPatientPositionMissions(),position.missionKey,'Choose Mission Equipment');missionLabel.append(missionSelect);wrapper.append(missionLabel);
  const stowLabel=document.createElement('label');stowLabel.className='small';stowLabel.textContent='Required stowage location';
  const stowSelect=document.createElement('select');stowSelect.dataset.positionStow='';editorPatientPositionOptions(stowSelect,editorPatientPositionLocations(),position.requiredStow,'Choose stowage location');stowLabel.append(stowSelect);wrapper.append(stowLabel);
  const typeLabel=document.createElement('label');typeLabel.className='small';typeLabel.textContent='Position type';
  const typeSelect=document.createElement('select');typeSelect.dataset.positionKind='';
  for(const [value,label] of [['litter','Litter'],['pta','PTA patient']]){const option=document.createElement('option');option.value=value;option.textContent=label;typeSelect.append(option);}
  typeSelect.value=position.kind||'litter';typeLabel.append(typeSelect);wrapper.append(typeLabel);
  const update=()=>{
    roleLabel.hidden=mode.value!=='roleFit';missionLabel.hidden=mode.value!=='mission';stowLabel.hidden=mode.value!=='mission';
    typeLabel.hidden=mode.value==='pta';
    if(mode.value==='pta')typeSelect.value='pta';
  };
  mode.addEventListener('change',update);update();
  return {wrapper,mode,roleSelect,missionSelect,stowSelect,typeSelect};
}
function editorPatientPositionDefinitionFromControls(base,controls,fields){
  const next={...base,name:fields.name.trim(),weight:Number(fields.weight),arm:Number(fields.arm),kind:controls.typeSelect.value};
  delete next.roleFitKey;delete next.missionKey;delete next.requiredStow;
  if(controls.mode.value==='roleFit')next.roleFitKey=controls.roleSelect.value;
  else if(controls.mode.value==='mission'){next.missionKey=controls.missionSelect.value;next.requiredStow=controls.stowSelect.value;}
  else next.kind='pta';
  return next;
}
function editorPatientPositionSave(next,key){
  const before=JSON.parse(JSON.stringify(EDITOR.draft.patientPositions[key]));
  EDITOR.draft.patientPositions[key]=next;
  if(!editorSaveDraft()){EDITOR.draft.patientPositions[key]=before;renderEditor();return false;}
  renderEditor();if(typeof render==='function')render();return true;
}
function editorPatientPositionDelete(key){
  const affectedTails=EDITOR.mode==='tail'?EDITOR.tailConfigTails:Object.keys(STORE.sessions||{});
  if(affectedTails.some(tail=>STORE.sessions?.[tail]?.patientOccupants?.[key])){alert('Clear the patient assigned to this position before deleting it.');return;}
  const before=EDITOR.draft.patientPositions[key];delete EDITOR.draft.patientPositions[key];
  if(!editorSaveDraft()){EDITOR.draft.patientPositions[key]=before;renderEditor();return;}
  renderEditor();if(typeof render==='function')render();
}
function renderEditorPatientPositions(host){
  const positions=EDITOR.draft.patientPositions||(EDITOR.draft.patientPositions={});
  const intro=document.createElement('p');intro.className='small muted';intro.textContent='Manage the patient and litter positions shown in Crew, Pax, Patients & Seating. New positions default to 90.00 kg; enter the approved arm and choose the equipment or stowage condition that makes each position available.';host.append(intro);
  const card=document.createElement('details');card.className='card';card.dataset.editorPanel='patientPositions';card.open=!!EDITOR.openPanels?.patientPositions;
  card.ontoggle=()=>{EDITOR.openPanels??={};EDITOR.openPanels.patientPositions=card.open;};
  const summary=document.createElement('summary');summary.textContent=`Patient Positions (${Object.keys(positions).length})`;card.append(summary);
  const content=document.createElement('div');content.style.marginTop='10px';card.append(content);
  const quickAdds=[
    ['AFT_STBD_TOP','AFT STBD TOP',10057,'RF_SAR_EQUIPMENT_CASEVAC_RACK_AFT_STBD'],
    ['AFT_PORT_TOP','AFT PORT TOP',10235,'RF_SAR_EQUIPMENT_CASEVAC_RACK_AFT_PORT']
  ];
  const suggestions=quickAdds.filter(([key])=>!positions[key]);
  if(suggestions.length){
    const note=document.createElement('p');note.className='small muted';note.textContent='Add the supplied rear CASEVAC rack top positions as local Editor entries. They are not part of the shipped defaults.';content.append(note);
    const suggested=document.createElement('div');suggested.className='row';suggested.style.flexWrap='wrap';
    for(const [key,name,arm,roleFitKey] of suggestions){
      const button=document.createElement('button');button.type='button';button.className='btn';button.textContent=`+ Add ${name} · ${arm} mm`;
      button.onclick=()=>{
        const position={name,arm,weight:PATIENT_STANDARD_WEIGHT_KG,kind:'litter',roleFitKey};
        positions[key]=position;
        if(!editorSaveDraft()){delete positions[key];renderEditor();return;}
        renderEditor();if(typeof render==='function')render();
      };
      suggested.append(button);
    }
    content.append(suggested);
  }
  const list=document.createElement('div');list.style.marginTop='12px';content.append(list);
  for(const [key,position] of Object.entries(positions).sort((a,b)=>a[1].name.localeCompare(b[1].name,undefined,{numeric:true,sensitivity:'base'}))){
    const row=document.createElement('section');row.className='card';row.style.padding='12px';
    const title=document.createElement('div');title.className='small mono muted';title.textContent=key+' · stable position key';row.append(title);
    const fields=document.createElement('div');fields.className='row';fields.style.cssText='align-items:flex-end;gap:8px;flex-wrap:wrap;margin-top:8px';
    const makeInput=(labelText,value,type,step,field)=>{const label=document.createElement('label');label.className='small';label.textContent=labelText;const input=document.createElement('input');input.type=type;input.value=value;input.dataset.positionField=field;if(step)input.step=step;label.append(input);fields.append(label);return input;};
    const nameInput=makeInput('Position name',position.name||'','text',null,'name');
    const weightInput=makeInput('Patient weight (kg)',Number(position.weight??PATIENT_STANDARD_WEIGHT_KG).toFixed(2),'number','0.01','weight');
    const armInput=makeInput('Arm (mm)',position.arm,'number','1','arm');
    row.append(fields);
    const requirement=editorPatientPositionRequirementControls(position,editorPatientPositionGate(position),'edit');row.append(requirement.wrapper);
    const actions=document.createElement('div');actions.className='row';actions.style.marginTop='8px';
    const save=document.createElement('button');save.type='button';save.className='btn good';save.textContent='Save Position';
    save.onclick=()=>{
      if(!nameInput.value.trim()||!Number.isFinite(weightInput.valueAsNumber)||weightInput.valueAsNumber<0||!Number.isFinite(armInput.valueAsNumber)){alert('Enter a position name, nonnegative patient weight, and numeric arm.');return;}
      const next=editorPatientPositionDefinitionFromControls(position,requirement,{name:nameInput.value,weight:weightInput.valueAsNumber,arm:armInput.valueAsNumber});
      editorPatientPositionSave(next,key);
    };
    const remove=document.createElement('button');remove.type='button';remove.className='btn bad';remove.textContent='Delete Position';remove.onclick=()=>editorPatientPositionDelete(key);
    actions.append(save,remove);row.append(actions);list.append(row);
  }
  const addToggle=document.createElement('button');addToggle.type='button';addToggle.className='btn good';addToggle.textContent=EDITOR.openPanels?.patientPositionAdd?'Cancel Add':'Add Custom Patient Position';addToggle.style.marginTop='10px';content.append(addToggle);
  if(EDITOR.openPanels?.patientPositionAdd){
    const form=document.createElement('section');form.className='card';form.style.cssText='padding:12px;margin-top:8px;border:2px solid var(--accent,#4a9eff)';
    const keyInput=document.createElement('input');keyInput.placeholder='e.g. AFT_STBD_TOP';keyInput.autocomplete='off';
    const nameInput=document.createElement('input');nameInput.placeholder='e.g. AFT STBD TOP';
    const weightInput=document.createElement('input');weightInput.type='number';weightInput.step='0.01';weightInput.value=PATIENT_STANDARD_WEIGHT_KG.toFixed(2);
    const armInput=document.createElement('input');armInput.type='number';armInput.step='1';armInput.placeholder='Approved arm in mm';
    const keyLabel=document.createElement('label');keyLabel.className='small';keyLabel.textContent='Position key (cannot be changed later)';keyLabel.append(keyInput);
    const nameLabel=document.createElement('label');nameLabel.className='small';nameLabel.textContent='Position name';nameLabel.append(nameInput);
    const weightLabel=document.createElement('label');weightLabel.className='small';weightLabel.textContent='Patient weight (kg)';weightLabel.append(weightInput);
    const armLabel=document.createElement('label');armLabel.className='small';armLabel.textContent='Arm (mm)';armLabel.append(armInput);
    const row=document.createElement('div');row.className='row';row.style.cssText='align-items:flex-end;gap:8px;flex-wrap:wrap';row.append(keyLabel,nameLabel,weightLabel,armLabel);form.append(row);
    const blank={kind:'litter'};const requirement=editorPatientPositionRequirementControls(blank,'roleFit','add');form.append(requirement.wrapper);
    const add=document.createElement('button');add.type='button';add.className='btn good';add.textContent='Add Patient Position';add.style.marginTop='10px';
    add.onclick=()=>{
      const key=editorItemKey(keyInput.value);
      if(!key||!nameInput.value.trim()||!Number.isFinite(weightInput.valueAsNumber)||weightInput.valueAsNumber<0||!Number.isFinite(armInput.valueAsNumber)){alert('Enter a unique position key, name, nonnegative patient weight, and numeric arm.');return;}
      if(Object.prototype.hasOwnProperty.call(positions,key)){alert('That patient position key is already in use. Choose a different key.');return;}
      const position=editorPatientPositionDefinitionFromControls(blank,requirement,{name:nameInput.value,weight:weightInput.valueAsNumber,arm:armInput.valueAsNumber});
      positions[key]=position;
      if(!editorSaveDraft()){delete positions[key];renderEditor();return;}
      EDITOR.openPanels.patientPositionAdd=false;renderEditor();if(typeof render==='function')render();
    };
    const cancel=document.createElement('button');cancel.type='button';cancel.className='btn';cancel.textContent='Cancel';cancel.style.marginTop='10px';cancel.onclick=()=>{EDITOR.openPanels.patientPositionAdd=false;renderEditor();};
    form.append(add,cancel);content.append(form);
  }
  addToggle.onclick=()=>{EDITOR.openPanels??={};EDITOR.openPanels.patientPositionAdd=!EDITOR.openPanels.patientPositionAdd;renderEditor();};
  host.append(card);
}


/* =========================
   MISSION EQUIPMENT EDITOR
   ========================= */

function editorAdjustDefaultAllocationTotal(item,total){
  if(!Array.isArray(item.defaultAllocations)||!item.defaultAllocations.length)return;
  let delta=total-item.defaultAllocations.reduce((sum,row)=>sum+row.quantity,0);
  if(delta>0)item.defaultAllocations[0].quantity+=delta;
  else if(delta<0){
    let remaining=-delta;
    for(const row of item.defaultAllocations){
      const take=Math.min(row.quantity,remaining);row.quantity-=take;remaining-=take;
      if(!remaining)break;
    }
  }
}
function editorRefreshDefaultAllocationFields(list,key,item){
  list.querySelectorAll(`[data-default-allocation-quantity="${key}"]`).forEach(input=>{
    const index=Number(input.dataset.index);if(item.defaultAllocations[index])input.value=item.defaultAllocations[index].quantity;
  });
  const totalInput=list.querySelector(`[data-k="${key}"][data-f="defaultQuantity"]`);
  if(totalInput)totalInput.value=item.defaultQuantity;
  const total=list.querySelector(`[data-default-total="${key}"]`);
  if(total)total.textContent=`Default load: ${item.defaultQuantity} × ${item.unitWeight} = ${fmtDecimal(item.defaultQuantity*item.unitWeight)} kg`;
}

function renderEditorMission(host) {
  const items   = EDITOR.draft.missionEquip;
  const stowage = missionLocations(EDITOR.draft);

  // Mission Equipment tab shows sortie kit only — stowage LOCATIONS
  // (port-fwd shelves, ramp shelves, overhead bins) live in their own
  // Stowage Locations tab. They remain AC.missionEquip entries; this is
  // purely an editor-view split.
  const keys = Object.keys(items)
    .filter(k => (items[k].group || "") !== "Stowage")
    .sort((a,b)=>MISSION_GROUPS.indexOf(items[a].group)-MISSION_GROUPS.indexOf(items[b].group)||String(items[a].group).localeCompare(String(items[b].group),undefined,{sensitivity:'base'})||items[a].name.localeCompare(items[b].name,undefined,{sensitivity:'base',numeric:true}));

  // Build stowage dropdown options grouped by stowage group
  const stowByGroup = {};
  for (const [id, loc] of Object.entries(stowage)) {
    const g = loc.group || "Other";
    if (!stowByGroup[g]) stowByGroup[g] = [];
    stowByGroup[g].push({ id, name: loc.name, arm: loc.arm });
  }
  const stowOptionsHtml = (selectedId) => {
    const custSel = (selectedId === "CUSTOM") ? "selected" : "";
    let out = '<option value="">— pick stowage —</option>';
    out += `<option value="CUSTOM" ${custSel}>— Custom CG arm —</option>`;
    out += `<option value="BASKET" ${selectedId==="BASKET"?"selected":""}>Follow carrying basket</option>`;
    for (const g of Object.keys(stowByGroup).sort()) {
      out += `<optgroup label="${g}">`;
      for (const s of stowByGroup[g].sort((a,b) => a.name.localeCompare(b.name))) {
        const sel = (s.id === selectedId) ? "selected" : "";
        out += `<option value="${s.id}" ${sel}>${s.name} (${s.arm} mm)</option>`;
      }
      out += "</optgroup>";
    }
    return out;
  };
  const allocationOptionsHtml = (selectedId) => {
    let out='';
    for(const g of Object.keys(stowByGroup).sort()){
      const locations=stowByGroup[g].filter(location=>!location.id.startsWith('CARRIER:')).sort((a,b)=>a.name.localeCompare(b.name));
      if(!locations.length)continue;
      out+=`<optgroup label="${g}">`;
      for(const location of locations)out+=`<option value="${location.id}" ${location.id===selectedId?'selected':''}>${location.name} (${location.arm} mm)</option>`;
      out+='</optgroup>';
    }
    return out;
  };

  const groups = missionGroupNames(EDITOR.draft);

  host.innerHTML = `
    <div class="small muted" style="margin-bottom:10px;">
      Manage the mission equipment available in the W&amp;B application. Set each item’s weight and stowage location, its default load, and whether it is carried by default in each Role Config. Changes save automatically as you edit.
    </div>

    <div id="missionItemList"></div>

    <div class="hr"></div>
    <div id="missionAddForm"></div>
    <div class="row">
      <button class="btn good" id="missionAddBtn">+ Add New Mission Equipment</button>
    </div>
    <details class="card" id="crewEquipmentPlacementEditor" style="margin-top:14px;">
      <summary><b>Additional Crew Equipment Placement</b></summary>
      <p class="small muted">Set default locations for personal bags and B25 kits added with crew beyond the standard crew complement. If a preferred location cannot take the item, the operator can choose an available cabin bay.</p>
      <div id="crewEquipmentPlacementFields"></div>
    </details>
  `;
  renderCrewEquipmentPlacementEditor(host.querySelector('#crewEquipmentPlacementFields'));

  const list = document.getElementById("missionItemList");

  // Pre-compute preset membership for checkbox rendering
  const presetKeys = Object.keys(EDITOR.draft.presets);
  const isInPreset = (k, pk) => {
    const mOn = EDITOR.draft.presets[pk]?.missionOn;
    return Array.isArray(mOn) && mOn.includes(k);
  };

  for (const k of keys) {
    const it = items[k];
    const row = document.createElement("div");
    row.className = "card";
    row.style.marginBottom = "8px";
    row.style.padding = "12px";

    const presetChecks = presetKeys.map(pk => {
      const pName = EDITOR.draft.presets[pk]?.name || pk;
      const chk   = isInPreset(k, pk) ? "checked" : "";
      return `<label class="small" style="display:flex;align-items:center;gap:4px;white-space:nowrap;cursor:pointer;">
        <input type="checkbox" data-k="${k}" data-preset="${pk}" ${it.alwaysInclude?'disabled':''} ${chk} style="width:auto;cursor:pointer;">
        ${escHtml(pName)}
      </label>`;
    }).join("");

    row.innerHTML = `
      <h3>Item Details</h3><div class="row" style="align-items:flex-end;">
        <div style="flex: 2 1 260px;">
          <div class="lbl">Name</div>
          <input type="text" data-k="${k}" data-f="name" value="${escHtml(it.name)}">
        </div>
        <div style="flex: 0 0 100px;">
          <div class="lbl">Unit weight (kg)</div>
          <input type="number" step="any" data-k="${k}" data-f="unitWeight" value="${it.unitWeight}">
        </div>
        <div style="flex: 2 1 240px;">
          <div class="lbl">Stowage</div>
          <select data-k="${k}" data-f="stow">
            ${stowOptionsHtml(it.stow)}
          </select>
        </div>
        <div style="flex: 0 0 110px; display:${it.stow === "CUSTOM" ? "block" : "none"};" data-customarm-wrap="${k}">
          <div class="lbl">Arm (mm)</div>
          <input type="number" step="1" data-k="${k}" data-f="customArm"
                 value="${it.customArm ?? 8000}">
        </div>
        <div style="flex: 1 1 160px;">
          <div class="lbl">Group</div>
          <select data-k="${k}" data-f="group">${groups.map(g=>`<option ${g===it.group?"selected":""}>${escHtml(g)}</option>`).join("")}</select>
        </div>
      </div>
      <div class="row" style="margin-top:10px;gap:10px;">
        <label style="flex:2 1 220px;">Description<input data-k="${k}" data-f="description" value="${escHtml(it.description||'')}"></label>
      </div><h3>Default Load</h3><p class="small muted">Set the quantity and stowage locations used to build the item’s default load. Changing a mission’s load does not change these defaults.</p><div class="row">
        <label>Default quantity<input style="width:100px" type="number" min="0" step="1" data-k="${k}" data-f="defaultQuantity" value="${it.defaultQuantity}"></label>
        <label>Minimum<input style="width:90px" type="number" min="0" step="1" data-k="${k}" data-f="minQuantity" value="${it.minQuantity??''}"></label>
        <label>Maximum<input style="width:130px" type="number" min="0" step="1" data-k="${k}" data-f="maxQuantity" value="${it.maxQuantity??''}" placeholder="No maximum" title="No maximum when left blank"></label>
      </div>
      ${Array.isArray(it.defaultAllocations)?`<div class="card" style="margin-top:10px;box-shadow:none" data-default-allocation-group="${k}">
        <b>Default quantity by location</b><p class="small muted">The location quantities must add up to the default quantity above.</p>
        <div data-default-allocation-rows="${k}">${it.defaultAllocations.map((allocation,index)=>`<div class="row" style="align-items:flex-end;margin:8px 0;gap:8px">
          <label style="flex:1 1 260px">Location<select data-default-allocation-location="${k}" data-index="${index}">${allocationOptionsHtml(allocation.stow)}</select></label>
          <label style="flex:0 0 110px">Quantity<input type="number" min="0" step="1" value="${allocation.quantity}" data-default-allocation-quantity="${k}" data-index="${index}"></label>
          <button type="button" class="btn small" data-default-allocation-remove="${k}" data-index="${index}" ${it.defaultAllocations.length<=1?'disabled':''}>Remove</button>
        </div>`).join('')}</div>
        <button type="button" class="btn small" data-default-allocation-add="${k}">Add location</button>
      </div>`:''}
        <span class="small mono" data-default-total="${k}">Default load: ${it.defaultQuantity} × ${it.unitWeight} = ${fmtDecimal(it.defaultQuantity*it.unitWeight)} kg</span>
      <h3>Mission Options</h3><div class="editor-mission-options">
        <label class="small"><input style="width:auto" type="checkbox" data-k="${k}" data-f="missionQuantityEditable" ${it.missionQuantityEditable?'checked':''}> Show quantity buttons in Mission Equipment<small>Show quick −/+ buttons during a mission. Extras can still be added through the item’s adjustment controls when unchecked.</small></label>
        <label class="small"><input style="width:auto" type="checkbox" data-k="${k}" data-f="alwaysInclude" ${it.alwaysInclude?'checked':''}> Carry by default in all configurations<small>Select this item whenever a Role Config is applied. The crew can deselect it for an individual mission. When enabled, per-configuration carry selections do not apply.</small></label>
        <label class="small"><input style="width:auto" type="checkbox" data-k="${k}" data-f="active" ${it.active!==false?'checked':''}> Available for use<small>Turn this off to retire the item from routine use. Its definition is retained; existing configurations and mission loads may need review.</small></label>
        <label class="small"><input style="width:auto" type="checkbox" data-k="${k}" data-f="isBasket" ${it.isBasket?'checked':''}> Allow this item to be a stowage location<small>Other equipment can be assigned to this item and moves with it. If this item is not carried, its contents must be relocated or removed.</small></label>

      </div>
      <div class="row" style="margin-top:10px; align-items:center; flex-wrap:wrap; gap:8px;">
        <div class="small mono muted" style="flex:1 1 100%;min-width:0;overflow-wrap:anywhere;">Key: ${k}<div class="small">This identifier links the item to configurations and saved selections. It cannot be edited. To use a different key, create a replacement, update its configurations, then delete the old item. Existing mission selections need review.</div></div>
        <div class="small muted" style="flex:0 0 auto;">Carried by default in these configurations:</div>
        <div style="display:flex; flex-wrap:wrap; gap:10px; align-items:center; flex:1 1 auto;">
          ${it.alwaysInclude?'<div class="small">Selected automatically where its default-carry rule applies. Individual configuration selections do not apply.</div>':'<div class="small">Select the Role Configs that include this item by default. The crew can still adjust the load for an individual mission.</div>'}${presetChecks}
        </div>
        <button class="btn bad" data-delk="${k}" style="flex:0 0 auto;">Delete</button>
      </div>
    `;
    list.appendChild(row);
  }

  // Field changes — text/number/select save silently, no re-render.
  list.querySelectorAll("[data-k][data-f]").forEach(el => {
    el.addEventListener("change", () => {
      const k    = el.dataset.k;
      const f    = el.dataset.f;
      const item = EDITOR.draft.missionEquip[k];
      if (!item) return;

      const before=JSON.parse(JSON.stringify(item));
      if(el.type === "checkbox") item[f]=el.checked;
      else if (["defaultQuantity","minQuantity","maxQuantity"].includes(f)) {
        if(el.value===""&&f!=="defaultQuantity")delete item[f];else item[f]=el.valueAsNumber;
        if(f==="defaultQuantity"&&Array.isArray(item.defaultAllocations))editorAdjustDefaultAllocationTotal(item,item.defaultQuantity);
      } else if (f === "unitWeight") {
        item.unitWeight = el.valueAsNumber;
      } else if (f === "customArm") {
        item.customArm = parseInt(el.value, 10) || 0;
      } else if (f === "stow") {
        item[f] = el.value;
        item.followBasket=el.value==="BASKET";
        // Show/hide the custom arm input for this item
        const wrap = list.querySelector(`[data-customarm-wrap="${k}"]`);
        if (wrap) wrap.style.display = (el.value === "CUSTOM") ? "block" : "none";
      } else {
        item[f] = el.value;
      }
      if(!editorSaveDraft()){EDITOR.draft.missionEquip[k]=before;renderEditor();}
      else if(['isBasket','alwaysInclude','group','name'].includes(f)){if(f==='group'){EDITOR.openPanels??={};EDITOR.openPanels['group:'+item.group]=true;EDITOR.openPanels['item:'+k]=true;}renderEditor();}
      else if(f==="defaultQuantity"&&Array.isArray(item.defaultAllocations))editorRefreshDefaultAllocationFields(list,k,item);
      else {const total=list.querySelector(`[data-default-total="${k}"]`);if(total)total.textContent=`Default load: ${item.defaultQuantity} × ${item.unitWeight} = ${fmtDecimal(item.defaultQuantity*item.unitWeight)} kg`;}
    });
  });

  list.querySelectorAll("[data-default-allocation-location]").forEach(el=>el.addEventListener("change",()=>{
    const k=el.dataset.defaultAllocationLocation,index=Number(el.dataset.index),item=EDITOR.draft.missionEquip[k];if(!item?.defaultAllocations?.[index])return;
    const before=JSON.parse(JSON.stringify(item));item.defaultAllocations[index].stow=el.value;
    if(!editorSaveDraft()){EDITOR.draft.missionEquip[k]=before;renderEditor();}
  }));
  list.querySelectorAll("[data-default-allocation-quantity]").forEach(el=>el.addEventListener("change",()=>{
    const k=el.dataset.defaultAllocationQuantity,index=Number(el.dataset.index),item=EDITOR.draft.missionEquip[k];if(!item?.defaultAllocations?.[index])return;
    if(!Number.isInteger(el.valueAsNumber)||el.valueAsNumber<0){el.reportValidity();return;}
    const before=JSON.parse(JSON.stringify(item));item.defaultAllocations[index].quantity=el.valueAsNumber;
    item.defaultQuantity=item.defaultAllocations.reduce((sum,row)=>sum+row.quantity,0);
    if(!editorSaveDraft()){EDITOR.draft.missionEquip[k]=before;renderEditor();}
    else editorRefreshDefaultAllocationFields(list,k,item);
  }));
  list.querySelectorAll("[data-default-allocation-add]").forEach(btn=>btn.addEventListener("click",()=>{
    const k=btn.dataset.defaultAllocationAdd,item=EDITOR.draft.missionEquip[k];if(!item?.defaultAllocations)return;
    const before=JSON.parse(JSON.stringify(item));item.defaultAllocations.push({quantity:0,stow:item.stow});
    if(!editorSaveDraft()){EDITOR.draft.missionEquip[k]=before;renderEditor();}else renderEditor();
  }));
  list.querySelectorAll("[data-default-allocation-remove]").forEach(btn=>btn.addEventListener("click",()=>{
    const k=btn.dataset.defaultAllocationRemove,index=Number(btn.dataset.index),item=EDITOR.draft.missionEquip[k];if(!item?.defaultAllocations||item.defaultAllocations.length<=1)return;
    const before=JSON.parse(JSON.stringify(item));item.defaultAllocations.splice(index,1);
    item.defaultQuantity=item.defaultAllocations.reduce((sum,row)=>sum+row.quantity,0);
    if(!editorSaveDraft()){EDITOR.draft.missionEquip[k]=before;renderEditor();}else renderEditor();
  }));

  // Preset membership checkboxes — add/remove item key from preset's missionOn.
  list.querySelectorAll("[data-preset]").forEach(el => {
    el.addEventListener("change", () => {
      const k  = el.dataset.k;
      const pk = el.dataset.preset;
      const pd = EDITOR.draft.presets[pk];
      if (!pd) return;
      if (!Array.isArray(pd.missionOn))  pd.missionOn  = [];
      if (!Array.isArray(pd.missionOff)) pd.missionOff = [];

      if (el.checked) {
        if (!pd.missionOn.includes(k)) pd.missionOn.push(k);
        pd.missionOff = pd.missionOff.filter(x => x !== k);
      } else {
        pd.missionOn = pd.missionOn.filter(x => x !== k);
      }
      editorSaveDraft();
    });
  });

  // Wire delete buttons
  list.querySelectorAll("[data-delk]").forEach(btn => {
    btn.onclick = () => {
      const k = btn.dataset.delk;
      const it = EDITOR.draft.missionEquip[k];
      if (!confirm(`Delete "${it?.name || k}"?\n\nThis removes it from the library.`)) return;
      if(Object.values(STORE.sessions).some(s=>s.mission?.[k])){alert("This item is used by a mission. Retire it or remove it from that mission first.");return;}
      delete EDITOR.draft.missionEquip[k];
      editorRemovePresetItem(k, ["missionOn", "missionOff"]);
      editorSaveDraft();
      renderEditor();
      if (typeof render === "function") render();
    };
  });

  // Wire add button — inline key form (no blocking prompt)
  document.getElementById("missionAddBtn").onclick = () => {
    const addForm = document.getElementById("missionAddForm");
    if (!addForm) return;
    // Toggle: if already open, close it
    if (addForm.dataset.open === "1") {
      addForm.innerHTML = "";
      addForm.dataset.open = "0";
      return;
    }
    addForm.dataset.open = "1";
    addForm.innerHTML = `
      <div class="card" style="margin-bottom:10px; padding:12px; border:2px solid var(--accent,#4a9eff);">
        <div class="lbl">New equipment key</div>
        <p class="small">Existing group: type me, the equipment group, and the item description. Capitals and underscores are added automatically. New group: type ME_NEW_GROUP__NEW_ITEM exactly, with a double underscore before the item. Quick entry cannot create a new group. After adding the key, name the item and enter its details. The key cannot be renamed.</p>
        <div class="row" style="gap:8px; align-items:center;">
          <input type="text" id="missionNewKeyInput" aria-label="New Mission Equipment key" placeholder="e.g. me sar mission equip spare radio" style="flex:1 1 100%;min-width:0;">
          <button class="btn good" id="missionNewKeyConfirm">Add</button>
          <button class="btn" id="missionNewKeyCancel">Cancel</button>
        </div>
        <div id="missionNewKeyErr" class="small" style="color:var(--bad,#e55); margin-top:4px; min-height:16px;"></div>
      </div>
    `;
    const inp  = document.getElementById("missionNewKeyInput");
    const err  = document.getElementById("missionNewKeyErr");
    const confirm_ = document.getElementById("missionNewKeyConfirm");
    const cancel_  = document.getElementById("missionNewKeyCancel");
    inp.focus();
    const preview=document.createElement('div');preview.className='small mono';preview.id='missionKeyPreview';preview.style.cssText='flex-basis:100%;overflow-wrap:anywhere';inp.after(preview);inp.oninput=()=>{preview.textContent=editorItemKey(inp.value);err.textContent='';};

    const tryAdd = () => {
      const {key,group,error}=editorKeyDefinition(inp.value,'mission');
      if(error){err.textContent=error;return;}
      if (Object.keys(EDITOR.draft.missionEquip).includes(key)) {
        err.textContent = `Key "${key}" is already in use. Choose another.`; return;
      }
      const firstStow = Object.keys(EDITOR.draft.stowage)[0] || "";
      EDITOR.draft.missionEquip[key] = {
        name:'New Mission Equipment Item',
        unitWeight: 0, defaultQuantity:1, minQuantity:0, missionQuantityEditable:false, active:true,
        stow: firstStow, group
      };
      EDITOR.openPanels??={};EDITOR.openPanels['group:'+group]=true;EDITOR.openPanels['item:'+key]=true;
      editorSaveDraft();
      renderEditor();
      if (typeof render === "function") render();
      const nameInput=document.querySelector(`[data-k="${key}"][data-f="name"]`);nameInput?.focus();nameInput?.select();
    };

    confirm_.onclick = tryAdd;
    cancel_.onclick  = () => { addForm.innerHTML = ""; addForm.dataset.open = "0"; };
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter")  tryAdd();
      if (e.key === "Escape") { addForm.innerHTML = ""; addForm.dataset.open = "0"; }
    });
    // Normalise to uppercase as user types
    inp.addEventListener("input", () => {
      const pos = inp.selectionStart;
      // Preserve the entered display name; only the generated key is capitalized.
      inp.setSelectionRange(pos, pos);
    });
  };
}

function renderCrewEquipmentPlacementEditor(host){
  if(!host)return;
  const rule=EDITOR.draft.crewEquipmentPlacement||(EDITOR.draft.crewEquipmentPlacement={seatAssociatedItems:[],pilotFlightEngineerB25:[],pilotFlightEngineerB25Priority:[],sarTechB25:[],sarTechB25Preferred:''});
  const items=EDITOR.draft.missionEquip, locations=missionLocations(EDITOR.draft);
  const select=(value,options,attribute)=>{const el=document.createElement('select');el.dataset.crewPlacement=attribute;el.innerHTML=options.map(([id,name])=>`<option value="${escHtml(id)}">${escHtml(name)}</option>`).join('');el.value=value||'';el.onchange=()=>{const before=JSON.stringify(rule);if(attribute==='priority0')rule.pilotFlightEngineerB25Priority[0]=el.value;else if(attribute==='priority1')rule.pilotFlightEngineerB25Priority[1]=el.value;else rule.sarTechB25Preferred=el.value;if(!editorSaveDraft()){EDITOR.draft.crewEquipmentPlacement=JSON.parse(before);renderEditor();}};return el;};
  const itemOptions=Object.entries(items).filter(([key])=>key.startsWith('ME_CREW_PERSONAL_EQUIP_'));
  const fieldset=(title,field,help,predicate)=>{const section=document.createElement('div');section.className='card';const heading=document.createElement('b');heading.textContent=title;section.append(heading);if(help){const p=document.createElement('p');p.className='small muted';p.textContent=help;section.append(p);}for(const [key,item] of itemOptions.filter(([key])=>predicate(key))){const label=document.createElement('label');label.style.display='block';const cb=document.createElement('input');cb.type='checkbox';cb.style.width='auto';cb.checked=(rule[field]||[]).includes(key);cb.onchange=()=>{const before=JSON.stringify(rule);rule[field]=rule[field]||[];rule[field]=cb.checked?[...new Set([...rule[field],key])]:rule[field].filter(x=>x!==key);if(!editorSaveDraft()){EDITOR.draft.crewEquipmentPlacement=JSON.parse(before);renderEditor();}};label.append(cb,document.createTextNode(' '+item.name));section.append(label);}host.append(section);};
  host.replaceChildren();
  fieldset('Associate Bags with Assigned Crew Seat','seatAssociatedItems','The load follows the seat of the added crew member.',key=>!key.endsWith('_B25'));
  fieldset('Pilot / Flight Engineer B25 Kits','pilotFlightEngineerB25','Assign the first available preferred shelf in priority order. Further kits or kits that do not fit can use cabin bays.',key=>key.endsWith('_B25')&&!key.includes('ST_TEAM'));
  const priority=document.createElement('div');priority.className='card';priority.innerHTML='<b>Pilot / Flight Engineer B25 Shelf Priority</b><div class="small muted">Locations are tried in order; bay locations are offered when neither preferred shelf can take the kit.</div>';const shelfOptions=Object.entries(EDITOR.draft.stowage).filter(([,loc])=>loc.group==='Ramp'||loc.group==='Port Fwd Shelves').map(([id,loc])=>[id,loc.name]);priority.append('First: ',select(rule.pilotFlightEngineerB25Priority?.[0],shelfOptions,'priority0'),' Second: ',select(rule.pilotFlightEngineerB25Priority?.[1],shelfOptions,'priority1'));host.append(priority);
  fieldset('SAR Tech B25 Kits','sarTechB25','Use the preferred Zone B location regardless of the order in which SAR Techs are added. If it cannot take the kit, cabin bays are offered.',key=>key.includes('ST_TEAM')&&key.endsWith('_B25'));
  const sar=document.createElement('div');sar.className='card';sar.innerHTML='<b>SAR Tech B25 Preferred Location</b><div class="small muted">Default location for every additional SAR Tech B25 kit.</div>';sar.append(select(rule.sarTechB25Preferred,Object.entries(EDITOR.draft.stowage).map(([id,loc])=>[id,loc.name]),'sarPreferred'));host.append(sar);
}


/* =========================
   STOWAGE LOCATIONS EDITOR
   Permanently-installed stowage structure (port-fwd shelves, ramp shelves,
   overhead bins) — items with group "Stowage". These are AC.missionEquip
   entries (so load planning, gating, and the overload guard keep working),
   but they are edited here, separated from per-sortie mission kit. The SAR
   cabinet is excluded — it is a role-fit item, edited in Role-Fit.
   ========================= */

function renderEditorStowage(host){
  host.innerHTML='<div class="small muted">Location reference arms are shared by equipment and mission allocations. Cabinet mass and shelf arms remain distinct.</div><div id="locationCards"></div><div class="card"><label>New stowage location key<input id="locationNewKey" placeholder="e.g. cabin spare radio position"></label><p class="small">Type the location group and description. Capitals and underscores are added automatically. After adding the key, name the location and enter its details. The key cannot be renamed.</p><div id="locationKeyPreview" class="small mono" style="overflow-wrap:anywhere"></div><button class="btn good" id="locationAdd">Add Stowage Location</button></div>';
  const list=host.querySelector('#locationCards');
  const panels=new Map();
  const groupPanel=group=>{
    if(!panels.has(group)){
      const panel=document.createElement('details');panel.className='card';panel.dataset.stowageEditorGroup=group;
      const summary=document.createElement('summary');summary.textContent=group;panel.append(summary);
      panel.open=!!EDITOR.openPanels?.['stowage:'+group];panel.ontoggle=()=>{EDITOR.openPanels??={};EDITOR.openPanels['stowage:'+group]=panel.open;};list.append(panel);panels.set(group,panel);
    }return panels.get(group);
  };
  for(const [id,arm] of Object.entries(EDITOR.draft.bayArms||{})){
    const row=document.createElement('div');row.className='card';row.style.padding='12px';
    row.innerHTML=`<div class="row"><b>${escHtml(missionLocations(EDITOR.draft)[id].name)}</b><label>Shared bay arm (mm)<input type="number" step="any" value="${arm}" data-bay-arm="${id}"></label></div><div class="small muted">Used by both mission equipment and bay loads.</div>`;
    row.querySelector('input').onchange=e=>{if(!Number.isFinite(e.target.valueAsNumber)){e.target.value=EDITOR.draft.bayArms[id];return;}EDITOR.draft.bayArms[id]=e.target.valueAsNumber;editorSaveDraft();};groupPanel('BAYS').append(row);
  }
  for(const [id,loc] of Object.entries(EDITOR.draft.stowage)){
    const row=document.createElement('div');row.className='card';row.style.padding='12px';
    row.dataset.locationKey=id;
    row.innerHTML=`<div class="small mono muted">${escHtml(id)}</div><div class="row"><label style="flex:2">Name<input data-location="name" value="${escHtml(loc.name)}"></label><label>Arm (mm)<input type="number" step="any" data-location="arm" value="${loc.arm}"></label><label>Location group<select data-location="group">${editorStowageGroupNames().map(g=>`<option ${loc.group===g?'selected':''}>${escHtml(g)}</option>`).join('')}</select></label><button class="btn bad" data-location-delete>Delete</button></div>`;
    row.querySelectorAll('[data-location]').forEach(el=>el.onchange=()=>{const field=el.dataset.location;if(field==='arm'&&!Number.isFinite(el.valueAsNumber)){el.value=loc.arm;return;}loc[field]=field==='arm'?el.valueAsNumber:el.value;editorSaveDraft();if(field==='group'){EDITOR.openPanels??={};EDITOR.openPanels['stowage:'+loc.group]=true;renderEditor();}});
    const requirement=document.createElement('label');requirement.className='small';requirement.textContent='Available when this Role Fit item is fitted';
    const select=document.createElement('select');select.dataset.locationRequirement=id;
    select.innerHTML='<option value="">No removable fitting required</option>'+Object.entries(EDITOR.draft.roleFit).map(([key,it])=>`<option value="${escHtml(key)}">${escHtml(it.name)}</option>`).join('');
    select.value=loc.roleFitKey|| (loc.group==='SAR Cabinet'?'RF_SAR_EQUIPMENT_FWD_SAR_CABINET':'');
    select.disabled=loc.group==='SAR Cabinet';
    select.onchange=()=>{if(select.value)loc.roleFitKey=select.value;else delete loc.roleFitKey;editorSaveDraft();};requirement.append(select);row.append(requirement);
    row.querySelector('[data-location-delete]').onclick=()=>{
      const referenced=Object.values(EDITOR.draft.missionEquip).some(it=>it.stow===id)||Object.values(STORE.sessions).some(s=>Object.values(s.missionLoads||{}).flat().some(r=>r.stow===id)||(s.zones||[]).some(z=>z.id===id&&z.w));
      if(referenced){alert('This location is referenced by equipment or a mission. Relocate those entries first.');return;}
      if(!confirm('Delete '+loc.name+'?'))return;delete EDITOR.draft.stowage[id];editorSaveDraft();renderEditor();
    };groupPanel(loc.group||'Cabin').append(row);
  }
  host.querySelector('#locationNewKey').oninput=e=>{host.querySelector('#locationKeyPreview').textContent=editorItemKey(e.target.value);};
  const newGroupHelp=document.createElement('p');newGroupHelp.className='small';newGroupHelp.textContent='New group: type NEW_GROUP__NEW_LOCATION exactly, with a double underscore before the location. Quick entry only works with existing groups.';host.querySelector('#locationKeyPreview').before(newGroupHelp);
  host.querySelector('#locationAdd').onclick=()=>{const {key:id,group,error}=editorKeyDefinition(host.querySelector('#locationNewKey').value,'stowage');if(error){alert(error);return;}if(missionLocations(EDITOR.draft)[id]){alert('Enter a unique location key.');return;}EDITOR.draft.stowage[id]={name:'New Stowage Location',arm:0,group};EDITOR.openPanels??={};EDITOR.openPanels['stowage:'+group]=true;editorSaveDraft();renderEditor();const nameInput=document.querySelector(`[data-location-key="${id}"] [data-location="name"]`);nameInput?.focus();nameInput?.select();};
}

function renderEditorRoleFit(host) {
  const roleFit = EDITOR.draft.roleFit;
  const keys    = sortSelectedFirst(Object.keys(roleFit),key=>!!roleFit[key].normally,key=>roleFit[key].name);

  host.innerHTML = `
    <div class="small muted" style="margin-bottom:10px;">
      ${keys.length} role-fit item${keys.length === 1 ? "" : "s"}.
      ${EDITOR.mode==='tail'
        ? 'For each item, set whether it is normally fitted to this aircraft and whether its weight is included in this aircraft’s recorded weight.'
        : 'Maintain the Role Fit equipment defaults used by the W&amp;B application. For each item, set whether it is normally fitted across the fleet and whether its weight is included in the fleet’s recorded aircraft weight.'}
    </div>

    <div id="roleFitItemList"></div>

    <div class="hr"></div>
    <div id="roleFitAddForm"></div>
    <div class="row">
      <button class="btn good" id="roleFitAddBtn">+ Add New Role-Fit Item</button>
    </div>
  `;

  const list = document.getElementById("roleFitItemList");

  // Pre-compute preset membership for role-fit checkboxes
  const rfPresetKeys = Object.keys(EDITOR.draft.presets);
  const isInRfPresetOn = (k, pk) => {
    const arr = EDITOR.draft.presets[pk]?.roleFitOn;
    return Array.isArray(arr) && arr.includes(k);
  };

  for (const k of keys) {
    const it = roleFit[k];
    const row = document.createElement("div");
    row.className = "card";
    row.style.marginBottom = "8px";
    row.style.padding = "12px";

    // Simple checkbox per preset: checked = installed when this preset loads.
    const presetChecks = rfPresetKeys.map(pk => {
      const pName = EDITOR.draft.presets[pk]?.name || pk;
      const chk   = isInRfPresetOn(k, pk) ? "checked" : "";
      return `<label class="small" style="display:flex;align-items:center;gap:4px;white-space:nowrap;cursor:pointer;">
        <input type="checkbox" data-k="${k}" data-rfpreset="${pk}" ${chk} style="width:auto;cursor:pointer;">
        ${escHtml(pName)}
      </label>`;
    }).join("");

    row.innerHTML = `
      <div class="row" style="align-items:flex-end;">
        <div style="flex: 3 1 300px;">
          <div class="lbl">Name</div>
          <input type="text" data-k="${k}" data-f="name" value="${escHtml(it.name)}">
        </div>
        <div style="flex: 0 0 100px;">
          <div class="lbl">Weight (kg)</div>
          <input type="number" step="0.01" data-k="${k}" data-f="w" value="${it.w}">
        </div>
        <div style="flex: 0 0 110px;">
          <div class="lbl">Arm (mm)</div>
          <input type="number" step="1" data-k="${k}" data-f="arm" value="${it.arm}">
        </div>
      </div>
      <div class="row" style="margin-top:10px; align-items:center; flex-wrap:wrap; gap:8px;">
        <div class="small mono muted" style="flex:1 1 100%;min-width:0;overflow-wrap:anywhere;">Key: ${k}<div class="small">This identifier links the item to configurations and saved selections and cannot be edited. Create a replacement with a new key and update its configurations before deleting this item. Existing mission selections need review.</div></div>
        <label class="small" style="flex:0 0 auto; display:flex; align-items:center; gap:6px; cursor:pointer;">
          <input type="checkbox" data-k="${k}" data-f="normally" ${it.normally ? "checked" : ""}
                 style="width:auto; cursor:pointer;"> Normally fitted
        </label>
        <label class="small" style="flex:0 0 auto; display:flex; align-items:center; gap:6px; cursor:pointer;">
          <input type="checkbox" data-k="${k}" data-f="maintenanceIncluded" ${it.maintenanceIncluded ? "checked" : ""}
                 style="width:auto; cursor:pointer;"> Included in recorded aircraft weight
        </label>
      </div>
      <label class="small"><input style="width:auto" type="checkbox" data-k="${k}" data-f="isStowage" ${it.isStowage?'checked':''}> Allow this item to be a stowage location</label>
      <p class="small muted">Other equipment can be assigned to this item. If it is not fitted, its contents must be relocated or removed.</p>
      <p class="small muted"><b>Normally fitted:</b> ${it.normally&&it.maintenanceIncluded?'This item is treated as fitted across roles.':EDITOR.mode==='tail'?'Used as this aircraft’s expected fit when a Role Config does not specify this item.':'Used as the expected fleet fit when a Role Config does not specify this item.'}</p>
      <p class="small muted"><b>Included in recorded aircraft weight:</b> ${EDITOR.mode==='tail'?'This aircraft’s':'The fleet’s'} recorded aircraft weight is assumed to include this item. This setting does not affect RFM Basic Weight.</p>
      <div class="row" style="margin-top:8px; align-items:center; flex-wrap:wrap; gap:10px;">
        <div class="small muted" style="flex:0 0 auto;">Installed in:</div>
        ${presetChecks}
        <button class="btn bad" data-delk="${k}" style="flex:0 0 auto; margin-left:auto;">Delete</button>
      </div>
    `;
    list.appendChild(row);
  }

  // Field edits (text/number) — save silently.
  list.querySelectorAll("[data-k][data-f]:not([type=checkbox])").forEach(el => {
    el.addEventListener("change", () => {
      const k = el.dataset.k;
      const f = el.dataset.f;
      const it = EDITOR.draft.roleFit[k];
      if (!it) return;
      if (f === "w")        it.w = parseFloat(el.value) || 0;
      else if (f === "arm") it.arm = parseInt(el.value, 10) || 0;
      else                  it[f] = el.value;
      editorSaveDraft();if(f==='name')renderEditor();
    });
  });

  // "Normally installed" checkbox — saves and also updates existing live sessions.
  list.querySelectorAll("[data-k][data-f][type=checkbox]").forEach(el => {
    el.addEventListener("change", () => {
      const k  = el.dataset.k;
      const f  = el.dataset.f;
      const it = EDITOR.draft.roleFit[k];
      if (!it) return;
      it[f] = el.checked === true;
      // Fleet defaults never replace per-sortie declarations.
      editorSaveDraft();if(f==='isStowage')renderEditor();
    });
  });

  // Per-preset installed checkboxes — checked = in roleFitOn, unchecked = not listed.
  list.querySelectorAll("[data-rfpreset]").forEach(el => {
    el.addEventListener("change", () => {
      const k  = el.dataset.k;
      const pk = el.dataset.rfpreset;
      const pd = EDITOR.draft.presets[pk];
      if (!pd) return;
      if (!Array.isArray(pd.roleFitOn))  pd.roleFitOn  = [];
      if (!Array.isArray(pd.roleFitOff)) pd.roleFitOff = [];

      if (el.checked) {
        if (!pd.roleFitOn.includes(k)) pd.roleFitOn.push(k);
        pd.roleFitOff = pd.roleFitOff.filter(x => x !== k);
      } else {
        pd.roleFitOn = pd.roleFitOn.filter(x => x !== k);
      }
      editorSaveDraft();
    });
  });

  // Delete
  list.querySelectorAll("[data-delk]").forEach(btn => {
    btn.onclick = () => {
      const k = btn.dataset.delk;
      const it = EDITOR.draft.roleFit[k];
      if (!confirm(`Delete "${it?.name || k}"?`)) return;
      if(Object.values(EDITOR.draft.stowage).some(loc=>loc.roleFitKey===k)){alert('This fitting is linked to a stowage location. Update that location before deleting it.');return;}
      delete EDITOR.draft.roleFit[k];
      editorRemovePresetItem(k, ["roleFitOn", "roleFitOff"]);
      editorSaveDraft();
      renderEditor();
      if (typeof render === "function") render();
    };
  });

  // Add — inline form
  document.getElementById("roleFitAddBtn").onclick = () => {
    const addForm = document.getElementById("roleFitAddForm");
    if (!addForm) return;
    if (addForm.dataset.open === "1") {
      addForm.innerHTML = "";
      addForm.dataset.open = "0";
      return;
    }
    addForm.dataset.open = "1";
    addForm.innerHTML = `
      <div class="card" style="margin-bottom:10px; padding:12px; border:2px solid var(--accent,#4a9eff);">
        <div class="lbl">New equipment key</div>
        <p class="small">Existing group: type rf, the major system, and the item description. Capitals and underscores are added automatically. New group: type RF_NEW_GROUP__NEW_ITEM exactly, with a double underscore before the item. Quick entry cannot create a new group. After adding the key, name the item and enter its details. The key cannot be renamed.</p>
        <div class="row" style="gap:8px; align-items:center;">
          <input type="text" id="rfNewKeyInput" aria-label="New Role Fit key" placeholder="e.g. rf aircraft systems air cooling pack" style="flex:1 1 100%;min-width:0;">
          <button class="btn good" id="rfNewKeyConfirm">Add</button>
          <button class="btn" id="rfNewKeyCancel">Cancel</button>
        </div>
        <div id="rfNewKeyErr" class="small" style="color:var(--bad,#e55); margin-top:4px; min-height:16px;"></div>
      </div>
    `;
    const inp = document.getElementById("rfNewKeyInput");
    const err = document.getElementById("rfNewKeyErr");
    inp.focus();
    const preview=document.createElement('div');preview.className='small mono';preview.id='rfKeyPreview';preview.style.cssText='flex-basis:100%;overflow-wrap:anywhere';inp.after(preview);inp.oninput=()=>{preview.textContent=editorItemKey(inp.value);err.textContent='';};

    const tryAdd = () => {
      const {key,group,error}=editorKeyDefinition(inp.value,'role');
      if(error){err.textContent=error;return;}
      if (Object.keys(EDITOR.draft.roleFit).includes(key)) {
        err.textContent = `Key "${key}" is already in use.`; return;
      }
      EDITOR.draft.roleFit[key] = { name:'New Role Fit Item', group, w: 0, arm: 0, normally: false, maintenanceIncluded: false };
      EDITOR.openPanels??={};EDITOR.openPanels['group:'+group]=true;EDITOR.openPanels['item:'+key]=true;
      editorSaveDraft();
      renderEditor();
      if (typeof render === "function") render();
      const nameInput=document.querySelector(`[data-k="${key}"][data-f="name"]`);nameInput?.focus();nameInput?.select();
    };

    document.getElementById("rfNewKeyConfirm").onclick = tryAdd;
    document.getElementById("rfNewKeyCancel").onclick  = () => { addForm.innerHTML = ""; addForm.dataset.open = "0"; };
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter")  tryAdd();
      if (e.key === "Escape") { addForm.innerHTML = ""; addForm.dataset.open = "0"; }
    });
    inp.addEventListener("input", () => {
      const pos = inp.selectionStart;
      // Preserve the entered display name; only the generated key is capitalized.
      inp.setSelectionRange(pos, pos);
    });
  };
}


/* =========================
   EXPORT CONFIG.JS
   ========================= */
// Generates a new config.js file as plain text for download.
// The custodian can then replace config.js in the app folder to
// publish changes to the fleet (until cloud hosting is ready).

function editorExportConfig() {
  if(!editorSaveDraft()) return;
  const exportDraft=EDITOR.mode==='tail'
    ? {...EDITOR.draft,...AC_FLEET_CONFIGURATION,tails:AC.tails,appOptions:AC.appOptions}
    : EDITOR.draft;
  // Read the current config.js from disk is not possible in-browser;
  // we rebuild the file content from AC values.

  // --- CONFIG VERSIONING ---
  // Read the version from the config currently loaded in memory and increment.
  // Single-custodian workflow: no concurrent edits, so a monotonic counter
  // carried inside the file is safe and needs no Git dependency.
  const prevMeta = (AC.meta && typeof AC.meta === "object") ? AC.meta : {};
  const prevVersion = Number.isFinite(prevMeta.configVersion) ? prevMeta.configVersion : 0;
  const newVersion = prevVersion + 1;
  const nowIso = new Date().toISOString();

  let note = prompt(
    "Optional: describe what changed in config v" + newVersion + ".\n" +
    "(Leave blank to auto-version with no note. The version increments either way.)",
    ""
  );
  // prompt returns null if cancelled — treat as "export anyway, no note"
  note = (note == null) ? "" : note.trim();

  // Build new changelog (newest-first), capped to keep the file from growing forever.
  const prevLog = Array.isArray(prevMeta.changelog) ? prevMeta.changelog : [];
  const newLog = [
    { version: newVersion, at: nowIso, note: note || "(no note provided)" },
    ...prevLog
  ].slice(0, 50);

  const newMeta = {
    configVersion: newVersion,
    configReleasedAt: nowIso,
    changelog: newLog,
    referenceDocuments: JSON.parse(JSON.stringify(exportDraft.referenceDocuments || prevMeta.referenceDocuments || {currentId:null,history:[]}))
  };
  // Reflect into live AC so the running app shows the new version immediately
  // after export (and so a re-export from the same session keeps incrementing).
  AC.meta = newMeta;

  const lines = [];
  const push  = (s) => lines.push(s);

  push("/**");
  push(" * config.js — CH-149 - 615 W&B App");
  push(" * Exported by the Custodian Editor on " + nowIso);
  push(" * Config data version: " + newVersion);
  push(" *");
  push(" * This file was generated from the editor. It contains the full");
  push(" * current state of all aircraft data. Rename to config.js and");
  push(" * replace your existing config.js to publish changes.");
  push(" */");
  push("");
  push("// SECTION 11 — CONFIG META (data version, separate from app code version)");
  push("const AC_META = " + stringifyPretty(newMeta) + ";");
  push("");
  push("// SECTION 1 — TAIL NUMBERS");
  push("const AC_TAILS = " + stringifyPretty(exportDraft.tails) + ";");
  push("const AC_APP_OPTIONS = " + stringifyPretty(exportDraft.appOptions) + ";");
  push("");
  push("// SECTION 1A — AUTH");
  push("const AC_AUTH = " + stringifyPretty(AC.auth) + ";");
  push("");
  push("// SECTION 2 — CG ENVELOPE");
  push("const AC_ENVELOPE = " + stringifyPretty(AC.envelope) + ";");
  push("");
  push("// SECTION 3 — BAY ARMS");
  push("const AC_BAY_ARMS = " + stringifyPretty(exportDraft.bayArms || AC.bayArms) + ";");
  push("");
  push("// SECTION 4 — RAMP LIMITS");
  push("const AC_RAMP = " + stringifyPretty(AC.ramp) + ";");
  push("");
  push("// SECTION 5 — FUEL TANKS");
  push("const AC_FUEL_TANK_ARMS = " + stringifyPretty(AC.fuelTankArms) + ";");
  push("const AC_FUEL_STAGES = "    + stringifyPretty(AC.fuelStages)    + ";");
  push("const AC_MAX_FUEL_KG = " + (AC.maxFuelKg || 4152) + "; // kg — sum of all positive fill stages");
  push("");
  push("// SECTION 6 — SEATS");
  push("const AC_CREW_SEATS = " + stringifyPretty(AC.crewSeats) + ";");
  push("const AC_PAX_SEATS = "  + stringifyPretty(AC.paxSeats)  + ";");
  push("");
  push("const AC_PATIENT_POSITIONS = " + stringifyPretty(exportDraft.patientPositions || AC.patientPositions || {}) + ";");
  push("");
  push("// SECTION 7 — STOWAGE LOCATIONS");
  push("const AC_STOWAGE = " + stringifyPretty(exportDraft.stowage) + ";");
  push("");
  push("// SECTION 8 — ROLE-FIT EQUIPMENT");
  push("const AC_ROLE_FIT = " + stringifyPretty(exportDraft.roleFit) + ";");
  push("");
  push("// SECTION 9 — MISSION EQUIPMENT");
  push("const AC_MISSION_EQUIP = " + stringifyPretty(exportDraft.missionEquip) + ";");
  push("const AC_CREW_EQUIPMENT_PLACEMENT = " + stringifyPretty(exportDraft.crewEquipmentPlacement) + ";");
  push("");
  push("// SECTION 10 — MISSION PRESETS");
  const exportPresets = JSON.parse(JSON.stringify(exportDraft.presets));
  push("const AC_PRESETS = " + stringifyPretty(exportPresets) + ";");
  push("const AC_TAIL_CONFIGURATIONS = " + stringifyPretty(AC.tailConfigurations||{}) + ";");
  push("");
  push("// EXPORT");
  push("const AC = {");
  push("  meta:          AC_META,");
  push("  auth:          AC_AUTH,");
  push("  tails:         AC_TAILS,");
  push("  appOptions:    AC_APP_OPTIONS,");
  push("  envelope:      AC_ENVELOPE,");
  push("  bayArms:       AC_BAY_ARMS,");
  push("  ramp:          AC_RAMP,");
  push("  fuelTankArms:  AC_FUEL_TANK_ARMS,");
  push("  fuelStages:    AC_FUEL_STAGES,");
  push("  maxFuelKg:     AC_MAX_FUEL_KG,");
  push("  crewSeats:     AC_CREW_SEATS,");
  push("  paxSeats:      AC_PAX_SEATS,");
  push("  patientPositions: AC_PATIENT_POSITIONS,");
  push("  stowage:       AC_STOWAGE,");
  push("  roleFit:       AC_ROLE_FIT,");
  push("  missionEquip:  AC_MISSION_EQUIP,");
  push("  crewEquipmentPlacement: AC_CREW_EQUIPMENT_PLACEMENT,");
  push("  presets:       AC_PRESETS,");
  push("  tailConfigurations: AC_TAIL_CONFIGURATIONS");
  push("};");
  push("");
  push("// Device overrides are validated and loaded by mission.js.");

  const content = lines.join("\n");
  const blob    = new Blob([content], { type: "text/plain" });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement("a");
  a.href        = url;
  a.download    = "config.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  if(EDITOR.mode==='tail'&&STORE.selectedTail)activateTailConfigurationForSession(STORE.selectedTail);
}


/* =========================
   HELPERS
   ========================= */

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function promptNewKey(defaultKey, existingKeys, label) {
  let key = prompt(
    `Enter unique key/ID for the new ${label}.\n` +
    `Use UPPERCASE letters, numbers, and underscores only.\n` +
    `Example: ME_NEW_RADIO`,
    defaultKey
  );
  if (!key) return null;
  key = key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  if (!key) { alert("Invalid key."); return null; }
  if (existingKeys.includes(key)) {
    alert(`Key "${key}" is already in use. Please choose another.`);
    return null;
  }
  return key;
}

function stringifyPretty(obj) {
  return JSON.stringify(obj, null, 2);
}
