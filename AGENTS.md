# Agoric SDK

Agoric SDK monorepo for JS/TS and Go components.

## Quick Reference
- **Package manager:** Yarn (via Corepack)
- **Install:** `corepack enable && yarn install`
- **Build:** `yarn build`
- **Test:** `yarn test`
- **Lint:** `yarn lint` or `yarn lint-fix`
- **Typecheck:** `yarn run -T tsc --noEmit --incremental`
- **Format:** `yarn format` or `yarn lint:format`
- **Env doctor:** `./scripts/env-doctor.sh`
- **Single package test:** `cd packages/eventual-send && yarn test`

## Detailed Instructions
- [Project Structure](.agents/guides/project-structure.md)
- [Coding Style](.agents/guides/coding-style.md)
- [Testing](.agents/guides/testing.md)
- [Git & PR Workflow](.agents/guides/git-workflow.md)
