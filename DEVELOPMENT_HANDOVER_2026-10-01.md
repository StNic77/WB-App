# CH-149-615 W&B — development handover

Updated: 1 October 2026. Scope: decisions and development in this conversation, through the Editor tab reordering and this documentation request. This is a decision and implementation record, not an approved operating publication or a verbatim transcript.

## Start here in a new conversation

Read this file, inspect the current working tree, and read `FUTURE_USER_TECHNICAL_MANUAL.md`. Treat the live files and subsequent user instructions as authoritative for the current implementation. Preserve uncommitted work and user changes to `config.js`.

The user wants incremental improvements to the working app, preserving its appearance and validated calculations. Discuss unresolved design choices in short pieces, agree each change, and implement when authorized. Do not reopen settled basic-weight accounting questions merely to reorganize the UI. Do not start broad cleanup, commit, push, or write the full manual merely because this handover mentions them.

### Workspace and release state

- Active repository: `C:\Users\sstni\Desktop\615 WB edit work\CH-149-615-WB - Active Dev`.
- Historical files and test outputs: sibling `Archive` directory. The former version-named active folder was renamed to make the working copy obvious; older material was preserved in Archive.
- Branch: `main`; origin: `https://github.com/StNic77/WB-App.git`.
- Latest commit pushed in this conversation: `88f71b2`, **Refine extra crew controls and configuration-based POL defaults**. Earlier milestone: `1e566f6`, **Rebuild mission equipment and configuration workflow for config v16**.
- App version: `0.2.13-dev`. Current working data version: **18**. Current service-worker release: **`v0.2.13-dev-c18-r6`**.
- October changes described below are **uncommitted and unpushed** at handover. This documentation request does not authorize a push.
- Latest release note: **“In development.”** The user explicitly requested this wording. Do not replace it with development summaries without instruction. Historical changelog entries remain historical.
- User supplied v17 locally, exported 1 October 2026, adding the internal life raft and its two named stowage locations. v18 builds on that file and preserves its supplied equipment values. The data revision was advanced to prevent older browser overrides from hiding the new stowage links.
- Local preview has been served at `http://127.0.0.1:6275/`; verify the server is still running before relying on it. The user also opens `index.html` directly from disk.

### Collaboration preferences

- Keep replies short and concrete; long reflected summaries make decisions harder for the user to follow.
- Distinguish a source document's proposed instructions from the user's authorization to execute.
- Explain what a control means operationally. Avoid using “configuration” ambiguously for both aircraft role and software/data revision.
- Preserve the look and feel; do not turn incremental work into a redesign.
- The intended routine is rapid: select aircraft, accept recorded weight/CG/fuel, choose role, use the standard load, certify, produce the record. Detailed controls support nonstandard sorties.
- Do not add confirmations solely because a new custodian data revision was received. Keep real missing-data, load, stowage, and accounting checks.

## Conversation milestones and settled decisions

### Equipment rebuild and accounting foundation

1. Replaced coarse mission equipment bundles with individual definitions using per-item weights and per-location quantities. Equipment owns mass/default location/default quantity; roles reference equipment IDs.
2. Preserved the distinction between physical fit and inclusion in recorded basic weight. Mission equipment normally adds to basic weight. Role-fit equipment may already be represented in the recorded weight or may be added for the selected role.
3. Normally fitted and included in recorded basic weight are separate stored properties, but some items are both in normal service. Do not infer weight inclusion solely from “Role Fit” classification. Delivered-aircraft weighing records will drive future custodian revisions.
4. RFM basic weight and recorded aircraft basic weight remain different starting bases. Accepted snapshots and recorded maintenance removals must not be silently replaced by current Editor defaults.
5. Added catalogue quantity properties and mission allocations. Mission adjustments never rewrite Editor defaults. Fixed routine items retain deliberate quantity adjustment for unusual loads.
6. Added named operational roles with create, duplicate, rename, edit, retire, and guarded deletion. Seat structures and occupants remain separate quantities in the accounting.
7. Preserved negative values/custom exceptions and the existing maintenance-exception workflow. Empty custom exceptions require no checkbox; actual entries require certification and edits invalidate that confirmation.

