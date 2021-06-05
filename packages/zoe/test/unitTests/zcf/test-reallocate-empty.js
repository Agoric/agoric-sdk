// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { AmountMath, AssetKind } from '@agoric/ertp';

import { setupZCFTest } from './setupZcfTest';

test(`zcf.reallocate introducing new empty amount`, async t => {
  const { zcf } = await setupZCFTest();
  const { zcfSeat: zcfSeat1 } = zcf.makeEmptySeatKit();
  const { zcfSeat: zcfSeat2 } = zcf.makeEmptySeatKit();
  const zcfMint = await zcf.makeZCFMint('RUN');
  const { brand } = zcfMint.getIssuerRecord();

  // Get the amount allocated on zcfSeat1. It is empty for the RUN brand.
  const allocation = zcfSeat1.getAmountAllocated('RUN', brand);
  t.true(AmountMath.isEmpty(allocation));

  const empty = AmountMath.makeEmpty(brand, AssetKind.NAT);

  // decrementBy empty
  t.throws(() => zcfSeat1.decrementBy({ RUN: empty }), {
    message:
      'The amount could not be subtracted from the allocation because the allocation did not have an amount under the keyword "RUN".',
  });

  // Try to incrementBy empty. This succeeds, and the keyword is added
  // with an empty amount.
  zcfSeat1.incrementBy({ RUN: empty });
  zcfSeat2.incrementBy({ RUN: empty });

  zcf.reallocate(zcfSeat1, zcfSeat2);

  t.deepEqual(zcfSeat1.getStagedAllocation(), {
    RUN: empty,
  });
  t.deepEqual(zcfSeat2.getStagedAllocation(), {
    RUN: empty,
  });
});
