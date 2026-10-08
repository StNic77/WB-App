function signedAccounting(value){return (value>=0?"+":"")+fmtDecimal(value,2);}
function expectedRoleFitLabel(s,key){
  const expectation=roleFitExpectation(s,key);
  if(expectation.aircraftLevel) return "Normally fitted to this aircraft";
  if(!s.preset) return expectation.normal?"Normally fitted to this aircraft":"Not normally fitted";
  return `${expectation.installed?"Fitted":"Not fitted"} for ${expectation.configuration}`;
}
function selectedRoleFitLabel(row){
  if(row.locked) return "Not fitted · Recorded on Accept";
  return ROLE_FIT_LABELS[row.declaration]||"Needs review";
}
/*
 * pdf.js — CH-149 Cormorant W&B App
 * 615 Wing, DLTP 101C-615
 *
 * Generates a printable / email-ready PDF record of the W&B certification.
 * Uses jsPDF (loaded via CDN in index.html).
 *
 * Entry point: generateWBReport()
 * Called by the "Print / Save PDF" button on the Certify tab.
 *
 * Document sections:
 *   Header      — unit, tail, date, FE, accepted-by
 *   1. Acceptance     — basic weight, basic CG, fuel log
 *   2. Fuel           — total, landing reserve, tank breakdown
 *   3. W&B Summary    — operating weight/CG, AUW/CG, envelope result
 *   4. CG Envelope    — plotted polygon with aircraft burn track
 *   5. Mission Config — preset applied, note re appendix
 *   6. Mission Equip  — equipment by group (SAR/ALSE/Mission/Shelves/Other)
 *   7. Crew & Pax     — seats installed and occupied
 *   8. Load Planning  — bay loads and cargo entries (if any)
 *   9. Certification  — certification record, MCDU cross-check values
 *   Appendix A        — Role Fit Equipment Summary
 *   Appendix B        — Custom Exceptions
 */

/* =========================
   MAIN ENTRY POINT
   ========================= */

function generateWBReport() {
  const tail = STORE.selectedTail;
  const s    = STORE.sessions?.[tail];

  if (!s) {
    alert("No aircraft selected.");
    return;
  }
  if (!s.accepted?.isAccepted) {
    alert("Aircraft must be accepted before generating a report.");
    return;
  }
  if (!s.certify?.certified) {
    alert("W&B must be certified before generating a report.");
    return;
  }

  const accountingErrors=[...accountingIssues(s),...missionIssues(s),...patientIssues(s)];
  if(s.fuel.landing>s.fuel.total)accountingErrors.push("Landing fuel exceeds departure fuel.");
  if(accountingErrors.length){alert("Resolve equipment accounting before generating a clearance: "+accountingErrors.join(" "));return;}

  // Load jsPDF — it must be available on window
  if (typeof window.jspdf === "undefined" && typeof jsPDF === "undefined") {
    alert("PDF library not loaded. Check your internet connection and reload the app.");
    return;
  }

  const { jsPDF } = window.jspdf || window;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });

  const wb = computeWB(tail);
  const ctx = new PDFContext(doc, tail, s, wb);

  ctx.drawHeader();
  ctx.drawAcceptance();       // 1
  ctx.drawFuel();             // 2
  ctx.drawWBSummary();        // 3
  ctx.drawEnvelopePlot();     // 4
  ctx.drawMissionConfig();    // 5
  ctx.drawMissionEquip();     // 6
  ctx.drawSeats();            // 7
  ctx.drawLoadPlanning();     // 8
  ctx.drawCertification();    // 9
  ctx.drawRoleFitAppendix();  // Appendix A — Role Fit Equipment Summary
  ctx.drawCustomExceptionsAppendix(); // Appendix B

  // File name: WB_615_[TAIL]_[YYYYMMDD]_Z[HH:MM].pdf — all UTC (Zulu)
  const now     = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");   // YYYYMMDD UTC
  const zuluHH  = String(now.getUTCHours()).padStart(2, "0");
  const zuluMM  = String(now.getUTCMinutes()).padStart(2, "0");
  const zuluStr = `Z${zuluHH}${zuluMM}`;
  doc.save(`WB_615_${tail}_${dateStr}_${zuluStr}.pdf`);
}


/* =========================
   PDF CONTEXT
   Helper class that tracks cursor position and provides
   drawing primitives. All Y positions are managed here
   so sections don't need to know where the previous one ended.
   ========================= */

class PDFContext {
  constructor(doc, tail, session, wb) {
    this.doc     = doc;
    this.tail    = tail;
    this.s       = session;
    this.wb      = wb;

    // Page geometry (letter: 216 x 279 mm)
    this.pageW   = 216;
    this.pageH   = 279;
    this.marginL = 14;
    this.marginR = 14;
    this.contentW = this.pageW - this.marginL - this.marginR;

    // Cursor
    this.y       = 14;

    // Colours
    this.C_DARK   = [15,  25,  50];   // near-black navy
    this.C_MED    = [60,  80, 120];   // mid navy
    this.C_LIGHT  = [200, 210, 230];  // light blue-grey
    this.C_GOOD   = [30,  160,  90];
    this.C_WARN   = [200, 140,  20];
    this.C_BAD    = [200,  50,  60];
    this.C_WHITE  = [255, 255, 255];
    this.C_PAGE   = [245, 247, 252];  // page background tint
  }

  // ── Primitives ──────────────────────────────────────────────

  newPage() {
    this.doc.addPage();
    this.y = 14;
    this._drawPageBg();
  }

  _drawPageBg() {
    this.doc.setFillColor(...this.C_PAGE);
    this.doc.rect(0, 0, this.pageW, this.pageH, "F");
  }

  checkPageBreak(needed) {
    if (this.y + needed > this.pageH - 16) {
      this.newPage();
    }
  }

  text(str, x, y, opts = {}) {
    this.doc.text(str ?? "", x, y, opts);
  }

  setFont(style = "normal", size = 9) {
    this.doc.setFont("helvetica", style);
    this.doc.setFontSize(size);
  }

  setColor(...rgb) {
    this.doc.setTextColor(...rgb);
  }

  hRule(y, color = this.C_LIGHT) {
    this.doc.setDrawColor(...color);
    this.doc.setLineWidth(0.2);
    this.doc.line(this.marginL, y, this.pageW - this.marginR, y);
  }

  // Section header bar
  sectionHeader(label) {
    this.checkPageBreak(12);
    this.doc.setFillColor(...this.C_DARK);
    this.doc.rect(this.marginL, this.y, this.contentW, 7, "F");
    this.setFont("bold", 9);
    this.setColor(...this.C_WHITE);
    this.text(label.toUpperCase(), this.marginL + 3, this.y + 5);
    this.setColor(0, 0, 0);
    this.y += 10;
  }

  // Colored alert banner — level = "good" | "warn" | "bad"
  // Used to draw attention to pass/fail or discrepancy conditions.
  alertBanner(level, title, detail) {
    this.checkPageBreak(14);
    const bgMap = {
      good: [220, 245, 225],   // light green tint
      warn: [255, 245, 215],   // light amber tint
      bad:  [250, 220, 220]    // light red tint
    };
    const textMap = {
      good: this.C_GOOD,
      warn: this.C_WARN,
      bad:  this.C_BAD
    };
    const bg    = bgMap[level]   || bgMap.warn;
    const txtC  = textMap[level] || textMap.warn;
    const h     = detail ? 12 : 8;

    // Bar
    this.doc.setFillColor(...bg);
    this.doc.rect(this.marginL, this.y, this.contentW, h, "F");
    // Left accent stripe
    this.doc.setFillColor(...txtC);
    this.doc.rect(this.marginL, this.y, 2, h, "F");

    this.setFont("bold", 9);
    this.setColor(...txtC);
    this.text(title, this.marginL + 5, this.y + 5.5);

    if (detail) {
      this.setFont("normal", 8);
      this.setColor(...this.C_DARK);
      this.text(detail, this.marginL + 5, this.y + 10);
    }

    this.setColor(0, 0, 0);
    this.y += h + 3;
  }

