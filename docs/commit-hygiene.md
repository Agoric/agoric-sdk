# Commit Hygiene Requirements

This document outlines the commit hygiene requirements for the Agoric SDK repository.

## Before Committing Changes

### 1. Run Code Generation (if applicable)

If you modify files in packages that have a `codegen` script, you **must** run it before committing:

```bash
# For client-utils
cd packages/client-utils
yarn codegen
```

This generates TypeScript code from proto files and ensures consistency.

### 2. Update Package Locks (if changing package.json)

If you modify any `package.json` files, you **must** run the lock file update script:

```bash
# From repository root
scripts/update-package-locks.sh
```

This updates all yarn.lock files across the repository. This is critical because:
- Several different yarn projects in the repo depend on the root yarn project's dependency graph
- These projects use the "portal" protocol which creates dependencies on the monorepo structure
- Changes to any package.json can affect lock files in other parts of the repository

**Always run this script even if you think only local changes were made.**

### 3. Format Code with Prettier

Always run Prettier to ensure code style compliance:

```bash
# From repository root
yarn format
```

Or format specific files:

```bash
yarn run -T prettier --write path/to/file.js
```

### 4. Run Linting

Ensure your changes pass linting:

```bash
# In the package directory
yarn lint

# Or with auto-fix
yarn lint-fix
```

### 5. Run Tests

Run tests in the affected package:

```bash
# In the package directory
yarn test

# Or just build and typecheck
yarn build
```

### 6. Build Before Testing

Some packages require building before tests will pass:

```bash
yarn build && yarn test
```

- client-utils
- cosmic-proto

Issue: [Changes to package "client-utils" are not visible without compilation #11954
](https://github.com/Agoric/agoric-sdk/issues/11954)

## Package-Specific Requirements

### @agoric/client-utils

1. Run `yarn codegen` after any changes to proto definitions or RPC client generation
2. Run `yarn format` (from repo root) before committing
3. Ensure tests pass with `yarn test`
4. Verify build succeeds with `yarn build`

### Other Packages

Check the package's `package.json` for available scripts and follow similar patterns.

## Why These Requirements Matter

- **Codegen**: Ensures generated code is in sync with proto definitions
- **Package Locks**: Keeps all yarn.lock files synchronized across the monorepo, preventing version conflicts
- **Formatting**: Maintains consistent code style across the codebase
- **Linting**: Catches common errors and enforces code quality standards
- **Testing**: Prevents regressions and ensures functionality

## Automated Checks

CI will verify these requirements, but running them locally saves time and prevents failed builds.
