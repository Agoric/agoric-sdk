// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { balancesToReachRatio } from '../../../src/vpool-xyk-amm/addLiquidity.js';
import { setupMintKits } from '../constantProduct/setupMints.js';

// The pool starts at 3000 and 4000. We want to add 400K and 300K to the pool,
// so the ratio will be close to 4:3
test('calcBalances', t => {
  const { run, bld } = setupMintKits();
  t.deepEqual(
    balancesToReachRatio(run(3000n), bld(4000n), run(400_000n), bld(300_000n)),
    {
      newX: run(3988n),
      newY: bld(3008n),
    },
  );
});

// pool starts at 4 and 9. We want it to end with a ratio of 12 to 3. This
// calculation doesn't pay attention to fees.
test('calcBalances 2', t => {
  const { run, bld } = setupMintKits();
  t.deepEqual(balancesToReachRatio(run(4n), bld(9n), run(1196n), bld(291n)), {
    newX: run(12n),
    newY: bld(3n),
  });
});