  // Two-column key/value row
  kvRow(label, value, highlight = null, valueOffset = 55) {
    this.checkPageBreak(7);
    const col1 = this.marginL;
    const col2 = this.marginL + valueOffset;

    this.setFont("normal", 8);
    this.setColor(...this.C_MED);
    this.text(label, col1, this.y);

    this.setFont("bold", 8);
    if (highlight === "good")       this.setColor(...this.C_GOOD);
    else if (highlight === "warn")  this.setColor(...this.C_WARN);
    else if (highlight === "bad")   this.setColor(...this.C_BAD);
    else                            this.setColor(...this.C_DARK);

    this.text(String(value ?? "—"), col2, this.y);
    this.setColor(0, 0, 0);
    this.y += 5.5;
  }

  summaryMetricPair(leftLabel,leftValue,rightLabel,rightValue,highlight=null){
    const x=this.marginL,w=this.contentW,h=16,gap=8,colW=(w-gap)/2;
    this.checkPageBreak(h+2);
    this.doc.setFillColor(235,238,248);
    this.doc.setDrawColor(...this.C_LIGHT);
    this.doc.setLineWidth(0.2);
    this.doc.roundedRect(x,this.y,w,h,1.5,1.5,'FD');
    const metrics=[[leftLabel,leftValue,x+4],[rightLabel,rightValue,x+colW+gap+4]];
    for(const [label,value,mx] of metrics){
      this.setFont('bold',8.5);this.setColor(...this.C_MED);this.text(label,mx,this.y+5);
      this.setFont('bold',12);if(highlight==='good')this.setColor(...this.C_GOOD);else if(highlight==='warn')this.setColor(...this.C_WARN);else if(highlight==='bad')this.setColor(...this.C_BAD);else this.setColor(...this.C_DARK);
      this.text(String(value??'—'),mx,this.y+11.5);
    }
    this.setColor(0,0,0);this.y+=h+4;
  }

  // Table: headers + rows with word-wrapping cells
  // Row height grows to fit the tallest wrapped cell in that row.
  table(headers, rows, colWidths, highlightedRows = new Set(), options = {}) {
    const lineH     = 3.4;    // line height within a wrapped cell
    const cellPadY  = 1.6;    // top/bottom padding inside a cell
    const cellPadX  = 2;      // left padding
    const x0        = this.marginL;
    let cx;
    const wrapHeaders=!!options.wrapHeaders;
    const headerFontSize=options.headerFontSize||7.5;
    const headerLineH=options.headerLineH||3;
    const wrappedHeaders=headers.map((header,i)=>wrapHeaders
      ? this.doc.splitTextToSize(String(header??""),colWidths[i]-(cellPadX*2))
      : [String(header??"")]);
    const hdrH=wrapHeaders
      ? Math.max(7,Math.max(1,...wrappedHeaders.map(lines=>lines.length))*headerLineH+3.5)
      : 7;

    this.checkPageBreak(hdrH + 10);

    const drawHeader=()=>{
      this.doc.setFillColor(...this.C_MED);
      this.doc.rect(x0, this.y, this.contentW, hdrH, "F");
      this.setFont("bold", headerFontSize);
      this.setColor(...this.C_WHITE);
      cx=x0+cellPadX;
      for(let i=0;i<headers.length;i++){
        const lines=wrappedHeaders[i];
        for(let ln=0;ln<lines.length;ln++) this.text(lines[ln],cx,this.y+2.5+((ln+1)*headerLineH));
        cx+=colWidths[i];
      }
      this.setColor(0,0,0);
      this.y+=hdrH;
    };
    drawHeader();

    // ── Data rows (word-wrap aware) ──────────────────────────
    this.setFont("normal", 7.5);

    rows.forEach((row, ri) => {
      // Pre-wrap each cell and find the tallest
      const wrapped = row.map((cell, i) => {
        const text = String(cell ?? "");
        const maxWidth = colWidths[i] - (cellPadX * 2);
        return this.doc.splitTextToSize(text, maxWidth);
      });

      const maxLines = Math.max(1, ...wrapped.map(w => w.length));
      const rowH     = (maxLines * lineH) + (cellPadY * 2);

      // Page break if this row would overflow; repeat the header for long tables when requested.
      if(this.y+rowH+2>this.pageH-16){
        this.newPage();
        if(options.repeatHeaderOnPageBreak)drawHeader();
      }

      // Zebra background
      if (highlightedRows.has(ri) || ri % 2 === 0) {
        this.doc.setFillColor(...(highlightedRows.has(ri) ? [255, 244, 204] : [235, 238, 248]));
        this.doc.rect(x0, this.y, this.contentW, rowH, "F");
      }

      // Render each cell's lines
      this.setFont("normal", 7.5);
      this.setColor(...this.C_DARK);
      cx = x0 + cellPadX;
      for (let i = 0; i < row.length; i++) {
        const lines = wrapped[i];
        for (let ln = 0; ln < lines.length; ln++) {
          const yLine = this.y + cellPadY + ((ln + 1) * lineH) - 1;
          this.text(lines[ln], cx, yLine);
        }
        cx += colWidths[i];
      }

      this.y += rowH;
    });

    this.hRule(this.y);
    this.y += 4;
  }

  // Small italic note (wraps to content width)
  note(str) {
    this.setFont("italic", 7.5);
    this.setColor(...this.C_MED);
    const lines = this.doc.splitTextToSize(str, this.contentW);
    for (const ln of lines) {
      this.checkPageBreak(6);
      this.text(ln, this.marginL, this.y);
      this.y += 4;
    }
    this.y += 1;
    this.setColor(0, 0, 0);
  }

  spacer(h = 4) {
    this.y += h;
  }


  // ── Section Renderers ────────────────────────────────────────

  drawHeader() {
    const doc = this.doc;
    const s   = this.s;

    // Page background
    this._drawPageBg();

    // Top banner
    doc.setFillColor(...this.C_DARK);
    doc.rect(0, 0, this.pageW, 28, "F");

    // Title
    this.setFont("bold", 16);
    this.setColor(...this.C_WHITE);
    this.text("WEIGHT & BALANCE RECORD", this.marginL, 12);

    // Subtitle
    this.setFont("normal", 9);
    this.setColor(...this.C_LIGHT);
    this.text("CH-149 - 615 Cormorant", this.marginL, 19);

    // Date/time top-right — local and Zulu
    const now      = new Date();
    const localDate = now.toLocaleDateString("en-CA", { year:"numeric", month:"short", day:"2-digit" });
    const localTime = now.toLocaleTimeString("en-CA", { hour:"2-digit", minute:"2-digit", hour12:false });
    const zuluDate  = now.toLocaleDateString("en-CA", { year:"numeric", month:"short", day:"2-digit", timeZone:"UTC" });
    const zuluHH    = String(now.getUTCHours()).padStart(2, "0");
    const zuluMM    = String(now.getUTCMinutes()).padStart(2, "0");
    const zuluTime  = `${zuluHH}:${zuluMM}`;
    this.setFont("bold", 10);
    this.setColor(...this.C_WHITE);
    this.text(`${localDate}  ${localTime} L`, this.pageW - this.marginR, 11, { align:"right" });
    this.setFont("bold", 10);
    this.setColor(...this.C_LIGHT);
    this.text(`${zuluDate}  ${zuluTime} Z`, this.pageW - this.marginR, 20, { align:"right" });

    this.y = 34;

    // Tombstone data row
    const tombstoneH = 20;
    doc.setFillColor(225, 230, 245);
    doc.rect(this.marginL, this.y, this.contentW, tombstoneH, "F");
    doc.setDrawColor(...this.C_LIGHT);
    doc.setLineWidth(0.3);
    doc.rect(this.marginL, this.y, this.contentW, tombstoneH, "S");

    const fields = [
      { label: "TAIL #",       value: this.tail },
      { label: "PRESET",       value: s.preset ? (AC.presets[s.preset]?.name ?? s.preset) : "Custom" },
      { label: "FE (CERTIFY)", value: s.certify?.by ?? "—" },
      { label: "ACCEPTED BY",  value: s.accepted?.by ?? "—" },
    ];

    const colW  = this.contentW / fields.length;
    fields.forEach((f, i) => {
      const fx = this.marginL + i * colW + 4;
      this.setFont("normal", 7);
      this.setColor(...this.C_MED);
      this.text(f.label, fx, this.y + 6);
      this.setFont("bold", 10);
      this.setColor(...this.C_DARK);
      this.text(String(f.value), fx, this.y + 14);
    });

    this.y += tombstoneH + 6;
    this.hRule(this.y);
    this.y += 5;
  }


