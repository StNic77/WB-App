/**
 * config.js — CH-149 - 615 W&B App
 * Exported by the Custodian Editor on 2026-10-09T04:06:09.000Z
 * Config data version: 26
 *
 * This file was generated from the editor. It contains the full
 * current state of all aircraft data. Rename to config.js and
 * replace your existing config.js to publish changes.
 */

// SECTION 11 — CONFIG META (data version, separate from app code version)
const AC_META = {
  "configVersion": 26,
  "configReleasedAt": "2026-10-09T04:06:09.000Z",
  "changelog": [
    {
      "version": 26,
      "at": "2026-10-09T04:06:09.000Z",
      "note": "In Development and Verification"
    },
    {
      "version": 25,
      "at": "2026-10-09T03:56:44.000Z",
      "note": "Adds editable patient positions to fleet and tail-specific configurations; existing patient positions and defaults are preserved."
    },
    {
      "version": 24,
      "at": "2026-10-08T17:02:25.000Z",
      "note": "Clarifies Role Fit accounting and Editor defaults; compatible v23 aircraft overrides are preserved and migrated."
    },
    {
      "version": 23,
      "at": "2026-10-06T23:12:29.000Z",
      "note": "Adds tail-specific configuration data so selected aircraft can have their own role configurations, equipment, seating, stowage and reference documents."
    },
    {
      "version": 22,
      "at": "2026-10-06T04:42:06.125Z",
      "note": "Aligns normally fitted role-fit equipment with the current Maintenance Basic Weight inclusion baseline for RFM sanity checks."
    },
    {
      "version": 21,
      "at": "2026-10-06T02:15:59.000Z",
      "note": "Adds custodian-controlled display order for Role Config presets; default order is SAR-3 Pax, SAR-10 Pax, Transport, then CASEVAC."
    },
    {
      "version": 20,
      "at": "2026-10-05T22:40:20.000Z",
      "note": "Adds default NVG set distribution across the upper and lower lockbox shelves."
    },
    {
      "version": 19,
      "at": "2026-10-03T06:16:33.000Z",
      "note": "In development."
    },
    {
      "version": 18,
      "at": "2026-10-01T22:56:20.000Z",
      "note": "In development."
    },
    {
      "version": 17,
      "at": "2026-10-01T16:55:18.163Z",
      "note": "added internal liferaft and its associated stowage"
    },
    {
      "version": 16,
      "at": "2026-09-30T14:59:53.451Z",
      "note": "In development."
    },
    {
      "version": 15,
      "at": "2026-09-30T01:06:46.739Z",
      "note": "Rebuilt mission equipment catalog with individual weights, quantities, and flexible stowage; added editable mission configurations; corrected Manual Fuel plots and PDFs; improved saved-session handling."
    },
    {
      "version": 14,
      "at": "2026-09-30T00:33:36.606Z",
      "note": "Individual mission equipment, per-location quantities, custom configurations and Manual Fuel PDF parity."
    },
    {
      "version": 13,
      "at": "2026-09-28T00:00:00.000Z",
      "note": "LOCAL REVIEW BUILD: explicit equipment accounting; corrected preset identifiers; complete CASEVAC four-rack system 120.09 kg at 8577 mm per supplied continuity notes. Not released."
    },
    {
      "version": 12,
      "at": "2026-09-26T18:52:14.635Z",
      "note": "Corrected Tank 1 arm to 10,875 mm using the Leonardo weight and balance clearance statement."
    },
    {
      "version": 11,
      "at": "2026-09-18T18:33:32.458Z",
      "note": "Corrected Maintenance Ladder arm to 14,940 mm."
    },
    {
      "version": 10,
      "at": "2026-09-18T17:52:12.348Z",
      "note": "added carry on equipment from RFM to RF equipment"
    },
    {
      "version": 9,
      "at": "2026-09-17T03:33:32.013Z",
      "note": "fixed code a equipment"
    },
    {
      "version": 8,
      "at": "2026-09-17T03:11:26.026Z",
      "note": "corrected"
    },
    {
      "version": 7,
      "at": "2026-09-17T02:59:57.773Z",
      "note": "updated list to include proper names and grouping by system"
    },
    {
      "version": 6,
      "at": "2026-09-16T18:33:01.133Z",
      "note": "additional Role Fit and Carry on equipment added"
    },
    {
      "version": 5,
      "at": "2026-09-15T22:10:25.411Z",
      "note": "updated normally installed Role-Fit items"
    },
    {
      "version": 4,
      "at": "2026-09-15T20:30:00.000Z",
      "note": "Test build: operator-language cleanup, accepted maintenance-exception locking, stowage/load-planning workflow updates, and reference-document history."
    },
    {
      "version": 3,
      "at": "2026-09-09T22:24:57.000Z",
      "note": "Added RFM and Maintenance Basic Weight baselines, maintenance exceptions, and seat classification controls."
    },
    {
      "version": 2,
      "at": "2026-06-26T22:53:20.249Z",
      "note": "Better organized personal equipment and added a spare set of NVGs"
    },
    {
      "version": 1,
      "at": "2026-06-22T04:00:47.904Z",
      "note": "Baseline configuration."
    }
  ],
  "referenceDocuments": {
    "currentId": "ref-issue-1-draft-2-built-04092026",
    "history": [
      {
        "id": "ref-issue-1-draft-2-built-04092026",
        "designation": "DLTP 101C-615-RFM",
        "versionType": "Issue",
        "version": "1 Draft 2",
        "versionDate": "04/09/2026",
        "status": "Internal Preview",
        "buildDate": "04/09/2026",
        "configVersion": 13
      },
      {
        "id": "ref-2026-06-09-issue-1",
        "designation": "DLTP 101C-615-RFM",
        "versionType": "Issue",
        "version": "1",
        "versionDate": "09-06-2026",
        "status": "FOR MPTF (DEV) USE ONLY",
        "effectiveAt": "2026-09-15T20:30:00.000Z",
        "appVersion": "0.2.4-test2",
        "configVersion": 4
      }
    ]
  }
};

// SECTION 1 — TAIL NUMBERS
const AC_TAILS = {
  "active": [
    "149920",
    "149921",
    "149922",
    "149923",
    "149924",
    "149925",
    "149926",
    "149927",
    "149928",
    "149929",
    "149930",
    "149931",
    "149932",
    "149933",
    "149934",
    "149935",
    "149936"
  ],
  "placeholders": [
    "149937",
    "149938",
    "149939",
    "149940"
  ]
};

// SECTION 1A — AUTH
const AC_AUTH = {
  "password": "custodian"
};

// SECTION 2 — CG ENVELOPE
const AC_ENVELOPE = {
  "envMain": [
    {
      "w": 13000,
      "cg": 7925
    },
    {
      "w": 14600,
      "cg": 7925
    },
    {
      "w": 15600,
      "cg": 8025
    },
    {
      "w": 15600,
      "cg": 8349
    },
    {
      "w": 12500,
      "cg": 8460
    },
    {
      "w": 9715,
      "cg": 8460
    },
    {
      "w": 9553,
      "cg": 8400
    },
    {
      "w": 10315,
      "cg": 8074
    },
    {
      "w": 11500,
      "cg": 7975
    }
  ],
  "envAlt": [
    {
      "w": 15600,
      "cg": 8025
    },
    {
      "w": 16000,
      "cg": 8065
    },
    {
      "w": 16000,
      "cg": 8335
    },
    {
      "w": 15600,
      "cg": 8349
    }
  ],
  "hardCg": {
    "min": 7925,
    "max": 8460
  },
  "cgBands": {
    "fwdMax": 8003,
    "midMax": 8257
  },
  "cgAbsolute": {
    "min": 7500,
    "max": 9000
  }
};

// SECTION 3 — BAY ARMS
const AC_BAY_ARMS = {
  "BAY1": 5375,
  "BAY2": 6375,
  "BAY3": 7375,
  "BAY4": 8375,
  "BAY5": 9375,
  "BAY55": 10125,
  "BAY6": 10884,
  "REAR": 12893
};

// SECTION 4 — RAMP LIMITS
const AC_RAMP = {
  "hinge": 11393,
  "end": 14393,
  "maxClosed": 350,
  "maxOpen": 450,
  "hingeMomentMax": 450
};

// SECTION 5 — FUEL TANKS
const AC_FUEL_TANK_ARMS = {
  "T1": 10875,
  "T2": 7375,
  "T3": 6375,
  "T4": 5375,
  "T5": 8375
};
const AC_FUEL_STAGES = [
  {
    "name": "Stage 1",
    "deltas": {
      "T1": 581.3,
      "T2": 581.3,
      "T3": 581.3,
      "T4": 0,
      "T5": 0
    }
  },
  {
    "name": "Stage 2",
    "deltas": {
      "T1": 249.1,
      "T2": 249.1,
      "T3": 0,
      "T4": 249.1,
      "T5": 0
    }
  },
  {
    "name": "Stage 3",
    "deltas": {
      "T1": 0,
      "T2": 0,
      "T3": 0,
      "T4": 332.2,
      "T5": 0
    }
  },
  {
    "name": "Stage 4",
    "deltas": {
      "T1": 0,
      "T2": 0,
      "T3": 249.1,
      "T4": 249.1,
      "T5": 0
    }
  },
  {
    "name": "Stage 5",
    "deltas": {
      "T1": 0,
      "T2": 0,
      "T3": 0,
      "T4": 0,
      "T5": 830.4
    }
  },
  {
    "name": "Stage 6",
    "deltas": {
      "T1": -249.1,
      "T2": -249.1,
      "T3": -124.6,
      "T4": -124.6,
      "T5": 0
    }
  },
  {
    "name": "Stage 7",
    "deltas": {
      "T1": 249.1,
      "T2": 249.1,
      "T3": -69.5,
      "T4": -69.5,
      "T5": -776.4
    }
  },
  {
    "name": "Stage 8",
    "deltas": {
      "T1": -110,
      "T2": -110,
      "T3": -55,
      "T4": -55,
      "T5": 0
    }
  },
  {
    "name": "Stage 9",
    "deltas": {
      "T1": -9.7,
      "T2": -9.7,
      "T3": 22.2,
      "T4": 22.2,
      "T5": -54
    }
  },
  {
    "name": "Stage 10",
    "deltas": {
      "T1": -129.4,
      "T2": -129.4,
      "T3": -64.7,
      "T4": -64.7,
      "T5": 0
    }
  },
  {
    "name": "Stage 11",
    "deltas": {
      "T1": 83.1,
      "T2": 83.1,
      "T3": 83.1,
      "T4": -538.7,
      "T5": 0
    }
  },
  {
    "name": "Stage 12",
    "deltas": {
      "T1": -664.4,
      "T2": -664.4,
      "T3": -621.8,
      "T4": 0,
      "T5": 0
    }
  }
];
const AC_MAX_FUEL_KG = 4152; // kg — sum of all positive fill stages

