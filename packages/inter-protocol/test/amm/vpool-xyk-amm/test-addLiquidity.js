// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { balancesToReachRatio } from '../../../src/vpool-xyk-amm/addLiquidity.js';
import { setupMintKits } from '../constantProduct/setupMints.js';

test.before(async t => {
  const bundleCache = await unsafeMakeBundleCache('bundles/');
  t.context = { bundleCache };
});

// The pool starts at 3000 and 4000. We want to add 400K and 300K to the pool,
// so the ratio will be close to 4:3
test('calcBalances', t => {
  const { run, bld } = setupMintKits();
  t.deepEqual(
    balancesToReachRatio(run(3000n), bld(4000n), run(400_000n), bld(300_000n)),
    {
      targetX: run(3988n),
      targetY: bld(3008n),
    },
  );
});

// pool starts at 4 and 9. We want it to end with a ratio of 12 to 3. This
// calculation doesn't pay attention to fees.
test('calcBalances 2', t => {
  const { run, bld } = setupMintKits();
  t.deepEqual(balancesToReachRatio(run(4n), bld(9n), run(1196n), bld(291n)), {
    targetX: run(12n),
    targetY: bld(3n),
  });
});

// The pool has x=4, y=9. The user wants to change the ratio to 1.1M:20K. The
// pool balance doesn't have enough resolution to support that, so it says no.
test('calcBalances out of balance', t => {
  const { run, bld } = setupMintKits();
  t.deepEqual(
    balancesToReachRatio(run(4n), bld(9n), run(1_196_000n), bld(21_000n)),
    {
      targetX: run(0n),
      targetY: bld(0n),
    },
  );
});