  drawAcceptance() {
    const s = this.s;
    this.sectionHeader("1 · Acceptance (Logbook Entry)");

    const _accD = s.accepted.at ? new Date(s.accepted.at) : null;
    const atLocal = _accD
      ? _accD.toLocaleString("en-CA", { dateStyle:"medium", timeStyle:"short" }) + " L"
      : "—";
    const atZulu = _accD
      ? (() => {
          const d = _accD.toLocaleDateString("en-CA", { year:"numeric", month:"short", day:"2-digit", timeZone:"UTC" });
          const hh = String(_accD.getUTCHours()).padStart(2, "0");
          const mm = String(_accD.getUTCMinutes()).padStart(2, "0");
          return `${d}  ${hh}:${mm} Z`;
        })()
      : "—";

    this.kvRow("Basic Weight",     `${s.accepted.basicW ?? "—"} kg`);
    this.kvRow("Basic CG",         `${s.accepted.basicCG ?? "—"} mm`);
    const basis = basicWeightBasis(s);
    this.kvRow("Basic Weight Source", basis === "MAINTENANCE" ? "RECORDED AIRCRAFT BASIC WEIGHT" : "RFM BASIC WEIGHT (BETA TESTING)");
    this.note(basis === "MAINTENANCE"
      ? "Basic Weight and CG are taken from the aircraft’s current weighing record in the servicing record set. Role Fit records which listed items are fitted and accounts for items not represented in this recorded value."
      : "Beta testing method: the entered RFM Basic Weight is the analytical starting value. Fitted Role Fit equipment is added to the calculated aircraft total because it is not included in the RFM baseline.");
    this.drawAccountingTrail();
    this.kvRow("Fuel Total from Log", `${s.accepted.fuelLog ?? "—"} kg`);
    this.note("The logged fuel initializes fuel planning and AUW/CG calculations. Fuel is not included in Operating Weight.");
    this.kvRow("Accepted By",      s.accepted.by ?? "—");
    this.kvRow("Accepted at (L)",  atLocal);
    this.kvRow("Accepted at (Z)",  atZulu);
    this.spacer();
  }


  drawMissionConfig() {
    const s = this.s;
    this.sectionHeader("5 · Role Configuration");

    const presetName = s.preset ? (AC.presets[s.preset]?.name ?? s.preset) : "Custom (no preset)";
    const notes      = s.preset ? (AC.presets[s.preset]?.notes ?? "") : "";

    this.kvRow("Preset applied", presetName);
    if (notes) this.note(`Note: ${notes}`);
    this.spacer(2);

    const rfOnCount=Object.keys(AC.roleFit).filter(key=>roleFitIsInstalled(s,key)).length;
    const wb=computeWB(this.tail);
    this.kvRow("Basic Weight source",wb.basicWeightBasis==="MAINTENANCE"?"Recorded Aircraft Basic Weight":"RFM Basic Weight (Beta Testing)");
    this.kvRow("Listed role-fit adjustment",signedAccounting(wb.roleFitAdjustmentW)+" kg");
    this.kvRow("Seat-structure adjustment",signedAccounting(wb.seatStructureAdjustmentW)+" kg");
    this.kvRow("Custom-exception adjustment",signedAccounting(wb.customExceptionW)+" kg");
    this.note("Role Fit equipment fit and accounting: Appendix A. Custom Exception details: Appendix B.");
    if(wb.seatStructureChanges.length) this.table(["Seat structure","Change","Delta kg","Arm mm"],wb.seatStructureChanges.map(x=>[x.name,x.current?"Installed":"Removed",signedAccounting(x.w),String(x.arm)]),[91,32,30,35]);
    this.note(!s.customExceptions.length?"No custom exceptions; confirmation not required.":s.customExceptionsReviewed?"Aircraft documentation review was confirmed for custom exceptions.":"Aircraft documentation review was not confirmed.");
    const seatTotals=computeSeatTotals(s);
    const crewOccupants=Object.keys(s.occupants).filter(k=>s.seats[k]&&s.occupants[k]?.type==='crew').length;
    const paxOccupants=Object.keys(s.occupants).filter(k=>s.seats[k]&&s.occupants[k]?.type==='pax').length;
    this.kvRow("Current occupants", `${Math.round(seatTotals.occupantW)} kg (${crewOccupants} crew, ${paxOccupants} passenger${paxOccupants===1?"":"s"}, ${computePatientTotals(s).count} patients)`);
    this.note(`Role Fit includes ${rfOnCount} items fitted or retained from the accepted record. Appendix A shows expected and selected fit, plus each item’s weight and moment adjustment.`);
    this.spacer();
  }


