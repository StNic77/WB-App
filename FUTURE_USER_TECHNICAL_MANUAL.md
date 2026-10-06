# Future work: CH-149-615 Weight and Balance Application User and Technical Manual

Status: planning outline only. Prepare for delivery with the application; do not draft the full manual in this change. This is a user manual written in military technical-publication language and format. It is not an official release document, an issued technical order, or evidence of airworthiness clearance.

## Purpose and writing requirements

Development reference: [Development handover — 1 October 2026](DEVELOPMENT_HANDOVER_2026-10-01.md). It records the conversation decisions, implementation state, verification evidence and unresolved work. This outline was updated on the same date; confirm behaviour against the eventual release before writing procedures or taking screenshots.

Provide aircrew and custodians with concise, formal instructions for operating the application and understanding its calculation basis. Use numbered chapters, paragraphs, procedures, tables and figures. Use consistent aviation terminology, direct procedural language, and defined responsibilities. Avoid conversational wording, promotional claims and unnecessary explanation. Distinguish operational instructions from custodian administration and technical reference material. Provide sufficient technical explanation and traceable evidence to support review for Technical Airworthiness Clearance (TAC) and Operational Airworthiness Clearance (OAC), without asserting that this outline defines their formal requirements or that clearance has been granted.

## Proposed document structure

1. Introduction: purpose, scope, intended users, responsibilities, applicability, definitions and abbreviations, referenced documents, application/data versions and revision control.
2. General description: system functions, equipment requirements, offline operation, data flow from aircraft records through calculation to MCDU entry and PDF record; operational limitations and supported workflows.
3. Standard operating procedure: aircraft selection; acceptance of recorded weight, CG and fuel; configuration selection; load review; certification and MCDU cross-check; generation and transmission of the weight and balance record; return/end-session procedures.
4. Detailed operating instructions by tab: Home, Accept, Role Config, Mission Equipment, Crew and PAX Seats, Fuel, Load Planning, Certify W&B. Explain controls, status indications, input units, validation messages and expected results. Include extra crew, linked equipment stowage, unavailable locations and stowage limits.
5. Non-standard aircraft and mission conditions: maintenance exceptions, custom exceptions, manual fit declarations, additional equipment, relocations, quantity changes, configuration changes and manual fuel entry. Clearly distinguish recorded-weight inclusion from physical fit.
6. Comprehensive Editor instruction manual: a clearly separated, self-contained custodian part, with its own contents and procedures, or a separate companion volume. Cover access; Role Fit Equipment; Mission Equipment; Crew and Pax Seats; Stowage Locations; Reference Documents; Aircraft Roles, in that order. Explain keys, defaults, limits, retirement/deletion, export, local overrides, published config replacement and verification after changes. A brief Editor overview in the operational user manual does not satisfy this requirement.
7. Technical calculation basis: source-controlled weights and arms; coordinate datum and units; signed weights and moments; weight summation; CG from total moment/weight; recorded versus RFM basic weight; seat structures and occupants; mission quantities and carrier locations; custom exceptions; fuel mapping and manual fuel; landing fuel distribution; CG-envelope evaluation; rounding and precision; capacity checks and MCDU tolerances.
8. Data retention and recovery: device storage, accepted snapshots, reset behaviour, configuration updates, review/invalidation rules, offline update/recovery and archived records.
9. Verification and examples: independently checked standard and non-standard worked examples, expected totals and moments, reference citations, operator acceptance checks and release verification.
10. Troubleshooting: symptom, probable cause and corrective action tables.
11. Through-life support and succession: ownership, equipment-data lifecycle, dependency management, release control, technology changes, recovery exercises, and custodian/developer handover. See the scope below.

Appendices: terminology and control labels; source-to-data traceability; equipment/location reference tables; formulas and independently worked examples; sample annotated PDF; custodian change checklist; revision record; equipment-dependency register; software/dependency inventory; release and recovery checklists; succession acceptance checklist.

## Design decisions to settle before drafting

- Working title, internal document identifier, author/maintainer, revision scheme and intended readership. Discuss any formal identification, review routing or distribution requirements with the user; do not invent an issuing authority, approval status or official publication designation.
- Suitable military technical-publication layout, paragraph numbering and caution/warning conventions for a non-official user manual.
- Applicable CH-149-615 RFM, aircraft weighing records/statements and other supporting sources, with exact revisions and locators. The 511 is comparison material only, not the authoritative calculation or operating basis for this application. Identify any inherited 511 assumptions that still require CH-149-615 verification.
- Confirmed delivered-aircraft equipment fit and recorded Basic Weight inclusion.
- Resolved policy for manual subtraction versus maintenance/custom exceptions.
- Frozen release and screenshots, plus accepted units, notation and terminology.
- Independent technical review of examples and calculations, and a first-time-user trial of procedures.