### Operational and report refinements

- Manual fuel has **no predicted burn trace**, in the app or PDF. Departure uses actual entered tanks; landing uses the mapped distribution for selected landing fuel. Mapped/stage mode retains its trace.
- Removed the fuel burn/endurance calculator. Tank bay labels: **T1 Bay 6, T2 Bay 3, T3 Bay 2, T4 Bay 1, T5 Bay 4**.
- PDF fuel details include distribution mode, tank contents, total fuel and combined fuel CG. Weight-and-balance summary distinguishes role-fit adjustment, seat structures, custom exceptions, mission equipment, occupants and other loads.
- Removed the repeated detailed role-fit adjustment list from the opening acceptance section. A brief direction points to the later role section and Appendix A, where adjustments are highlighted. Equipment names/details remain in their detailed sections.
- PDF local time uses the device time zone when formatted; UTC derives from the saved timestamp. This is not a saved snapshot of the original acceptance time zone. If the device time zone changes later, the displayed local representation may change.
- Role-fit controls remain: **Fitted · Included in Basic Weight; Not Fitted · Excluded from Basic Weight; Fitted · Added to Basic Weight; Not Fitted · Subtracted from Basic Weight**. Subtraction requires an additional explicit confirmation. Whether subtraction should eventually live solely in an exception workflow remains unresolved.
- Grey/green/uncoloured/yellow role-fit presentation describes defaults, selected role, and overrides; it must not substitute for the displayed weight adjustment. Removed the standalone “Normally Installed” grouping heading from operational Role Fit.
- Configuration seat checkbox columns and Seat Baseline columns were aligned. Faint alternating row shading connects seat names to their installed/occupied controls.
- No automatic coupling was added between EO/IR turret, structure, cables, blanking or hand controller. Their RFM entries remain individually controlled pending delivered-aircraft understanding.

### Extra crew and equipment

- **Add Crew & Equipment** in Crew and Pax Seats supports an extra Pilot, Flight Engineer, or SAR Tech in an available installed seat.
- Starting selections: Pilot B25 and EFB bag; FE B25 and helmet bag; SAR Tech B25/dive gear and hoist bag. RON bags are optional for all. Individual bag checkboxes can be changed.
- Worn personal equipment is already part of the applicable occupant weight; do not add an unsolicited explanatory note for professional aircrew.
- Each added bag receives its own mission allocation/location. Custom arm entry is available. A custom arm does not establish or validate a stowage capacity or restraint approval.
- Added-crew cards show the person, seat and associated bags/locations. **Remove crew member** removes the occupant and offers the existing choice to remove their bags or retain them aboard. Retained bags are detached from the removed person's ID.
- Shelf checks include existing loads and all proposed bags. An addition exceeding a defined shelf limit is blocked with the projected total and limit.
- Preset application retains linked extra-crew bags when the associated occupant remains in an installed seat. Mission overrides remain separate from catalogue defaults.

### POL decision — latest rule supersedes earlier proposals

- POL Container and POL: **11 kg**, mission equipment, default location **SAR cabinet Zone B**.
- Selected by default in **SAR-3 and SAR-10** via role membership.
- Available but not selected by default in **CASEVAC and Transport**.
- There is **no special rule automatically carrying POL simply because the cabinet is fitted**. That former rule was removed before commit `88f71b2`.
- If selected with an unavailable default location, the normal relocation requirement applies, just as for other equipment.

## October scope implemented in the working tree

The original scope document is `C:\Users\sstni\Desktop\CH-149-615_WB_Dev_Scope_2026-10-01.md`. The subsequent conversation refined it; the agreements below take precedence over earlier suggestions in that document.