// SECTION 6 — SEATS
const AC_CREW_SEATS = {
  "C1": {
    "name": "C1 Pilot (Stbd)",
    "arm": 3673,
    "wSeat": 24.12,
    "alwaysInstalled": true,
    "includedInRfmBasic": true,
    "maintenanceIncluded": true,
    "occupantArm": 3473
  },
  "C2": {
    "name": "C2 Pilot (Port)",
    "arm": 3673,
    "wSeat": 24.12,
    "alwaysInstalled": true,
    "includedInRfmBasic": true,
    "maintenanceIncluded": true,
    "occupantArm": 3473
  },
  "C3": {
    "name": "C3 Cockpit Jump",
    "arm": 4559,
    "wSeat": 17.84,
    "occupantArm": 4459
  },
  "C4": {
    "name": "C4 FE (Bay 2 Port)",
    "arm": 6469,
    "wSeat": 26.8,
    "occupantArm": 6262
  },
  "C5": {
    "name": "C5 ST TL (Bay 4 Port)",
    "arm": 8440,
    "wSeat": 26.8,
    "occupantArm": 8244
  },
  "C6": {
    "name": "C6 ST TM (Bay 5 Stbd)",
    "arm": 9434,
    "wSeat": 26.8,
    "occupantArm": 9234
  }
};
const AC_PAX_SEATS = {
  "P1": {
    "name": "P1  Stbd Bay 5.5",
    "arm": 10125,
    "wSeat": 6.9
  },
  "P2": {
    "name": "P2  Stbd Rear Fuse",
    "arm": 11762,
    "wSeat": 9.35,
    "normallyInstalled": true,
    "maintenanceIncluded": true
  },
  "P3": {
    "name": "P3  Port Rear Fuse",
    "arm": 11760,
    "wSeat": 9.35,
    "normallyInstalled": true,
    "maintenanceIncluded": true
  },
  "P4": {
    "name": "P4  Stbd Bay 1 Aft",
    "arm": 5625,
    "wSeat": 6.9
  },
  "P5": {
    "name": "P5  Stbd Bay 2 Fwd",
    "arm": 6125,
    "wSeat": 6.9
  },
  "P6": {
    "name": "P6  Stbd Bay 2 Aft",
    "arm": 6625,
    "wSeat": 6.9
  },
  "P7": {
    "name": "P7  Stbd Bay 5 Fwd",
    "arm": 9125,
    "wSeat": 6.9
  },
  "P8": {
    "name": "P8  Stbd Bay 5 Aft",
    "arm": 9625,
    "wSeat": 6.9
  },
  "P9": {
    "name": "P9  Stbd Bay 6 Fwd",
    "arm": 10625,
    "wSeat": 6.9
  },
  "P10": {
    "name": "P10 Stbd Bay 6 Aft",
    "arm": 11125,
    "wSeat": 6.9
  },
  "P11": {
    "name": "P11 Port Bay 3 Fwd",
    "arm": 7125,
    "wSeat": 6.9
  },
  "P12": {
    "name": "P12 Port Bay 3 Aft",
    "arm": 7625,
    "wSeat": 6.9
  },
  "P13": {
    "name": "P13 Port Bay 4 Fwd",
    "arm": 8125,
    "wSeat": 6.9
  },
  "P14": {
    "name": "P14 Port Bay 4 Aft",
    "arm": 8625,
    "wSeat": 6.9
  },
  "P15": {
    "name": "P15 Port Bay 5 Fwd",
    "arm": 9125,
    "wSeat": 6.9
  },
  "P16": {
    "name": "P16 Port Bay 5 Aft",
    "arm": 9625,
    "wSeat": 6.9
  },
  "P17": {
    "name": "P17 Port Bay 5.5",
    "arm": 10125,
    "wSeat": 6.9
  },
  "P18": {
    "name": "P18 Port Bay 6 Fwd",
    "arm": 10626,
    "wSeat": 6.9
  }
};

const AC_PATIENT_POSITIONS = {
  "STOKES_CABIN": {
    "name": "Stokes Litter (Cabin)",
    "arm": 7863,
    "weight": 90,
    "kind": "litter",
    "missionKey": "ME_SAR_MISSION_EQUIP_STOKES_LITTER_CABIN",
    "requiredStow": "CABIN_DEPLOYED"
  },
  "FWD_STBD_TOP": {
    "name": "FWD STBD top",
    "arm": 6120,
    "weight": 90,
    "kind": "litter",
    "roleFitKey": "RF_SAR_EQUIPMENT_CASEVAC_RACK_FWD_STBD"
  },
  "FWD_STBD_MIDDLE": {
    "name": "FWD STBD middle",
    "arm": 6120,
    "weight": 90,
    "kind": "litter",
    "roleFitKey": "RF_SAR_EQUIPMENT_CASEVAC_RACK_FWD_STBD"
  },
  "FWD_STBD_BOTTOM": {
    "name": "FWD STBD bottom",
    "arm": 6120,
    "weight": 90,
    "kind": "litter",
    "roleFitKey": "RF_SAR_EQUIPMENT_CASEVAC_RACK_FWD_STBD"
  },
  "AFT_STBD_MIDDLE": {
    "name": "AFT STBD middle",
    "arm": 10057,
    "weight": 90,
    "kind": "litter",
    "roleFitKey": "RF_SAR_EQUIPMENT_CASEVAC_RACK_AFT_STBD"
  },
  "AFT_STBD_BOTTOM": {
    "name": "AFT STBD bottom",
    "arm": 10057,
    "weight": 90,
    "kind": "litter",
    "roleFitKey": "RF_SAR_EQUIPMENT_CASEVAC_RACK_AFT_STBD"
  },
  "FWD_PORT_TOP": {
    "name": "FWD PORT top",
    "arm": 7898,
    "weight": 90,
    "kind": "litter",
    "roleFitKey": "RF_SAR_EQUIPMENT_CASEVAC_RACK_FWD_PORT"
  },
  "FWD_PORT_MIDDLE": {
    "name": "FWD PORT middle",
    "arm": 7898,
    "weight": 90,
    "kind": "litter",
    "roleFitKey": "RF_SAR_EQUIPMENT_CASEVAC_RACK_FWD_PORT"
  },
  "FWD_PORT_BOTTOM": {
    "name": "FWD PORT bottom",
    "arm": 7898,
    "weight": 90,
    "kind": "litter",
    "roleFitKey": "RF_SAR_EQUIPMENT_CASEVAC_RACK_FWD_PORT"
  },
  "AFT_PORT_MIDDLE": {
    "name": "AFT PORT middle",
    "arm": 10235,
    "weight": 90,
    "kind": "litter",
    "roleFitKey": "RF_SAR_EQUIPMENT_CASEVAC_RACK_AFT_PORT"
  },
  "AFT_PORT_BOTTOM": {
    "name": "AFT PORT bottom",
    "arm": 10235,
    "weight": 90,
    "kind": "litter",
    "roleFitKey": "RF_SAR_EQUIPMENT_CASEVAC_RACK_AFT_PORT"
  },
  "PTA": {
    "name": "PTA patient",
    "arm": 10375,
    "weight": 90,
    "kind": "pta"
  }
};

