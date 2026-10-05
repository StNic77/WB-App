function formatConfigurationReleaseTime(value){
  const date=new Date(value);
  if(!Number.isFinite(date.getTime()))return 'Release time unavailable';
  return date.toISOString().slice(0,19).replace('T',' ')+' UTC';
}

/* persist.js — CH-149-615 W&B App
 * Session persistence + app versioning.
 *
 * Goal: the app survives being swiped closed on the EFB iPad. All sessions,
 * the selected tail, and the active tab are written to localStorage on every
 * render and restored on boot. State stays valid until the operator explicitly
 * ends the session ("End Session" on Home), or until a version bump invalidates
 * an incompatible older save.
 *
 * Keys used here (namespaced, no collision with wb_theme / ac_config_overrides):
 *   wb615_session   → the persisted STORE snapshot
 *
 * Load order: this file must load AFTER config.js/compute.js and BEFORE app.js,
 * because app.js calls into restoreSession()/persistSession() during boot/render.
 */

/* =========================
   APP VERSION
   Bump APP_VERSION on any release. STATE_SCHEMA gates saved-state
   compatibility: if a stored snapshot was written under a different
   STATE_SCHEMA, the old snapshot is discarded rather than loaded into a shape
   the new code doesn't expect. Increment STATE_SCHEMA whenever the session
   object shape in makeNewSession() changes.
   ========================= */
const APP_VERSION  = "0.2.16-dev";  // human-facing release version (shown in UI / PDF)
const STATE_SCHEMA = 6;         // v6: mission quantities and per-location allocations

const SESSION_KEY = "wb615_session";
let sessionSaveBlocked=false;
function showSessionMigrationWarning(message){
  let el=document.getElementById("sessionMigrationWarning");
  if(!el){el=document.createElement("div");el.id="sessionMigrationWarning";el.className="callout";el.setAttribute("role","alert");document.body.prepend(el);}
  el.textContent=message;
}

/* =========================
   SAVE
   Called from render() in app.js after every state change. Cheap: a single
   JSON.stringify of STORE plus a version stamp. Wrapped so a storage failure
   (private mode, quota) never breaks the app.
   ========================= */
function persistSession(){
  try {
    if (sessionSaveBlocked || typeof STORE === "undefined" || !STORE) return;
    const snapshot = {
      appVersion:   APP_VERSION,
      schema:       STATE_SCHEMA,
      missionSignature: missionCatalogueSignature(),
      roleFitSignature: roleFitAccountingSignature(),
      savedAt:      new Date().toISOString(),
      selectedTail: STORE.selectedTail,
      activeTab:    (typeof activeTab !== "undefined") ? activeTab : "HOME",
      sessions:     STORE.sessions
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(snapshot));
  } catch (e) {
    // Non-fatal: app continues in-memory only.
    console.warn("[persist] save failed:", e);
  }
}

/* =========================
   RESTORE
   Called from boot in app.js AFTER initTails() has built fresh default
   sessions. If a compatible snapshot exists, it overwrites the defaults.
   Returns true if a snapshot was restored, false otherwise.
   ========================= */