  drawMissionEquip() {
    const s = this.s;
    const items = missionRows(s);
    if(!items.length && !s.zones?.some(z=>(+z?.w||0)>0))return;
    this.sectionHeader("6 · Mission Equipment");
    const totals = computeMissionTotals(s);
    const equipmentCG=totals.w && Number.isFinite(totals.m)?Math.round(totals.m/totals.w):null;
    this.kvRow("Selected configuration",AC.presets[s.preset]?.name || "Aircraft defaults / custom load");
    this.kvRow("Mission equipment total",fmtDecimal(totals.w)+" kg");
    this.kvRow("Combined equipment CG",equipmentCG==null?"Not applicable — no net equipment weight":equipmentCG+" mm");
    this.note("Actual mission load, including changes made for this flight.");
    this.spacer(2);
    const hasItems = items.length > 0;
    if (!hasItems) {
      this.note("No loadable mission equipment.");
    }
    // Group order — items whose group doesn't match any bucket go into Other
    const GROUP_ORDER = missionGroupNames().map(label=>({label,match:g=>g===label})).concat([{label:'Other',match:()=>true}]);

    // Assign each item to the first matching bucket
    const buckets = GROUP_ORDER.map(b => ({ label: b.label, rows: [] }));
    for (const it of items) {
      const g = it.group || "";
      let placed = false;
      for (let i = 0; i < GROUP_ORDER.length - 1; i++) {
        if (GROUP_ORDER[i].match(g)) {
          buckets[i].rows.push(it);
          placed = true;
          break;
        }
      }
      if (!placed) buckets[buckets.length - 1].rows.push(it); // Other
    }

    const headers   = ["Item", "Weight", "Arm", "Stowage"];
    const colWidths = [92, 18, 20, 58];

    for (const bucket of buckets) {
      if (bucket.rows.length === 0) continue;
      this.checkPageBreak(12);
      this.setFont("bold", 8);
      this.setColor(...this.C_MED);
      this.text(bucket.label.toUpperCase(), this.marginL, this.y);
      this.y += 5;
      this.table(
        headers,
        bucket.rows.map(it => [it.name+` (${it.quantity} x ${it.unitWeight} kg)`, `${fmtDecimal(it.w)} kg`, `${it.arm??"?"} mm`, it.stow]),
        colWidths
      );
    }

    // ----- Stowage Summary: load held in each stowage location -----
    // Sum the weight of ON mission items by their stow ID, then report
    // each load-planning location with its loaded weight, max, and status.
    const occupied = {};
    for (const it of items){
      if(it.stowId && it.w>0) occupied[it.stowId]=(occupied[it.stowId]||0)+it.w;
    }
    // Add any manual Load-Planning weight entered against a stow location
    for (const z of (s.zones || [])){
      if (!z || !z.id) continue;
      const zw = +z.w || 0;
      if (zw <= 0) continue;
      occupied[z.id] = (occupied[z.id] || 0) + zw;
    }

    const stowDefs = (typeof getLoadStowages === "function") ? getLoadStowages() : [];
    const stowRows = stowDefs
      .map(def => {
        const loaded = Math.round(occupied[def.id] || 0);
        const over = loaded > (+def.max || 0);
        return { def, loaded, over };
      })
      .filter(r => r.loaded > 0)   // only show locations that hold something
      .map(r => [
        r.def.label,
        `${r.loaded} kg`,
        `${r.def.max} kg`,
        r.over ? "OVER" : "OK"
      ]);

    if (stowRows.length){
      this.checkPageBreak(16);
      this.setFont("bold", 8);
      this.setColor(...this.C_MED);
      this.text("STOWAGE LIMIT CHECK (BY LOCATION)", this.marginL, this.y);
      this.y += 4;
      this.note("Verification only — these weights are already included in the mission equipment totals above and are NOT added again. This table confirms each stowage location is within its capacity limit.");
      this.table(
        ["Stowage Location", "Stowed", "Limit", "Status"],
        stowRows,
        [92, 22, 22, 30]
      );
    }

    this.spacer();
  }


  drawSeats() {
    const s = this.s;
    this.sectionHeader("7 · Crew, Passenger Seats & Patients");

    // Occupant standard weights (per RFM): crew 90.7 kg, pax 90.00 kg
    const crewW = 90.7;
    const paxW  = 90.0;

    const kg = (n) => `${fmtDecimal(n)} kg`;
    const seatApplied = (k,it) => {
      if (it.includedInRfmBasic) return 0;
      const current=!!s.seats[k];
      const baseline=basicWeightBasis(s)==="MAINTENANCE" ? !!s.accepted.maintenanceBaseline?.seats?.[k] : false;
      return (Number(current)-Number(baseline))*it.wSeat;
    };

    // Crew
    const crewRows = Object.entries(AC.crewSeats)
      .filter(([k]) => s.seats[k])
      .map(([k, it]) => {
        const occupied = !!s.occupants?.[k];
        return [
          it.name,
          `${it.arm} mm`,
          it.includedInRfmBasic ? "Included in BW" : kg(seatApplied(k,it)),
          occupied ? kg(crewW)+" @ "+(it.occupantArm ?? it.arm)+" mm" : "vacant",
          kg(seatApplied(k,it)+(occupied?crewW:0))
        ];
      });

    // Pax
    const paxRows = Object.entries(AC.paxSeats)
      .filter(([k]) => s.seats[k])
      .map(([k, it]) => {
        const occupied = !!s.occupants?.[k];
        return [
          it.name,
          `${it.arm} mm`,
          kg(seatApplied(k,it)),
          occupied ? kg(s.occupants[k].type==='crew'?crewW:paxW)+(s.occupants[k].type==='crew'?' (crew)':'') : "vacant",
          kg(seatApplied(k,it)+(occupied?(s.occupants[k].type==='crew'?crewW:paxW):0))
        ];
      });

    const headers  = ["Seat", "Seat Arm", "Seat Applied", "Occupant / Arm", "Total Applied"];
    const colWidths = [62, 25, 25, 48, 28];

    if (crewRows.length) {
      this.setFont("bold", 8);
      this.setColor(...this.C_DARK);
      this.text("Crew:", this.marginL, this.y);
      this.y += 5;
      this.table(headers, crewRows, colWidths);
    }

    if (paxRows.length) {
      this.setFont("bold", 8);
      this.setColor(...this.C_DARK);
      this.text("Passengers:", this.marginL, this.y);
      this.y += 5;
      this.table(headers, paxRows, colWidths);
    }

    const patients=patientRows(s).filter(row=>row.available||row.occupied);
    if(patients.length){
      this.spacer(2);this.kvRow('Patients',String(computePatientTotals(s).count));
      this.table(['Patient position','Arm mm','Occupancy','Applied kg'],patients.map(row=>[row.name,String(row.arm),row.occupied?'Occupied':'Empty',row.occupied?fmtDecimal(row.weight):'0']),[78,30,45,35]);
    }
    if (!crewRows.length && !paxRows.length) {
      this.note("No seats installed.");
    }
    this.spacer();
  }


  drawFuel() {
    const s  = this.s;
    const wb = this.wb;
    this.sectionHeader("2 · Fuel");

    this.kvRow("Total fuel (departure)", `${wb.fuelTotal} kg`);
    this.kvRow("Landing reserve",        `${s.fuel?.landing ?? 300} kg`);
    this.kvRow("Burn (est.)",            `${Math.max(0, wb.fuelTotal - (s.fuel?.landing ?? 300))} kg`);
    this.spacer(2);

    // Tank breakdown
    const tanks = wb.fuelTanks || {};
    const fuelWeight=Object.values(tanks).reduce((sum,w)=>sum+w,0);
    const fuelMoment=Object.entries(tanks).reduce((sum,[key,w])=>sum+w*AC.fuelTankArms[key],0);
    this.kvRow("Fuel distribution",s.fuel.manualTanks?"Manual tank entries":"RFM mapped distribution");
    this.kvRow("Combined fuel CG",fuelWeight>0?fmtDecimal(Math.round(fuelMoment/fuelWeight))+" mm":"Not applicable — no fuel");
    const tankBays={T1:6,T2:3,T3:2,T4:1,T5:4};
    const tankRows = Object.entries(AC.fuelTankArms).map(([k, arm]) => [
      `${k} · Bay ${tankBays[k]}`,
      `${arm} mm`,
      `${tanks[k] ?? 0} kg`
    ]);

    this.setFont("bold", 8);
    this.setColor(...this.C_DARK);
    this.text("Tank Distribution:", this.marginL, this.y);
    this.y += 5;
    this.table(["Tank", "Arm", "Contents"], tankRows, [40, 40, 40]);
    this.spacer();
  }


