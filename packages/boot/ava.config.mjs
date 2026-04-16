/**
 * @file package-specific AVA config
 * Normally the config goes in package.json but AVA's way to influence sharding
 * is with a comparator function, which is not JSON-serializable. So we put the
 * config in a separate .mjs file and point to it from package.json.
 */
// TODO break up the slowest test files so that the default sharding is more
// balanced and we don't have to rely on this custom sorting.

// Keep this list complete for boot test files.
// Unlisted tests still run, but they fall back to path sorting after all listed
// tests, which can silently skew CI shard balance and snapshot locality.
//
// The fixed order is chosen so AVA's contiguous shard slicing keeps each
// runutils snapshot family in as few shards as practical. That reduces duplicate
// cold snapshot regeneration in CI. Balance still matters, but only after
// snapshot-family fanout.
const bootTestOrder = [
  'test/bootstrapTests/ec-membership-update.test.ts',
  'test/bootstrapTests/upgradeAPI.test.ts',
  'test/bootstrapTests/terminate-governed.test.ts',
  'test/bootstrapTests/wallet-fun.test.ts',
  'test/bootstrapTests/updateUpgradedVaultParams.test.ts',
  'test/bootstrapTests/walletSurvivesZoeRestart.test.ts',

  'test/orchestration/orchestration.test.ts',
  'test/orchestration/restart-contracts.test.ts',
  'test/orchestration/axelar-gmp.test.ts',
  'test/orchestration/contract-upgrade.test.ts',
  'test/orchestration/lca.test.ts',
  'test/bootstrapTests/vow-offer-results.test.ts',
  'test/tools/runutils-snapshots.test.ts',

  'test/bootstrapTests/vats-restart.test.ts',
  'test/bootstrapTests/net-ibc-upgrade.test.ts',
  'test/bootstrapTests/demo-config.test.ts',
  'test/bootstrapTests/vtransfer.test.ts',
  'test/orchestration/vstorage-chain-info.test.ts',
  'test/bootstrapTests/boot-snapshot.test.ts',

  'test/configs.test.js',
  'test/tools/create-runutils-snapshot.test.ts',
  'test/tools/proposal-extractor-cache.test.ts',
  'test/tools/ibc/mocks.test.ts',
  'test/upgrading/upgrade-vats.test.ts',
  'test/upgrading/upgrade-contracts.test.js',
];

const bootTestRank = new Map(bootTestOrder.map((file, index) => [file, index]));

const normalizeTestPath = file => file.replace(/\\/g, '/');

// AVA expects a comparator. This one produces the fixed ordering declared by
// bootTestOrder above, with any unlisted files sorted afterward by path.
const byExplicitBootOrder = (a, b) => {
  const aPath = normalizeTestPath(a);
  const bPath = normalizeTestPath(b);
  const aRank = bootTestRank.get(aPath);
  const bRank = bootTestRank.get(bPath);

  if (aRank !== undefined || bRank !== undefined) {
    if (aRank === undefined) {
      return 1;
    }
    if (bRank === undefined) {
      return -1;
    }
    return aRank - bRank;
  }

  return aPath.localeCompare(bPath, [], { numeric: true });
};

export default {
  extensions: {
    js: true,
    ts: 'module',
  },
  files: ['test/**/*.test.*'],
  nodeArguments: ['--loader=ts-blank-space/register', '--no-warnings'],
  require: ['@endo/init/debug.js'],
  timeout: '20m',
  sortTestFiles: byExplicitBootOrder,
};
