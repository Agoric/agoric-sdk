# Oxlint migration status

This document tracks migration progress from `eslint.config.mjs` to `.oxlintrc.json` while Oxlint is running in advisory mode.

## Current mode

- Oxlint runs from `yarn lint:oxlint` as `yarn dlx oxlint@latest --config .oxlintrc.json .`.
- The CI job `lint-oxlint` in `test-all-packages` is non-blocking (`continue-on-error: true`).
- Oxlint severities are intentionally limited to `off` and `warn`.
- Support for `no-restricted-syntax` is provided via `oxlint-plugin-eslint` (using the `eslint-js/` prefix).
- **Type-aware features:** Oxlint is currently run without type-aware features (`--type-aware` or `--type-check`). Rules requiring type information (e.g., `no-floating-promises`) are not yet migrated to Oxlint.

## `no-restricted-syntax` migration status

### From `eslint.config.mjs` -> `.oxlintrc.json`

| ESLint scope | Rule intent | Converted to Oxlint | Notes |
| --- | --- | --- | --- |
| `packages/*/src/**/*.js`, `packages/*/tools/**/*.js`, `packages/*/tools/**/*.mjs`, `packages/*/*.js`, `packages/wallet/api/src/**/*.js` | Deprecated terminology: `currency` | ✅ Yes | Implemented via `eslint-js/no-restricted-syntax`. |
| same as above | Deprecated terminology: `blacklist` | ✅ Yes | Implemented via `eslint-js/no-restricted-syntax`. |
| same as above | Deprecated terminology: `whitelist` | ✅ Yes | Implemented via `eslint-js/no-restricted-syntax`. |
| same as above | Deprecated terminology: `RUN` | ✅ Yes | Implemented via `eslint-js/no-restricted-syntax`. |
| same as above | Deprecated terminology: `loan` | ✅ Yes | Implemented via `eslint-js/no-restricted-syntax`. |
| same as above | `Object.fromEntries(Object.entries(...))` restriction | ✅ Yes | Implemented via `eslint-js/no-restricted-syntax`. |
| `packages/*/src/exos/**` | Async function and vow restrictions | ✅ Yes | Implemented via `eslint-js/no-restricted-syntax`. |
| `packages/zoe/src/contracts/loan/*.js` | Loan-contract exception (allow “loan”) | ✅ Yes | Implemented via `eslint-js/no-restricted-syntax`. |

## Related restriction-rule migration status

| ESLint rule | Scope | Converted to Oxlint | Notes |
| --- | --- | --- | --- |
| `no-restricted-properties` | test/demo files | ✅ Yes | Implemented via `eslint-js/no-restricted-properties`. |
| `no-restricted-imports` | `packages/boot/test/**/*.test.*s` | ✅ Yes | Implemented via `eslint-js/no-restricted-imports`. |
| `@jessie.js/safe-await-separator` | Global (with test/a3p overrides) | ✅ Yes | Implemented via `@jessie.js/` prefix using JS plugin bridge. |
| `plugin:ava/recommended` | test files | ✅ Yes | Implemented via `ava/` prefix using JS plugin bridge. |

## JSDoc rule migration status

Native Oxlint JSDoc rules are used where possible. Custom Agoric tags are supported via `tagNamePreference`.

| ESLint rule | Converted to Oxlint | Notes |
| --- | --- | --- |
| `jsdoc/check-tag-names` | ✅ Yes | Native. Custom tags (alpha, beta, category, etc.) allowed via `tagNamePreference`. |
| `jsdoc/check-access` | ✅ Yes | Native. |
| `jsdoc/check-property-names` | ✅ Yes | Native. |
| `jsdoc/empty-tags` | ✅ Yes | Native. |
| `jsdoc/implements-on-classes` | ✅ Yes | Native. |
| `jsdoc/require-property` | ✅ Yes | Native. |
| `jsdoc/require-property-name` | ✅ Yes | Native. |
| `jsdoc/require-property-type` | ✅ Yes | Native. |
| `jsdoc/no-defaults` | ✅ Yes | Native (set to `off`). |
| `jsdoc/require-property-description` | ✅ Yes | Native (set to `off`). |
| `jsdoc/require-yields` | ✅ Yes | Native (set to `off`). |
| `jsdoc/require-param` | ✅ Yes | Native (set to `off`). |
| `jsdoc/require-param-type` | ✅ Yes | Native (set to `off`). |
| `jsdoc/require-returns-type` | ✅ Yes | Native (set to `off`). |

## ESLint rules that could potentially be turned off later

These should only be disabled in ESLint after we verify semantic parity and acceptable signal/noise in CI:

- `no-restricted-syntax` (scoped entries listed above)
- `no-restricted-properties` (`test.only` policy)
- `no-restricted-imports` (`packages/boot/test/**/*.test.*s` scope)
- `@jessie.js/safe-await-separator` (global and scoped policies)
- `@typescript-eslint/no-floating-promises` once Oxlint type-aware results are stable enough for policy replacement

## Evaluation: custom Agoric/Endo plugin migration

### Current ESLint plugin dependencies

- `plugin:@agoric/recommended`
- `@jessie.js/safe-await-separator`
- JSDoc ESLint plugin rules currently used in multiple scoped overrides

### Oxlint migration feasibility (current)

- **Agoric custom plugin rules:** No direct Oxlint plugin bridge exists for ESLint plugins today, so these cannot be mechanically imported. Migration requires either:
  1. Upstreaming equivalent built-in Oxlint rules, or
  2. Re-expressing specific policies using available Oxlint core rules/selectors (as done for restricted syntax/import/property policies).
- **AVA rules:** Migrated to Oxlint using the JS plugin bridge with the `ava` alias.
- **Endo/Jessie-specific rules:** `@jessie.js/safe-await-separator` is ecosystem-specific and has been successfully migrated to Oxlint using the JS plugin bridge with the `@jessie.js` alias.
- **`require-extensions` plugin behavior:** Removed from ESLint. TypeScript `nodenext` configuration now handles import extension enforcement.

### Recommendation

Run dual-lint for now:

1. Keep ESLint as enforcement gate.
2. Keep Oxlint non-blocking to collect parity data.
3. Promote only rule families that prove equivalent and low-noise.
