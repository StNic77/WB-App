# CH-149-615 W&B Release History

## v0.3.0-dev / Config v24 — 2026-10-08 17:02:25 UTC
- Removes the Maintenance Exceptions workflow from Accept; Custom Exceptions remain available for documented aircraft-specific adjustments.
- Simplifies Role Fit to three fit and weight-treatment choices with basis-specific explanations, and carries the expected-versus-selected fit and weight/moment effects into Appendix A.
- Clarifies fleet and selected-tail Editor scope, Role Fit defaults, and Mission Equipment guidance; adds a v23-to-v24 migration that backs up and preserves compatible tail-specific overrides.
- Improves Appendix B explanation and exception weight, arm, and applied-change headings; synchronizes app, configuration, and offline release identifiers.

## v0.2.19-dev / Config v23 — 2026-10-06 23:12:29 UTC
- Adds Create Tail-Specific Configuration, allowing one or more selected aircraft to receive a copied and independently edited configuration.
- Tail-specific equipment, seats, stowage, role configurations and reference documents load only when an assigned tail with that setup is selected. Tail-specific data is included in config.js exports.
- Adds the App Settings tab for aircraft management and Accept page options.
- Updates Crew, Pax and patient summaries, role configuration workflow, tab helpers, and related load planning and certification wording.
- App, configuration, and offline release identifiers synchronized.

## v0.2.18-dev / Config v22 — 2026-10-06 04:42:06 UTC
- RFM normally fitted role-fit defaults now match the current Maintenance Basic Weight inclusion baseline for sanity checks. The default additions are the seven role-fit items already identified as Maintenance-included, plus 18.70 kg of passenger-seat structures.
- Exported configuration data from the Custodian Editor; synchronized app, configuration, and offline release identifiers.

## v0.2.17-dev / Config v21 — 2026-10-06 02:15:59 UTC
- Role Config presets now remain in a custodian-defined display order regardless of selection. Default order: SAR-3 Pax, SAR-10 Pax, Transport, CASEVAC.
- The Editor provides Move up and Move down controls for configuration order; new and duplicated configurations are appended.
- Existing v18-v20 Editor overrides are backed up and migrated with the new preset order metadata.

## v0.2.16-dev / Config v20 — 2026-10-05 22:54:58 UTC
- PDF Weight and Balance Summary now groups Operating Weight/CG, AUW/CG, and Landing Weight/CG with bold labels, larger values, and increased spacing around the metric panels.
- Configuration data remains at v20; no aircraft data changed in this update.

## v0.2.15-dev / Config v20 — 2026-10-05 22:40:20 UTC
- Mission Equipment equipment groups use selected-first alphabetical ordering; SAR Rifle and SAR Shotgun are grouped, with an amber warning when both are selected.
- Adds the default NVG set distribution of four on the upper lockbox shelf and one on the lower shelf, with Editor controls for per-shelf quantities.
- Compatible v19 Editor overrides are backed up and migrated while the new shipped NVG shelf defaults are added.
- App, configuration, on-screen, PDF and offline-release version identifiers are synchronized.
- For future releases: increment the software version for code changes and the configuration version for aircraft data changes; update the UTC configuration release timestamp and newest changelog entry, then synchronize the offline release manifest.

## v0.2.14-dev / Config v19 — 2026-10-03 06:16:33 UTC
- Release metadata synchronized across the app, configuration and offline package.
- Includes crew in passenger seats, role occupant resets, responsive tabs and scrolling, UTC release display, CASEVAC patients and four independently installed stretcher racks.
- Compatible v18 Editor overrides are backed up and migrated, preserving custom roles and edits.

## v0.2.10 / Config v12
- Added offline preparation, update activation, reversionary operation, and return-to-latest instructions to the opening version screen.
- The opening version screen now reappears when either the app version or configuration version changes.

## v0.2.9 / Config v12
- Added a controlled recovery switch between the latest and immediately previous complete, verified offline releases.
- Added persistent reversionary-version marking and a direct return-to-latest control.
- Added automatic offline-readiness rechecks while a service-worker update is still installing.