function restoreSession(){
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return false;

    const snap = JSON.parse(raw);

    if (!snap || ![4,5,STATE_SCHEMA].includes(snap.schema) || !snap.sessions || typeof snap.sessions!=="object"){
      sessionSaveBlocked=true;
      showSessionMigrationWarning("Saved session format is not supported. The original save is preserved; automatic saving is paused.");
      return false;
    }
    // Validate before replacing live sessions, so malformed saves cannot partly load.
    for(const s of Object.values(snap.sessions)){
      if(!s || typeof s!=="object" || !s.accepted || !s.fuel || !s.seats || !s.bays || !Array.isArray(s.cargo))throw new Error('Incomplete saved session');
      if(s.patientOccupants && (typeof s.patientOccupants!=='object'||Array.isArray(s.patientOccupants)||Object.values(s.patientOccupants).some(value=>typeof value!=='boolean')))throw new Error('Invalid patient occupancy');
      if(s.missionLoads){
        for(const rows of Object.values(s.missionLoads)){
          if(!Array.isArray(rows)||rows.some(r=>!r||typeof r.id!=='string'||!Number.isInteger(r.quantity)||r.quantity<0||typeof r.stow!=='string'))throw new Error('Invalid equipment allocation');
          if(new Set(rows.map(r=>r.id)).size!==rows.length)throw new Error('Duplicate equipment allocation identity');
        }
      }
    }
    const needsMigration=snap.schema===4 || Object.values(snap.sessions).some(s=>!s.roleFitDeclarations);
    if(needsMigration){
      const backupKey="wb615_session_before_accounting_v5";
      if(!localStorage.getItem(backupKey)) localStorage.setItem(backupKey,raw);
    }

    // Only restore sessions for tails that still exist in the current config.
    // (Protects against a config.js change removing a tail out from under a save.)
    for (const tail of Object.keys(snap.sessions)){
      if (STORE.sessions[tail]){
        STORE.sessions[tail] = snap.sessions[tail];
        const a = STORE.sessions[tail].accepted || (STORE.sessions[tail].accepted = {});
        // Older saved sessions used the RFM calculation exclusively.
        if (!a.basicWeightBasis) a.basicWeightBasis = "MAINTENANCE";
        if (!("maintenanceBaseline" in a)) a.maintenanceBaseline = null;

        const restored = STORE.sessions[tail];
        restored.ui??={};restored.ui.meGroups={};restored.ui.locationGroups={};restored.ui.missionView='equipment';
        normalizeRackSessionKey(restored);
        if(needsMigration || !restored.roleFitDeclarations) migrateRoleFitDeclarations(restored);
        if(snap.roleFitSignature!==roleFitAccountingSignature() && restored.accepted?.isAccepted){
          if(!localStorage.getItem('wb615_session_before_fit_defaults_v2'))localStorage.setItem('wb615_session_before_fit_defaults_v2',raw);
          if(snap.schema===STATE_SCHEMA&&restored.accountingReviewReason!=='migration')restored.accountingReviewRequired=false;
          invalidateAccountingCertification(restored);
        }
        syncRoleFitPhysicalState(restored);
        if(snap.schema!==STATE_SCHEMA){
          if(!localStorage.getItem('wb615_session_before_mission_v2'))localStorage.setItem('wb615_session_before_mission_v2',raw);
          restored.mission={};restored.missionLoads={};
          for(const [key,it] of Object.entries(AC.missionEquip))restored.mission[key]=missionAutomaticDefault(restored,key,it);
          restored.missionReviewRequired=true;
          restored.missionReviewReason='migration';
          invalidateAccountingCertification(restored);
        } else if(snap.missionSignature!==missionCatalogueSignature()){
          if(restored.missionReviewReason!=='migration')restored.missionReviewRequired=false;invalidateAccountingCertification(restored);
        }
        if(snap.schema===STATE_SCHEMA){
          if(restored.missionReviewReason!=='migration')restored.missionReviewRequired=false;
          if(restored.accountingReviewReason!=='migration')restored.accountingReviewRequired=false;
        }

      }
    }

    if (snap.selectedTail && STORE.sessions[snap.selectedTail]){
      STORE.selectedTail = snap.selectedTail;
    }
    if (snap.activeTab && typeof activeTab !== "undefined"){
      activeTab = snap.activeTab;
    }

    console.log("[persist] restored session from " + snap.savedAt
      + " (app " + snap.appVersion + ")");
    return true;
  } catch (e) {
    sessionSaveBlocked=true;
    showSessionMigrationWarning("Saved data could not be safely restored or backed up. The original save is preserved; automatic saving is paused.");
    console.warn("[persist] restore failed:", e);
    return false;
  }
}

/* =========================
   END SESSION
   Explicit operator action. Clears the persisted snapshot and resets all
   sessions to defaults. This is the ONLY thing (besides a version bump) that
   invalidates saved state — swiping the app closed does not.
   ========================= */