// SECTION 7 — STOWAGE LOCATIONS
const AC_STOWAGE = {
  "SAR_CABINET_FWD_TOP": {
    "name": "SAR Cabinet FWD Top (Zone A)",
    "arm": 6275,
    "group": "SAR Cabinet"
  },
  "SAR_CABINET_FWD_BTM": {
    "name": "SAR Cabinet FWD Btm (Zone B)",
    "arm": 6275,
    "group": "SAR Cabinet"
  },
  "SAR_CABINET_UPPER": {
    "name": "SAR Cabinet Upper (Zone C)",
    "arm": 6275,
    "group": "SAR Cabinet"
  },
  "SAR_CABINET_TOP": {
    "name": "SAR Cabinet Top (Zone D)",
    "arm": 6275,
    "group": "SAR Cabinet"
  },
  "LOCKBOX_TOP": {
    "name": "Lockbox Top Shelf (Zone E)",
    "arm": 6275,
    "group": "SAR Cabinet"
  },
  "LOCKBOX_BTM": {
    "name": "Lockbox Bottom Shelf (Zone F)",
    "arm": 6275,
    "group": "SAR Cabinet"
  },
  "SAR_CABINET_MIDDLE": {
    "name": "SAR Cabinet Middle (Zone G)",
    "arm": 6275,
    "group": "SAR Cabinet"
  },
  "SAR_CABINET_BOTTOM": {
    "name": "SAR Cabinet Bottom (Zone H)",
    "arm": 6275,
    "group": "SAR Cabinet"
  },
  "CABIN_PORT_STOW": {
    "name": "Stowage - Rescue Basket (B6 Port)",
    "roleFitKey": "RF_STOW_BASKET_PORT",
    "arm": 10937,
    "group": "Cabin"
  },
  "CABIN_STBD_STOW": {
    "name": "Stowage - Rescue Basket (B6 Stbd)",
    "roleFitKey": "RF_STOW_BASKET_STBD",
    "arm": 10934,
    "group": "Cabin"
  },
  "CABIN_DEPLOYED": {
    "name": "Stowage - Stokes Litter (Cabin B3/4 Centre)",
    "roleFitKey": "RF_STOW_STOKES_CABIN",
    "arm": 7863,
    "group": "Cabin"
  },
  "PTA_COT_AREA": {
    "name": "PTA Cot Area",
    "arm": 10375,
    "group": "Cabin"
  },
  "OVERHEAD_STBD": {
    "name": "Overhead Bins (Stbd)",
    "arm": 10511,
    "group": "Cabin"
  },
  "OVERHEAD_PORT": {
    "name": "Overhead Bins (Port)",
    "arm": 10732,
    "group": "Cabin"
  },
  "PORT_FWD_SHELF_TOP": {
    "name": "Port Fwd Shelf (Top)",
    "arm": 5331,
    "group": "Port Fwd Shelves"
  },
  "PORT_FWD_SHELF_MID": {
    "name": "Port Fwd Shelf (Middle)",
    "arm": 5331,
    "group": "Port Fwd Shelves"
  },
  "PORT_FWD_SHELF_BOT": {
    "name": "Port Fwd Shelf (Bottom)",
    "arm": 5331,
    "group": "Port Fwd Shelves"
  },
  "RAMP_STOW": {
    "name": "Stowage - Stokes Litter (Rear Ramp)",
    "roleFitKey": "RF_STOW_STOKES_RAMP",
    "arm": 13132,
    "group": "Cabin"
  },
  "RAMP_PORT_FWD": {
    "name": "Ramp Shelf Port Fwd",
    "arm": 12463,
    "group": "Ramp"
  },
  "RAMP_PORT_AFT": {
    "name": "Ramp Shelf Port Aft",
    "arm": 13226,
    "group": "Ramp"
  },
  "RAMP_STBD_FWD": {
    "name": "Ramp Shelf Stbd Fwd",
    "arm": 12481,
    "group": "Ramp"
  },
  "RAMP_STBD_AFT": {
    "name": "Ramp Shelf Stbd Aft",
    "arm": 13228,
    "group": "Ramp"
  },
  "CABINET_TOP_SURFACE": {
    "name": "On top of SAR cabinet",
    "arm": 5875,
    "group": "SAR Cabinet"
  },
  "INT_LIFE_RAFT_B3_STBD_F": {
    "roleFitKey": "RF_STOW_LIFERAFT_STBD_B3_F",
    "name": "Stowage - Internal Life Raft (Stbd B3 F)",
    "arm": 7100,
    "group": "Cabin"
  },
  "INT_LIFE_RAFT_B4_STBD_A": {
    "roleFitKey": "RF_STOW_LIFERAFT_STBD_B4_A",
    "name": "Stowage - Internal Life Raft (Stbd B4 A)",
    "arm": 8600,
    "group": "Cabin"
  }
};

// SECTION 8 — ROLE-FIT EQUIPMENT
const AC_ROLE_FIT = {
  "RF_STOW_TOOLKIT": {
    "name": "Stowage - Tool Kit / Emergency Spares",
    "w": 1.6,
    "arm": 12491,
    "normally": false,
    "maintenanceIncluded": false
  },
  "RF_STOW_STOKES_RAMP": {
    "name": "Stowage - Stokes Litter (Rear Ramp)",
    "w": 2.11,
    "arm": 13132,
    "normally": false,
    "maintenanceIncluded": false
  },
  "RF_STOW_STOKES_CABIN": {
    "name": "Stowage - Stokes Litter (Cabin B3/4 Centre)",
    "w": 2.11,
    "arm": 7863,
    "normally": false,
    "maintenanceIncluded": false
  },
  "RF_STOW_BASKET_PORT": {
    "name": "Stowage - Rescue Basket (B6 Port)",
    "w": 2.61,
    "arm": 10937,
    "normally": false,
    "maintenanceIncluded": false
  },
  "RF_STOW_BASKET_STBD": {
    "name": "Stowage - Rescue Basket (B6 Stbd)",
    "w": 2.61,
    "arm": 10934,
    "normally": false,
    "maintenanceIncluded": false
  },
  "RF_ICE_PROTECTION_TR_SLIP_RING": {
    "name": "Tail Rotor Slip Ring",
    "w": 2.4,
    "arm": 19500,
    "normally": true,
    "maintenanceIncluded": true
  },
  "RF_ICE_PROTECTION_RIPU": {
    "name": "RIPU",
    "w": 34.88,
    "arm": 5520,
    "normally": true,
    "maintenanceIncluded": true
  },
  "RF_ICE_PROTECTION_RIPU_CABLES": {
    "name": "RIPU Cables (Removable)",
    "w": 2.5,
    "arm": 5112,
    "normally": true,
    "maintenanceIncluded": true
  },
  "RF_STOW_LIFERAFT_STBD_B3_F": {
    "name": "Stowage - Internal Life Raft Stbd Bay 3 Fwd",
    "w": 0.57,
    "arm": 7100,
    "normally": false,
    "maintenanceIncluded": false
  },
  "RF_STOW_LIFERAFT_STBD_B4_A": {
    "name": "Stowage - Internal Life Raft Stbd Bay 4 Aft",
    "w": 0.57,
    "arm": 8600,
    "normally": false,
    "maintenanceIncluded": false
  },
  "RF_SENSOR_SYSTEMS_EOIR_TURRET": {
    "name": "WESCAM MX-15 Turret",
    "w": 43.2,
    "arm": 1684,
    "normally": false,
    "maintenanceIncluded": false
  },
  "RF_SENSOR_SYSTEMS_EOIR_HAND_CONTROLLER": {
    "name": "WESCAM MX-15 Hand Controller (incl bracket/cable)",
    "w": 1.7,
    "arm": 5828,
    "normally": false,
    "maintenanceIncluded": false
  },
  "RF_SENSOR_SYSTEMS_SENSOR_WORKSTATION": {
    "name": "Sensor Workstation",
    "w": 46.69,
    "arm": 5830,
    "normally": false,
    "maintenanceIncluded": false
  },
  "RF_SENSOR_SYSTEMS_TRAKKA_SRCHLT": {
    "name": "TRAKKA A-800 Searchlight",
    "w": 34.47,
    "arm": 6340,
    "normally": false,
    "maintenanceIncluded": false
  },
  "RF_SENSOR_SYSTEMS_EOIR_BLANKING": {
    "name": "WESCAM MX-15 Blanking Removal (when turret installed)",
    "w": -0.95,
    "arm": 1908,
    "normally": false,
    "maintenanceIncluded": false
  },
  "RF_SENSOR_SYSTEMS_EOIR_STRUCT_FITTINGS": {
    "name": "WESCAM MX-15 Removable Structure and Fittings",
    "w": 0.11,
    "arm": 3241,
    "normally": false,
    "maintenanceIncluded": false
  },
  "RF_AIRCRAFT_SYSTEMS_AIR_COOLING_PACK": {
    "name": "Air Cooling Pack",
    "w": 64.62,
    "arm": 9673,
    "normally": false,
    "maintenanceIncluded": false
  },
  "RF_AIRCRAFT_SYSTEMS_FLOATATION_SYSTEM": {
    "name": "Floatation System",
    "w": 83.91,
    "arm": 8478,
    "normally": true,
    "maintenanceIncluded": true
  },
  "RF_AIRCRAFT_SYSTEMS_SPONSON_LIFERAFTS": {
    "name": "10-man Life Rafts (x2) Sponsons",
    "w": 66.03,
    "arm": 9588,
    "normally": true,
    "maintenanceIncluded": true
  },
  "RF_AIRCRAFT_SYSTEMS_SECONDARY_HOIST": {
    "name": "Electrical Secondary Hoist & Boom & Earthing Lead",
    "w": 82.34,
    "arm": 9255,
    "normally": true,
    "maintenanceIncluded": true
  },
  "RF_AIRCRAFT_SYSTEMS_SEA_TRAY": {
    "name": "Sea Tray",
    "w": 10.3,
    "arm": 8127,
    "normally": false,
    "maintenanceIncluded": false
  },
  "RF_SAR_EQUIPMENT_DIVE_O2_BOTTLE_RACK": {
    "name": "Dive Bottle / O2 Rack",
    "w": 7,
    "arm": 10849,
    "normally": false,
    "maintenanceIncluded": false
  },
  "RF_SAR_EQUIPMENT_FWD_SAR_CABINET": {
    "name": "SAR Equipment Storage Cabinet",
    "w": 73.7,
    "arm": 5875,
    "normally": false,
    "maintenanceIncluded": false
  },
  "RF_SAR_EQUIPMENT_CSH_PATIENT_TREATMENT_SYSTEM": {
    "name": "CSH Patient Treatment System (incl floor mount)",
    "w": 110,
    "arm": 10375,
    "normally": false,
    "maintenanceIncluded": false
  },
  "RF_ICE_PROTECTION_MR_SLIP_RING": {
    "name": "Main Rotor Slip Ring",
    "w": 12,
    "arm": 8000,
    "normally": true,
    "maintenanceIncluded": true
  },
  "RF_SENSOR_SYSTEMS_EOIR_REMOVABLE_CABLES": {
    "name": "WESCAM MX-15 Removable Cables",
    "w": 3.17,
    "arm": 1800,
    "normally": false,
    "maintenanceIncluded": false
  },
  "RF_SERVICING_EQUIPMENT_LASHING_KIT": {
    "name": "Lashing/Tie Down Rings",
    "w": 9.76,
    "arm": 7243,
    "normally": false,
    "maintenanceIncluded": false
  },
  "RF_SERVICING_EQUIPMENT_FIELD_TOOL_KIT": {
    "name": "Field Tool Kit and Spares Pack",
    "w": 5.98,
    "arm": 12688,
    "normally": false,
    "maintenanceIncluded": false
  },
  "RF_SERVICING_EQUIPMENT_CODE_A_EQUIP": {
    "name": "Plugs and Covers ",
    "w": 23,
    "arm": 10690,
    "normally": false,
    "maintenanceIncluded": false
  },
  "RF_AIRCRAFT_SYSTEMS_CARRY_ON_EQUIP_ICS_CABLES_CREW": {
    "name": "ICS Headset Cables - Crew (3 Off, 6M)",
    "w": 2.48,
    "arm": 8625,
    "normally": false,
    "maintenanceIncluded": false
  },
  "RF_AIRCRAFT_SYSTEMS_CARRY_ON_EQUIP_ICS_CABLES_PAX": {
    "name": "ICS Headset Cables - Passenger (4 Off, 2M)",
    "w": 1.16,
    "arm": 8625,
    "normally": false,
    "maintenanceIncluded": false
  },
  "RF_SERVICING_EQUIPMENT_CARRY_ON_EQUIP_LADDER": {
    "name": "Maintenance Ladder",
    "w": 27,
    "arm": 14940,
    "normally": false,
    "maintenanceIncluded": false
  },
  "RF_SAR_EQUIPMENT_CASEVAC_RACK_FWD_PORT": {
    "name": "CASEVAC Stretcher Rack — FWD PORT",
    "w": 30.0225,
    "arm": 7898,
    "normally": false,
    "maintenanceIncluded": false,
    "source": "RFM positions supplied by user; one quarter of the 120.09 kg four-rack system, including litters"
  },
  "RF_SAR_EQUIPMENT_CASEVAC_RACK_FWD_STBD": {
    "name": "CASEVAC Stretcher Rack — FWD STBD",
    "w": 30.0225,
    "arm": 6120,
    "normally": false,
    "maintenanceIncluded": false,
    "source": "RFM positions supplied by user; one quarter of the 120.09 kg four-rack system, including litters"
  },
  "RF_SAR_EQUIPMENT_CASEVAC_RACK_AFT_PORT": {
    "name": "CASEVAC Stretcher Rack — AFT PORT",
    "w": 30.0225,
    "arm": 10235,
    "normally": false,
    "maintenanceIncluded": false,
    "source": "RFM positions supplied by user; one quarter of the 120.09 kg four-rack system, including litters"
  },
  "RF_SAR_EQUIPMENT_CASEVAC_RACK_AFT_STBD": {
    "name": "CASEVAC Stretcher Rack — AFT STBD",
    "w": 30.0225,
    "arm": 10057,
    "normally": false,
    "maintenanceIncluded": false,
    "source": "RFM positions supplied by user; one quarter of the 120.09 kg four-rack system, including litters"
  }
};

