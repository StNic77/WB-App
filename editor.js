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
  activeSection: "MISSION",
  draft: null
};


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
    const payload = {
      missionSchema: MISSION_SCHEMA,
      baseConfigVersion: AC_META.configVersion,
      roleFitAccountingVersion: 1,
      missionEquip: EDITOR.draft.missionEquip,
      stowage:      EDITOR.draft.stowage,
      bayArms:      EDITOR.draft.bayArms || AC.bayArms,
      roleFit:      EDITOR.draft.roleFit,
      crewSeats:    EDITOR.draft.crewSeats,
      paxSeats:     EDITOR.draft.paxSeats,
      presets:      EDITOR.draft.presets,
      referenceDocuments: EDITOR.draft.referenceDocuments
    };
    localStorage.setItem("ac_config_overrides", JSON.stringify(payload));

    // Mutate live AC so the app sees changes immediately
    AC.missionEquip = EDITOR.draft.missionEquip;
    AC.stowage      = EDITOR.draft.stowage;
    AC.bayArms      = EDITOR.draft.bayArms || AC.bayArms;
    AC.roleFit      = EDITOR.draft.roleFit;
    AC.crewSeats    = EDITOR.draft.crewSeats;
    AC.paxSeats     = EDITOR.draft.paxSeats;
    AC.meta.referenceDocuments = EDITOR.draft.referenceDocuments;

    AC.presets = EDITOR.draft.presets;

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
    persistSession();
    return true;
  } catch (e) {
    alert("Failed to save changes: " + e.message);
  }
}

function editorResetDefaults() {
  if (!confirm("Reset ALL mission equipment, stowage, and role-fit data to factory defaults?\n\nThis will discard every change made in the editor.")) return;
  try {
    localStorage.removeItem("ac_config_overrides");
    alert("Reset complete. The page will now reload.");
    location.reload();
  } catch (e) {
    alert("Reset failed: " + e.message);
  }
}

