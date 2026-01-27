# Coding Style

## Overview
Use this when adding or modifying JS/TS code or package metadata.

## Rules
- ESM by default; JS and TypeScript are both used.
- Target Node versions: ^20.9 or ^22.11.
- Prettier enforces single quotes and 2-space indentation.
- ESLint config lives at `eslint.config.mjs` (includes AVA, TypeScript, JSDoc, and repo-specific rules).
- Package naming: publishable packages use `@agoric/*`; private/local packages use `@aglocal/*`.
- Verify package naming with `yarn lint:package-names` when changing package metadata.