// SECTION 9 — MISSION EQUIPMENT
const AC_MISSION_EQUIP = {
  "ME_CREW_PERSONAL_EQUIP_AIRCRAFT_COMMANDER_B25": {
    "name": "B25 — Aircraft Commander",
    "unitWeight": 20,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "PORT_FWD_SHELF_MID",
    "group": "CREW PERSONAL EQUIP",
    "active": true
  },
  "ME_CREW_PERSONAL_EQUIP_AIRCRAFT_COMMANDER_RON_BAG": {
    "name": "RON BAG — Aircraft Commander",
    "unitWeight": 10,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "SAR_CABINET_FWD_BTM",
    "group": "CREW PERSONAL EQUIP",
    "active": true
  },
  "ME_CREW_PERSONAL_EQUIP_AIRCRAFT_COMMANDER_EFB_BAG": {
    "name": "EFB BAG — Aircraft Commander",
    "unitWeight": 5,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "CUSTOM",
    "group": "CREW PERSONAL EQUIP",
    "active": true,
    "customArm": 3473
  },
  "ME_CREW_PERSONAL_EQUIP_FIRST_OFFICER_B25": {
    "name": "B25 — First Officer",
    "unitWeight": 20,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "PORT_FWD_SHELF_TOP",
    "group": "CREW PERSONAL EQUIP",
    "active": true
  },
  "ME_CREW_PERSONAL_EQUIP_FIRST_OFFICER_RON_BAG": {
    "name": "RON BAG — First Officer",
    "unitWeight": 10,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "SAR_CABINET_FWD_BTM",
    "group": "CREW PERSONAL EQUIP",
    "active": true
  },
  "ME_CREW_PERSONAL_EQUIP_FIRST_OFFICER_EFB_BAG": {
    "name": "EFB BAG — First Officer",
    "unitWeight": 5,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "CUSTOM",
    "group": "CREW PERSONAL EQUIP",
    "active": true,
    "customArm": 3473
  },
  "ME_CREW_PERSONAL_EQUIP_FLIGHT_ENGINEER_B25": {
    "name": "B25 — Flight Engineer",
    "unitWeight": 20,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "PORT_FWD_SHELF_BOT",
    "group": "CREW PERSONAL EQUIP",
    "active": true
  },
  "ME_CREW_PERSONAL_EQUIP_FLIGHT_ENGINEER_RON_BAG": {
    "name": "RON BAG — Flight Engineer",
    "unitWeight": 10,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "SAR_CABINET_FWD_BTM",
    "group": "CREW PERSONAL EQUIP",
    "active": true
  },
  "ME_CREW_PERSONAL_EQUIP_FLIGHT_ENGINEER_HELMET_BAG": {
    "name": "HELMET BAG — Flight Engineer",
    "unitWeight": 10,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "CUSTOM",
    "group": "CREW PERSONAL EQUIP",
    "active": true,
    "customArm": 6262
  },
  "ME_CREW_PERSONAL_EQUIP_ST_TEAM_LEAD_B25": {
    "name": "B25 / Dive Gear — ST Team Lead",
    "unitWeight": 40,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "RAMP_PORT_FWD",
    "group": "CREW PERSONAL EQUIP",
    "active": true
  },
  "ME_CREW_PERSONAL_EQUIP_ST_TEAM_LEAD_RON_BAG": {
    "name": "RON BAG — ST Team Lead",
    "unitWeight": 10,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "RAMP_PORT_AFT",
    "group": "CREW PERSONAL EQUIP",
    "active": true
  },
  "ME_CREW_PERSONAL_EQUIP_ST_TEAM_LEAD_HOIST_BAG": {
    "name": "HOIST BAG — ST Team Lead",
    "unitWeight": 10,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "CUSTOM",
    "group": "CREW PERSONAL EQUIP",
    "active": true,
    "customArm": 8244
  },
  "ME_CREW_PERSONAL_EQUIP_ST_TEAM_MEMBER_B25": {
    "name": "B25 / Dive Gear — ST Team Member",
    "unitWeight": 40,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "RAMP_STBD_FWD",
    "group": "CREW PERSONAL EQUIP",
    "active": true
  },
  "ME_CREW_PERSONAL_EQUIP_ST_TEAM_MEMBER_RON_BAG": {
    "name": "RON BAG — ST Team Member",
    "unitWeight": 10,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "RAMP_STBD_AFT",
    "group": "CREW PERSONAL EQUIP",
    "active": true
  },
  "ME_CREW_PERSONAL_EQUIP_ST_TEAM_MEMBER_HOIST_BAG": {
    "name": "HOIST BAG — ST Team Member",
    "unitWeight": 10,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "CUSTOM",
    "group": "CREW PERSONAL EQUIP",
    "active": true,
    "customArm": 9234
  },
  "ME_AIRCRAFT_ALSE_EQUIP_ARCTIC_KIT_A": {
    "name": "Arctic Kit A",
    "unitWeight": 23,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "SAR_CABINET_TOP",
    "group": "AIRCRAFT ALSE EQUIP",
    "active": true
  },
  "ME_AIRCRAFT_ALSE_EQUIP_ARCTIC_KIT_B": {
    "name": "Arctic Kit B",
    "unitWeight": 20,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "SAR_CABINET_FWD_TOP",
    "group": "AIRCRAFT ALSE EQUIP",
    "active": true,
    "description": "Specific missions only — winter months"
  },
  "ME_AIRCRAFT_ALSE_EQUIP_SLEEP_KIT": {
    "name": "Sleep Kit",
    "unitWeight": 12,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "SAR_CABINET_TOP",
    "group": "AIRCRAFT ALSE EQUIP",
    "active": true
  },
  "ME_AIRCRAFT_ALSE_EQUIP_BASIC_KIT": {
    "name": "Basic Kit",
    "unitWeight": 18.2,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "SAR_CABINET_TOP",
    "group": "AIRCRAFT ALSE EQUIP",
    "active": true
  },
  "ME_AIRCRAFT_ALSE_EQUIP_PAX_LIFE_VESTS": {
    "name": "PAX Life Vests",
    "unitWeight": 1.8,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "SAR_CABINET_TOP",
    "group": "AIRCRAFT ALSE EQUIP",
    "active": true
  },
  "ME_AIRCRAFT_ALSE_EQUIP_QUICK_DON_IMMERSION_SUITS": {
    "name": "Quick Don Immersion Suits",
    "unitWeight": 3.25,
    "defaultQuantity": 3,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "SAR_CABINET_UPPER",
    "group": "AIRCRAFT ALSE EQUIP",
    "active": true
  },
  "ME_SAR_MEDICAL_EQUIP_PENETRATION_KIT": {
    "name": "Penetration Kit",
    "unitWeight": 14.35,
    "defaultQuantity": 2,
    "missionQuantityEditable": true,
    "minQuantity": 0,
    "stow": "SAR_CABINET_MIDDLE",
    "group": "SAR MEDICAL EQUIP",
    "active": true
  },
  "ME_SAR_MEDICAL_EQUIP_SUPPLEMENTAL_KIT": {
    "name": "Supplemental Kit",
    "unitWeight": 15.9,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "SAR_CABINET_MIDDLE",
    "group": "SAR MEDICAL EQUIP",
    "active": true
  },
  "ME_SAR_MEDICAL_EQUIP_AED": {
    "name": "AED",
    "unitWeight": 3.7,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "SAR_CABINET_MIDDLE",
    "group": "SAR MEDICAL EQUIP",
    "active": true
  },
  "ME_SAR_MEDICAL_EQUIP_CASUALTY_BAG": {
    "name": "Casualty Bag",
    "unitWeight": 2.5,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "SAR_CABINET_MIDDLE",
    "group": "SAR MEDICAL EQUIP",
    "active": true
  },
  "ME_SAR_MEDICAL_EQUIP_MED_SLED": {
    "name": "Med Sled",
    "unitWeight": 15,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "SAR_CABINET_BOTTOM",
    "group": "SAR MEDICAL EQUIP",
    "active": true
  },
  "ME_SAR_MEDICAL_EQUIP_NARCOTICS_KIT": {
    "name": "Narcotics Kit",
    "unitWeight": 0.5,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "OVERHEAD_PORT",
    "group": "SAR MEDICAL EQUIP",
    "active": true
  },
  "ME_SAR_MEDICAL_EQUIP_AVIOX_O2_PRIMARY": {
    "name": "AviOx O2 Primary",
    "unitWeight": 8.35,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "PTA_COT_AREA",
    "group": "SAR MEDICAL EQUIP",
    "active": true
  },
  "ME_SAR_MEDICAL_EQUIP_AVIOX_O2_SPARE_BOTTLES": {
    "name": "AviOx O2 Spare Bottles",
    "unitWeight": 12.7,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "PTA_COT_AREA",
    "group": "SAR MEDICAL EQUIP",
    "active": true
  },
  "ME_SAR_MISSION_EQUIP_NVG_SET_AND_CASE": {
    "name": "NVG Set and Case",
    "unitWeight": 1.25,
    "defaultQuantity": 5,
    "missionQuantityEditable": true,
    "minQuantity": 0,
    "stow": "LOCKBOX_TOP",
    "defaultAllocations": [
      {
        "quantity": 4,
        "stow": "LOCKBOX_TOP"
      },
      {
        "quantity": 1,
        "stow": "LOCKBOX_BTM"
      }
    ],
    "group": "SAR MISSION EQUIP",
    "active": true
  },
  "ME_SAR_MISSION_EQUIP_STOKES_LITTER_FLOTATION_KIT": {
    "name": "Stokes Litter Flotation Kit",
    "unitWeight": 2.5,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "CUSTOM",
    "group": "SAR MISSION EQUIP",
    "active": true,
    "customArm": 14940
  },
  "ME_SAR_MISSION_EQUIP_HOIST_KIT": {
    "name": "Hoist Kit incl Short/Long Rescue Collar",
    "unitWeight": 2.5,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "CABINET_TOP_SURFACE",
    "group": "SAR MISSION EQUIP",
    "active": true
  },
  "ME_SAR_MISSION_EQUIP_GUIDELINE": {
    "name": "Guideline",
    "unitWeight": 5,
    "defaultQuantity": 2,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "BASKET",
    "group": "SAR MISSION EQUIP",
    "active": true,
    "followBasket": true
  },
  "ME_SAR_MISSION_EQUIP_GUIDELINE_WEIGHT": {
    "name": "Guideline Weight",
    "unitWeight": 2,
    "defaultQuantity": 2,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "BASKET",
    "group": "SAR MISSION EQUIP",
    "active": true,
    "followBasket": true
  },
  "ME_SAR_MISSION_EQUIP_MOUNTAIN_LINK": {
    "name": "Mountain Link",
    "unitWeight": 0.5,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "CABINET_TOP_SURFACE",
    "group": "SAR MISSION EQUIP",
    "active": true
  },
  "ME_SAR_MISSION_EQUIP_STOKES_LITTER_CABIN": {
    "name": "Stokes Litter (Cabin)",
    "unitWeight": 49,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "CABIN_DEPLOYED",
    "group": "SAR MISSION EQUIP",
    "active": true
  },
  "ME_SAR_MISSION_EQUIP_STOKES_LITTER_RAMP": {
    "name": "Stokes Litter (Ramp)",
    "unitWeight": 49,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "RAMP_STOW",
    "group": "SAR MISSION EQUIP",
    "active": true
  },
  "ME_SAR_MISSION_EQUIP_RESCUE_BASKET_PORT": {
    "name": "Rescue Basket (Port)",
    "unitWeight": 31.8,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "CABIN_PORT_STOW",
    "group": "SAR MISSION EQUIP",
    "active": true,
    "isBasket": true
  },
  "ME_SAR_MISSION_EQUIP_RESCUE_BASKET_STBD": {
    "name": "Rescue Basket (Stbd)",
    "unitWeight": 31.8,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "CABIN_STBD_STOW",
    "group": "SAR MISSION EQUIP",
    "active": true,
    "isBasket": true
  },
  "ME_SAR_MISSION_EQUIP_COMMS_BAG": {
    "name": "Comms Bag",
    "unitWeight": 8.6,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "SAR_CABINET_MIDDLE",
    "group": "SAR MISSION EQUIP",
    "active": true
  },
  "ME_SAR_MISSION_EQUIP_CAMP_KIT": {
    "name": "Camp Kit",
    "unitWeight": 22,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "SAR_CABINET_BOTTOM",
    "group": "SAR MISSION EQUIP",
    "active": true
  },
  "ME_SAR_MISSION_EQUIP_DRILL_KIT": {
    "name": "Drill Kit",
    "unitWeight": 8.25,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "SAR_CABINET_BOTTOM",
    "group": "SAR MISSION EQUIP",
    "active": true
  },
  "ME_SAR_MISSION_EQUIP_ROPE_LOWERING_SYSTEM": {
    "name": "Rope Lowering System",
    "unitWeight": 13,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "SAR_CABINET_BOTTOM",
    "group": "SAR MISSION EQUIP",
    "active": true
  },
  "ME_SAR_MISSION_EQUIP_ROPE_RESCUE_KIT": {
    "name": "Rope Rescue Kit",
    "unitWeight": 22,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "SAR_CABINET_BOTTOM",
    "group": "SAR MISSION EQUIP",
    "active": true
  },
  "ME_SAR_MISSION_EQUIP_FORCE_EXTRACTION_TOOL": {
    "name": "Force Extraction Tool",
    "unitWeight": 4.2,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "SAR_CABINET_BOTTOM",
    "group": "SAR MISSION EQUIP",
    "active": true
  },
  "ME_SAR_MISSION_EQUIP_SAR_RIFLE": {
    "name": "SAR Rifle",
    "unitWeight": 5,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "OVERHEAD_STBD",
    "group": "SAR MISSION EQUIP",
    "active": true
  },
  "ME_SAR_MISSION_EQUIP_SAR_SHOTGUN": {
    "name": "SAR Shotgun",
    "unitWeight": 5,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "OVERHEAD_STBD",
    "group": "SAR MISSION EQUIP",
    "active": true,
    "description": "When carried"
  },
  "ME_SAR_MISSION_EQUIP_HUMAN_REMAINS_BAG": {
    "name": "Human Remains Bag",
    "unitWeight": 4,
    "defaultQuantity": 2,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "SAR_CABINET_BOTTOM",
    "group": "SAR MISSION EQUIP",
    "active": true
  },
  "ME_SAR_MISSION_EQUIP_TALON_STRETCHER": {
    "name": "Talon Stretcher",
    "unitWeight": 6.5,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "PTA_COT_AREA",
    "group": "SAR MISSION EQUIP",
    "active": true
  },
  "ME_SAR_MISSION_EQUIP_MISCELLANEOUS_BAG": {
    "name": "Miscellaneous Bag",
    "unitWeight": 3,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "SAR_CABINET_MIDDLE",
    "group": "SAR MISSION EQUIP",
    "active": true
  },
  "ME_SAR_MISSION_EQUIP_ALPINE_KIT": {
    "name": "Alpine Kit",
    "unitWeight": 18.35,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "SAR_CABINET_BOTTOM",
    "group": "SAR MISSION EQUIP",
    "active": true,
    "description": "Specific missions only"
  },
  "ME_SAR_MISSION_EQUIP_OPERATIONAL_DIVE_KIT_BOTTLES": {
    "name": "Operational Dive Kit (Bottles)",
    "unitWeight": 80,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "BAY55",
    "group": "SAR MISSION EQUIP",
    "active": true,
    "description": "Specific missions only"
  },
  "ME_SAR_MISSION_EQUIP_OPERATIONAL_DIVE_KIT_EQUIP": {
    "name": "Operational Dive Kit (Equip)",
    "unitWeight": 80,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "BAY55",
    "group": "SAR MISSION EQUIP",
    "active": true,
    "description": "Specific missions only"
  },
  "ME_SAR_MISSION_EQUIP_REEL_SPLINT": {
    "name": "Reel Splint",
    "unitWeight": 4.5,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "SAR_CABINET_BOTTOM",
    "group": "SAR MISSION EQUIP",
    "active": true,
    "description": "Specific missions only"
  },
  "ME_CREW_COMFORT_EQUIP_BMS_BOX": {
    "name": "BMS Box",
    "unitWeight": 11,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "SAR_CABINET_FWD_BTM",
    "group": "CREW COMFORT EQUIP",
    "active": true
  },
  "ME_CREW_COMFORT_EQUIP_WATER_BOTTLE_STORAGE_BAG": {
    "name": "Water Bottle Storage Bag",
    "unitWeight": 7.5,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "SAR_CABINET_UPPER",
    "group": "CREW COMFORT EQUIP",
    "active": true,
    "followBasket": false
  },
  "ME_SERVICING_EQUIP_POL_CONTAINER_AND_POL": {
    "name": "POL Container and POL",
    "unitWeight": 11,
    "defaultQuantity": 1,
    "missionQuantityEditable": false,
    "minQuantity": 0,
    "stow": "SAR_CABINET_FWD_BTM",
    "group": "SERVICING EQUIP",
    "active": true,
    "alwaysInclude": false
  },
  "ME_PORT_FWD_SHELF_TOP": {
    "name": "Port Fwd Shelf Top",
    "w": 0,
    "stow": "PORT_FWD_SHELF_TOP",
    "group": "Stowage"
  },
  "ME_PORT_FWD_SHELF_MID": {
    "name": "Port Fwd Shelf Middle",
    "w": 0,
    "stow": "PORT_FWD_SHELF_MID",
    "group": "Stowage"
  },
  "ME_PORT_FWD_SHELF_BOT": {
    "name": "Port Fwd Shelf Bottom",
    "w": 0,
    "stow": "PORT_FWD_SHELF_BOT",
    "group": "Stowage"
  },
  "ME_RAMP_SHELF_PORT_FWD": {
    "name": "Ramp Shelf Port Fwd",
    "w": 0,
    "stow": "RAMP_PORT_FWD",
    "group": "Stowage"
  },
  "ME_RAMP_SHELF_PORT_AFT": {
    "name": "Ramp Shelf Port Aft",
    "w": 0,
    "stow": "RAMP_PORT_AFT",
    "group": "Stowage"
  },
  "ME_RAMP_SHELF_STBD_FWD": {
    "name": "Ramp Shelf Stbd Fwd",
    "w": 0,
    "stow": "RAMP_STBD_FWD",
    "group": "Stowage"
  },
  "ME_RAMP_SHELF_STBD_AFT": {
    "name": "Ramp Shelf Stbd Aft",
    "w": 0,
    "stow": "RAMP_STBD_AFT",
    "group": "Stowage"
  },
  "ME_OVERHEAD_PORT": {
    "name": "Overhead Bin (Port)",
    "w": 0,
    "stow": "OVERHEAD_PORT",
    "group": "Stowage"
  },
  "ME_OVERHEAD_STBD": {
    "name": "Overhead Bin (Stbd)",
    "w": 0,
    "stow": "OVERHEAD_STBD",
    "group": "Stowage"
  },
  "ME_AIRCRAFT_ALSE_EQUIP_INTERNAL_LIFE_RAFT": {
    "name": "Internal 10 Pers Life Raft",
    "unitWeight": 50,
    "defaultQuantity": 1,
    "minQuantity": 0,
    "missionQuantityEditable": false,
    "active": true,
    "stow": "INT_LIFE_RAFT_B3_STBD_F",
    "group": "AIRCRAFT ALSE EQUIP",
    "followBasket": false,
    "description": "Fitted only when personnel carried on board is expected to exceed the capacity of the external life rafts"
  }
};

