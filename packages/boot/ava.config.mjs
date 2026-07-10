/**
 * @file package-specific AVA config
 * Normally the config goes in package.json but AVA's way to influence sharding
 * is with a comparator function, which is not JSON-serializable. So we put the
 * config in a separate .mjs file and point to it from package.json.
 */
// TODO break up the slowest test files so that the default sharding is more
// balanced and we don't have to rely on this custom sorting.

// Keep this list COMPLETE for boot test files. AVA slices the sorted list into
// CI_NODE_TOTAL contiguous chunks BY COUNT via chunkd(files, index, total) — it
// does NOT read these comments — so an unlisted file falls to the path-sorted
// end and silently shifts every shard boundary.
//
// Because the cut is by count, the blank-line groups below MUST match chunkd's
// chunk sizes for the current file count, or the cuts land mid-group and undo
// the balancing. For the current 26 files at total=4 the sizes are [7, 7, 6, 6]
// (e.g. 24 -> [6,6,6,6], 28 -> [7,7,7,7]). Re-check sizes AND per-shard CI
// timings whenever the file set changes.
//
// The order targets, in priority:
//   1. Balance per-shard wall-clock. The orchestration suite (IBC-heavy) is the
//      dominant cost; its files are split across shards 0/1 so no single shard
//      carries the whole family. vstorage-chain-info is split into config +
//      revise (independent boots) so they run on separate cores within shard 1.
//   2. Keep each runutils snapshot family within one shard. All families
//      (demo-base, main-vaults-base, itest-vaults-base, orchestration-base) are
//      cached and restored in every shard, so a family spanning two shards only
//      costs duplicate *cold* regeneration on cache-miss runs. main-vaults-base
//      (upgradeAPI, terminate-governed, wallet-fun, provisionPool-governance) is
//      kept together in shard 2.
const bootTestOrder = [
  // shard 0 (7): orchestration-base (heavy half) + light unit/tool tests
  'test/orchestration/orchestration.test.ts',
  'test/orchestration/contract-upgrade.test.ts',
  'test/orchestration/lca.test.ts',
  'test/configs.test.js',
  'test/tools/ibc/mocks.test.ts',
  'test/tools/proposal-extractor-cache.test.ts',
  'test/tools/boot-test-context.test.ts',

  // shard 1 (7): orchestration-base (remaining) + orchestration-chains + light
  'test/orchestration/restart-contracts.test.ts',
  'test/orchestration/axelar-gmp.test.ts',
  'test/bootstrapTests/vow-offer-results.test.ts',
  'test/orchestration/vstorage-chain-info.test.ts',
  'test/orchestration/revise-chain-info.test.ts',
  'test/tools/runutils-snapshots.test.ts',
  'test/tools/controller-fixture.test.ts',

  // shard 2 (6): main-vaults-base + upgrading + snapshot tool
  'test/bootstrapTests/upgradeAPI.test.ts',
  'test/bootstrapTests/terminate-governed.test.ts',
  'test/bootstrapTests/wallet-fun.test.ts',
  'test/bootstrapTests/provisionPool-governance.test.ts',
  'test/tools/create-runutils-snapshot.test.ts',
  'test/upgrading/upgrade-vats.test.ts',

  // shard 3 (6): itest-vaults-base + demo-base + upgrading
  'test/bootstrapTests/vats-restart.test.ts',
  'test/bootstrapTests/net-ibc-upgrade.test.ts',
  'test/bootstrapTests/boot-snapshot.test.ts',
  'test/bootstrapTests/demo-config.test.ts',
  'test/bootstrapTests/vtransfer.test.ts',
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
  extensions: ['js', 'ts'],
  files: ['test/**/*.test.*'],
  nodeArguments: ['--import=ts-blank-space/register', '--no-warnings'],
  timeout: '20m',
  sortTestFiles: byExplicitBootOrder,
  workerThreads: false,
};
