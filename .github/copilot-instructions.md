# Agoric SDK Development Guide

**ALWAYS follow these instructions first. Only search for additional information if these instructions are incomplete or found to be in error.**

## Prerequisites and Environment Setup

Install required dependencies in this exact order:

1. **Enable Corepack** (required for proper Yarn version):
   ```bash
   corepack enable
   ```

2. **Verify Prerequisites**:
   - Node.js ^20.9 or ^22.11 (tested with v20.19.4)
   - Go ^1.22.12 (tested with v1.24.5) 
   - Yarn (will be managed by corepack - uses 4.9.2)
   - gcc >=10 or clang >=10 (tested with gcc 13.3.0)

3. **For Apple Silicon/newer architectures**, you may need:
   ```bash
   export CPLUS_INCLUDE_PATH=/opt/homebrew/include
   xcode-select --install
   ```

## Build/Test/Lint Commands with Timing Expectations

**CRITICAL TIMEOUTS**: NEVER CANCEL builds or tests. Set appropriate timeouts as indicated below.

### Installation and Build (NEVER CANCEL - Set 60+ minute timeouts)
- **Install dependencies**: `yarn install` 
  - Expected time: ~4 minutes (includes native compilation)
  - NEVER CANCEL: Includes compiling xsnap native modules
- **Build all packages**: `yarn build`
  - Expected time: ~1.5 minutes  
  - NEVER CANCEL: Builds all 56+ packages and contract bundles
- **Build TypeScript only**: `yarn build-ts` 
  - Expected time: ~35 seconds
  - Note: May have type errors in current codebase - this is normal

### Testing (NEVER CANCEL - Set 30+ minute timeouts)
- **Test all packages**: `yarn test`
  - Expected time: Varies significantly by package
  - NEVER CANCEL: Some test suites take 10+ minutes per package
- **Test single package**: `cd packages/package-name && yarn test`
  - Expected time: 30 seconds to 3 minutes depending on package
  - Example: ERTP tests ~53 seconds, SwingSet tests ~2.8 minutes
- **Test specific package with workspaces**: `yarn workspaces foreach --include '@agoric/package-name' --all run test`
  - Expected time: Same as individual package
  - Useful for testing from repository root
- **Test single file**: `cd packages/package-name && yarn test test/file.test.js`
- **Test with specific engines**: `yarn test:xs` for XS engine testing

### Linting and Formatting (NEVER CANCEL - Set 20+ minute timeouts)
- **Lint all packages**: `yarn lint`
  - Expected time: ~11.5 minutes
  - NEVER CANCEL: Runs ESLint + TypeScript on all packages
- **Format code**: `yarn format` 
  - Expected time: ~39 seconds
  - NEVER CANCEL: Runs Prettier on all files
- **Check formatting**: `yarn lint:format`

## Environment Variables and Paths

### Critical Environment Setup
```bash
# Always enable corepack first
corepack enable

# Add agoric CLI to PATH
export PATH=$PATH:~/bin

# For Apple Silicon (if needed)
export CPLUS_INCLUDE_PATH=/opt/homebrew/include
```

### Important Paths and Files
- **Repository root**: `/home/runner/work/agoric-sdk/agoric-sdk` (or your clone location)
- **CLI location**: `~/bin/agoric` (after yarn link-cli)
- **Package directories**: `packages/*` (56+ packages)
- **Integration tests**: `a3p-integration/`, `multichain-testing/`
- **Scripts**: `scripts/` (build helpers, environment setup)
- **Configuration**: Root `package.json`, `tsconfig.build.json`, `eslint.config.mjs`

## Development Workflow

### Setting Up Agoric CLI
```bash
yarn link-cli ~/bin/agoric
export PATH=$PATH:~/bin
agoric --version  # Should show version (e.g., 0.21.1)
```

### Exploring Repository Structure
```bash
# List all workspace packages
yarn workspaces list

# Check workspace dependencies (may show mismatched deps - this is normal)
yarn workspaces info

# Run commands across multiple workspaces
yarn workspaces foreach --all run build
```

### Creating New Projects
```bash
# After setting up CLI
cd ~
agoric init my-project
cd my-project  
# Note: agoric install may fail with dapp templates due to yarn version conflicts
# Use manual yarn install if needed:
yarn install  # May require --immutable-cache=false for templates
agoric start  # Browse to http://localhost:8000
```

**Known Issues with agoric install:**
- Dapp templates may use incompatible yarn syntax with current yarn version
- If `agoric install` fails, try manual `yarn install` in the project directory
- Template lockfiles may need regeneration