  drawLoadPlanning() {
    const s = this.s;
    this.sectionHeader("8 · Load Planning");

    // Bay loads
    const bays    = s.bays || {};
    const bayRows = Object.entries(AC.bayArms)
      .filter(([k]) => (bays[k] ?? 0) > 0)
      .map(([k, arm]) => [k==='REAR'?'Rear Area (Ramp Area)':k, `${arm} mm`, `${bays[k]} kg`]);

    // MCDU Cargo entries
    const cargoRows = (s.cargo || [])
      .map((c, i) => [`Cargo ${i+1}`, `${c.arm ?? 0} mm`, `${c.w ?? 0} kg`])
      .filter(r => parseFloat(r[2]) > 0);

    // Stowage loads — resolve label + arm from Section 7 (getLoadStowages)
    const _stowDefs = (typeof getLoadStowages === "function") ? getLoadStowages() : [];
    const zoneRows = (s.zones || [])
      .filter(z => (z?.w ?? 0) > 0)
      .map(z => {
        const def = _stowDefs.find(d => d.id === z.id) || null;
        const label = def ? def.label : (z.id || "—");
        const arm   = def ? def.arm   : 0;
        return [label, `${arm} mm`, `${z.w} kg`];
      });

    if (!bayRows.length && !cargoRows.length && !zoneRows.length) {
      this.note("No additional loads entered in Load Planning.");
    } else {
      const headers  = ["Location", "Arm", "Weight"];
      const colWidths = [100, 40, 48];

      if (bayRows.length) {
        this.setFont("bold", 8);
        this.setColor(...this.C_DARK);
        this.text("Bay Loads:", this.marginL, this.y);
        this.y += 5;
        this.table(headers, bayRows, colWidths);
      }
      if (cargoRows.length) {
        this.setFont("bold", 8);
        this.setColor(...this.C_DARK);
        this.text("MCDU Cargo:", this.marginL, this.y);
        this.y += 5;
        this.table(headers, cargoRows, colWidths);
      }
      if (zoneRows.length) {
        this.setFont("bold", 8);
        this.setColor(...this.C_DARK);
        this.text("Stowage Loads (Load Planning):", this.marginL, this.y);
        this.y += 5;
        this.table(headers, zoneRows, colWidths);
      }
    }
    this.spacer();
  }


  drawWBSummary() {
    const wb  = this.wb;
    const s   = this.s;
    this.checkPageBreak(65);
    this.sectionHeader("3 · Weight & Balance Summary");

    // ── Calculated vs MCDU discrepancy check ────────────────────
    // Tolerances match the certify-gate thresholds in app.js.
    const TOL = { auw: 100, cg: 20, fuel: 100 };
    const mcdu = s.certify?.mcdu || null;

    const discrepancy = mcdu ? {
      auw:  { calc: wb.auw,       mcdu: +mcdu.auw,  tol: TOL.auw,  unit: "kg" },
      cg:   { calc: wb.auwCG,     mcdu: +mcdu.cg,   tol: TOL.cg,   unit: "mm" },
      fuel: { calc: wb.fuelTotal, mcdu: +mcdu.fuel, tol: TOL.fuel, unit: "kg" }
    } : null;

    const statusForRow = (row) => {
      const diff = Math.abs(row.calc - row.mcdu);
      if (diff === 0)       return { level: "good", word: "MATCH" };
      if (diff <= row.tol)  return { level: "warn", word: "WITHIN TOL" };
      return                       { level: "bad",  word: "EXCEEDS TOL" };
    };

    if (discrepancy) {
      const auwS  = statusForRow(discrepancy.auw);
      const cgS   = statusForRow(discrepancy.cg);
      const fuelS = statusForRow(discrepancy.fuel);

      // Roll up to a single worst-case level for the banner
      const worst =
        (auwS.level === "bad" || cgS.level === "bad" || fuelS.level === "bad")    ? "bad"  :
        (auwS.level === "warn"|| cgS.level === "warn"|| fuelS.level === "warn")   ? "warn" :
                                                                                    "good";

      if (worst === "good") {
        this.alertBanner("good", "MCDU cross-check: all values match calculated", null);
      } else if (worst === "warn") {
        this.alertBanner(
          "warn",
          "MCDU cross-check: minor discrepancies within tolerance",
          `Tolerances — AUW ±${TOL.auw} kg · CG ±${TOL.cg} mm · Fuel ±${TOL.fuel} kg. Review table below.`
        );
      } else {
        this.alertBanner(
          "bad",
          "MCDU CROSS-CHECK: DISCREPANCY EXCEEDS TOLERANCE",
          `One or more values differ beyond the certification tolerance. Review table below.`
        );
      }
      this.spacer(1);
    }

    const envStatus  = wb.flags.envOk ? "WITHIN ENVELOPE" : "OUT OF ENVELOPE";
    const envHl      = wb.flags.envOk ? "good" : "bad";
    const cgStatus   = wb.flags.hardCgOk ? "PASS" : "FAIL";
    const cgHl       = wb.flags.hardCgOk ? "good" : "bad";
    const auwStatus  = wb.flags.overweightAirborne ? "OVER WEIGHT" : (wb.flags.altGross ? "ALTERNATE GROSS WEIGHT" : "OK");
    const auwHl      = wb.flags.overweightAirborne ? "bad" : (wb.flags.altGross ? "warn" : "good");

    const missionTotals = computeMissionTotals(s);
    const seatTotals = computeSeatTotals(s);
    const crewOccupants = Object.keys(s.occupants).filter(k=>s.seats[k]&&s.occupants[k]?.type==='crew').length;
    const paxOccupants = Object.keys(s.occupants).filter(k=>s.seats[k]&&s.occupants[k]?.type==='pax').length;
    const missionCG = missionTotals.w ? Math.round(missionTotals.m / missionTotals.w) : null;
    const occupantCG = seatTotals.occupantW ? Math.round(seatTotals.occupantM / seatTotals.occupantW) : null;
    const signed = v => signedAccounting(v)+" kg";

    this.kvRow("Basic Weight & CG", `${s.accepted.basicW ?? "—"} kg @ ${s.accepted.basicCG ?? "—"} mm · ${wb.basicWeightBasis === "MAINTENANCE" ? "Recorded Aircraft Basic Weight" : "RFM Basic Weight (Beta Testing)"}`);
    this.kvRow("Role-Fit Adjustment to Basic Weight", signed(wb.roleEquipmentAdjustmentW), null, 82);
    this.note(`Role-Fit Equipment: ${signed(wb.roleFitAdjustmentW)} · Seat Structures: ${signed(wb.seatStructureAdjustmentW)}.`);
    this.kvRow("Custom Exceptions", signed(wb.customExceptionW));
    this.note("All seats except C1 and C2 pilot seats are defined as role-fit equipment in the RFM. Seat structures are shown separately here for W&B accounting.");
    this.kvRow("Mission Equipment", `${signed(missionTotals.w)}${missionCG == null ? "" : ` @ ${missionCG} mm`}`);
    this.kvRow("Occupants", `${signed(seatTotals.occupantW)}${occupantCG == null ? "" : ` @ ${occupantCG} mm`} (${crewOccupants} crew, ${paxOccupants} passenger${paxOccupants===1?"":"s"}, ${computePatientTotals(s).count} patients)`);
    this.spacer(1);
    if(wb.zonesTotal)this.kvRow("Additional Stowage Load",signed(wb.zonesTotal));
    this.summaryMetricPair("Operating Weight",`${wb.opW} kg`,"CG",`${wb.opCG} mm`);
    // Tactical payload — layered on top of OW (not part of Operating Weight).
    this.kvRow("Bay Loads",            `${wb.bayTotal ?? 0} kg`);
    this.kvRow("Cargo",                `${wb.cargoTotal ?? 0} kg`);
    this.kvRow("Fuel (departure)",     `${wb.fuelTotal} kg`);
    this.spacer(1);
    this.summaryMetricPair("AUW",`${wb.auw} kg`,"CG",`${wb.auwCG} mm`,auwHl);
    this.kvRow("CG Band",              wb.cgBand);
    this.spacer(1);
    this.kvRow("CG Hard Limits",       cgStatus,         cgHl);
    this.kvRow("Envelope",             envStatus,        envHl);
    // Alt envelope: highlight both rows yellow — aircraft is legal but in expanded limits
    const inAlt      = wb.flags.inAlt;
    const inMain     = wb.flags.inMain;
    const mainHl     = inAlt ? "warn" : null;          // yellow NO when alt is active
    const altHl      = inAlt ? "warn" : null;           // yellow YES when alt is active
    this.kvRow("In Main Envelope",  inMain ? "YES" : "NO",  mainHl);
    this.kvRow("In Alt Envelope",   inAlt  ? "YES" : "NO",  altHl);
    this.kvRow("AUW Check",            auwStatus,        auwHl);

    // ── Landing condition + burn track check ──
    if (typeof computeBurnTrack === "function") {
      const track = computeBurnTrack(this.tail);
      if (this.s.fuel) {
        const land = computeLandingPoint(this.tail);

        const inPoly = (pt, poly) => {
          let inside = false;
          for (let i=0, j=poly.length-1; i<poly.length; j=i++){
            const xi = poly[i].cg, yi = poly[i].w;
            const xj = poly[j].cg, yj = poly[j].w;
            const hit = ((yi > pt.w) !== (yj > pt.w)) &&
              (pt.cg < (xj-xi)*(pt.w-yi)/((yj-yi) || 1e-9) + xi);
            if (hit) inside = !inside;
          }
          return inside;
        };
        const inEnv = (pt) => inPoly(pt, AC.envelope.envMain) || inPoly(pt, AC.envelope.envAlt);

        const landOk  = inEnv(land);
        const trackOk = track.every(p => inEnv(p));

        this.spacer(2);
        this.setFont("bold", 8);
        this.setColor(...this.C_DARK);
        this.text("Landing Condition:", this.marginL, this.y);
        this.y += 5;
        this.kvRow("Fuel at landing",   `${land.fuel} kg`);
        this.summaryMetricPair("Landing Weight",`${land.w} kg`,"CG",`${land.cg} mm`);
        this.kvRow("Landing Envelope",
                   landOk ? "WITHIN" : "OUT",
                   landOk ? "good" : "bad");
        if(!this.s.fuel.manualTanks) this.kvRow("Burn Track",
                   trackOk ? "ALL IN ENVELOPE" : "EXCEEDS ENVELOPE",
                   trackOk ? "good" : "bad");
      }
    }

    if (discrepancy) {
      this.spacer(2);
      this.setFont("bold", 8);
      this.setColor(...this.C_DARK);
      this.text("Calculated vs MCDU Cross-Check:", this.marginL, this.y);
      this.y += 5;

      const rows = [
        { label: "AUW",  ...discrepancy.auw,  status: statusForRow(discrepancy.auw)  },
        { label: "CG",   ...discrepancy.cg,   status: statusForRow(discrepancy.cg)   },
        { label: "Fuel", ...discrepancy.fuel, status: statusForRow(discrepancy.fuel) }
      ];

      // Column layout (4 cols: Parameter | Calculated | MCDU | Difference | Status)
      const x0    = this.marginL;
      const hdrH  = 7;
      const rowH  = 6.5;
      const cols  = [
        { key: "label",   w: 28 },
        { key: "calc",    w: 38, align: "right", unit: true },
        { key: "mcdu",    w: 38, align: "right", unit: true },
        { key: "diff",    w: 38, align: "right" },
        { key: "status",  w: 46 }
      ];

      // Header
      this.checkPageBreak(hdrH + rowH * 3 + 4);
      this.doc.setFillColor(...this.C_MED);
      this.doc.rect(x0, this.y, this.contentW, hdrH, "F");
      this.setFont("bold", 7.5);
      this.setColor(...this.C_WHITE);
      const headers = ["Parameter", "Calculated", "MCDU", "Difference", "Status"];
      let cx = x0;
      headers.forEach((h, i) => {
        const col = cols[i];
        const tx  = col.align === "right" ? cx + col.w - 2 : cx + 2;
        this.text(h, tx, this.y + 5, col.align === "right" ? { align: "right" } : {});
        cx += col.w;
      });
      this.y += hdrH;

      // Data rows — each colored by its own status
      rows.forEach(r => {
        const tintMap = {
          good: [235, 248, 238],
          warn: [254, 246, 220],
          bad:  [250, 228, 228]
        };
        const txtMap = {
          good: this.C_GOOD,
          warn: this.C_WARN,
          bad:  this.C_BAD
        };

        const diff     = r.calc - r.mcdu;          // signed
        const diffStr  = (diff > 0 ? "+" : "") + diff + " " + r.unit;
        const calcStr  = r.calc + " " + r.unit;
        const mcduStr  = r.mcdu + " " + r.unit;

        // Row background
        this.doc.setFillColor(...tintMap[r.status.level]);
        this.doc.rect(x0, this.y, this.contentW, rowH, "F");

        // Left accent stripe
        this.doc.setFillColor(...txtMap[r.status.level]);
        this.doc.rect(x0, this.y, 1.5, rowH, "F");

        // Row text
        this.setFont("bold", 7.5);
        this.setColor(...this.C_DARK);
        this.text(r.label, x0 + 3, this.y + 4.5);

        this.setFont("normal", 7.5);
        this.text(calcStr, x0 + cols[0].w + cols[1].w - 2, this.y + 4.5, { align: "right" });
        this.text(mcduStr, x0 + cols[0].w + cols[1].w + cols[2].w - 2, this.y + 4.5, { align: "right" });

        // Difference in status color + bold if exceeds tol
        this.setFont(r.status.level === "bad" ? "bold" : "normal", 7.5);
        this.setColor(...txtMap[r.status.level]);
        this.text(diffStr, x0 + cols[0].w + cols[1].w + cols[2].w + cols[3].w - 2, this.y + 4.5, { align: "right" });

        // Status label
        this.setFont("bold", 7.5);
        this.setColor(...txtMap[r.status.level]);
        this.text(r.status.word, x0 + cols[0].w + cols[1].w + cols[2].w + cols[3].w + 2, this.y + 4.5);

        this.setColor(0, 0, 0);
        this.y += rowH;
      });

      this.hRule(this.y);
      this.y += 4;

      this.setFont("italic", 7);
      this.setColor(...this.C_MED);
      this.text(
        `Tolerances: AUW ±${TOL.auw} kg · CG ±${TOL.cg} mm · Fuel ±${TOL.fuel} kg`,
        this.marginL, this.y
      );
      this.setColor(0, 0, 0);
      this.y += 5;
    }
    this.spacer();
  }


