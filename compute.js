/* compute.js — All W&B math and calculations */
/* =========================
   CORE MATH
   ========================= */

function roundKg(x){ return Math.round(x); } // per your rounding requirement
function roundMm(x){ return Math.round(x); }

function cgFromMoment(totalW, totalM){
  if (totalW <= 0) return null;
  return totalM / totalW;
}


/* =========================
   MISSION EQUIPMENT RESOLVER
   Mission items reference a stowage location by ID (see config.js
   Section 7). This helper returns a fully-resolved item with the
   arm and stowage name already looked up, so calling code can just
   read .arm and .stow without knowing about the lookup.
   ========================= */

function getMissionItem(key){
  const it = AC.missionEquip[key];
  if (!it) return null;

  // Custom CG arm — item placed at a manually specified arm, no named stowage location
  if (it.stow === "CUSTOM") {
    const arm = it.customArm || 0;
    return {
      key,
      name:      it.name,
      w:         it.w,
      arm,
      stow:      `Custom (${arm} mm)`,
      stowId:    "CUSTOM",
      stowGroup: "Custom",
      group:     it.group,
      on:        it.on
    };
  }

  const loc = AC.stowage[it.stow];
  return {
    key,
    name:  it.name,
    w:     it.w,
    arm:   loc ? loc.arm  : 0,
    stow:  loc ? loc.name : (it.stow || "Unknown"),
    stowId: it.stow,
    stowGroup: loc ? loc.group : "",
    group: it.group,
    on:    it.on
  };
}

function normalizeRoleFitState(state){
  // Role-fit items remain independently selectable unless explicitly locked by
  // the Accepted Aircraft State. Do not infer installation/removal of the
  // EO/IR Hand Controller from the Sensor Workstation or EO/IR package.
  return state;
}

function computeRoleFitTotals(s){
  // Accepted maintenance removals are authoritative. Dependency normalization
  // must never silently reinstall an item recorded as removed at Acceptance.
  if (s?.accepted?.isAccepted && basicWeightBasis(s) === "MAINTENANCE" && s.accepted.maintenanceBaseline?.roleFit){
    for (const [k,it] of Object.entries(AC.roleFit)){
      if (roleFitMaintenanceDefault(it) && s.accepted.maintenanceBaseline.roleFit[k] === false) s.roleFit[k] = false;
    }
  }

  let w=0, m=0;
  for (const k of Object.keys(AC.roleFit)){
    if (!s.roleFit[k]) continue;
    const it = AC.roleFit[k];
    w += it.w;
    m += it.w * it.arm;
  }
  return {w, m};
}

function basicWeightBasis(s){
  return s?.accepted?.basicWeightBasis === "MAINTENANCE" ? "MAINTENANCE" : "RFM";
}

function roleFitMaintenanceDefault(it){
  return it?.maintenanceIncluded !== undefined ? !!it.maintenanceIncluded : !!it?.normally;
}

function seatMaintenanceDefault(it){ return !!it?.maintenanceIncluded; }

function computeRoleFitAdjustment(s){
  const current = computeRoleFitTotals(s);
  if (basicWeightBasis(s) === "RFM") {
    return {w:current.w, m:current.m, currentW:current.w, currentM:current.m, changes:[], baselineEstablished:true};
  }
  const baseline = s?.accepted?.maintenanceBaseline?.roleFit;
  if (!baseline) return {w:0,m:0,currentW:current.w,currentM:current.m,changes:[],baselineEstablished:false};
  let w=0, m=0;
  const changes=[];
  for (const k of Object.keys(AC.roleFit)){
    const wasOn=!!baseline[k], isOn=!!s.roleFit[k];
    if (wasOn === isOn) continue;
    const it=AC.roleFit[k], sign=isOn ? 1 : -1;
    const dw=sign*it.w, dm=dw*it.arm;
    w += dw; m += dm;
    changes.push({key:k,name:it.name,baseline:wasOn,current:isOn,w:dw,arm:it.arm,m:dm});
  }
  return {w,m,currentW:current.w,currentM:current.m,changes,baselineEstablished:true};
}

function computeMissionTotals(s){
  let w=0, m=0;
  for (const k of Object.keys(AC.missionEquip)){
    if (!s.mission[k]) continue;
    const it = getMissionItem(k);
    if (!it) continue;
    w += it.w;
    m += it.w * it.arm;
  }
  return {w, m};
}