## Comprehensive Editor manual requirement — 3 October 2026

The user requires comprehensive instructions for the Editor, distinct from the comprehensive operational user manual. The preferred planning structure is one publication with separate User and Editor parts; retain the option to issue the Editor part as a companion manual. Final packaging remains to be agreed. Keep procedures self-contained so custodians can use the Editor part without searching through aircrew operating instructions, and cross-reference shared technical material rather than duplicating it.

Required Editor coverage:

- Purpose, custodian responsibilities, access and session termination, Editor navigation, and the boundary between catalogue editing and operational mission changes.
- Every Editor tab, control and editable field: meaning, units, permitted values, defaults, required/optional status, validation, dependencies, and the effect on operational pages, calculations and records. Verify all behaviour against the release being documented.
- Numbered procedures for creating, amending, retiring and deleting items; stable keys versus display names; automatic key formatting and explicit group creation; role membership; seat baselines; quantities; stowage links and capacities; and reference-document maintenance.
- Worked editing examples, screenshots, expected results and checks after each change. Explain physical installation versus recorded-basic-weight inclusion, seat structure versus occupancy, and other distinctions that can cause duplicate accounting.
- Save and configuration lifecycle: unsaved edits, browser-local overrides, export, configuration revision identification, controlled distribution, installation on another device, and verification of the active configuration online and offline. Clearly distinguish saving locally from updating the distributed application.
- Dependency review and change effects: referenced keys, linked locations, role presets, equipment-specific rules, accepted-aircraft snapshots, existing sessions, certification and historical records. Identify implemented safeguards and any checks that custodians must perform themselves.
- Backup, restore, rollback, troubleshooting and recovery procedures, including the exact scope of reset/session controls. Document limitations from verified behaviour.
- A complete change checklist covering source evidence, before/after data, validation, representative W&B checks, review, revision records, distribution and successor handover. State which changes require software-maintainer involvement.

This addition records the documentation requirement and scope; it does not constitute the completed Editor manual or authorize drafting the full publication before the existing production prerequisites are met.

## Intended production sequence

Agree the outline and publication format; freeze the relevant app release; assemble verified source references; draft operational procedures; document custodian procedures and calculation basis; prepare worked examples and figures; conduct technical and operator reviews; deliver the version-matched user manual with the application, with its document and review status explicitly stated.


## Technical substantiation for TAC/OAC review

The manual should let a reviewer follow each important result from its source through the application to the output. Include the following material or point to separately maintained evidence, rather than treating a descriptive user guide as proof of clearance:

- System boundary and data flow: what the application calculates, what the operator enters, what is stored locally, what is exported, and what is entered independently into the MCDU. Describe the absence of a direct aircraft-system connection.
- Source register: document title/identifier, applicable aircraft or configuration, revision/date, chapter/paragraph/table/figure/page, units and datum. Distinguish RFM data, aircraft-specific weighing records, manufacturer statements, measured equipment data, user-supplied values, and provisional assumptions.
- Traceability matrix: source and locator → source value or rule → configuration field or calculation function → user-facing result/PDF field → verification case and evidence. Explain transformations such as unit conversion, interpolation, rounding and signed adjustments.
- Calculation rationale: equations, order of operations, baseline inclusion rules, physical-fit versus weight-accounting distinctions, prevention of duplicate counting, occupant and seat treatment, fuel distribution modes, envelope evaluation and load limits. Explain why each method is appropriate to the cited CH-149-615 basis.
- Assumptions and limitations register: origin, rationale, affected results, provisional status, verification needed and disposition. Comparison with the 511 must be labelled as comparison and must not silently substitute for a CH-149-615 source.
- Verification evidence: independently derived expected results, numerical tolerances, boundary and failure cases, regression coverage, tested software/data versions and outstanding discrepancies. Distinguish automated tests from independent validation and operational user trials.
- Operational controls and failure behaviour: incorrect or missing input, unavailable stowage, overloaded locations, stale configuration data, persistence failures, certification invalidation and recovery. Describe what the operator sees and which actions are blocked or remain available.
- Configuration management: relationship between application version, distributed configuration, device overrides, accepted-aircraft snapshots and generated records; responsibilities for changes and checks following an update.
- Review status: identify unresolved source questions, known limitations and work still required. Record actual review outcomes when available; do not present assumptions, tests or this manual itself as clearance or approval.

