# Versioning Policy

This policy distinguishes changes to the application from changes to the aircraft configuration data it uses. Apply the checklist whenever preparing a versioned build.

## The two version numbers

### Software version (`APP_VERSION`)

The software version identifies changes to application code and behavior, including the operator interface, Editor, validation, persistence, and calculations. While the app is in development, use `0.MINOR.PATCH-dev`.

- **Patch** (`0.2.20-dev`): a focused correction or small refinement to behavior that already exists. Examples include fixing a display defect, correcting a misleading label, or refining an existing workflow without adding a new capability.
- **Minor** (`0.3.0-dev`): a new capability or substantial workflow that changes what operators or custodians can do, expands what can be represented, or changes the calculation or validation rules. A minor release is appropriate even when the underlying equations do not change. Examples include a new Editor capability, a new operator workflow, a new persistent session field, or a new calculation method.

Use judgment within development. The size of the code diff is not the deciding factor; the change in capability and the compatibility or operational impact are.

Under these criteria, the tail-specific Editor and operator role availability meet the **minor** threshold. The already-pushed `0.2.19-dev` build remains unchanged; use `0.3.0-dev` for the next software-versioned build so the new policy is applied consistently from this point forward.

### Configuration version (`AC_META.configVersion`)

The configuration version identifies aircraft-specific data and the structure used to store that data.

- **Increment the configuration version** when shipped aircraft data changes, such as equipment weights or arms, seat data, stowage data, role definitions, tail assignments, or reference-document records.
- **Also increment it** when a software change adds or changes the saved configuration structure in `config.js` or Editor overrides. Add a migration path when compatible local Editor data should be preserved.
- **Do not increment it** for a software-only change that leaves the aircraft data and saved configuration structure unchanged.

A single release can increment both versions. For example, adding tail-specific configuration support changes application behavior and adds a new configuration structure, so both versions advance.

## Development release checklist

Before committing a versioned build, answer these questions:

1. **Did application code change?**
   - No: leave `APP_VERSION` unchanged.
   - Yes: continue.
2. **Is this a focused correction or refinement to an existing capability?**
   - Yes: increment the software patch number, such as `0.2.19-dev` to `0.2.20-dev`.
   - No; it adds a capability, substantial workflow, data shape, or changes calculation/validation behavior: start the next software minor series at `.0`, such as `0.2.19-dev` to `0.3.0-dev`.
3. **Did shipped aircraft data or the saved configuration structure change?**
   - Yes: increment `AC_META.configVersion`, set `configReleasedAt` in UTC, add a changelog entry, and update the offline release configuration version.
   - No: keep the configuration version unchanged.
4. **Can existing local Editor data be loaded after the configuration version changes?**
   - If yes, add or update a tested migration path and preserve a backup of the original override.
   - If not, ensure the app clearly preserves or backs up incompatible data according to the existing override-loading behavior.
5. **Are all release identifiers synchronized?**
   - Update `APP_VERSION` in `persist.js` and the app version in `sw.js` together.
   - Update `configVersion` and `releaseId` in `sw.js` to match `config.js` and the software version.
   - Add the release summary to `TEST_BUILD_CHANGELOG.md`.
   - Update version assertions in existing tests when their expected current version changes.
6. **Verify before committing.**
   - Check syntax and whitespace.
   - Run the relevant existing tests and manual checks for the changed behavior, persistence, and offline release where applicable.
   - Confirm the working tree contains only the intended changes, then commit and push if requested.

## Release Candidate and 1.x.x

Use the `1.x.x-rc.N` series for Release Candidates. The first candidate is `1.0.0-rc.1`; subsequent candidate builds increment `N`. Start RC only when the planned feature set is stable enough for operational acceptance testing. Fixes during RC advance the candidate number. After acceptance, release `1.0.0`.

Configuration versioning remains independent during RC and after 1.0: increment it only for aircraft data or saved-configuration structure changes.

## Examples

| Change | Software version | Configuration version |
|---|---|---|
| Correct a typo or a small display defect | Patch | No change |
| Add tail-specific Editor and operator role availability | New minor series | Increment for the new saved structure |
| Change an equipment weight or seat arm in shipped data | No change if code is unchanged | Increment |
| Add a new calculation method or change a calculation rule | New minor series during development | Only if aircraft data or its stored structure also changes |
| Change existing Editor help text without changing its workflow | Patch | No change |