  drawEnvelopePlot() {
    this.checkPageBreak(100);
    this.sectionHeader("4 · CG Envelope Plot");

    const wb      = this.wb;
    const plotX   = this.marginL;
    const plotY   = this.y;
    const plotW   = this.contentW;
    const plotH   = 85;
    const doc     = this.doc;

    // Background
    doc.setFillColor(245, 247, 252);
    doc.rect(plotX, plotY, plotW, plotH, "F");
    doc.setDrawColor(...this.C_LIGHT);
    doc.setLineWidth(0.3);
    doc.rect(plotX, plotY, plotW, plotH, "S");

    // Envelope data
    const envMain = AC.envelope.envMain;
    const envAlt  = AC.envelope.envAlt;

    // Match the screen's fixed RFM-style scales; use config vertices unchanged.
    const cgMin = 7800;
    const cgMax = 8600;
    const wMin = 9000;
    const wMax = 16500;

    const pad = { l: 18, r: 8, t: 14, b: 18 };
    const innerW = plotW - pad.l - pad.r;
    const innerH = plotH - pad.t - pad.b;

    const toX = (cg) => plotX + pad.l + ((cg - cgMin) / (cgMax - cgMin)) * innerW;
    const toY = (w)  => plotY + pad.t + innerH - ((w - wMin)  / (wMax  - wMin))  * innerH;

    // Grid lines (light)
    doc.setDrawColor(210, 215, 230);
    doc.setLineWidth(0.15);

    // Vertical grid (CG)
    const cgStep = 50;
    for (let cg = Math.ceil(cgMin/cgStep)*cgStep; cg <= cgMax; cg += cgStep) {
      const x = toX(cg);
      doc.setLineWidth(cg % 100 === 0 ? 0.15 : 0.08);
      doc.line(x, plotY + pad.t, x, plotY + pad.t + innerH);
      this.setFont("normal", 6);
      this.setColor(130, 140, 160);
      if (cg % 100 === 0) doc.text(String(cg), x, plotY + pad.t + innerH + 4, { align: "center" });
    }

    // Horizontal grid (weight)
    const wStep = 500;
    for (let w = Math.ceil(wMin/wStep)*wStep; w <= wMax; w += wStep) {
      const y = toY(w);
      doc.setLineWidth(w % 1000 === 0 ? 0.15 : 0.08);
      doc.line(plotX + pad.l, y, plotX + pad.l + innerW, y);
      this.setFont("normal", 6);
      this.setColor(130, 140, 160);
      if (w % 1000 === 0) doc.text(String(w), plotX + pad.l - 1, y + 1.5, { align: "right" });
    }

    // Outline the exact config polygon so the reference grid stays visible.
    const mainPts = envMain.map(p => [toX(p.cg), toY(p.w)]);

    // Stroke
    doc.setDrawColor(60, 120, 200);
    doc.setLineWidth(0.6);
    doc.moveTo(mainPts[0][0], mainPts[0][1]);
    mainPts.slice(1).forEach(([x, y]) => doc.lineTo(x, y));
    doc.close();
    doc.stroke();

    // Draw alt envelope polygon
    if (envAlt && envAlt.length) {
      const altPts = envAlt.map(p => [toX(p.cg), toY(p.w)]);
      doc.setDrawColor(180, 120, 0);
      doc.setLineWidth(0.4);
      doc.moveTo(altPts[0][0], altPts[0][1]);
      altPts.slice(1).forEach(([x, y]) => doc.lineTo(x, y));
      doc.close();
      doc.stroke();
    }

    // ── Burn track (departure → landing) ──────────────────────
    // Uses computeBurnTrack() so the curve reflects actual tank
    // distribution at each fuel level, not a straight line.
    const track = (typeof computeBurnTrack === "function")
      ? computeBurnTrack(this.tail)
      : [];

    // Point-in-polygon helper for envelope check
    const inPoly = (pt, poly) => {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i].cg, yi = poly[i].w;
        const xj = poly[j].cg, yj = poly[j].w;
        const intersect = ((yi > pt.w) !== (yj > pt.w)) &&
          (pt.cg < (xj - xi) * (pt.w - yi) / ((yj - yi) || 1e-9) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    };

    const ptInEnvelope = (pt) =>
      inPoly(pt, AC.envelope.envMain) || inPoly(pt, AC.envelope.envAlt);

    if (!this.s.fuel.manualTanks && track.length > 1) {
      doc.setLineWidth(0.8);
      for (let i = 1; i < track.length; i++) {
        const a = track[i - 1];
        const b = track[i];
        const ok = ptInEnvelope(a) && ptInEnvelope(b);
        const col = ok ? this.C_GOOD : this.C_BAD;
        doc.setDrawColor(...col);
        doc.line(toX(a.cg), toY(a.w), toX(b.cg), toY(b.w));
      }
    }

    // ── Landing point ──
    const landPt = computeLandingPoint(this.tail);
    if (landPt) {
      const lx = toX(landPt.cg);
      const ly = toY(landPt.w);
      const landOk = ptInEnvelope(landPt);
      const landColor = landOk ? [80, 140, 220] : this.C_BAD;

      // Fine crosshairs and a white-ringed center make the exact plotted
      // coordinate easier to identify over the grid and burn track.
      doc.setDrawColor(...landColor);
      doc.setLineWidth(0.25);
      doc.line(lx - 4, ly, lx + 4, ly);
      doc.line(lx, ly - 4, lx, ly + 4);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(255, 255, 255);
      doc.circle(lx, ly, 2.2, "FD");
      doc.setFillColor(...landColor);
      doc.setDrawColor(...landColor);
      doc.circle(lx, ly, 1.1, "F");

      const landValue = `${landPt.w} kg / ${landPt.cg} mm`;
      this.setFont("bold", 6.5);
      const landTitleW = doc.getTextWidth("Landing");
      this.setFont("normal", 6.5);
      const landValueW = doc.getTextWidth(landValue);
      const landTextW = Math.max(landTitleW, landValueW);
      // Place left and below the marker, with a white backing to mask the track.
      const landTextX = Math.max(plotX + pad.l + 2, lx - landTextW - 7);
      const landTextY = Math.min(plotY + pad.t + innerH - 2, ly + 6);
      doc.setFillColor(255, 255, 255);
      doc.rect(landTextX - 1, landTextY - 4.5, landTextW + 2, 8, "F");
      this.setFont("bold", 6.5);
      this.setColor(...landColor);
      doc.text("Landing", landTextX, landTextY - 1);
      this.setFont("normal", 6.5);
      doc.text(landValue, landTextX, landTextY + 2.5);
    }

    // Plot the aircraft point (DEPARTURE)
    const ptX = toX(wb.auwCG);
    const ptY = toY(wb.auw);
    const ptColor = wb.flags.envOk ? this.C_GOOD : this.C_BAD;

    // Fine crosshairs and a white-ringed center make the exact plotted
    // coordinate easier to identify over the grid and burn track.
    doc.setLineWidth(0.25);
    doc.setDrawColor(...ptColor);
    doc.line(ptX - 4, ptY, ptX + 4, ptY);
    doc.line(ptX, ptY - 4, ptX, ptY + 4);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(255, 255, 255);
    doc.circle(ptX, ptY, 2.6, "FD");
    doc.setFillColor(...ptColor);
    doc.setDrawColor(...ptColor);
    doc.circle(ptX, ptY, 1.4, "F");

    // Takeoff label, placed above and right of the marker with an opaque backing.
    const takeoffValue = `${wb.auw} kg / ${wb.auwCG} mm`;
    this.setFont("bold", 7);
    const takeoffTitleW = doc.getTextWidth("Takeoff");
    this.setFont("normal", 6.5);
    const takeoffValueW = doc.getTextWidth(takeoffValue);
    const takeoffTextW = Math.max(takeoffTitleW, takeoffValueW);
    let takeoffTextX = ptX + 6;
    if (takeoffTextX + takeoffTextW > plotX + pad.l + innerW - 2) takeoffTextX = ptX - takeoffTextW - 6;
    const takeoffTextY = Math.max(plotY + pad.t + 5, ptY - 5);
    doc.setFillColor(255, 255, 255);
    doc.rect(takeoffTextX - 1, takeoffTextY - 4, takeoffTextW + 2, 8, "F");
    this.setFont("bold", 7);
    this.setColor(...ptColor);
    doc.text("Takeoff", takeoffTextX, takeoffTextY - 1);
    this.setFont("normal", 6.5);
    doc.text(takeoffValue, takeoffTextX, takeoffTextY + 2.5);

    // ── Burn track legend (bottom-left of plot) ──
    const legX = plotX + pad.l + 2;
    const legY = plotY + plotH - 6;
    this.setFont("normal", 6);
    this.setColor(...this.C_MED);
    if(!this.s.fuel.manualTanks){
      doc.setDrawColor(...this.C_GOOD);doc.setLineWidth(0.8);doc.line(legX,legY,legX+6,legY);
      doc.text('Burn track (green = in envelope, red = out)',legX+8,legY+1.5);
    }else doc.text('Manual fuel: departure entered; landing mapped. No predicted path.',legX,legY+1.5);


    // Axis labels
    this.setFont("bold", 7);
    this.setColor(...this.C_MED);
    doc.text("CG (mm)", plotX + pad.l + innerW / 2, plotY + plotH - 9, { align: "center" });
    doc.text("AUW (kg)", plotX + 4, plotY + pad.t + innerH / 2, { angle: 90, align: "center" });

    // Envelope result badge
    const badgeColor = wb.flags.envOk ? this.C_GOOD : this.C_BAD;
    const badgeText  = wb.flags.envOk ? "WITHIN ENVELOPE" : "OUT OF ENVELOPE";
    doc.setFillColor(...badgeColor);
    doc.roundedRect(plotX + plotW - 52, plotY + 4, 48, 8, 2, 2, "F");
    this.setFont("bold", 7.5);
    this.setColor(...this.C_WHITE);
    doc.text(badgeText, plotX + plotW - 28, plotY + 9.5, { align: "center" });

    this.y = plotY + plotH + 6;
    if(this.s.fuel.manualTanks)this.note(MANUAL_FUEL_ADVISORY);
    this.spacer();
  }


