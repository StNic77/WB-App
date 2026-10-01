# Future work: CH-149-615 Weight and Balance Application User and Technical Manual

Status: planning outline only. Prepare for delivery with the application; do not draft the full manual in this change. This is a user manual written in military technical-publication language and format. It is not an official release document, an issued technical order, or evidence of airworthiness clearance.

## Purpose and writing requirements

Provide aircrew and custodians with concise, formal instructions for operating the application and understanding its calculation basis. Use numbered chapters, paragraphs, procedures, tables and figures. Use consistent aviation terminology, direct procedural language, and defined responsibilities. Avoid conversational wording, promotional claims and unnecessary explanation. Distinguish operational instructions from custodian administration and technical reference material. Provide sufficient technical explanation and traceable evidence to support review for Technical Airworthiness Clearance (TAC) and Operational Airworthiness Clearance (OAC), without asserting that this outline defines their formal requirements or that clearance has been granted.

## Proposed document structure

1. Introduction: purpose, scope, intended users, responsibilities, applicability, definitions and abbreviations, referenced documents, application/data versions and revision control.
2. General description: system functions, equipment requirements, offline operation, data flow from aircraft records through calculation to MCDU entry and PDF record; operational limitations and supported workflows.
3. Standard operating procedure: aircraft selection; acceptance of recorded weight, CG and fuel; configuration selection; load review; certification and MCDU cross-check; generation and transmission of the weight and balance record; return/end-session procedures.
4. Detailed operating instructions by tab: Home, Accept, Mission Config, Mission Equipment, Crew and PAX Seats, Fuel, Load Planning, Certify W&B. Explain controls, status indications, input units, validation messages and expected results. Include extra crew, linked equipment stowage, unavailable locations and stowage limits.
5. Non-standard aircraft and mission conditions: maintenance exceptions, custom exceptions, manual fit declarations, additional equipment, relocations, quantity changes, configuration changes and manual fuel entry. Clearly distinguish recorded-weight inclusion from physical fit.
6. Custodian Editor: access, mission equipment, role-fit equipment, seat baseline, stowage locations, reference documents and configurations. Explain keys, defaults, limits, retirement/deletion, export, local overrides, published config replacement and verification after changes.
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

- Inventory equipment-specific identifiers embedded in code, including POL/cabinet behaviour and extra-crew equipment selection. Move suitable relationships into validated, documented configuration data so deletion or replacement cannot silently break a special rule.
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