Use operationally readable chapters for aircrew and custodians, with deeper derivations, traceability tables and verification records in technical chapters/appendices. The exact evidence package and acceptance criteria remain to be agreed with the relevant reviewers.


## Through-life support and succession

Purpose: preserve the ability to understand, verify, maintain and recover the application throughout aircraft service, including transfer to personnel who did not participate in its development. Treat source code, configuration data, verification evidence and documentation as maintained deliverables. Do not rely on developer memory or conversation history as the operational reference.

### Responsibilities and handover

- Define application custodian, software maintainer, technical reviewer and release/distribution responsibilities. Identify the responsible appointments and succession process without inventing official authorities.
- Explain which changes can be made through the Editor and which require software maintenance. Document when source verification, independent calculation checks, regression testing and operational review are required.
- Maintain a decision register: rule or assumption, rationale, source, affected data/code, review status and unresolved questions.
- Require a successor to demonstrate restoring the release, tracing a worked calculation, making and validating a sample data change, exporting/distributing the configuration and recovering the previous version.

### Equipment-data lifecycle and dependency control

- Distinguish equipment data from executable code. Explain that Editor changes generally alter local data, not JavaScript files on disk, and that export/replacement is required for distribution.
- Document keys and all references to them: configuration membership, linked stowage, extra-crew equipment, special fit/carry rules and saved-session records.
- Define addition, amendment, retirement, replacement and deletion procedures. Prefer retirement before deletion; identify active dependants before replacing or deleting an item. Explain why a historical backup containing an old key is different from a broken active reference.
- Specify validation coverage for save and export: missing/duplicate references, unavailable carriers, cycles, invalid weights/arms/quantities and special dependencies. Record which checks are implemented and which remain proposed; do not imply complete coverage.
- Document handling of accepted-aircraft snapshots, historical records and old sessions after catalogue changes. Preserve the ability to interpret earlier records without silently applying current data to them.

### Known supportability work to track

These are design/maintenance actions to evaluate, not capabilities guaranteed by this outline:

- Inventory equipment-specific identifiers embedded in code, including cabinet-location availability and extra-crew equipment selection. POL carriage now follows role membership rather than a special cabinet-fitted carry rule. Move suitable remaining relationships into validated, documented configuration data so deletion or replacement cannot silently break a special rule.
- Review deletion coverage beyond preset lists, including linked locations and inactive saved allocations. Identify and report dependencies before a change is applied.
- Consolidate shared constants and eliminate confirmed dead code through separate, tested changes. Retain required migration/compatibility support until its removal criteria are established.
- Establish sufficient provenance to identify the exact application, distributed configuration and local modifications used for each calculation and generated record. Distinguish current version labels from any additional integrity identifiers still needed.

### Device configuration and controlled release

- Explain the precedence and scope of distributed config.js, local Editor overrides, mission adjustments and accepted snapshots. Describe how to detect and resolve differences between devices without losing needed data.
- Establish a reviewed release procedure: change description and source evidence; dependency validation; regression and independently checked examples; assigned software/data revision; archived previous release; distribution; device verification; rollback.
- Preserve each release's source revision, configuration, documentation, dependency versions, test results, known limitations and installation/recovery instructions as one identifiable package.
- Define backup retention, migration and recovery procedures. Test restoration; do not assume that browser-local storage or a service-worker cache is a durable archive.

### Technology sustainment

- Maintain an inventory of browsers/operating systems, third-party libraries and licences, development/test tools, and supported installation methods.
- Document environment setup and test execution with transferable paths and instructions. Identify machine-specific paths or assumptions requiring replacement during handover.
- Agree review intervals and triggers, including aircraft-document changes, browser/OS updates, library changes, data-schema changes, defects and personnel turnover. Verify compatibility rather than assuming unchanged operation through the 2040s or 2050s.
- Document repository access/ownership transfer, release storage and recovery contacts. Keep credentials out of the manual and source code.

### Minimum handover package

1. Source repository and relevant history, with a known working release and recovery copy.
2. Matching configuration, source register, equipment/location dictionary and dependency register.
3. User/custodian procedures and technical calculation rationale.
4. Independent worked examples, automated tests, test instructions and recorded results.
5. Installation, update, device reconciliation, backup and recovery procedures.
6. Decision/assumption register, limitations, outstanding defects and planned supportability improvements.
7. Named responsibility assignments and a completed successor familiarisation/acceptance checklist.

The manual must distinguish documented current behaviour from future safeguards. A documentation entry alone does not implement a software control or establish airworthiness approval.

