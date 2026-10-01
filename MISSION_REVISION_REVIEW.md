# Mission equipment revision — local review build

App **0.2.13-dev**, configuration **14**. Implementation authorized in the discussion of 29 September; handoff prepared 30 September 2026. Not published or pushed.

## Delivered behaviour

- Manual Fuel departure uses entered tank weights. Manual mode has no calculated burn trace in either the app or PDF. Both show a mapped landing-fuel point with an explicit advisory. Stage mode retains the mapped burn trace. The same fuel calculations serve both outputs.
- 57 individual catalogue definitions, in the six requested groups. All supplied weights are per item. PAX life vests and AviOx spare bottles each default to one item, as confirmed. Crew names use the agreed uppercase keys. ST B25/dive gear replaces the ordinary ST B25.
- Default quantities: immersion suits 3; penetration kits 2; NVGs 5; guidelines 2; guideline weights 2; human remains bags 2; other listed items 1. Quantity controls change one unit at a time and respect configured bounds. Fixed routine items can still be adjusted for a nonstandard mission through the deliberate adjustment action.
- Carried units can be grouped at one location, split, or added at another location. Mission quantities and locations never rewrite catalogue defaults. The PDF lists actual quantity, unit mass, total mass and location for each allocation.
- Guidelines and weights follow a selected carrying basket. A single basket resolves automatically; multiple baskets require a selected carrier. A missing carrier requires a new carrier or explicit location. Basket and contents retain separate mass contributions.
- Cabinet own arm 5875 mm and shelf arms 6275 mm remain distinct. Mountain link and hoist kit use the user-selected editable top-of-cabinet default at 5875 mm. Flotation kit uses 14940 mm. Bay arms are referenced from one shared source, not copied into equipment definitions.
- POL defaults on in every configuration and in a new session, remaining mission equipment. Its Zone B default must be relocated when the cabinet is absent.
- Editor retains the existing styling, cards, field controls and tab layout. It adds quantity properties, active/retired state, basket relationships, and a Configurations tab. Locations now edit actual named location arms rather than zero-mass placeholder equipment.
- Configurations support create, edit, duplicate, rename, retire and safe deletion, with catalogue membership, seats, occupants and role-fit selections. Mission Config buttons are generated from active configurations. Existing role-fit calculation and maintenance-exception logic is preserved.

## Starting configuration membership

Existing individual memberships were mapped to the new IDs. Old medical/SAR/ALSE bundles were expanded to their named components using the recorded bundle locations. Specific-mission Arctic B, Alpine kit, operational dive kits and reel splint remain optional; shotgun remains optional. Existing crew/RON selection patterns remain.

The newly listed normal flotation kit, hoist kit, guidelines and weights, comms bag, human remains bags, Talon stretcher, BMS and water bag are included in SAR3 and SAR10 as starting defaults. CASEVAC/Transport retain their existing equipment selection pattern plus default POL. The Editor can change membership without source edits. These are reviewable defaults, not a newly asserted operational load requirement.

## Audit: configuration and Editor consumers

| Retained data | Current consumers/purpose |
|---|---|
| `meta` version, release date, changelog, document history | Header/splash, Editor export and reference tab, PDF provenance, override compatibility |
| `auth.password` | Existing local Custodian Editor login |
| `tails.active/placeholders` | Session creation, tail selection and placeholder behaviour |
| Envelope polygons, hard/absolute CG bounds, CG bands | `computeWB`, shared chart calculations, live/PDF plotting and certification |
| `bayArms` | Cargo/bay mass moments, mission location resolver, location Editor and PDF; no independent mission copy |
| Ramp geometry and limits | Existing ramp checks and load planning; preserved |
| Fuel arms, staged deltas, maximum fuel | Existing fuel solver and tank totals, shared landing/trace calculations; stage names retain source sequence identity |
| Crew/passenger seats and baseline flags | Seat structures, occupant moments, presets and maintenance baseline; unchanged accounting |
| Named stowage name/arm/group | Equipment defaults, location selection, moments, cabinet availability, load planning and PDF |
| Role-fit name/mass/arm/default/baseline flags | Existing accounting, maintenance exceptions, Editor, configuration expectations and PDF; negative values preserved |
| Equipment name/description/group | Editor, grouped mission controls and report identity |
| Equipment `unitWeight`, `defaultQuantity`, optional min/max | Mission allocations, exact mass/moment, Editor validation and PDF quantity arithmetic |
| Equipment `missionQuantityEditable` | Routine +/- visibility; nonstandard quantities remain deliberately available for every item |
| Equipment `stow` and conditional `customArm` | Default allocation location; actual mission locations live separately |
| Equipment `active`, `alwaysInclude`, `isBasket`, `followBasket` | Selection/retirement handling, universal POL default, carrying-basket resolution |
| Configuration name/notes/active/image | Editor identity, crew buttons/description, existing configuration illustrations and PDF |
| Configuration mission/role-fit references, seats and occupants | Preset application; no duplicate unit mass/arm data |
| Nine zero-mass Stowage markers | Existing physical shelf/bin availability controls and load-planning gates; intentionally retained outside the six equipment groups |