function computeSeatTotals(s){
  // Occupant standard weights (per RFM):
  //   CREW standard weight = 90.7 kg (200 lb)
  //   PAX  standard weight = 90.00 kg
  const crewW = 90.7;  // RFM: crew standard weight is 90.7 kg
  const paxW  = 90.0;  // RFM: PAX standard weight is 90.00 kg
  let w=0, m=0, structureW=0, structureM=0, occupantW=0, occupantM=0;
  const changes=[];
  const basis = basicWeightBasis(s);
  const maintenanceSeats = s?.accepted?.maintenanceBaseline?.seats;

  const addSeatStructure = (k, seat) => {
    if (seat.includedInRfmBasic) return;
    const current = !!s.seats[k];
    const baseline = basis === "MAINTENANCE" ? !!maintenanceSeats?.[k] : false;
    const factor = (basis === "MAINTENANCE" && !maintenanceSeats) ? 0 : (Number(current) - Number(baseline));
    if (!factor) return;
    const dw = factor * seat.wSeat;
    const dm = dw * seat.arm;
    structureW += dw; structureM += dm;
    changes.push({key:k,name:seat.name,baseline,current,w:dw,arm:seat.arm,m:dm});
  };

  // crew seats — occupants at crew standard weight (90.7 kg)
  for (const k of Object.keys(AC.crewSeats)){
    const seat = AC.crewSeats[k];
    addSeatStructure(k, seat);
    if (s.seats[k] && s.occupants[k]){
      occupantW += crewW;
      occupantM += crewW * seat.arm;
    }
  }
  // pax seats — occupants at PAX standard weight (90.00 kg)
  for (const k of Object.keys(AC.paxSeats)){
    const seat = AC.paxSeats[k];
    addSeatStructure(k, seat);
    if (s.seats[k] && s.occupants[k]){
      occupantW += paxW;
      occupantM += paxW * seat.arm;
    }
  }
  w = structureW + occupantW; m = structureM + occupantM;
  return {w,m,structureW,structureM,occupantW,occupantM,changes,baselineEstablished:basis !== "MAINTENANCE" || !!maintenanceSeats};
}

function computeBayTotals(s){
  let w=0, m=0;
  for (const bay of Object.keys(s.bays)){
    const ww = +s.bays[bay] || 0;
    const arm = AC.bayArms[bay];
    w += ww;
    m += ww * arm;
  }
  return {w, m};
}

function computeCargoTotals(s){
  let w=0, m=0;
  for (const c of s.cargo){
    const ww = +c.w || 0;
    const arm = +c.arm || 0;
    w += ww;
    m += ww * arm;
  }
  return {w, m};
}

function solveFuelTanksFromTotal(totalKg){
  // Fill from stages, applying positive deltas only, sequentially, partially if needed.
  // This is a distribution solver for a total fuel amount.
  // Any negative stages are ignored for fill distribution; they’re transfer dynamics not a fill bucket.
  const tanks = {T1:0,T2:0,T3:0,T4:0,T5:0};
  let remaining = Math.max(0, totalKg);

  for (const st of AC.fuelStages){
    // stage capacity = sum of positive deltas
    const posKeys = Object.keys(st.deltas).filter(k => st.deltas[k] > 0);
    const cap = posKeys.reduce((a,k)=>a+st.deltas[k], 0);
    if (cap <= 0) continue;
    if (remaining <= 0) break;

    const take = Math.min(remaining, cap);
    const frac = take / cap;

    for (const k of posKeys){
      tanks[k] += st.deltas[k] * frac;
    }
    remaining -= take;
  }

  // rounding to nearest kg at end (you asked for that)
  for (const k of Object.keys(tanks)){
    tanks[k] = roundKg(tanks[k]);
  }

  // adjust rounding drift to match totalKg exactly by distributing +/-
  let sum = Object.values(tanks).reduce((a,b)=>a+b,0);
  let drift = roundKg(totalKg) - sum;
  const order = ["T3","T2","T1","T4","T5"]; // arbitrary stable order
  let i=0;
  while (drift !== 0 && i < 5000){
    const kk = order[i % order.length];
    tanks[kk] += (drift > 0 ? 1 : -1);
    drift += (drift > 0 ? -1 : 1);
    i++;
  }

  return tanks;
}

function computeFuelTotals(s){
  const total = roundKg(+s.fuel.total || 0);
  let tanks = s.fuel.tanks;

  if (!s.fuel.manualTanks){
    tanks = solveFuelTanksFromTotal(total);
    s.fuel.tanks = {...tanks};
  } else {
    // manual tanks: total is sum
    const sum = roundKg(Object.values(tanks).reduce((a,b)=>a+(+b||0),0));
    s.fuel.total = sum;
  }

  let w=0, m=0;
  for (const k of Object.keys(tanks)){
    const ww = +tanks[k] || 0;
    const arm = AC.fuelTankArms[k];
    w += ww;
    m += ww * arm;
  }
  return {w: roundKg(w), m};
}