### Edit Loop for Package Development
1. Modify code in e.g. `packages/zoe/`
2. Run `yarn build` (at top level or in specific package)
3. Re-run tests: `yarn test` or `agoric start --reset`
4. Repeat

### Important: Contract Bundles
When modifying Zoe contracts, always run `yarn build` to regenerate contract facet bundles. Changes are ignored without rebuilding.

## Validation Requirements

**ALWAYS run these validation steps before completing any changes:**

1. **Build validation**: `yarn build` must complete successfully
2. **Lint validation**: `yarn lint` must pass (warnings acceptable)  
3. **Format validation**: `yarn format` then verify no changes with `git diff`
4. **Test validation**: Run tests for any modified packages
5. **CLI validation**: If CLI changes, test `agoric --version` and basic commands

### Manual Testing Scenarios

**ALWAYS test actual functionality after making changes:**

- For contract changes: Deploy and exercise contract functionality
- For CLI changes: Run through complete `agoric init` -> `agoric start` workflow
- For core changes: Run integration tests in modified packages
- For build changes: Verify clean build from scratch

## Repository Structure and Key Locations

### Package Organization (56+ packages)
- **Core packages**: `packages/ERTP`, `packages/zoe`, `packages/SwingSet`
- **CLI and tools**: `packages/agoric-cli`, `packages/deployment` 
- **Contracts**: `packages/inter-protocol`, `packages/governance`
- **Testing**: All packages have tests in `test/` directories
- **Integration**: `a3p-integration/` for chain upgrade testing
- **Multi-chain**: `multichain-testing/` for cross-chain scenarios

### Configuration Files
- **Root config**: `package.json` (defines workspace structure)
- **Build config**: `tsconfig.build.json`, `lerna.json`
- **Lint config**: `eslint.config.mjs` 
- **Environment**: `repoconfig.sh` (version requirements)

### Important Directories
- **Scripts**: `scripts/` (build helpers, env setup)
- **Documentation**: `docs/`, `README.md`, `CONTRIBUTING.md`
- **CI/CD**: `.github/workflows/` (extensive test matrix)
- **Dependencies**: Uses Yarn workspaces with Corepack

## Code Style Guidelines

- **Modules**: Use ESM imports/exports (`import/export` not `require()`)
- **TypeScript**: Strict null checks, no unchecked side effects
- **Formatting**: Follow Prettier formatting (enforced by linting)
- **Documentation**: Use JSDocs for function documentation  
- **Async**: Handle promises properly, no floating promises
- **Terminology**: Avoid deprecated terms (see eslint.config.mjs)
- **Tests**: Place in `packages/*/test/**/*.test.*`
- **Commits**: Follow conventional commit messages
- **Branches**: Use issue numbers as prefix (e.g., `123-description`)

## Error Handling Patterns

- **Orchestration**: Always return vows rather than promises
- **Lint rules**: Use `@typescript-eslint/no-floating-promises` 
- **Explicit handling**: Handle errors explicitly rather than letting them propagate
- **Vat communication**: Follow SwingSet patterns for inter-vat messaging

## Common Issues and Troubleshooting

### Build Issues
- If `yarn install` fails: Ensure corepack is enabled and gcc/clang available
- If native modules fail: Install build tools (`build-essential` on Linux, Xcode on Mac)
- If TypeScript errors: Current codebase has some expected type errors

### Test Issues  
- Tests timeout: Use appropriate timeout values, never cancel long-running tests
- Flaky tests: Some integration tests may be timing-sensitive
- XS engine tests: May behave differently than Node.js tests

### Environment Issues
- Path issues: Ensure `~/bin` is in PATH after CLI setup
- Permission issues: May need sudo for global installs
- Version mismatches: Verify prerequisite versions match requirements

### Dapp Template Issues
- `agoric install` may fail due to yarn version incompatibilities
- Template dependencies may have lockfile conflicts
- Use manual `yarn install` if `agoric install` fails

## Package-Specific Notes

### High-priority packages requiring extra care:
- **SwingSet**: Core vat system, complex tests (~2.8 min)
- **ERTP**: Electronic Rights Transfer Protocol, fundamental
- **Zoe**: Smart contract framework, requires bundle rebuilds
- **agoric-cli**: Main developer interface, test thoroughly

### Integration testing:
- **a3p-integration**: Chain upgrade testing (~20 second install)  
- **multichain-testing**: Cross-chain functionality testing

Remember: This is a complex blockchain platform. Take time to understand the architecture before making changes. When in doubt, run the full test suite and examine existing patterns in the codebase.