  drawRoleFitAppendix() {
    const s=this.s;
    const rows=roleFitAccountingRows(s)
      .filter(row=>row.current||row.w!==0||row.m!==0||roleFitExpectation(s,row.key).installed)
      .map(row=>{
        const expected=roleFitExpectation(s,row.key);
        // A missing item expected by the selected role is shown as the change
        // from that role's fitted configuration. This is report-only; W&B totals
        // continue to use the actual fitted state and accepted basic weight.
        if(!row.current&&expected.installed&&!row.locked&&!row.custom&&row.w===0&&row.m===0)
          return {...row,reportW:-row.itemW,reportM:-row.itemW*row.arm};
        return {...row,reportW:row.w,reportM:row.m};
      })
      .sort((a,b)=>a.name.localeCompare(b.name));
    if(!rows.length)return;
    this.newPage();this.sectionHeader("Appendix A · Role Fit Equipment Summary");

    this.note("Expected Role Fit shows the selected role’s configuration. Fitted equipment and missing equipment expected for that role are listed; unrelated unfitted equipment with no W&B effect is omitted. Ordinary deltas show adjustments to the accepted aircraft basic weight. A missing role-expected item shows the negative difference from its expected fitted state; that report value is not applied a second time. Calculated totals use actual fitted equipment.");
    this.table(
      ["Role Fit item","Expected Role Fit","Selected Role Fit","Item weight (kg)","Arm (mm)","Weight delta (kg)","Moment delta (kg·mm)"],
      rows.map(x=>[x.name,expectedRoleFitLabel(s,x.key),selectedRoleFitLabel(x),fmtDecimal(x.itemW),fmtDecimal(x.arm),signedAccounting(x.reportW),signedAccounting(x.reportM)]),
      [40,30,42,20,14,20,22],
      new Set(rows.flatMap((x,i)=>(x.reportW!==0||x.reportM!==0)?[i]:[])),
      {wrapHeaders:true,headerFontSize:6.5,headerLineH:2.8,repeatHeaderOnPageBreak:true}
    );
    this.spacer();
  }

