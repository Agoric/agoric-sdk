## Enforce `tools` Scope (keep `tools`, no `dev`)

### Summary
Adopt `tools` as a **supported support-API surface** (mostly testing/integration helpers), and enforce boundaries with:
1. lint rules,
2. package `exports`/`files` policy,
3. CI import checks,
4. phased allowlist cleanup.

Rollout mode: **Phased allowlist** (selected).

### Scope contract to enforce
- `scripts/`: executable entrypoints only.
- `src/`: production/runtime library code.
- `tools/`: cross-package support utilities (test harnesses, mocks, typed helper interfaces).
- `test/`: local tests only; not imported by other packages.
- Rule: `src/**` must not import `**/tools/**` (except explicit temporary allowlist).
- Rule: `tools/**` may import `src/**` but not vice versa.

### Important API/interface changes
- Add repo-level policy doc section: “`tools` contract”.
- For packages that intentionally expose tools, use explicit subpath exports (preferred):
  - `exports: { "./tools/*": "./tools/*" }` (or explicit files).
- For packages that don’t intend external tools use, remove `tools/` from `files` and no `exports` entry.
- Keep current public tool paths stable where already used externally; deprecate only with wrappers and release notes.

### Enforcement implementation
1. ESLint rule for dependency direction
- Add `no-restricted-imports` (or import plugin equivalent) override:
  - In `packages/*/src/**`: forbid imports matching `**/tools/**`.
  - Allowlist specific known legacy paths temporarily (single central list).

2. ESLint rule for test/local boundaries
- In non-test files, forbid imports from `**/test/**`.
- In package A non-test files, forbid deep imports into package B `test/**`.

3. Package manifest checks
- Add CI script that validates each package’s `tools` exposure matches policy:
  - If tools are public: require explicit `exports` for tools.
  - If not public: fail if `files` includes `tools/`.
- This prevents accidental publishing of private helpers.

4. CI import-graph check
- Add a lightweight `rg`-based check script:
  - fail on new `src -> tools` imports not in allowlist.
  - fail on any new cross-package `test` imports.
- Run in PR CI.

5. Allowlist burn-down
- Store current violations in a tracked allowlist file.
- CI blocks additions; removals are encouraged.
- Periodically remove migrated entries until empty, then switch to hard fail with no allowlist.

### Test cases and scenarios
1. Lint unit checks
- `src` importing a `tools` file fails.
- `tools` importing `src` passes.
- Non-test importing `test` fails.

2. Manifest validation checks
- Package with public tools but no `exports` entry fails.
- Package with private tools but `files` includes tools fails.

3. CI regression checks
- New `src -> tools` violation in PR fails.
- Existing allowlisted violation unchanged passes.

### Assumptions/defaults
- `tools` remains a first-class, intentionally shared support surface.
- No `dev/` path introduced.
- Existing externally used `tools` paths remain compatible during cleanup.
- Rollout is phased: no new violations, gradual migration of old ones.

### Progress
- [x] Add repo-level `tools` contract policy doc section.
- [x] Add central allowlist/policy file for phased rollout.
- [x] Add ESLint boundary enforcement with temporary allowlist.
- [x] Add CI import-graph check (`rg`-based).
- [ ] Add package manifest exposure validation.
- [ ] Wire checks into PR CI.
- [ ] Run targeted validation and capture follow-up cleanup items.