/* =========================
   BURN TRACK
   Computes a sequence of {w, cg, label, fuel} points showing
   how AUW and CG evolve as fuel burns from departure down to
   landing weight. Uses the same fuel distribution solver so
   the CG shift matches how the tanks actually drain.

   Returns: array of points, departure first → landing last.
   ========================= */

function computeBurnTrack(tail){
  const s = STORE.sessions[tail];
  if (!s) return [];

  // Non-fuel state doesn't change during burn — capture once.
  // Use full non-fuel weight (OW + cargo + bay) and the TRUE moment,
  // not a reconstruction from rounded CG.
  const wb0     = computeWB(tail);
  const baseW   = wb0.nonFuelW;
  const baseM   = wb0.nonFuelM;

  const fuelDep  = roundKg(s.fuel?.total ?? 0);
  const fuelLdg  = roundKg(Math.max(0, Math.min(s.fuel?.landing ?? 300, fuelDep)));

  // Helper: compute {w, cg} for a given total fuel amount
  const pointAtFuel = (fuelKg) => {
    const tanks = solveFuelTanksFromTotal(fuelKg);
    let fw = 0, fm = 0;
    for (const k of Object.keys(tanks)){
      const kg  = tanks[k] || 0;
      const arm = AC.fuelTankArms[k];
      fw += kg;
      fm += kg * arm;
    }
    const w  = roundKg(baseW + fw);
    const m  = baseM + fm;
    const cg = roundMm(cgFromMoment(w, m) || 0);
    return { w, cg, fuel: roundKg(fw) };
  };

  // Sample the burn curve. We step every ~50 kg for a smooth line,
  // and explicitly include the departure and landing points.
  const track = [];
  const step  = 50;

  track.push({ ...pointAtFuel(fuelDep), label: "Departure" });

  for (let f = fuelDep - step; f > fuelLdg; f -= step){
    track.push({ ...pointAtFuel(f), label: null });
  }

  track.push({ ...pointAtFuel(fuelLdg), label: "Landing" });

  return track;
}


function cgBand(cg){
  if (cg == null) return "—";
  if (cg < AC.envelope.cgBands.fwdMax) return "FWD";
  if (cg <= AC.envelope.cgBands.midMax) return "MID";
  return "AFT";
}