function editorInitDraft() {
  // Deep-clone current AC state into an editable draft.
  // Presets carry missionOn/Off AND roleFitOn/Off so the editor
  // can manage both mission equipment and role-fit preset membership.
  const presetsDraft = JSON.parse(JSON.stringify(AC.presets));

  EDITOR.draft = {
    missionEquip: JSON.parse(JSON.stringify(AC.missionEquip)),
    stowage:      JSON.parse(JSON.stringify(AC.stowage)),
    bayArms:      JSON.parse(JSON.stringify(AC.bayArms)),
    roleFit:      JSON.parse(JSON.stringify(AC.roleFit)),
    crewSeats:    JSON.parse(JSON.stringify(AC.crewSeats)),
    paxSeats:     JSON.parse(JSON.stringify(AC.paxSeats)),
    presets:      presetsDraft,
    referenceDocuments: JSON.parse(JSON.stringify(AC.meta.referenceDocuments || {currentId:null,history:[]}))
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
    { id: "MISSION",  label: "Mission Equipment" },
    { id: "ROLEFIT",  label: "Role Fit Equipment" },
    { id: "SEATBASE", label: "Seat Baseline" },
    { id: "STOWAGE",  label: "Stowage Locations" },
    { id: "REFERENCE", label: "Reference Documents" },
    { id: "CONFIGURATIONS", label: "Configurations" }
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

      <div id="editorSectionHost"></div>

      <div class="hr"></div>
      <div class="row" style="gap:8px;">
        <button class="btn" id="editorExportBtn">Export config.js</button>
        <button class="btn bad" id="editorResetBtn">Reset to Factory Defaults</button>
        <button class="btn warn" id="editorSignOutBtn" style="margin-left:auto;">Sign Out</button>
      </div>
      <div class="small muted" style="margin-top:6px;">
        Export produces a downloadable config.js with your current changes —
        useful when it is time to publish updates to the rest of the fleet.
      </div>
    </div>
  `;

  // Wire tab buttons
  host.querySelectorAll("[data-edsec]").forEach(b => {
    b.onclick = () => {
      EDITOR.activeSection = b.dataset.edsec;
      renderEditor();
    };
  });

  // Wire footer buttons
  document.getElementById("editorExportBtn").onclick = editorExportConfig;
  document.getElementById("editorResetBtn").onclick  = editorResetDefaults;
  document.getElementById("editorSignOutBtn").onclick = () => {
    EDITOR.authed = false;
    EDITOR.draft = null;
    renderEditor();
  };

  // Render active section
  const secHost = document.getElementById("editorSectionHost");
  if (EDITOR.activeSection === "CONFIGURATIONS") renderEditorConfigurations(secHost);
  if (EDITOR.activeSection === "MISSION")  renderEditorMission(secHost);
  if (EDITOR.activeSection === "STOWAGE")  renderEditorStowage(secHost);
  if (EDITOR.activeSection === "ROLEFIT")  renderEditorRoleFit(secHost);
  if (EDITOR.activeSection === "SEATBASE") renderEditorSeatBaseline(secHost);
  if (EDITOR.activeSection === "REFERENCE") renderEditorReference(secHost);
}

function renderEditorConfigurations(host){
  const presets=EDITOR.draft.presets;
  host.innerHTML='<div class="small muted">Configurations reference catalogue items. Weights and arms stay in the equipment catalogue. Changes save locally.</div><div id="configurationCards"></div><div class="card"><div class="row"><label>New configuration name<input id="configurationNewName"></label><button class="btn good" id="configurationCreate">Create configuration</button></div></div>';
  const list=host.querySelector('#configurationCards');
  const newKey=()=> 'CONFIG_'+Date.now().toString(36).toUpperCase()+'_'+Math.random().toString(36).slice(2,6).toUpperCase();
  const refresh=()=>{editorSaveDraft();renderEditor();};
  host.querySelector('#configurationCreate').onclick=()=>{
    const name=host.querySelector('#configurationNewName').value.trim();if(!name){alert('Enter a configuration name.');return;}
    presets[newKey()]={name,notes:'',active:true,seats:{crew:[],pax:[]},occupants:[],roleFitOn:[],roleFitOff:[],missionOn:[],missionOff:[]};refresh();
  };
  for(const [key,p] of Object.entries(presets)){
    const card=document.createElement('details');card.className='card';card.dataset.configurationKey=key;
    card.innerHTML=`<summary><b>${escHtml(p.name)}</b>${p.active===false?' · Retired':''}</summary>
      <div class="row" style="margin-top:10px"><label style="flex:1">Name<input data-config-field="name" value="${escHtml(p.name)}"></label><label style="flex:2">Description<input data-config-field="notes" value="${escHtml(p.notes||'')}"></label></div>
      <div class="row" style="margin-top:10px"><label><input type="checkbox" style="width:auto" data-config-active ${p.active!==false?'checked':''}> Available for use<small>Uncheck to retire this item. Its definition is retained; existing configurations and mission loads may need review.</small></label><button class="btn" data-config-duplicate>Duplicate</button><button class="btn bad" data-config-delete>Delete</button></div>
      <h3>Mission equipment</h3><div data-config-equipment></div>
      <details><summary>Seats, default occupants and role-fit equipment</summary><div data-config-fit></div></details>`;
    card.querySelectorAll('[data-config-field]').forEach(input=>input.onchange=()=>{
      const field=input.dataset.configField;if(field==='name'&&!input.value.trim()){input.value=p.name;return;}
      p[field]=input.value.trim();editorSaveDraft();card.querySelector('summary b').textContent=p.name;
    });
    card.querySelector('[data-config-active]').onchange=e=>{p.active=e.target.checked;editorSaveDraft();};
    card.querySelector('[data-config-duplicate]').onclick=()=>{presets[newKey()]={...JSON.parse(JSON.stringify(p)),name:p.name+' Copy',active:true};refresh();};
    card.querySelector('[data-config-delete]').onclick=()=>{
      if(Object.values(STORE.sessions).some(s=>s.preset===key)){alert('This configuration is used by a session. Retire it or select another configuration first.');return;}
      if(!confirm('Delete configuration "'+p.name+'"?'))return;delete presets[key];refresh();
    };
    const equipment=card.querySelector('[data-config-equipment]');
    for(const group of MISSION_GROUPS){
      const section=document.createElement('details');section.innerHTML='<summary>'+group+'</summary>';
      for(const [id,it] of Object.entries(EDITOR.draft.missionEquip)){
        if(it.group!==group)continue;
        const label=document.createElement('label');label.className='small';label.style.cssText='display:block;margin:8px 0';
        const check=document.createElement('input');check.type='checkbox';check.style.width='auto';check.checked=(p.missionOn||[]).includes(id)||!!it.alwaysInclude;check.disabled=!!it.alwaysInclude||(it.active===false&&!check.checked);
        check.onchange=()=>{p.missionOn=(p.missionOn||[]).filter(k=>k!==id);p.missionOff=(p.missionOff||[]).filter(k=>k!==id);if(check.checked)p.missionOn.push(id);editorSaveDraft();};
        label.append(check,document.createTextNode(' '+it.name+(it.active===false?' (retired)':'')+(it.alwaysInclude?(id==='ME_SERVICING_EQUIP_POL_CONTAINER_AND_POL'?' · With SAR cabinet':' · Every configuration'):'')));section.append(label);
      }
      equipment.append(section);
    }
    const fit=card.querySelector('[data-config-fit]');
    fit.innerHTML='<section class="config-fit-section"><h3>Seats and default occupants</h3><div class="config-seat-row config-fit-heading"><span>Seat</span><span>Installed</span><span>Occupied</span></div><div data-config-seats></div></section><section class="config-fit-section"><h3>Role Fit Equipment</h3><div data-config-rolefit></div></section>';
    const seatsHost=fit.querySelector('[data-config-seats]');
    const roleFitHost=fit.querySelector('[data-config-rolefit]');
    for(const [kind,catalogue] of [['crew',EDITOR.draft.crewSeats],['pax',EDITOR.draft.paxSeats]]){
      for(const [id,it] of Object.entries(catalogue)){
        const label=document.createElement('div');label.className='config-seat-row small';
        const name=document.createElement('span');name.textContent=it.name;label.append(name);
        for(const occupant of [false,true]){
          const cb=document.createElement('input');cb.type='checkbox';cb.style.width='auto';cb.checked=occupant?(p.occupants||[]).includes(id):(p.seats?.[kind]||[]).includes(id);
          cb.setAttribute('aria-label',it.name+(occupant?' occupied':' installed'));
          cb.onchange=()=>{p.seats??={crew:[],pax:[]};const list=occupant?(p.occupants??=[]):(p.seats[kind]??=[]);const i=list.indexOf(id);if(i>=0)list.splice(i,1);if(cb.checked)list.push(id);if(occupant&&cb.checked&&!p.seats[kind].includes(id))p.seats[kind].push(id);if(!occupant&&!cb.checked)p.occupants=(p.occupants||[]).filter(x=>x!==id);editorSaveDraft();};
          label.append(cb);
        }seatsHost.append(label);
      }
    }
    for(const [id,it] of Object.entries(EDITOR.draft.roleFit)){
      const label=document.createElement('label');label.className='config-rolefit-row small';
      const name=document.createElement('span');name.textContent=it.name;label.append(name);
      const select=document.createElement('select');select.innerHTML=`<option value="">Aircraft Default — ${it.normally?'Installed':'Not Installed'}</option><option value="on">Installed</option><option value="off">Removed</option>`;select.value=(p.roleFitOn||[]).includes(id)?'on':(p.roleFitOff||[]).includes(id)?'off':'';
      select.onchange=()=>{p.roleFitOn=(p.roleFitOn||[]).filter(k=>k!==id);p.roleFitOff=(p.roleFitOff||[]).filter(k=>k!==id);if(select.value==='on')p.roleFitOn.push(id);if(select.value==='off')p.roleFitOff.push(id);editorSaveDraft();};label.append(select);roleFitHost.append(label);
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
}


/* =========================
   MISSION EQUIPMENT EDITOR
   ========================= */

function renderEditorMission(host) {
  const items   = EDITOR.draft.missionEquip;
  const stowage = missionLocations(EDITOR.draft);

  // Mission Equipment tab shows sortie kit only — stowage LOCATIONS
  // (port-fwd shelves, ramp shelves, overhead bins) live in their own
  // Stowage Locations tab. They remain AC.missionEquip entries; this is
  // purely an editor-view split.
  const keys = Object.keys(items)
    .filter(k => (items[k].group || "") !== "Stowage")
    .sort((a,b)=>MISSION_GROUPS.indexOf(items[a].group)-MISSION_GROUPS.indexOf(items[b].group)||a.localeCompare(b));

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

  const groups = MISSION_GROUPS;

  host.innerHTML = `
    <div class="small muted" style="margin-bottom:10px;">
      ${keys.length} item${keys.length === 1 ? "" : "s"}. Changes save automatically as you edit.
    </div>

    <div id="missionItemList"></div>

    <div class="hr"></div>
    <div id="missionAddForm"></div>
    <div class="row">
      <button class="btn good" id="missionAddBtn">+ Add New Mission Equipment</button>
    </div>
  `;

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
          <select data-k="${k}" data-f="group">${groups.map(g=>`<option ${g===it.group?"selected":""}>${g}</option>`).join("")}</select>
        </div>
      </div>
      <div class="row" style="margin-top:10px;gap:10px;">
        <label style="flex:2 1 220px;">Description<input data-k="${k}" data-f="description" value="${escHtml(it.description||'')}"></label>
      </div><h3>Default Load</h3><p class="small muted">Each quantity represents one item. Changes made for a mission do not change these defaults.</p><div class="row">
        <label>Default quantity<input style="width:100px" type="number" min="0" step="1" data-k="${k}" data-f="defaultQuantity" value="${it.defaultQuantity}"></label>
        <label>Minimum<input style="width:90px" type="number" min="0" step="1" data-k="${k}" data-f="minQuantity" value="${it.minQuantity??''}"></label>
        <label>Maximum<input style="width:130px" type="number" min="0" step="1" data-k="${k}" data-f="maxQuantity" value="${it.maxQuantity??''}" placeholder="No maximum" title="No maximum when left blank"></label>
      </div>
        <span class="small mono" data-default-total="${k}">Default load: ${it.defaultQuantity} × ${it.unitWeight} = ${fmtDecimal(it.defaultQuantity*it.unitWeight)} kg</span>
      <h3>Mission Options</h3><div class="editor-mission-options">
        <label class="small"><input style="width:auto" type="checkbox" data-k="${k}" data-f="missionQuantityEditable" ${it.missionQuantityEditable?'checked':''}> Show quantity buttons in Mission Equipment<small>Show quick −/+ buttons during a mission. Extras can still be added through the item’s adjustment controls when unchecked.</small></label>
        <label class="small"><input style="width:auto" type="checkbox" data-k="${k}" data-f="alwaysInclude" ${it.alwaysInclude?'checked':''}> ${k==='ME_SERVICING_EQUIP_POL_CONTAINER_AND_POL'?'Carry by default when the SAR cabinet is fitted':'Carry by default in all configurations'}<small>${k==='ME_SERVICING_EQUIP_POL_CONTAINER_AND_POL'?'Otherwise, the crew can add this item manually and select its stowage location.':'Select this item whenever a configuration is applied. The crew can deselect it for an individual mission.'}</small></label>
        <label class="small"><input style="width:auto" type="checkbox" data-k="${k}" data-f="active" ${it.active!==false?'checked':''}> Available for use<small>Uncheck to retire this item. Its definition is retained; existing configurations and mission loads may need review.</small></label>
        <label class="small"><input style="width:auto" type="checkbox" data-k="${k}" data-f="isBasket" ${it.isBasket?'checked':''}> Allow this item to be a stowage location<small>Other equipment can be assigned to this item and follows its location when moved. If this item is not carried, its contents must be relocated or removed.</small></label>

      </div>
      <div class="row" style="margin-top:10px; align-items:center; flex-wrap:wrap; gap:8px;">
        <div class="small mono muted" style="flex:1 1 100%;min-width:0;overflow-wrap:anywhere;">Key: ${k}<div class="small">This identifier links the item to configurations and saved selections. It cannot be edited. To use a different key, create a replacement, update its configurations, then delete the old item. Existing mission selections need review.</div></div>
        <div class="small muted" style="flex:0 0 auto;">Carried by default in these configurations:</div>
        <div style="display:flex; flex-wrap:wrap; gap:10px; align-items:center; flex:1 1 auto;">
          ${it.alwaysInclude?'<div class="small">Selected automatically where its default-carry rule applies. Individual configuration selections do not apply.</div>':''}${presetChecks}
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
      else if(['isBasket','alwaysInclude'].includes(f)){renderEditor();}
      else {const total=list.querySelector(`[data-default-total="${k}"]`);if(total)total.textContent=`Default load: ${item.defaultQuantity} × ${item.unitWeight} = ${fmtDecimal(item.defaultQuantity*item.unitWeight)} kg`;}
    });
  });

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
        <div class="lbl">New item key (UPPERCASE, numbers, underscores only)</div>
        <div class="row" style="gap:8px; align-items:center;">
          <p class="small">A unique identifier connecting this item to configurations and saved selections. Separate from its displayed name; cannot be changed after creation.</p><input type="text" id="missionNewKeyInput" placeholder="e.g. ME_NEW_RADIO"
                 style="flex:1; text-transform:uppercase; font-family:monospace;">
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

    const tryAdd = () => {
      let key = inp.value.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
      if (!key.startsWith("ME_")) { err.textContent = "Key must start with ME_."; return; }
      if (Object.keys(EDITOR.draft.missionEquip).includes(key)) {
        err.textContent = `Key "${key}" is already in use. Choose another.`; return;
      }
      const firstStow = Object.keys(EDITOR.draft.stowage)[0] || "";
      EDITOR.draft.missionEquip[key] = {
        name:  "New Equipment Item",
        unitWeight: 0, defaultQuantity:1, minQuantity:0, missionQuantityEditable:false, active:true,
        stow: firstStow, group: MISSION_GROUPS[0]
      };
      editorSaveDraft();
      renderEditor();
      if (typeof render === "function") render();
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
      inp.value = inp.value.toUpperCase();
      inp.setSelectionRange(pos, pos);
    });
  };
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
  host.innerHTML='<div class="small muted">Location reference arms are shared by equipment and mission allocations. Cabinet mass and shelf arms remain distinct.</div><div id="locationCards"></div><div class="card row"><input id="locationNewKey" placeholder="New location key"><button class="btn good" id="locationAdd">Add Stowage Location</button></div>';
  const list=host.querySelector('#locationCards');
  for(const [id,arm] of Object.entries(EDITOR.draft.bayArms||{})){
    const row=document.createElement('div');row.className='card';row.style.padding='12px';
    row.innerHTML=`<div class="row"><b>${escHtml(missionLocations(EDITOR.draft)[id].name)}</b><label>Shared bay arm (mm)<input type="number" step="any" value="${arm}" data-bay-arm="${id}"></label></div><div class="small muted">Used by both mission equipment and bay loads.</div>`;
    row.querySelector('input').onchange=e=>{if(!Number.isFinite(e.target.valueAsNumber)){e.target.value=EDITOR.draft.bayArms[id];return;}EDITOR.draft.bayArms[id]=e.target.valueAsNumber;editorSaveDraft();};list.append(row);
  }
  for(const [id,loc] of Object.entries(EDITOR.draft.stowage)){
    const row=document.createElement('div');row.className='card';row.style.padding='12px';
    row.innerHTML=`<div class="small mono muted">${escHtml(id)}</div><div class="row"><label style="flex:2">Name<input data-location="name" value="${escHtml(loc.name)}"></label><label>Arm (mm)<input type="number" step="any" data-location="arm" value="${loc.arm}"></label><label>Location group<select data-location="group">${['SAR Cabinet','Cabin','Port Fwd Shelves','Ramp','Cabin Bays'].map(g=>`<option ${loc.group===g?'selected':''}>${g}</option>`).join('')}</select></label><button class="btn bad" data-location-delete>Delete</button></div>`;
    row.querySelectorAll('[data-location]').forEach(el=>el.onchange=()=>{const field=el.dataset.location;if(field==='arm'&&!Number.isFinite(el.valueAsNumber)){el.value=loc.arm;return;}loc[field]=field==='arm'?el.valueAsNumber:el.value;editorSaveDraft();});
    row.querySelector('[data-location-delete]').onclick=()=>{
      const referenced=Object.values(EDITOR.draft.missionEquip).some(it=>it.stow===id)||Object.values(STORE.sessions).some(s=>Object.values(s.missionLoads||{}).flat().some(r=>r.stow===id)||(s.zones||[]).some(z=>z.id===id&&z.w));
      if(referenced){alert('This location is referenced by equipment or a mission. Relocate those entries first.');return;}
      if(!confirm('Delete '+loc.name+'?'))return;delete EDITOR.draft.stowage[id];editorSaveDraft();renderEditor();
    };list.append(row);
  }
  host.querySelector('#locationAdd').onclick=()=>{const id=host.querySelector('#locationNewKey').value.trim().toUpperCase();if(!/^[A-Z0-9_]+$/.test(id)||missionLocations(EDITOR.draft)[id]){alert('Enter a unique uppercase location key.');return;}EDITOR.draft.stowage[id]={name:'New location',arm:0,group:'Cabin'};editorSaveDraft();renderEditor();};
}

function renderEditorRoleFit(host) {
  const roleFit = EDITOR.draft.roleFit;
  const keys    = Object.keys(roleFit).sort();

  host.innerHTML = `
    <div class="small muted" style="margin-bottom:10px;">
      ${keys.length} role-fit item${keys.length === 1 ? "" : "s"}.
      Set the default installed state, the fleet Maintenance Basic Weight baseline, and preset membership independently.
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
                 style="width:auto; cursor:pointer;"> Default installed state
        </label>
        <label class="small" style="flex:0 0 auto; display:flex; align-items:center; gap:6px; cursor:pointer;">
          <input type="checkbox" data-k="${k}" data-f="maintenanceIncluded" ${it.maintenanceIncluded ? "checked" : ""}
                 style="width:auto; cursor:pointer;" title="Default assumption for aircraft weighing records. Record aircraft-specific differences under Maintenance Exceptions on Accept."> Included in Recorded Aircraft Basic Weight
        </label>
      </div>
      <label class="small"><input style="width:auto" type="checkbox" data-k="${k}" data-f="isStowage" ${it.isStowage?'checked':''}> Allow this item to be a stowage location</label>
      <p class="small muted">Other equipment can be assigned to this item. If it is not fitted, its contents must be relocated or removed.</p>
      <p class="small muted">Recorded Aircraft Basic Weight inclusion is the default assumption for weighing records. Record aircraft-specific differences under Maintenance Exceptions on Accept.</p>
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
      editorSaveDraft();
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
        <div class="lbl">New item key (UPPERCASE, numbers, underscores only)</div>
        <div class="row" style="gap:8px; align-items:center;">
          <p class="small">A unique identifier connecting this item to configurations and saved selections. Separate from its displayed name; cannot be changed after creation.</p><input type="text" id="rfNewKeyInput" placeholder="e.g. RF_NEW_ITEM"
                 style="flex:1; text-transform:uppercase; font-family:monospace;">
          <button class="btn good" id="rfNewKeyConfirm">Add</button>
          <button class="btn" id="rfNewKeyCancel">Cancel</button>
        </div>
        <div id="rfNewKeyErr" class="small" style="color:var(--bad,#e55); margin-top:4px; min-height:16px;"></div>
      </div>
    `;
    const inp = document.getElementById("rfNewKeyInput");
    const err = document.getElementById("rfNewKeyErr");
    inp.focus();

    const tryAdd = () => {
      let key = inp.value.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
      if (!key) { err.textContent = "Key cannot be empty."; return; }
      if (Object.keys(EDITOR.draft.roleFit).includes(key)) {
        err.textContent = `Key "${key}" is already in use.`; return;
      }
      EDITOR.draft.roleFit[key] = { name: "New Role-Fit Item", w: 0, arm: 0, normally: false, maintenanceIncluded: false };
      editorSaveDraft();
      renderEditor();
      if (typeof render === "function") render();
    };

    document.getElementById("rfNewKeyConfirm").onclick = tryAdd;
    document.getElementById("rfNewKeyCancel").onclick  = () => { addForm.innerHTML = ""; addForm.dataset.open = "0"; };
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter")  tryAdd();
      if (e.key === "Escape") { addForm.innerHTML = ""; addForm.dataset.open = "0"; }
    });
    inp.addEventListener("input", () => {
      const pos = inp.selectionStart;
      inp.value = inp.value.toUpperCase();
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
    referenceDocuments: JSON.parse(JSON.stringify(EDITOR.draft.referenceDocuments || prevMeta.referenceDocuments || {currentId:null,history:[]}))
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
  push("const AC_TAILS = " + stringifyPretty(AC.tails) + ";");
  push("");
  push("// SECTION 1A — AUTH");
  push("const AC_AUTH = " + stringifyPretty(AC.auth) + ";");
  push("");
  push("// SECTION 2 — CG ENVELOPE");
  push("const AC_ENVELOPE = " + stringifyPretty(AC.envelope) + ";");
  push("");
  push("// SECTION 3 — BAY ARMS");
  push("const AC_BAY_ARMS = " + stringifyPretty(EDITOR.draft.bayArms || AC.bayArms) + ";");
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
  push("// SECTION 7 — STOWAGE LOCATIONS");
  push("const AC_STOWAGE = " + stringifyPretty(EDITOR.draft.stowage) + ";");
  push("");
  push("// SECTION 8 — ROLE-FIT EQUIPMENT");
  push("const AC_ROLE_FIT = " + stringifyPretty(EDITOR.draft.roleFit) + ";");
  push("");
  push("// SECTION 9 — MISSION EQUIPMENT");
  push("const AC_MISSION_EQUIP = " + stringifyPretty(EDITOR.draft.missionEquip) + ";");
  push("");
  push("// SECTION 10 — MISSION PRESETS");
  const exportPresets = JSON.parse(JSON.stringify(EDITOR.draft.presets));
  push("const AC_PRESETS = " + stringifyPretty(exportPresets) + ";");
  push("");
  push("// EXPORT");
  push("const AC = {");
  push("  meta:          AC_META,");
  push("  auth:          AC_AUTH,");
  push("  tails:         AC_TAILS,");
  push("  envelope:      AC_ENVELOPE,");
  push("  bayArms:       AC_BAY_ARMS,");
  push("  ramp:          AC_RAMP,");
  push("  fuelTankArms:  AC_FUEL_TANK_ARMS,");
  push("  fuelStages:    AC_FUEL_STAGES,");
  push("  maxFuelKg:     AC_MAX_FUEL_KG,");
  push("  crewSeats:     AC_CREW_SEATS,");
  push("  paxSeats:      AC_PAX_SEATS,");
  push("  stowage:       AC_STOWAGE,");
  push("  roleFit:       AC_ROLE_FIT,");
  push("  missionEquip:  AC_MISSION_EQUIP,");
  push("  presets:       AC_PRESETS");
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