### Role terminology and Editor tabs

- Operational **Mission Config** became **Role Config**; PDF **Mission Configuration** became **Role Configuration**. Internal IDs, preset names, storage keys and calculation objects were not renamed for cosmetic consistency.
- Latest Editor tab order and labels:
  1. Role Fit Equipment
  2. Mission Equipment
  3. Crew and Pax Seats
  4. Stowage Locations
  5. Reference Documents
  6. Aircraft Roles
- Aircraft Roles is the renamed Configurations tab. Its internal section ID remains `CONFIGURATIONS`; some explanatory/create/edit wording inside it still uses “configuration.” The last user request renamed/reordered the buttons, not every occurrence of that word.
- Reordering buttons did not change the Editor's initial `activeSection`, which remains `MISSION` unless changed during the session.

### Mission Equipment loading guide

- **Group By: Equipment Group / Stowage Location**. Equipment Group is the initial view and retains its existing equipment controls.
- Primary use: select aircraft, choose the role being prepared (for example SAR-3 Pax), go to Mission Equipment, switch to Stowage Location, and open each shelf/location to see what belongs there.
- Helper: **“Select the configuration you are preparing in Role Config. In Mission Equipment, switch Group By to Stowage Location, then open a location to see the equipment and quantities assigned there for the selected configuration.”** No extra “use this as a loading guide” sentence.
- Collapsed heading: **Zone G — 7 items** (using the actual location name). Count is the sum of physical quantities, not the number of catalogue definitions. No preview list under a collapsed heading.
- Expanded locations show equipment names, quantities, unit/total mass, arm, stowage and available description. This view derives from the same current load as the equipment view; it is not a second prescribed-load dataset. Sortie relocations and quantities are reflected immediately.
- Fitted empty locations remain visible with **0 items**.
- Unfitted locations stay visible, greyed out and not expandable, with **“To use this stowage location, fit it in Role Config.”**
- Selected equipment with an invalid location remains visible under **Stowage required**. It is not hidden or silently removed. Crew can fit the required location or change the allocation.
- **Crew Personal Equipment** and **Available Stowage Locations** retain their existing separate sections in both views. They are excluded from the loading-guide location counts.
- Linked basket contents follow the basket's resolved location. Split allocations appear under their actual locations; distinct custom arms have distinct location groups.
- The loading guide is primarily a reference view; existing quantity/location editing stays in Equipment Group. A **Choose stowage** action on unresolved entries returns to the relevant group.

### Dedicated stowage fittings and RFM names

| Location ID (unchanged) | Display name / arm | Required existing Role Fit key |
|---|---|---|
| `CABIN_STBD_STOW` | Stowage - Rescue Basket (B6 Stbd), 10934 mm | `RF_STOW_BASKET_STBD` |
| `CABIN_PORT_STOW` | Stowage - Rescue Basket (B6 Port), 10937 mm | `RF_STOW_BASKET_PORT` |
| `RAMP_STOW` | Stowage - Stokes Litter (Rear Ramp), 13132 mm | `RF_STOW_STOKES_RAMP` |
| `CABIN_DEPLOYED` | Stowage - Stokes Litter (Cabin B3/4 Centre), 7863 mm | `RF_STOW_STOKES_CABIN` |
| `INT_LIFE_RAFT_B3_STBD_F` | Stowage - Internal Life Raft (Stbd B3 F), 7100 mm | `RF_STOW_LIFERAFT_STBD_B3_F` |
| `INT_LIFE_RAFT_B4_STBD_A` | Stowage - Internal Life Raft (Stbd B4 A), 8600 mm | `RF_STOW_LIFERAFT_STBD_B4_A` |

