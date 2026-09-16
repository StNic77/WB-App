# CH-149-615 W&B v0.2.4-test2 / Config v4

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