  drawAccountingTrail() {
    this.spacer(2);
    this.note("Role Fit and mission equipment adjustments are applied when calculating the aircraft total from the accepted starting weight. See Role Configuration for adjustment totals, Appendix A for Role Fit equipment and accounting, and Appendix B for Custom Exceptions.");
  }


  drawCustomExceptionsAppendix() {
    this.newPage();this.sectionHeader("Appendix B · Custom Exceptions");
    this.note("Custom Exceptions record documented, aircraft-specific equipment adjustments outside the standard Role Fit list. An adjustment can add or subtract weight from the calculation. Each entry shows its weight, arm, and source when recorded; any linked Role Fit equipment is shown to prevent double-counting.");
    this.note(!this.s.customExceptions.length?"No custom exceptions; confirmation not required.":this.s.customExceptionsReviewed?"Current aircraft documentation review confirmed.":"Aircraft documentation review not confirmed.");
    const rows=customExceptionAccountingRows(this.s);
    if(!rows.length){this.note("No custom exceptions recorded.");return;}
    for(const x of rows){
      this.checkPageBreak(55);
      this.kvRow("Custom exception",x.description||"Unnamed");
      if(x.source)this.kvRow("Reference",x.source);
      if(x.roleFitKeys?.length)this.kvRow("Linked role-fit items",x.roleFitKeys.map(key=>AC.roleFit[key]?.name||key).join(', '));
      else if(x.key)this.kvRow("Linked role-fit item",AC.roleFit[x.key]?.name||x.key);
      this.kvRow("Treatment",x.accounting==='ACCOUNTED'?"Already included in selected value — no adjustment":"Apply adjustment to calculated aircraft total");
      this.table(
        ["Exception item weight (kg)","Arm (mm)","Applied weight change (kg)","Applied moment change (kg·mm)"],
        [[fmtDecimal(x.inputW),fmtDecimal(x.arm),signedAccounting(x.w),signedAccounting(x.m)]],
        [46,26,58,58],
        new Set(),
        {wrapHeaders:true,headerFontSize:7,headerLineH:3}
      );
      this.spacer(3);
    }
  }

  drawCertification() {
    const s  = this.s;
    this.checkPageBreak(45);
    this.sectionHeader("9 · Certification");

    const _cerD = s.certify?.at ? new Date(s.certify.at) : null;
    const certAtLocal = _cerD
      ? _cerD.toLocaleString("en-CA", { dateStyle:"medium", timeStyle:"short" }) + " L"
      : "—";
    const certAtZulu = _cerD
      ? (() => {
          const d = _cerD.toLocaleDateString("en-CA", { year:"numeric", month:"short", day:"2-digit", timeZone:"UTC" });
          const hh = String(_cerD.getUTCHours()).padStart(2, "0");
          const mm = String(_cerD.getUTCMinutes()).padStart(2, "0");
          return `${d}  ${hh}:${mm} Z`;
        })()
      : "—";

    this.kvRow("Certified By", s.certify?.by ?? "—");
    this.kvRow("Certified at (L)",        certAtLocal);
    this.kvRow("Certified at (Z)",        certAtZulu);
    this.spacer(3);

    // Footer
    this.hRule(this.y);
    this.y += 5;
    const footNow  = new Date();
    const footDate = footNow.toISOString().slice(0, 10);
    const footHH   = String(footNow.getUTCHours()).padStart(2, "0");
    const footMM   = String(footNow.getUTCMinutes()).padStart(2, "0");
    // Line 1: document identity — bold
    this.setFont("bold", 8);
    this.setColor(...this.C_DARK);
    this.text(
      `CH-149 - 615 · Tail ${this.tail} · Generated ${footDate} ${footHH}:${footMM}Z`,
      this.pageW / 2, this.y, { align: "center" }
    );
    this.y += 4.5;
    // Line 2: version provenance — ties this sortie record to the exact data
    // version it was computed against (config) and the app build (code).
    {
      const cfgV = (typeof AC !== "undefined" && AC.meta && Number.isFinite(AC.meta.configVersion))
        ? AC.meta.configVersion : "?";
      const cfgRel = (typeof AC !== "undefined" && AC.meta && AC.meta.configReleasedAt)
        ? new Date(AC.meta.configReleasedAt).toISOString().slice(0, 10) : "—";
      const appV = (typeof APP_VERSION !== "undefined") ? APP_VERSION : "?";
      this.setFont("normal", 7);
      this.setColor(...this.C_MED);
      this.text(
        `Config data v${cfgV} (released ${cfgRel}) · App v${appV} · Data source: ${formatReferenceDocument(this.s?.accepted?.referenceDocument || currentReferenceDocument())}`,
        this.pageW / 2, this.y, { align: "center" }
      );
    }
    this.y += 5;
    // Line 3: disclaimer — italic, muted
    this.setFont("italic", 7.5);
    this.setColor(...this.C_MED);
    this.text(
      "This document is a planning tool and does not replace certified aircraft documentation.",
      this.pageW / 2, this.y, { align: "center" }
    );
  }
}