function pointInPoly(pt, poly){
  // ray-casting for convex/concave polygons
  let inside = false;
  for (let i=0, j=poly.length-1; i<poly.length; j=i++){
    const xi=poly[i].cg, yi=poly[i].w;
    const xj=poly[j].cg, yj=poly[j].w;
    const intersect = ((yi > pt.w) !== (yj > pt.w)) &&
      (pt.cg < (xj - xi) * (pt.w - yi) / ((yj - yi) || 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function computeWB(tail){
  const s = STORE.sessions[tail];

  // basic
  const basicW = +s.accepted.basicW || 0;
  const basicCG = +s.accepted.basicCG || 0;
  const basicM = basicW * basicCG;

  // Role fit / mission / seats
  const rf = computeRoleFitAdjustment(s);
  const me = computeMissionTotals(s);
  const st = computeSeatTotals(s);

  // Cabin bay loads (tactical / optional)
  const bay = computeBayTotals(s);

    // Cargo
  const cargo = computeCargoTotals(s);

  // Load zones / shelves (discrete stowage locations)
  // NOTE: entries may optionally include an 'arm' field. If missing, that entry contributes weight only if arm is known.
  const zones = (() => {
    const list = Array.isArray(s.zones) ? s.zones : [];
    let w = 0;
    let m = 0;
    for (const z of list){
      if (!z) continue;
      const zw = +z.w || 0;
      const arm = +z.arm; // may be NaN if not present yet
      if (!Number.isFinite(zw)) continue;
      w += zw;
      if (Number.isFinite(arm)) m += zw * arm;
    }
    return { w: roundKg(w), m };
  })();

  // Fuel
  const MAX_FUEL_KG = AC.maxFuelKg; // hard physical cap (see config.js)

  // ---- Hard physical fuel cap (does not change allowance logic; prevents impossible fuel) ----
  if (!s.fuel) s.fuel = { total: 0, tanks: {} };

  // Clamp total (if UI writes to total directly)
  s.fuel.total = Math.min(roundKg(s.fuel.total || 0), MAX_FUEL_KG);

  // Clamp tanks (if UI writes to tanks directly)
  const t = s.fuel.tanks || {};
  const tankKeys = Object.keys(t);
  if (tankKeys.length){
    const sumTanks = tankKeys.reduce((acc,k)=> acc + (Number(t[k])||0), 0);
    if (sumTanks > MAX_FUEL_KG){
      const factor = MAX_FUEL_KG / sumTanks;

      // scale down proportionally
      let scaled = {};
      let newSum = 0;
      for (const k of tankKeys){
        const v = Number(t[k]) || 0;
        const nv = roundKg(v * factor);
        scaled[k] = nv;
        newSum += nv;
      }

      // fix rounding drift to hit cap exactly (adjust last key)
      const drift = newSum - MAX_FUEL_KG;
      if (drift !== 0){
        const last = tankKeys[tankKeys.length - 1];
        scaled[last] = roundKg((scaled[last] || 0) - drift);
      }

      s.fuel.tanks = scaled;
      s.fuel.total = MAX_FUEL_KG;
    }
  }
  // ------------------------------------------------------------------------------------------

  const fuel = computeFuelTotals(s);


  // ✅ OPERATING WEIGHT (per RFM): Basic + selected items (role-fit, mission equip)
  //    + crew/baggage (seats & occupants) + mission stowages (zones).
  //    Cargo and Bays are TACTICAL PAYLOAD — excluded from OW, added at AUW.
  const opW = roundKg(basicW + rf.w + me.w + st.w + zones.w);
  const opM = basicM + rf.m + me.m + st.m + zones.m;
  const opCG = roundMm(cgFromMoment(opW, opM) || 0);


  // ✅ AUW = Operating Weight + Payload (Cargo + Bays) + Fuel
  const auw = roundKg(opW + bay.w + cargo.w + fuel.w);
  const auwM = opM + bay.m + cargo.m + fuel.m;
  const auwCG = roundMm(cgFromMoment(auw, auwM) || 0);

  // Envelope checks
  const hardCgOk = (auwCG >= AC.envelope.hardCg.min && auwCG <= AC.envelope.hardCg.max);
  const absCgOk = (auwCG >= AC.envelope.cgAbsolute.min && auwCG <= AC.envelope.cgAbsolute.max);
  const inMain = pointInPoly({w:auw, cg:auwCG}, AC.envelope.envMain);
  const inAlt = (auw <= 16000) && (auw >= 15600) && pointInPoly({w:auw, cg:auwCG}, AC.envelope.envAlt.concat([AC.envelope.envAlt[0]]));
  const envOk = (inMain && absCgOk) || (inAlt && absCgOk);

  // Weight checks (per your notes)
  const overweightAirborne = auw > 16000;
  const altGross = (auw > 15600 && auw <= 16000);

  const band = cgBand(auwCG);

  // Non-fuel totals (OW + tactical payload), with TRUE unrounded moment.
  // Used by the burn track (holds non-fuel constant, varies fuel) and the
  // PDF, so neither has to reconstruct moment from a rounded CG.
  const nonFuelW = roundKg(opW + bay.w + cargo.w);
  const nonFuelM = opM + bay.m + cargo.m;

  return {
    basicW, basicCG,
    basicWeightBasis: basicWeightBasis(s),
    roleFitAdjustmentW: roundKg(rf.w),
    roleFitAdjustmentM: rf.m,
    roleFitCurrentW: roundKg(rf.currentW),
    roleFitCurrentM: rf.currentM,
    roleFitChanges: rf.changes,
    roleFitBaselineEstablished: rf.baselineEstablished,
    seatStructureAdjustmentW: roundKg(st.structureW),
    seatStructureAdjustmentM: st.structureM,
    seatStructureChanges: st.changes,
    roleEquipmentAdjustmentW: roundKg(rf.w + st.structureW),
    roleEquipmentAdjustmentM: rf.m + st.structureM,
    opW, opCG, opM,                 // opM = true unrounded OW moment
    nonFuelW, nonFuelM,             // OW + cargo + bay (no fuel), true moment
    fuelTotal: roundKg(s.fuel.total || 0),
    fuelTanks: {...s.fuel.tanks},
    bayTotal:  roundKg(bay.w),
    cabinTotal: roundKg(bay.w),     // retained alias (legacy callers)
    cargoTotal: roundKg(cargo.w),
    zonesTotal: roundKg(zones.w),

    auw, auwCG,
    cgBand: band,
    flags: {
      hardCgOk, absCgOk, envOk, inMain, inAlt,
      overweightAirborne, altGross
    }
  };
}


/* =========================
   ACCEPTANCE INVALIDATION
   ========================= */