- Stowage definitions carry `roleFitKey`; the resolver and location selectors check physical fit. The fittings and carried equipment retain separate mass contributions; links do not add fitting mass twice.
- Basket fittings weigh **2.61 kg each**, Stokes fittings **2.11 kg each**, and internal life raft fittings **0.57 kg each**, as present in the current data.
- Internal 10 Pers Life Raft: **50 kg each**, default quantity **1**, initially located at the Bay 3 forward holder. It is not selected by default in a role. The user selects the required holder(s) and carried raft allocation(s).
- Existing bay `REAR` is displayed as **Rear Area (Ramp Area)** where appropriate. No duplicate general rear/ramp location was created. The fixed-width MCDU mirror keeps its short `REAR` label.
- `RAMP_STOW` now belongs to **Cabin** in the Editor. Overhead bins also remain **Cabin**; the user withdrew the separate Overhead Bins group proposal.
- SAR cabinet availability continues to control its shelves. Cabinet own arm **5875 mm** and individual shelf arms **6275 mm** remain distinct. Hoist kit and mountain link retain the user-selected top-of-cabinet arm **5875 mm**. Do not merge these arms.
- Editor Stowage Locations exposes the required Role Fit item for linked locations. Cabinet-group locations retain their established cabinet dependency. The data validator rejects a missing linked Role Fit key; deletion of a linked fitting is blocked until its locations are addressed.

### Collapsible organisation

- Collapsible sections start closed throughout the app. Envelope/predicted CG-path charts start expanded.
- Explicitly opening an item keeps it open while editing; creating an item deliberately opens its group and fields for completion. Page/section changes and reload reset the relevant collapsed defaults.
- Mission Equipment and Role Fit Editors have group panels with collapsible individual item panels.
- Role Fit headings, in order: **Aircraft Systems; Ice Protection; SAR Equipment; Sensor Systems; Servicing Equipment; Stowage Fittings**. Explicitly created custom groups are supported too.
- Crew and Pax Seats has only two collapsible parent groups, **Crew Seats** and **Passenger Seats**. Individual seat rows remain compact and aligned, without extra collapse controls.
- Stowage Locations uses the existing Group values as collapsed headings: **BAYS**, **SAR Cabinet**, **Cabin**, **Port Fwd Shelves**, **Ramp**, plus applicable custom groups. The initially proposed longer display labels were superseded by “use group names.”
- No Equipment Group/Stowage Location toggle was added to the Editor; the user expressly declined it.

### Key-only creation — latest agreed behaviour

The custodian enters **only a key** when creating mission equipment, role-fit equipment or a stowage location. Do not reintroduce a separate name field in the creation form.

- After creation, the entry opens in its group as **New Role Fit Item**, **New Mission Equipment Item**, or **New Stowage Location**. The existing name, mass, arm/location and other fields are then edited normally.
- Existing entries remain editable through those same fields. Established keys remain immutable; this is not a rename-keys feature.
- Existing group quick entry: spaces/lowercase are accepted and capitals/underscores are generated. Example: `rf aircraft systems air cooling pack` → `RF_AIRCRAFT_SYSTEMS_AIR_COOLING_PACK`.
- Mission equipment quick entry includes `me` and the complete known group, e.g. `me sar mission equip spare radio`.
- Stowage quick entry starts with its known group, e.g. `cabin spare radio position`. No mandatory RF/ME prefix for locations.
- New groups **require explicit uppercase syntax**, with **double underscore** between group and item: `RF_NEW_GROUP__NEW_ITEM`, `ME_NEW_GROUP__NEW_ITEM`, or `NEW_GROUP__NEW_LOCATION` for stowage. The double underscore is preserved in the resulting key. Quick free-text entry must not guess a new group boundary.
- Once a custom group exists, quick entry can resolve that group. Duplicates are rejected. Standard Role Fit key-prefix aliases such as `RF_STOW_` remain recognized.
- Helpers explain both methods and a live preview shows the generated key. Key fields are full-width beneath the helper; the earlier tiny squeezed field was fixed.
- Custom group information belongs to item/location data and is included in Editor saves/exports. Mission group lists are derived from catalogue groups across operational display, Aircraft Roles editing and PDF, so newly grouped items are not omitted.

