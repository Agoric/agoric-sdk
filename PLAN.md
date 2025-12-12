# AVA 5.x to 6.x Upgrade Plan

## Completed Tasks

- [x] Updated all packages from AVA 5.x (`^5.3.0`) to AVA 6.x (`^6.3.0`) - 56 package.json files
- [x] Created AVA 6.x patch to support `AGORIC_AVA_EXPECT_UNHANDLED_REJECTIONS` environment variable
  - Patch location: `.yarn/patches/ava-npm-6.3.0-3cec8f89e3.patch`
  - Changes:
    - `lib/worker/base.js`: Modified to exit with code 0 when unhandled rejection count matches expected
    - `lib/run-status.js`: Modified `suggestExitCode` to allow expected unhandled rejections
    - `lib/reporters/default.js`: Modified to display expected vs actual unhandled rejections count
- [x] Added resolution in root `package.json` for `ava@npm:^6.3.0`
- [x] Ran `yarn install` to apply patches

## Tests Status

### Packages that pass tests:
- [x] access-token
- [x] agoric-cli
- [x] async-flow (42 tests passed, 1 known failure)
- [x] base-zone
- [x] builders
- [x] cache
- [x] casting
- [x] client-utils
- [x] create-dapp
- [x] deploy-script-support
- [x] ERTP
- [x] fast-usdc
- [x] governance (88 tests passed, 1 unhandled rejection - expected)
- [x] import-manager
- [x] inter-protocol
- [x] internal
- [x] kmarshal
- [x] network
- [x] notifier (69 tests passed, 2 known failures)
- [x] orchestration
- [x] pegasus
- [x] smart-wallet
- [x] solo
- [x] spawner
- [x] store
- [x] swing-store
- [x] swingset-liveslots
- [x] vm-config
- [x] xsnap-lockdown

### Packages with test issues to investigate:

- [ ] vow - Some tests expecting unhandled rejections aren't getting the expected count when run in parallel
- [ ] boot - Has test failures unrelated to AVA upgrade (pre-existing issues)

## Key Changes in AVA 6.x

1. **Exit behavior**: Tests with unhandled rejections now check against `AGORIC_AVA_EXPECT_UNHANDLED_REJECTIONS` 
   env var before determining exit code
2. **Reporting**: Reporter shows actual vs expected unhandled rejection counts
3. **Worker exit**: When unhandled rejections match expected count, worker exits with code 0 instead of 1

## Testing Notes

The `makeExpectUnhandledRejection` helper from `@agoric/internal/src/lib-nodejs/ava-unhandled-rejection.js` 
spawns a subprocess with `AGORIC_AVA_EXPECT_UNHANDLED_REJECTIONS` set to the expected count. The AVA 6 patch 
ensures that when the actual unhandled rejection count matches the expected, the test passes.

## Remaining Work

1. **SES + AVA Unhandled Rejection Tracking Issue**: The `currently-unhandled` library in AVA 6 
   doesn't see the unhandled rejections that SES intercepts. This causes tests that expect 
   specific unhandled rejection counts to fail because AVA sees 0 rejections while SES sees 
   the actual count.
   
   **Root Cause**: SES's unhandled rejection tracking (`SES_UNHANDLED_REJECTION`) intercepts 
   promise rejections before they reach Node's `process.on('unhandledRejection')` handler, 
   which is what `currently-unhandled` uses.
   
   **Affected Tests**:
   - `packages/vow/test/watch-upgrade.test.js` - expects 5 unhandled rejections
   - `packages/vow/test/unhandled-rejections.test.js` - expects varying counts
   
   **Potential Solutions**:
   - Investigate why AVA 5 worked (possibly different timing or SES version)
   - Modify SES to also emit to Node's unhandledRejection handler
   - Create a different mechanism for counting unhandled rejections in SES environment
   - Use AVA's `test.failing` for tests that expect unhandled rejections

2. Run full test suite to verify all other packages pass
3. Clean up any extra patch files that were created during development