Removed/replaced: three coarse bundles; obsolete grouped masses for suits/NVGs; separate sixth-NVG definition; old crew keys; undefined `ME_NEW_THINGY`, `ME_ALSE_ARCTIC2`, `ME_ALSE_KIT` references; inactive FE B25 custom arm; unused equipment `on` flags. The six-group selector replaces the old free-text group suggestions. Location editing now changes consumed location data. Existing role-fit aliases are retained because persisted-data migration consumes them. Existing shelf capacity limits remain unchanged in `STOW_MAX`.

## Persistence and integrity

- Mission schema 2; session schema 6. Compatible sessions retain actual per-location quantities across refresh/restart. End Session/return-to-available clears mission allocations and retains Editor defaults.
- Old coarse catalogue overrides are backed up, not applied to the new catalogue. Unrelated role-fit/seat overrides are retained with the existing compatibility corrections. Old sessions preserve their accepted/maintenance data but reset incompatible mission selections and require review. Original JSON is backed up.
- Overrides are tied to the shipped configuration version. Mismatched versions are backed up rather than silently masking a newer catalogue. The saved mission records a catalogue/location/configuration signature; a changed signature invalidates certification and requests review.
- Retired or missing selected equipment does not silently substitute another item. Retired preset members remain visible and block certification until explicitly resolved. Used items/configurations cannot be permanently deleted; retirement is available.
- Invalid/missing locations and absent cabinets produce visible review issues. Unknown location moments are not fabricated. PDF clearance generation and certification reject unresolved mission issues.
- Malformed allocation structures are rejected before any saved session replaces the fresh state. Original storage is preserved and automatic saving is paused.

## Verification

Run `node --test tests/mission-accounting.test.cjs tests/mission-revision.test.cjs` from this directory. The automated suite covers existing accounting regressions plus independent six-kit mass/moment arithmetic, fixed/variable quantities, bounds, split locations, carrier links, defaults, signed masses, configuration lifecycle, export/reload, stale storage, malformed storage, Manual/Stage fuel and PDF content, offline restoration, and 820 px layout overflow.

PDF plot pages and iPad-width Editor/Mission screenshots were visually inspected. Tests run in desktop Edge with an iPad-sized viewport; physical iPad touch behaviour has not been exercised. Generated review artifacts are under `../../outputs/mission-revision`.

## Review workflow

Open the local preview, accept a test aircraft, and select SAR3 or CASEVAC. In Mission Equip, select an item, adjust quantity, split a location, or add a unit at another location. Check the mass/moment summary. In Editor, use Configurations to review the starting membership and create a mission-specific grouping. In Fuel, edit a tank to enter Manual mode: the trace disappears but departure and landing points remain. Enter a total fuel value to return to Stage mode.

All application changes are local working-tree edits. The source directory retains its historical folder name; the visible app/configuration version identifies this revision.

## September 30 Editor and extra-crew update

- Mission Equipment cards now separate item details, default load, and mission options with visible explanations. Existing equipment keys remain read-only. Seat Baseline checkboxes use aligned columns.
- Mission equipment can provide linked stowage; role-fit items opt in with the stowage-location switch. Linked contents follow the carrier location/arm. Unavailable carriers, ambiguous allocations, and cycles block certification pending correction.
- AviOx spare bottles, guidelines, guideline weights, human remains bags, and passenger life vests no longer show routine quantity buttons; Adjust mission quantity remains available.
- Add Crew & Equipment on Crew and PAX Seats offers Pilot, Flight Engineer, and SAR Tech with the agreed checked bags and unchecked RON bag. Uses an available installed seat, validates bag stowage before applying, and counts crew in PAX seats at 90.7 kg. Bags use catalogue weights, and each added allocation is linked to its crew member. Clearing that person offers removal of associated bags; retaining bags detaches the link. Preset changes preserve extras when their occupied seat remains installed.
- Config remains v16. No historical comparison, commit, or push performed.
- Validation: 46 automated checks pass, including browser flows, linked stowage, extra-crew moments and PDF seat output, persistence, Editor columns, existing accounting, fuel, and PDF checks. Tablet-width and desktop screenshots reviewed. Physical-device/operator testing remains with the user.