### Data update notice, certification and logout

- The confusing original notice mixed a data-revision mismatch with unavailable cabinet locations. It set a review flag and blocked certification until confirmed, even though the distributed data had already been loaded.
- Ordinary data updates now rely on the splash/home version and release information. No additional “accept updated equipment” button or redundant revision notice is required.
- Older incompatible Editor overrides are backed up and not applied over a newer distributed revision. A relevant changed saved-data signature still invalidates previous certification.
- Missing/retired equipment, invalid locations, overloads and genuine accounting issues still require resolution. A normal valid Role Config → Certify path does not require visiting Mission Equipment.
- **Actual old-format recovery is different from a routine data update.** If a legacy saved session cannot be restored in full, its recovery notice/review remains. Migration-reason flags preserve this check across another reload. Malformed saves are preserved and saving is paused rather than overwriting the original.
- End Session / Clear All also clears in-memory Editor authorization and draft access, returns to Home, and requires the password on re-entry. Saved custodian data is preserved. There is no separate persisted Editor-login flag in the current implementation.
- PDF footer already records application version, data version, data release date and source reference. The user accepted that placement. Do not add release notes to the PDF or duplicate version information at the top solely for this work.

## Data and calculation constraints to preserve

- Current `config.js` is the source for exact catalogue values and role memberships; do not rebuild it from an older conversation list or `MISSION_REVISION_REVIEW.md`.
- User-supplied unit-weight decisions included: immersion suits 3 × 3.25 kg; NVGs default 5 × 1.25 kg; penetration kits default 2 × 14.35 kg; PAX life vests 1 × 1.8 kg; AviOx spare bottles 1 × 12.7 kg. Quantities refer to the defined item, not guessed internal contents.
- Routine +/- stays on NVGs. It was turned off for AviOx spare bottles, guidelines, guideline weights, human remains bags and PAX life vests; deliberate Adjust mission quantity remains available.
- Guidelines/weights follow a selected basket; their own quantities/masses remain independent. CASEVAC may need six penetration kits at separate locations; never force all copies to share one arm.
- Preserve user-selected default arms/locations in current data, including flotation 14940 mm, dive kits Bay 5.5, Talon PTA cot area, BMS Zone B, water bag upper shelf/Zone C, POL Zone B. Some earlier suggestions were superseded by subsequent Editor edits.
- CASEVAC rack system remains a complete installation: **120.09 kg at 8577 mm**, not four independently multiplied catalogue masses.
- Use the **CH-149-615** source basis. CH-149-511 material is comparison only. The user's later aircraft/weighing inspection may require further Role Fit baseline changes.
- Current shelf capacities live in `STOW_MAX`; absence of a defined capacity is not evidence of approved unlimited loading. Keep this distinction in technical documentation.

## Implementation map

| File | Responsibility / useful entry points |
|---|---|
| `config.js` | Published metadata, equipment, stowage, bay arms, roles, sources and other aircraft data |
| `mission.js` | `missionGroupNames`, catalogue validation, overrides, allocations, location resolution, mission issues and totals inputs |
| `mission-ui.js` | Equipment controls and `renderMissionLocationGroups`; presentation-only grouping toggle |
| `editor.js` | `editorItemKey`, `editorKeyDefinition`, group helpers, collapsible panels, creation, data editing/export |
| `accounting.js`, `accounting-ui.js` | Recorded/RFM baseline accounting, fit declarations, maintenance/custom exceptions and review UI |
| `extra-crew.js` | Extra occupants, linked bag allocations, removal and projected shelf checks |
| `compute.js` | Shared weight/moment/CG and fuel calculations |
| `app.js` | Page navigation, rendering, certification, shelf limits, MCDU presentation and offline-readiness UI |
| `persist.js` | Session schema 6, version/signature handling, backup/recovery and Editor logout on reset |
| `pdf.js` | W&B record, detailed equipment, role/accounting appendices and footer provenance |
| `sw.js` | Verified release cache, required assets, current/previous release and offline recovery |