## v0.2.8 / Config v12
- Added sortie-specific Custom Exceptions with signed decimal weights, exact arms, source references, calculated moments, documentation review confirmation, certification gating, and PDF reporting.
- Preserved fractional and negative cargo values through the calculation and displayed negative values on the MCDU-style cargo page.
- Added Alternate Gross Weight and Over Weight labels at the applicable limits.
- Corrected Tank 1 arm to 10,875 mm from the Leonardo clearance statement.
- Retained exact intermediate mass for CG and limit calculations while keeping whole-kilogram presentation where appropriate.
- Added a verified offline release package containing configuration data, code, PDF support, icons, schematics, and all mission-configuration images.
- Added a visible offline-readiness indicator and retained the previous verified cache for future recovery support.
- Corrected web-app manifest icon paths.

Baseline: v0.2.3 (preserved separately).

This test build embodies the agreed operator-language and workflow review from 15 Sep 2026.

## Major changes
- Recorded Aircraft Basic Weight remains the default; RFM Basic Weight remains a deliberate Beta Testing path.
- Maintenance Exceptions are selected as removals before Acceptance; Acceptance locks the accepted aircraft state.
- Accepted Maintenance Exceptions remain visible but unavailable in Mission Config and cannot be restored by presets.
- Mission Config presets respect the accepted aircraft state.
- Permanent stowage locations remain available by default; SAR Cabinet locations follow physical cabinet installation; operator stowage availability controls are retained.
- Prevents making a stowage location unavailable while equipment is assigned to it.
- Load Planning stowage math now displays Assigned Load, Additional Load, Maximum Load, and live Remaining Capacity.
- Stowage editing moved ahead of the MCDU Cargo/Cabin confirmation displays.
- Operator-facing language cleaned up throughout Mission Equipment, Fuel, Load Planning, Certify, and PDF.
- Accepted By and Certified By now use independent Last Name entries.
- Added Editor > Reference Document with append-only history and deliberate review acknowledgement.
- Reference-document source is centralized and is snapshotted at Acceptance for PDF provenance.
- PDF Maintenance Exception wording made explicit.

## Deliberately deferred
- No change to Role-Fit Equipment Adjustment calculation/presentation pending hands-on functional testing.
- No authentication/password signature system; the identity fields are kept conceptually separable for a future authenticated-signature implementation.

## Test focus
1. Accept Recorded Aircraft Basic Weight with Secondary Hoist removed as a Maintenance Exception.
2. Apply SAR presets and confirm the hoist remains unchecked/greyed/unavailable.
3. Confirm non-exception role-fit items remain normally selectable.
4. Verify CASEVAC/Transport permanent stowage locations remain usable while SAR Cabinet locations follow cabinet installation.
5. Assign equipment to stowage, verify live remaining capacity, and confirm an occupied location cannot be made unavailable.
6. Exercise MCDU Cargo/Cabin transcription layout and Cabin page toggle.
7. Create a new Reference Document record in Editor and verify history/current source behavior.
8. Accept a session, then change current reference metadata and verify that session PDF retains the source snapshotted at Acceptance.


## test2 defect correction
- Maintenance Exceptions are now captured explicitly when **Accept** is clicked.
- Accepted exception items are immediately forced out of the live role-fit state.
- Mission Config presets cannot reinstall accepted Maintenance Exceptions.
- Accepted exception items remain visible but locked/non-interactive in Role-Fit Equipment.
- Config data remains **v4**; this correction changes application logic only.


## Test 2 in-place correction
- EO/IR Hand Controller is independently selectable and is not inferred/locked from Sensor Workstation or EO/IR package state.
- EO/IR Hand Controller remains outside the Recorded Aircraft Basic Weight baseline unless explicitly represented by source data.
- Mission Config Summary now exposes the Operating Weight build-up: Accepted Basic Weight, net Role-Fit Equipment Adjustment, Mission Equipment, Occupants, and Operating Weight.
- Current Role-Fit Equipment Installed is displayed separately as an informational total to avoid double-counting it mentally against Recorded Aircraft Basic Weight.
- All-Up Weight summary shows Operating Weight + Fuel, and includes Cargo/Cabin tactical payload when present.
- Service-worker cache revision advanced so the corrected Test 2 assets replace the earlier cached test build.

## v0.2.5 Test 3
- Predicted CG path is yellow in Manual Tank Distribution mode while in the envelope; predicted excursions remain red.
- PDF Certification keeps Certified By and local/Zulu time, and removes the Flight Engineer Signature, service-number, and Ops Use boxes.
- App and service-worker cache versions advanced to v0.2.5-test3.