## Release capture checklist — agreed development through 1 October 2026

These are subjects to capture when the full manual is commissioned, not completed manual sections. Use the handover and release source files for implementation detail. Check each subject against the frozen release and record its verification evidence.

### Operator procedures and terminology

- [ ] Describe the standard rapid workflow: select aircraft, accept recorded Basic Weight/CG and fuel, select the aircraft role, review load, certify and generate the record. Use **Role Config** for the operational tab and **data revision** for distributed application data.
- [ ] Define recorded aircraft Basic Weight, RFM Basic Weight, role-fit adjustments, seat structure, mission equipment and occupants. Separate physical fit from whether weight is already in the baseline; explain prevention of double counting.
- [ ] Explain all four role-fit declarations and the additional confirmation required for subtraction. Identify subtraction policy as unresolved until settled; do not imply that a UI option grants operational authority to remove equipment.
- [ ] Explain aircraft-default fit, selected-role fit, manual overrides, colours and the displayed signed weight adjustment. Describe maintenance exceptions already reflected in the accepted record and sortie-only custom exceptions. No custom entries means no custom-exception certification requirement.
- [ ] Describe collapsed sections, with the envelope/predicted CG-path chart visible; distinguish normal collapsed defaults from sections deliberately opened for editing or corrective action.

### Mission equipment and stowage reference

- [ ] Explain unit weight, default quantity, fixed versus mission-editable quantities, routine plus/minus controls and Adjust Mission Quantity. Mission changes do not change custodian defaults.
- [ ] Describe Equipment Group and Stowage Location views. The latter supports preparing the selected role: collapsed headings show location and total physical item count; expansion shows item details. Empty fitted locations show zero items.
- [ ] Explain unavailable locations shown grey and unavailable for selection, with the instruction to fit the supporting item in Role Config. Explain how actual fit overrides affect location availability.
- [ ] Describe role-fit-to-stowage links, including basket, Stokes litter and internal life-raft fittings. Explain that fitting mass and equipment carried there are separate contributions. Use the handover mapping and verified RFM locators for the final tables.
- [ ] Distinguish the dedicated rear-ramp Stokes litter stowage from the existing Rear Area (Ramp Area) bay. Preserve their separate arms and purposes; do not create a duplicate general ramp location.
- [ ] Explain carrier-linked equipment moving with its carrier, individually located quantities, custom arms, and relocation when a default location is unavailable. Describe Stowage Required and the corrective action before certification.
- [ ] Explain capacity warnings and their scope: known location limits can be checked; an entered custom arm alone does not establish an approved location or a load limit.
- [ ] Explain that crew personal equipment is separate from role-preparation stowage reference contents and that zero-weight availability markers are not carried equipment counts.
- [ ] Record POL default membership in SAR 3 and SAR 10, optional carriage in CASEVAC/Transport, and normal relocation handling if its cabinet location is unavailable. Do not describe a universal cabinet-fitted carry rule.

### Additional crew

- [ ] Document Add Crew and Equipment, passenger-seat selection, the displayed added-person summary, equipment locations, and removal from that summary.
- [ ] Explain suggested personal equipment by crew position, optional selection including RON bags, individual stowage/custom arms, and known-capacity warnings. Confirm the final position-to-equipment mappings against the release.
- [ ] Explain what happens to associated equipment when removing a crew member or changing a role; demonstrate retained versus removed allocations without changing catalogue defaults.

### CASEVAC stretcher racks and patients — manual note, 3 October 2026

- [ ] Explain independent rack installation in Aircraft Roles and Role Config: FWD PORT at 7898 mm, FWD STBD at 6120 mm, AFT PORT at 10235 mm, and AFT STBD at 10057 mm. Each rack is one quarter of 120.09 kg: **30.0225 kg**, including its litters.
- [ ] State the calculation convention explicitly: fitting all four racks totals **120.09 kg at 8577.5 mm**, compared with the supplied RFM complete-system value of **120.09 kg at 8577 mm**. The resulting moment difference is **60.045 kg·mm**, equivalent to an aircraft CG difference of **0.00500375 mm at 12,000 kg**. The user accepted this difference as negligible on 3 October 2026. Retain the individual-rack calculation for both full and partial installations; do not describe a special combined-system correction.
- [ ] Document patient assignment in Crew and Pax Seats. Fitting a rack automatically makes its patient positions available: three positions (top, middle, bottom) on each forward rack, and two (middle, bottom) on each aft rack, for ten litter positions total. Each patient is **90.00 kg** at the associated rack arm. A fitted PTA also provides one **90.00 kg** patient position at **10375 mm**. Do not add litter structure weight a second time.
- [ ] Explain that selecting a role resets patient occupancy; occupied positions with unavailable supporting equipment remain visible for correction and prevent certification. Patient loads are included in weight, CG, occupant summaries and the PDF.

