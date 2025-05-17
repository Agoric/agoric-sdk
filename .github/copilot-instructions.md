# Agoric SDK Development Guide

## Build/Test/Lint Commands
- Build all: `yarn build`
- Build TypeScript: `yarn build-ts`
- Test all: `yarn test`
- Test single package: `cd packages/package-name && yarn test`
- Test single test file: `cd packages/package-name && yarn test test/file.test.js`
- Lint: `yarn lint`
- Format code: `yarn format`

## Code Style Guidelines
- Use ESM imports/exports (`import/export` not `require()`)
- TypeScript: strict null checks, no unchecked side effects
- Follow Prettier formatting (enforced by linting)
- Use JSDocs for function documentation
- Async functions: handle promises properly, no floating promises
- Avoid deprecated terminology (see eslint.config.mjs)
- Test files in `packages/*/test/**/*.test.*`
- Follow conventional commit messages
- Each PR should modify a single package when possible
- Keep the history tidy - avoid overlapping branches
- All work should happen on branches with issue numbers (e.g., `123-description`)

## Error Handling
- Always return vows rather than promises in orchestration code
- Use `@typescript-eslint/no-floating-promises` rule
- Handle errors explicitly rather than letting them propagate