// SECTION 10 — MISSION PRESETS
const AC_PRESETS = {
  "SAR3": {
    "name": "SAR-3 Pax",
    "displayOrder": 1,
    "notes": "EO/IR + Sensor WS + SAR Cabinet + PTA Cot installed.",
    "image": "images/SAR_3_Pax.png",
    "seats": {
      "crew": [
        "C1",
        "C2",
        "C3",
        "C4",
        "C5",
        "C6"
      ],
      "pax": [
        "P1",
        "P2",
        "P3"
      ]
    },
    "occupants": [
      "C1",
      "C2",
      "C4",
      "C5",
      "C6"
    ],
    "roleFitOn": [
      "RF_AIRCRAFT_SYSTEMS_SECONDARY_HOIST",
      "RF_SENSOR_SYSTEMS_TRAKKA_SRCHLT",
      "RF_AIRCRAFT_SYSTEMS_SEA_TRAY",
      "RF_SAR_EQUIPMENT_DIVE_O2_BOTTLE_RACK",
      "RF_AIRCRAFT_SYSTEMS_AIR_COOLING_PACK",
      "RF_AIRCRAFT_SYSTEMS_FLOATATION_SYSTEM",
      "RF_AIRCRAFT_SYSTEMS_SPONSON_LIFERAFTS",
      "RF_SERVICING_EQUIPMENT_LASHING_KIT",
      "RF_ICE_PROTECTION_RIPU",
      "RF_ICE_PROTECTION_RIPU_CABLES",
      "RF_ICE_PROTECTION_MR_SLIP_RING",
      "RF_ICE_PROTECTION_TR_SLIP_RING",
      "RF_SERVICING_EQUIPMENT_FIELD_TOOL_KIT",
      "RF_STOW_TOOLKIT",
      "RF_STOW_STOKES_RAMP",
      "RF_STOW_STOKES_CABIN",
      "RF_STOW_BASKET_PORT",
      "RF_STOW_BASKET_STBD",
      "RF_SENSOR_SYSTEMS_EOIR_TURRET",
      "RF_SENSOR_SYSTEMS_SENSOR_WORKSTATION",
      "RF_SAR_EQUIPMENT_CSH_PATIENT_TREATMENT_SYSTEM",
      "RF_SAR_EQUIPMENT_FWD_SAR_CABINET",
      "RF_SENSOR_SYSTEMS_EOIR_HAND_CONTROLLER",
      "RF_SERVICING_EQUIPMENT_CODE_A_EQUIP",
      "RF_SENSOR_SYSTEMS_EOIR_BLANKING",
      "RF_SENSOR_SYSTEMS_EOIR_STRUCT_FITTINGS",
      "RF_SENSOR_SYSTEMS_EOIR_REMOVABLE_CABLES",
      "RF_AIRCRAFT_SYSTEMS_CARRY_ON_EQUIP_ICS_CABLES_PAX",
      "RF_AIRCRAFT_SYSTEMS_CARRY_ON_EQUIP_ICS_CABLES_CREW",
      "RF_SERVICING_EQUIPMENT_CARRY_ON_EQUIP_LADDER"
    ],
    "roleFitOff": [],
    "missionOn": [
      "ME_SAR_MEDICAL_EQUIP_MED_SLED",
      "ME_SAR_MISSION_EQUIP_MOUNTAIN_LINK",
      "ME_SAR_MISSION_EQUIP_CAMP_KIT",
      "ME_SAR_MISSION_EQUIP_DRILL_KIT",
      "ME_SAR_MISSION_EQUIP_ROPE_LOWERING_SYSTEM",
      "ME_SAR_MISSION_EQUIP_ROPE_RESCUE_KIT",
      "ME_SAR_MISSION_EQUIP_FORCE_EXTRACTION_TOOL",
      "ME_SAR_MEDICAL_EQUIP_PENETRATION_KIT",
      "ME_SAR_MEDICAL_EQUIP_SUPPLEMENTAL_KIT",
      "ME_SAR_MEDICAL_EQUIP_AED",
      "ME_SAR_MEDICAL_EQUIP_CASUALTY_BAG",
      "ME_SAR_MISSION_EQUIP_MISCELLANEOUS_BAG",
      "ME_SAR_MEDICAL_EQUIP_AVIOX_O2_PRIMARY",
      "ME_SAR_MEDICAL_EQUIP_AVIOX_O2_SPARE_BOTTLES",
      "ME_AIRCRAFT_ALSE_EQUIP_ARCTIC_KIT_A",
      "ME_AIRCRAFT_ALSE_EQUIP_SLEEP_KIT",
      "ME_AIRCRAFT_ALSE_EQUIP_BASIC_KIT",
      "ME_AIRCRAFT_ALSE_EQUIP_PAX_LIFE_VESTS",
      "ME_SAR_MISSION_EQUIP_RESCUE_BASKET_STBD",
      "ME_SAR_MISSION_EQUIP_STOKES_LITTER_RAMP",
      "ME_AIRCRAFT_ALSE_EQUIP_QUICK_DON_IMMERSION_SUITS",
      "ME_SAR_MISSION_EQUIP_NVG_SET_AND_CASE",
      "ME_SAR_MISSION_EQUIP_SAR_RIFLE",
      "ME_SAR_MEDICAL_EQUIP_NARCOTICS_KIT",
      "ME_PORT_FWD_SHELF_TOP",
      "ME_PORT_FWD_SHELF_MID",
      "ME_PORT_FWD_SHELF_BOT",
      "ME_RAMP_SHELF_PORT_FWD",
      "ME_RAMP_SHELF_PORT_AFT",
      "ME_RAMP_SHELF_STBD_FWD",
      "ME_RAMP_SHELF_STBD_AFT",
      "ME_OVERHEAD_PORT",
      "ME_OVERHEAD_STBD",
      "ME_CREW_PERSONAL_EQUIP_ST_TEAM_LEAD_B25",
      "ME_CREW_PERSONAL_EQUIP_ST_TEAM_MEMBER_B25",
      "ME_CREW_PERSONAL_EQUIP_FIRST_OFFICER_B25",
      "ME_CREW_PERSONAL_EQUIP_FLIGHT_ENGINEER_B25",
      "ME_CREW_PERSONAL_EQUIP_AIRCRAFT_COMMANDER_B25",
      "ME_CREW_PERSONAL_EQUIP_ST_TEAM_MEMBER_HOIST_BAG",
      "ME_CREW_PERSONAL_EQUIP_ST_TEAM_LEAD_HOIST_BAG",
      "ME_CREW_PERSONAL_EQUIP_FIRST_OFFICER_EFB_BAG",
      "ME_CREW_PERSONAL_EQUIP_FLIGHT_ENGINEER_HELMET_BAG",
      "ME_CREW_PERSONAL_EQUIP_AIRCRAFT_COMMANDER_EFB_BAG",
      "ME_SAR_MISSION_EQUIP_STOKES_LITTER_FLOTATION_KIT",
      "ME_SAR_MISSION_EQUIP_HOIST_KIT",
      "ME_SAR_MISSION_EQUIP_GUIDELINE",
      "ME_SAR_MISSION_EQUIP_GUIDELINE_WEIGHT",
      "ME_SAR_MISSION_EQUIP_COMMS_BAG",
      "ME_SAR_MISSION_EQUIP_HUMAN_REMAINS_BAG",
      "ME_SAR_MISSION_EQUIP_TALON_STRETCHER",
      "ME_CREW_COMFORT_EQUIP_BMS_BOX",
      "ME_CREW_COMFORT_EQUIP_WATER_BOTTLE_STORAGE_BAG",
      "ME_SERVICING_EQUIP_POL_CONTAINER_AND_POL"
    ],
    "missionOff": [],
    "active": true
  },
  "SAR10": {
    "name": "SAR-10 Pax",
    "displayOrder": 2,
    "notes": "PTA Cot removed vs SAR-3.",
    "image": "images/SAR_10_Pax.png",
    "seats": {
      "crew": [
        "C1",
        "C2",
        "C3",
        "C4",
        "C5",
        "C6"
      ],
      "pax": [
        "P1",
        "P9",
        "P10",
        "P2",
        "P3",
        "P17",
        "P16",
        "P15",
        "P12",
        "P11"
      ]
    },
    "occupants": [
      "C1",
      "C2",
      "C4",
      "C5",
      "C6"
    ],
    "roleFitOn": [
      "RF_AIRCRAFT_SYSTEMS_SECONDARY_HOIST",
      "RF_SENSOR_SYSTEMS_TRAKKA_SRCHLT",
      "RF_AIRCRAFT_SYSTEMS_SEA_TRAY",
      "RF_SAR_EQUIPMENT_DIVE_O2_BOTTLE_RACK",
      "RF_AIRCRAFT_SYSTEMS_AIR_COOLING_PACK",
      "RF_AIRCRAFT_SYSTEMS_FLOATATION_SYSTEM",
      "RF_AIRCRAFT_SYSTEMS_SPONSON_LIFERAFTS",
      "RF_SERVICING_EQUIPMENT_LASHING_KIT",
      "RF_ICE_PROTECTION_RIPU",
      "RF_ICE_PROTECTION_RIPU_CABLES",
      "RF_ICE_PROTECTION_MR_SLIP_RING",
      "RF_ICE_PROTECTION_TR_SLIP_RING",
      "RF_SERVICING_EQUIPMENT_FIELD_TOOL_KIT",
      "RF_STOW_TOOLKIT",
      "RF_STOW_STOKES_RAMP",
      "RF_STOW_STOKES_CABIN",
      "RF_STOW_BASKET_PORT",
      "RF_STOW_BASKET_STBD",
      "RF_SENSOR_SYSTEMS_EOIR_TURRET",
      "RF_SENSOR_SYSTEMS_SENSOR_WORKSTATION",
      "RF_SAR_EQUIPMENT_FWD_SAR_CABINET",
      "RF_SENSOR_SYSTEMS_EOIR_HAND_CONTROLLER",
      "RF_SERVICING_EQUIPMENT_CODE_A_EQUIP",
      "RF_SENSOR_SYSTEMS_EOIR_BLANKING",
      "RF_SENSOR_SYSTEMS_EOIR_STRUCT_FITTINGS",
      "RF_SENSOR_SYSTEMS_EOIR_REMOVABLE_CABLES",
      "RF_AIRCRAFT_SYSTEMS_CARRY_ON_EQUIP_ICS_CABLES_PAX",
      "RF_AIRCRAFT_SYSTEMS_CARRY_ON_EQUIP_ICS_CABLES_CREW",
      "RF_SERVICING_EQUIPMENT_CARRY_ON_EQUIP_LADDER"
    ],
    "roleFitOff": [
      "RF_SAR_EQUIPMENT_CSH_PATIENT_TREATMENT_SYSTEM"
    ],
    "missionOn": [
      "ME_SAR_MEDICAL_EQUIP_MED_SLED",
      "ME_SAR_MISSION_EQUIP_MOUNTAIN_LINK",
      "ME_SAR_MISSION_EQUIP_CAMP_KIT",
      "ME_SAR_MISSION_EQUIP_DRILL_KIT",
      "ME_SAR_MISSION_EQUIP_ROPE_LOWERING_SYSTEM",
      "ME_SAR_MISSION_EQUIP_ROPE_RESCUE_KIT",
      "ME_SAR_MISSION_EQUIP_FORCE_EXTRACTION_TOOL",
      "ME_SAR_MEDICAL_EQUIP_PENETRATION_KIT",
      "ME_SAR_MEDICAL_EQUIP_SUPPLEMENTAL_KIT",
      "ME_SAR_MEDICAL_EQUIP_AED",
      "ME_SAR_MEDICAL_EQUIP_CASUALTY_BAG",
      "ME_SAR_MISSION_EQUIP_MISCELLANEOUS_BAG",
      "ME_SAR_MEDICAL_EQUIP_AVIOX_O2_PRIMARY",
      "ME_SAR_MEDICAL_EQUIP_AVIOX_O2_SPARE_BOTTLES",
      "ME_AIRCRAFT_ALSE_EQUIP_ARCTIC_KIT_A",
      "ME_AIRCRAFT_ALSE_EQUIP_SLEEP_KIT",
      "ME_AIRCRAFT_ALSE_EQUIP_BASIC_KIT",
      "ME_AIRCRAFT_ALSE_EQUIP_PAX_LIFE_VESTS",
      "ME_SAR_MISSION_EQUIP_RESCUE_BASKET_PORT",
      "ME_SAR_MISSION_EQUIP_STOKES_LITTER_RAMP",
      "ME_AIRCRAFT_ALSE_EQUIP_QUICK_DON_IMMERSION_SUITS",
      "ME_SAR_MISSION_EQUIP_NVG_SET_AND_CASE",
      "ME_SAR_MISSION_EQUIP_SAR_RIFLE",
      "ME_SAR_MEDICAL_EQUIP_NARCOTICS_KIT",
      "ME_PORT_FWD_SHELF_TOP",
      "ME_PORT_FWD_SHELF_MID",
      "ME_PORT_FWD_SHELF_BOT",
      "ME_RAMP_SHELF_PORT_FWD",
      "ME_RAMP_SHELF_PORT_AFT",
      "ME_RAMP_SHELF_STBD_FWD",
      "ME_RAMP_SHELF_STBD_AFT",
      "ME_OVERHEAD_PORT",
      "ME_OVERHEAD_STBD",
      "ME_CREW_PERSONAL_EQUIP_ST_TEAM_LEAD_B25",
      "ME_CREW_PERSONAL_EQUIP_ST_TEAM_MEMBER_B25",
      "ME_CREW_PERSONAL_EQUIP_FIRST_OFFICER_B25",
      "ME_CREW_PERSONAL_EQUIP_FLIGHT_ENGINEER_B25",
      "ME_CREW_PERSONAL_EQUIP_AIRCRAFT_COMMANDER_B25",
      "ME_CREW_PERSONAL_EQUIP_ST_TEAM_MEMBER_HOIST_BAG",
      "ME_CREW_PERSONAL_EQUIP_ST_TEAM_LEAD_HOIST_BAG",
      "ME_CREW_PERSONAL_EQUIP_FIRST_OFFICER_EFB_BAG",
      "ME_CREW_PERSONAL_EQUIP_FLIGHT_ENGINEER_HELMET_BAG",
      "ME_CREW_PERSONAL_EQUIP_AIRCRAFT_COMMANDER_EFB_BAG",
      "ME_SAR_MISSION_EQUIP_STOKES_LITTER_FLOTATION_KIT",
      "ME_SAR_MISSION_EQUIP_HOIST_KIT",
      "ME_SAR_MISSION_EQUIP_GUIDELINE",
      "ME_SAR_MISSION_EQUIP_GUIDELINE_WEIGHT",
      "ME_SAR_MISSION_EQUIP_COMMS_BAG",
      "ME_SAR_MISSION_EQUIP_HUMAN_REMAINS_BAG",
      "ME_SAR_MISSION_EQUIP_TALON_STRETCHER",
      "ME_CREW_COMFORT_EQUIP_BMS_BOX",
      "ME_CREW_COMFORT_EQUIP_WATER_BOTTLE_STORAGE_BAG",
      "ME_SERVICING_EQUIP_POL_CONTAINER_AND_POL"
    ],
    "missionOff": [],
    "active": true
  },
  "CASEVAC": {
    "occupantRoles": {
      "P2": "SAR Tech",
      "P3": "SAR Tech"
    },
    "name": "CASEVAC",
    "displayOrder": 4,
    "notes": "Sensor WS removed; SAR cabinet removed; mission gear baseline off. Four independently selectable stretcher racks, 30.0225 kg each at their patient-position arms; total 120.09 kg including litters.",
    "image": "images/CASEVAC.png",
    "seats": {
      "crew": [
        "C1",
        "C2",
        "C3",
        "C4"
      ],
      "pax": [
        "P2",
        "P3"
      ]
    },
    "occupants": [
      "C1",
      "C2",
      "C4",
      "P2",
      "P3"
    ],
    "roleFitOn": [
      "RF_AIRCRAFT_SYSTEMS_SECONDARY_HOIST",
      "RF_SENSOR_SYSTEMS_TRAKKA_SRCHLT",
      "RF_AIRCRAFT_SYSTEMS_SEA_TRAY",
      "RF_SAR_EQUIPMENT_DIVE_O2_BOTTLE_RACK",
      "RF_AIRCRAFT_SYSTEMS_AIR_COOLING_PACK",
      "RF_AIRCRAFT_SYSTEMS_FLOATATION_SYSTEM",
      "RF_AIRCRAFT_SYSTEMS_SPONSON_LIFERAFTS",
      "RF_SERVICING_EQUIPMENT_LASHING_KIT",
      "RF_ICE_PROTECTION_RIPU",
      "RF_ICE_PROTECTION_RIPU_CABLES",
      "RF_ICE_PROTECTION_MR_SLIP_RING",
      "RF_ICE_PROTECTION_TR_SLIP_RING",
      "RF_SERVICING_EQUIPMENT_FIELD_TOOL_KIT",
      "RF_STOW_TOOLKIT",
      "RF_SENSOR_SYSTEMS_EOIR_TURRET",
      "RF_SERVICING_EQUIPMENT_CODE_A_EQUIP",
      "RF_SENSOR_SYSTEMS_EOIR_BLANKING",
      "RF_SENSOR_SYSTEMS_EOIR_STRUCT_FITTINGS",
      "RF_SENSOR_SYSTEMS_EOIR_REMOVABLE_CABLES",
      "RF_AIRCRAFT_SYSTEMS_CARRY_ON_EQUIP_ICS_CABLES_PAX",
      "RF_AIRCRAFT_SYSTEMS_CARRY_ON_EQUIP_ICS_CABLES_CREW",
      "RF_SERVICING_EQUIPMENT_CARRY_ON_EQUIP_LADDER",
      "RF_SAR_EQUIPMENT_CASEVAC_RACK_FWD_PORT",
      "RF_SAR_EQUIPMENT_CASEVAC_RACK_FWD_STBD",
      "RF_SAR_EQUIPMENT_CASEVAC_RACK_AFT_PORT",
      "RF_SAR_EQUIPMENT_CASEVAC_RACK_AFT_STBD"
    ],
    "roleFitOff": [
      "RF_SAR_EQUIPMENT_FWD_SAR_CABINET",
      "RF_SENSOR_SYSTEMS_SENSOR_WORKSTATION",
      "RF_SAR_EQUIPMENT_CSH_PATIENT_TREATMENT_SYSTEM",
      "RF_STOW_STOKES_RAMP",
      "RF_STOW_STOKES_CABIN",
      "RF_STOW_BASKET_PORT",
      "RF_STOW_BASKET_STBD"
    ],
    "missionOn": [
      "ME_OVERHEAD_PORT",
      "ME_OVERHEAD_STBD",
      "ME_CREW_PERSONAL_EQUIP_FIRST_OFFICER_B25",
      "ME_CREW_PERSONAL_EQUIP_FLIGHT_ENGINEER_B25",
      "ME_CREW_PERSONAL_EQUIP_AIRCRAFT_COMMANDER_B25",
      "ME_CREW_PERSONAL_EQUIP_FIRST_OFFICER_EFB_BAG",
      "ME_CREW_PERSONAL_EQUIP_FLIGHT_ENGINEER_HELMET_BAG",
      "ME_CREW_PERSONAL_EQUIP_AIRCRAFT_COMMANDER_EFB_BAG"
    ],
    "missionOff": [
      "ME_SAR_MEDICAL_EQUIP_MED_SLED",
      "ME_SAR_MISSION_EQUIP_MOUNTAIN_LINK",
      "ME_SAR_MISSION_EQUIP_CAMP_KIT",
      "ME_SAR_MISSION_EQUIP_DRILL_KIT",
      "ME_SAR_MISSION_EQUIP_ROPE_LOWERING_SYSTEM",
      "ME_SAR_MISSION_EQUIP_ROPE_RESCUE_KIT",
      "ME_SAR_MISSION_EQUIP_FORCE_EXTRACTION_TOOL",
      "ME_SAR_MISSION_EQUIP_RESCUE_BASKET_PORT",
      "ME_SAR_MISSION_EQUIP_RESCUE_BASKET_STBD",
      "ME_SAR_MISSION_EQUIP_STOKES_LITTER_RAMP",
      "ME_SAR_MISSION_EQUIP_STOKES_LITTER_CABIN",
      "ME_SAR_MEDICAL_EQUIP_PENETRATION_KIT",
      "ME_SAR_MEDICAL_EQUIP_SUPPLEMENTAL_KIT",
      "ME_SAR_MEDICAL_EQUIP_AED",
      "ME_SAR_MEDICAL_EQUIP_CASUALTY_BAG",
      "ME_SAR_MISSION_EQUIP_MISCELLANEOUS_BAG",
      "ME_SAR_MEDICAL_EQUIP_AVIOX_O2_PRIMARY",
      "ME_SAR_MEDICAL_EQUIP_AVIOX_O2_SPARE_BOTTLES",
      "ME_AIRCRAFT_ALSE_EQUIP_ARCTIC_KIT_A",
      "ME_AIRCRAFT_ALSE_EQUIP_SLEEP_KIT",
      "ME_AIRCRAFT_ALSE_EQUIP_BASIC_KIT",
      "ME_AIRCRAFT_ALSE_EQUIP_PAX_LIFE_VESTS",
      "ME_AIRCRAFT_ALSE_EQUIP_QUICK_DON_IMMERSION_SUITS",
      "ME_SAR_MISSION_EQUIP_NVG_SET_AND_CASE",
      "ME_SAR_MISSION_EQUIP_SAR_RIFLE",
      "ME_SAR_MEDICAL_EQUIP_NARCOTICS_KIT",
      "ME_PORT_FWD_SHELF_TOP",
      "ME_PORT_FWD_SHELF_MID",
      "ME_PORT_FWD_SHELF_BOT",
      "ME_RAMP_SHELF_PORT_FWD",
      "ME_RAMP_SHELF_PORT_AFT",
      "ME_RAMP_SHELF_STBD_FWD",
      "ME_RAMP_SHELF_STBD_AFT"
    ],
    "active": true
  },
  "TRANSPORT": {
    "name": "Transport",
    "displayOrder": 3,
    "notes": "Transport: SAR cabinet removed; Sensor WS removed; EO/IR + TRAKKA stay.",
    "image": "images/Transport.png",
    "seats": {
      "crew": [
        "C1",
        "C2",
        "C3",
        "C4"
      ],
      "pax": [
        "P1",
        "P2",
        "P3",
        "P4",
        "P5",
        "P6",
        "P7",
        "P8",
        "P9",
        "P10",
        "P11",
        "P12",
        "P15",
        "P16",
        "P17",
        "P18"
      ]
    },
    "occupants": [
      "C1",
      "C2",
      "C4"
    ],
    "roleFitOn": [
      "RF_AIRCRAFT_SYSTEMS_SECONDARY_HOIST",
      "RF_SENSOR_SYSTEMS_TRAKKA_SRCHLT",
      "RF_AIRCRAFT_SYSTEMS_SEA_TRAY",
      "RF_SAR_EQUIPMENT_DIVE_O2_BOTTLE_RACK",
      "RF_AIRCRAFT_SYSTEMS_AIR_COOLING_PACK",
      "RF_AIRCRAFT_SYSTEMS_FLOATATION_SYSTEM",
      "RF_AIRCRAFT_SYSTEMS_SPONSON_LIFERAFTS",
      "RF_SERVICING_EQUIPMENT_LASHING_KIT",
      "RF_SENSOR_SYSTEMS_EOIR_TURRET",
      "RF_ICE_PROTECTION_MR_SLIP_RING",
      "RF_ICE_PROTECTION_TR_SLIP_RING",
      "RF_SERVICING_EQUIPMENT_FIELD_TOOL_KIT",
      "RF_STOW_TOOLKIT",
      "RF_ICE_PROTECTION_RIPU",
      "RF_ICE_PROTECTION_RIPU_CABLES",
      "RF_SERVICING_EQUIPMENT_CODE_A_EQUIP",
      "RF_SENSOR_SYSTEMS_EOIR_BLANKING",
      "RF_SENSOR_SYSTEMS_EOIR_STRUCT_FITTINGS",
      "RF_SENSOR_SYSTEMS_EOIR_REMOVABLE_CABLES",
      "RF_AIRCRAFT_SYSTEMS_CARRY_ON_EQUIP_ICS_CABLES_PAX",
      "RF_AIRCRAFT_SYSTEMS_CARRY_ON_EQUIP_ICS_CABLES_CREW",
      "RF_SERVICING_EQUIPMENT_CARRY_ON_EQUIP_LADDER"
    ],
    "roleFitOff": [
      "RF_SAR_EQUIPMENT_FWD_SAR_CABINET",
      "RF_SENSOR_SYSTEMS_SENSOR_WORKSTATION"
    ],
    "missionOn": [
      "ME_OVERHEAD_PORT",
      "ME_OVERHEAD_STBD",
      "ME_CREW_PERSONAL_EQUIP_FIRST_OFFICER_B25",
      "ME_CREW_PERSONAL_EQUIP_FLIGHT_ENGINEER_B25",
      "ME_CREW_PERSONAL_EQUIP_AIRCRAFT_COMMANDER_B25",
      "ME_CREW_PERSONAL_EQUIP_FIRST_OFFICER_EFB_BAG",
      "ME_CREW_PERSONAL_EQUIP_FLIGHT_ENGINEER_HELMET_BAG",
      "ME_CREW_PERSONAL_EQUIP_AIRCRAFT_COMMANDER_EFB_BAG"
    ],
    "missionOff": [],
    "active": true
  }
};

