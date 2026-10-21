# Agent Notes for a3p-integration

This document provides guidance for AI agents working with the a3p-integration test suite.

## Overview

The a3p-integration directory contains upgrade proposals that are tested against a synthetic Agoric chain. This simulates real-world upgrade scenarios and validates that proposals work correctly.

## Directory Structure

```
a3p-integration/
├── proposals/          # Individual upgrade proposals
│   ├── g:ymax1/       # Proposal for ymax1 contract
│   ├── f:ymax0-restart/ # Proposal for ymax0 restart
│   └── ...            # Other proposals
├── package.json       # Workspace configuration
└── README.md          # User documentation
```

### Proposal Naming Convention

Proposals follow the pattern `[letter]:[name]`:
- The letter indicates ordering (execution order)
- The colon separates the prefix from the descriptive name
- Examples: `g:ymax1`, `f:ymax0-restart`, `z:acceptance`

**Important:** When using `yarn test -m`, the colon is ignored for matching.

## Essential Commands

### `yarn doctor`
Sanity checks all proposal packages.

```bash
cd a3p-integration
yarn doctor
```

**Use when:**
- After modifying proposal package.json files
- Before running tests
- Troubleshooting package dependency issues

**What it checks:**
- Package structure
- Dependencies consistency
- Proposal metadata

### `yarn build`
Builds the complete test environment.

```bash
cd a3p-integration
yarn build
```

**What it does:**
1. Builds the latest Agoric SDK
2. Generates all proposal submissions
3. Builds the synthetic chain image

**Use when:**
- First time setting up a3p tests
- After modifying SDK code that affects proposals
- After adding/modifying proposal files

**Note:** This can take significant time (10-30 minutes depending on system).

### `yarn test -m <pattern>`
Runs the first proposal matching the pattern.

```bash
cd a3p-integration
yarn test -m ymax0      # Runs f:ymax0-restart
yarn test -m ymax1      # Runs g:ymax1
yarn test -m acceptance # Runs z:acceptance
```

**How matching works:**
- The `-m` flag matches against proposal names
- The colon separator is ignored (`:` treated as empty)
- First matching proposal is executed
- Pattern matching is case-sensitive

**Examples:**
```bash
yarn test -m ymax0       # Matches f:ymax0-restart
yarn test -m ymax        # Matches first ymax* proposal
yarn test -m upgrade     # Matches first *upgrade* proposal
```

## Common Workflows

### Testing a Portfolio Contract Change

```bash
# 1. Modify code in packages/portfolio-contract or packages/portfolio-deploy

# 2. Build everything (required after code changes)
cd a3p-integration
yarn build

# 3. Run ymax proposal tests
yarn test -m ymax0      # Test ymax0 restart
yarn test -m ymax1      # Test ymax1 deployment

# 4. Check results
# Tests pass: Proposal executed successfully on synthetic chain
# Tests fail: Check logs for errors
```

### Adding a New Proposal

```bash
# 1. Create proposal directory
mkdir -p a3p-integration/proposals/h:my-proposal

# 2. Add package.json, test files, submission files
# (See existing proposals for structure)

# 3. Validate package structure
cd a3p-integration
yarn doctor

# 4. Build and test
yarn build
yarn test -m my-proposal
```

### Debugging Proposal Failures

```bash
# 1. Check build logs
yarn build 2>&1 | tee build.log

# 2. Run specific test with verbose output
yarn test -m ymax0 --verbose

# 3. Check proposal submission files
ls proposals/g:ymax1/submission/

# 4. Validate proposal structure
yarn doctor
```

## Integration with Portfolio Deploy

Many proposals use portfolio-deploy packages:

```javascript
// In proposal package.json
{
  "dependencies": {
    "@aglocal/portfolio-deploy": "workspace:*",
    "@agoric/client-utils": "dev"
  }
}
```

**Best practices:**
- Import from `@aglocal/portfolio-deploy/src/` for shared utilities
- Use constants from `contract-constants.js`
- Use wallet utilities from `wallet-utils.js`
- Don't duplicate code - import from portfolio-deploy

## Troubleshooting

### "Proposal not found"
- Check proposal directory exists in `proposals/`
- Verify naming matches pattern (letter:name)
- Try `ls proposals/` to see all proposals

### "Build fails"
- Run `yarn doctor` to check package structure
- Check that SDK dependencies are up to date
- Clear build cache and rebuild: `rm -rf node_modules && yarn && yarn build`

### "Tests timeout"
- Increase timeout in proposal's ava configuration
- Check if synthetic chain is stuck (restart build)
- Verify proposal isn't waiting for unavailable resources

### "Workspace dependency errors"
- Verify `workspace:*` protocol in package.json
- Run `yarn install` from repo root
- Check that referenced package exists in workspace

## Performance Tips

- **Parallel builds:** `yarn build` uses all CPU cores
- **Selective testing:** Use `-m` to run only needed proposals
- **Cache builds:** Avoid rebuilding if only test code changed
- **Local chain:** Consider using local chain for rapid iteration

## Related Documentation

- [a3p-integration/README.md](./README.md) - User-facing documentation
- [packages/portfolio-deploy/README.md](../packages/portfolio-deploy/README.md) - Portfolio deployment
- [Agoric SDK Testing Guide](https://github.com/Agoric/agoric-sdk/wiki/Testing)