### Fuel and printed record

- [ ] Explain mapped and Manual Fuel modes. Manual departure CG uses actual tank entries; landing uses the mapped distribution for selected landing fuel. Manual mode has no predicted burn trace in either the app or PDF.
- [ ] Include tank bay labels: T1 Bay 6, T2 Bay 3, T3 Bay 2, T4 Bay 1, T5 Bay 4, with source verification. Explain total fuel CG from tank moments and the displayed fuel mode/distribution. Do not document the removed burn/endurance calculator.
- [ ] Annotate the PDF: accepted baseline/source, fuel and combined fuel CG, separate role-fit/seat-structure adjustments, custom exceptions, mission equipment weight/arm, occupants, stowage checks and Appendix A role-fit declarations.
- [ ] Explain why the acceptance section refers to the detailed declarations rather than repeating the whole adjustment list. Identify application/data versions, release date and source reference in the footer; release notes belong in the app.
- [ ] Verify and document timestamps precisely: UTC comes from the stored timestamp; displayed local time uses the device timezone at rendering. Do not claim the original acceptance timezone is separately preserved unless implemented and verified before release.

### Custodian procedures

- [ ] Match the Editor order and labels: **Role Fit Equipment; Mission Equipment; Crew and Pax Seats; Stowage Locations; Reference Documents; Aircraft Roles**. Include seat-column alignment and the distinction between seat installation and occupancy.
- [ ] Explain grouped, collapsible item editing and the role-fit groups: Aircraft Systems, Ice Protection, SAR Equipment, Sensor Systems, Servicing Equipment and Stowage Fittings. Stowage uses its saved groups, including Cabin for the agreed cabin/ramp-stowage items; do not invent separate groups from location names.
- [ ] Explain key-only creation for role-fit, mission equipment and stowage. Creation produces **New Role Fit Item**, **New Mission Equipment Item** or **New Stowage Location**, then opens the editable details. Show existing-group quick entry, capital/underscore conversion and the preview.
- [ ] Explain explicit new-group syntax: **RF_NEW_GROUP__NEW_ITEM**, **ME_NEW_GROUP__NEW_ITEM** or **NEW_GROUP__NEW_LOCATION**. The double underscore separates the group from the item; a new group requires the explicit format rather than quick entry. Validate examples against the released parser.
- [ ] Explain that keys are stable references rather than display names. Existing keys are not edited in place. Describe replacement/retirement/deletion, dependency checks, backups and validation of affected roles, locations, extra-crew mappings and saved data.
- [ ] Explain each equipment field and checkbox in operational language: routine quantity controls, default carriage, active status and use as a carrier/stowage location. Include supporting-role-fit availability links for named stowage.
- [ ] Document role creation, duplication, naming, editing and retirement; references to catalogue IDs; default physical fit versus baseline inclusion; and how new roles appear in relevant Editor controls.
- [ ] Explain local saves, exported config.js, distribution, revision changes and validation. A hard refresh does not clear browser-local edits; private browsing is a separate temporary test environment, not a release or backup method.

### Updates, recovery and release evidence

- [ ] Distinguish an ordinary custodian data update from recovery of an older session format. Ordinary revision updates do not require a second generic equipment-acceptance checkbox; real recovered-load review and unresolved-load checks remain.
- [ ] Explain stale override backup handling, accepted-session preservation, certification invalidation, End Session/Clear All behaviour and restoration limits. Verify the exact messages against the release rather than reproducing obsolete protected-session or generic-update wording.
- [ ] Capture offline update/cache behaviour and distinguish direct-file use from a hosted installation. Include supported-device checks and a recovery/rollback exercise.
- [ ] Carry forward automated regression evidence, independent worked examples and operator trials as separate evidence types. The handover records 57 passing automated tests before the final Editor-label reorder, followed by syntax verification; this is not independent aircraft validation or iPad acceptance.
- [ ] Resolve provisional arms, delivered-aircraft baseline assumptions, subtraction policy and remaining supportability tasks before describing them as settled release behaviour. Keep the CH-149-615 source register authoritative; label 511 comparisons explicitly.

Verification update — 1 October 2026: the full three-file automated regression suite was subsequently rerun after the final Editor tab reorder, with all 57 tests passing. This supersedes the timing qualification in the checklist above; independent source validation and operator acceptance remain separate activities.