## Verification and how to resume

Last full suite: **57 tests passed** after key-only/custom-group work. This includes accounting, fuel/manual trace, PDF content, quantities and locations, persistence, Editor workflows, and an older installed release updating online then reopening offline. Subsequently, only Editor tab labels/order and the service-worker release suffix changed; syntax checks passed for those changes. Do not describe a physical iPad/Safari acceptance trial as completed.

Run from the active repository:

```powershell
& 'C:\Program Files\nodejs\node.exe' --test tests/mission-accounting.test.cjs tests/mission-revision.test.cjs tests/dev-scope.test.cjs
```

- Playwright tests use bundled `msedge` and a locally installed Playwright package under `C:/Users/sstni/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright`. This path is machine-specific and must be adapted for another maintainer.
- Offline upgrade test intentionally reads committed baseline **88f71b2** using Git, rather than moving `HEAD`. Preserve access to that commit or replace it with a documented fixture when transferring the tests.
- Test evidence is under `Archive/outputs/dev-scope`, `Archive/outputs/mission-revision`, and `Archive/outputs/mission-accounting-review`. Screenshots include loading guide, collapsible Editor, Role Fit headings and key helper. A generated sample report was rendered for visual review.
- Service worker caches the required application assets as a verified release. Activation keeps the current and one previous verified release, and removes older verified releases. Retaining the previous release is intentional recovery behaviour.
- Git may require `-c safe.directory='C:/Users/sstni/Desktop/615 WB edit work/CH-149-615-WB - Active Dev'` in this environment. Do not change ownership or discard the working tree to work around that setting.
- User's next likely step is local review, followed by explicit commit/push authorization. No request to create a new Codex conversation has been made; this file enables the user to start one themselves.

## Outstanding / deferred work

1. User acceptance review of the latest local build, especially loading-guide navigation and new-key helpers. Resolve actual findings incrementally.
2. Full user/technical manual: update outline now; draft only when requested and after publication-design questions are agreed. See the companion outline for release capture requirements.
3. Delivered-aircraft fit and actual weighing inclusion: authoritative records still needed for final defaults. Do not infer approval from developer tests.
4. Subtraction-button policy, exact source traceability, original-local-time snapshot needs and document identification/review arrangements remain open.
5. Broad stale/dead-code cleanup is deferred. Earlier audit identified apparently unused helpers (`maintenanceLockedRoleFit`, `invalidateAcceptance`, `renderMcduAuwCgReplica_TEST`, `getMissionItem`, `promptNewKey`, `lastPersistInfo`), debug logging, repeated constants and stale comments. Recheck usage before deleting anything; retain required migration aliases and vendor code.
6. Review all equipment-specific dependencies before a future deletion/retirement overhaul; extra-crew bag mapping still relies on known catalogue IDs. Published version labels alone do not prove exact local-data integrity.
7. Earlier **MISSION_REVISION_REVIEW.md** describes a v14 development stage and contains superseded POL/update-review behaviour. It is historical context, not the current operating specification.

## Manual handover requirement

The eventual manual is a formal military-style **user and technical manual**, not an official technical order. It must explain operation and the calculation/source basis deeply enough to support TAC/OAC review, while making no claim of granted clearance. Preserve the decision rationale and unresolved assumptions for maintainers into the 2040s/2050s. Do not rely on this conversation as the only durable record.

## Commit preparation update — 1 October 2026

After this handover was written, the user authorized committing and pushing all pending development work and these documents. The complete three-file regression suite was rerun after the final Editor tab reorder: all 57 tests passed. The uncommitted status above describes the initial handover snapshot; consult Git history and status for the resulting commit and current synchronization state.