function endPersistedSession(){
  try {
    if (sessionSaveBlocked){
      const original = localStorage.getItem(SESSION_KEY);
      if (original !== null){
        // Preserve the exact original, including invalid JSON, before an explicit reset.
        const backupKey = `${SESSION_KEY}_before_explicit_reset_${Date.now()}`;
        localStorage.setItem(backupKey, original);
        if (localStorage.getItem(backupKey) !== original) throw new Error("Session backup could not be verified");
      }
    }
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {
    alert("The session could not be backed up or cleared because browser storage is unavailable or full. Your original save has been kept. Free some browser storage and try again.");
    return false;
  }
  if(typeof EDITOR!=='undefined'){EDITOR.authed=false;EDITOR.draft=null;}
  sessionSaveBlocked = false;
  document.getElementById("sessionMigrationWarning")?.remove();
  if (typeof missionConfigNotice !== "undefined" && missionConfigNotice) showSessionMigrationWarning(missionConfigNotice);
  try { localStorage.removeItem(SPLASH_ACK_KEY); } catch (e) {}  // re-show opening screen
  // These Certify fields are plain DOM inputs, not part of STORE. Resetting
  // the sessions alone leaves their previous values visible on the next tail.
  for (const id of ["mcduAUW", "mcduCG", "mcduFuel", "certSvc"]){
    const input = document.getElementById(id);
    if (input) input.value = "";
  }
  if (typeof initTails === "function"){
    STORE.sessions = {};
    STORE.selectedTail = null;
    initTails();
  }
  if (typeof activeTab !== "undefined") activeTab = "HOME";
  return true;
}

/* When the snapshot was last written (for UI display). */
function lastPersistInfo(){
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw);
    return { savedAt: snap.savedAt, appVersion: snap.appVersion };
  } catch (e) { return null; }
}

/* =========================
   OPENING SCREEN / DISCLAIMER GATE
   Shows on a genuinely new session (no prior acknowledgement), and again
   whenever the config data version differs from the last acknowledged one.
   "Just dismiss" — no logging, no PDF entry.

   Acknowledgement is keyed to the config version so a custodian data update
   forces operators to re-acknowledge and notice the version moved. A plain
   swipe-close/reopen with an unchanged config does NOT re-show it.
   ========================= */
const SPLASH_ACK_KEY = "wb615_splash_ack";

function currentConfigVersion(){
  if (typeof AC !== "undefined" && AC.meta && Number.isFinite(AC.meta.configVersion)){
    return AC.meta.configVersion;
  }
  return null;
}

/* Returns true if the splash should be shown right now. */
function splashShouldShow(){
  try {
    const acked = localStorage.getItem(SPLASH_ACK_KEY);
    if (acked == null) return true;                 // never acknowledged → new session
    const curV = currentConfigVersion();
    if (curV == null) return false;
    const appV = (typeof APP_VERSION !== "undefined") ? APP_VERSION : "unknown";
    return acked !== `${appV}|${curV}`;              // app or config changed since acknowledgement
  } catch (e) {
    return true; // storage unavailable → show (fail safe toward informing)
  }
}

/* Record acknowledgement of the current config version. */
function splashAcknowledge(){
  try {
    const curV = currentConfigVersion();
    const appV = (typeof APP_VERSION !== "undefined") ? APP_VERSION : "unknown";
    localStorage.setItem(SPLASH_ACK_KEY, curV == null ? "" : `${appV}|${curV}`);
  } catch (e) { /* non-fatal */ }
}

/* Wire up and conditionally display the opening screen. Call once at boot,
   after AC and the DOM are available. */
function maybeShowSplash(){
  const overlay = document.getElementById("splashOverlay");
  if (!overlay) return;

  // Populate version numbers + note every time (cheap, keeps them current).
  const appEl = document.getElementById("splashAppVer");
  const cfgEl = document.getElementById("splashCfgVer");
  const noteEl = document.getElementById("splashCfgNote");

  if (appEl) appEl.textContent =
    (typeof APP_VERSION !== "undefined") ? ("v" + APP_VERSION) : "—";

  const curV = currentConfigVersion();
  if (cfgEl) cfgEl.textContent = (curV != null) ? ("v" + curV) : "—";

  if (noteEl && typeof AC !== "undefined" && AC.meta){
    const log = Array.isArray(AC.meta.changelog) ? AC.meta.changelog : [];
    const latest = log[0];
    let txt = "";
    if (AC.meta.configReleasedAt){
      txt += "Configuration released " +
        formatConfigurationReleaseTime(AC.meta.configReleasedAt) + ". ";
    }
    if (latest && latest.note && latest.note !== "(no note provided)"){
      txt += "Latest change: " + latest.note;
    }
    noteEl.textContent = txt.trim();
  }

  // Wire the dismiss button once.
  const btn = document.getElementById("splashAck");
  if (btn && !btn._wired){
    btn._wired = true;
    btn.onclick = () => {
      splashAcknowledge();
      overlay.hidden = true;
    };
  }

  // Show or hide based on the gate.
  overlay.hidden = !splashShouldShow();
}