// EXPORT
const AC = {
  meta:          AC_META,
  auth:          AC_AUTH,
  tails:         AC_TAILS,
  appOptions:    { allowRfmBasicWeight: true },
  envelope:      AC_ENVELOPE,
  bayArms:       AC_BAY_ARMS,
  ramp:          AC_RAMP,
  fuelTankArms:  AC_FUEL_TANK_ARMS,
  fuelStages:    AC_FUEL_STAGES,
  maxFuelKg:     AC_MAX_FUEL_KG,
  crewSeats:     AC_CREW_SEATS,
  paxSeats:      AC_PAX_SEATS,
  patientPositions: AC_PATIENT_POSITIONS,
  stowage:       AC_STOWAGE,
  roleFit:       AC_ROLE_FIT,
  missionEquip:  AC_MISSION_EQUIP,
  crewEquipmentPlacement: {
    seatAssociatedItems: [
      'ME_CREW_PERSONAL_EQUIP_AIRCRAFT_COMMANDER_RON_BAG',
      'ME_CREW_PERSONAL_EQUIP_AIRCRAFT_COMMANDER_EFB_BAG',
      'ME_CREW_PERSONAL_EQUIP_FIRST_OFFICER_RON_BAG',
      'ME_CREW_PERSONAL_EQUIP_FIRST_OFFICER_EFB_BAG',
      'ME_CREW_PERSONAL_EQUIP_FLIGHT_ENGINEER_RON_BAG',
      'ME_CREW_PERSONAL_EQUIP_FLIGHT_ENGINEER_HELMET_BAG',
      'ME_CREW_PERSONAL_EQUIP_ST_TEAM_LEAD_RON_BAG',
      'ME_CREW_PERSONAL_EQUIP_ST_TEAM_MEMBER_RON_BAG',
      'ME_CREW_PERSONAL_EQUIP_ST_TEAM_MEMBER_HOIST_BAG',
      'ME_CREW_PERSONAL_EQUIP_ST_TEAM_LEAD_HOIST_BAG'
    ],
    pilotFlightEngineerB25: [
      'ME_CREW_PERSONAL_EQUIP_AIRCRAFT_COMMANDER_B25',
      'ME_CREW_PERSONAL_EQUIP_FIRST_OFFICER_B25',
      'ME_CREW_PERSONAL_EQUIP_FLIGHT_ENGINEER_B25'
    ],
    pilotFlightEngineerB25Priority: ['RAMP_PORT_AFT','RAMP_STBD_AFT'],
    sarTechB25: [
      'ME_CREW_PERSONAL_EQUIP_ST_TEAM_LEAD_B25',
      'ME_CREW_PERSONAL_EQUIP_ST_TEAM_MEMBER_B25'
    ],
    sarTechB25Preferred: 'SAR_CABINET_FWD_BTM'
  },
  presets:       AC_PRESETS,
  tailConfigurations: {}
};

// Device overrides are validated and loaded by mission.js.
