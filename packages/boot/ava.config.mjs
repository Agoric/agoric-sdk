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
// AVA slices this list into CI_NODE_TOTAL contiguous shards (chunkd). The order
// below targets two goals, in priority order:
//   1. Balance per-shard wall-clock. With the Inter Protocol vault/PSM scenarios
//      removed (#12719), the orchestration suite (IBC-heavy: stakeAtom,
//      basic-flows, restart-contracts) became the dominant cost — ~all of it
//      landed in one contiguous shard, leaving that shard ~3x the lightest. The
//      six orchestration-base files are therefore split across the first two
//      shards so no single shard carries the whole family.
//   2. Keep each runutils snapshot family in as few shards as practical. All
//      families (demo-base, main-vaults-base, itest-vaults-base, orchestration-base)
//      are cached and restored in every CI shard, so a family spanning two shards
//      only costs duplicate *cold* regeneration on cache-miss runs (i.e. when a
//      config/bundle changes). That makes splitting the heavy orchestration
//      family across two shards a cheap way to buy balance; every other family is
//      kept within a single shard.
// Each blank-line group below is one target shard (at CI_NODE_TOTAL=4). Re-verify
// the split against CI shard timings if the file set or per-file cost shifts.
const bootTestOrder = [
  // shard 0: orchestration-base (heavy half) + light unit/tool tests
  'test/orchestration/orchestration.test.ts',
  'test/orchestration/contract-upgrade.test.ts',
  'test/orchestration/lca.test.ts',
  'test/configs.test.js',
  'test/tools/ibc/mocks.test.ts',
  'test/tools/proposal-extractor-cache.test.ts',

  // shard 1: orchestration-base (remaining) + orchestration-chains + light
  'test/orchestration/restart-contracts.test.ts',
  'test/orchestration/axelar-gmp.test.ts',
  'test/bootstrapTests/vow-offer-results.test.ts',
  'test/orchestration/vstorage-chain-info.test.ts',
  'test/tools/runutils-snapshots.test.ts',
  'test/tools/controller-fixture.test.ts',

  // shard 2: main-vaults-base + upgrading + snapshot tool
  'test/bootstrapTests/upgradeAPI.test.ts',
  'test/bootstrapTests/terminate-governed.test.ts',
  'test/bootstrapTests/wallet-fun.test.ts',
  'test/tools/create-runutils-snapshot.test.ts',
  'test/upgrading/upgrade-vats.test.ts',
  'test/upgrading/upgrade-contracts.test.js',

  // shard 3: itest-vaults-base + demo-base
  'test/bootstrapTests/vats-restart.test.ts',
  'test/bootstrapTests/net-ibc-upgrade.test.ts',
  'test/bootstrapTests/boot-snapshot.test.ts',
  'test/bootstrapTests/demo-config.test.ts',
  'test/bootstrapTests/vtransfer.test.ts',
  'test/tools/boot-test-context.test.ts',
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
  extensions: ['js', 'ts'],
  files: ['test/**/*.test.*'],
  nodeArguments: ['--import=ts-blank-space/register', '--no-warnings'],
  timeout: '20m',
  sortTestFiles: byExplicitBootOrder,
  workerThreads: false,
};
