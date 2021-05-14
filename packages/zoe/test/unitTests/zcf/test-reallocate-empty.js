// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { AmountMath } from '@agoric/ertp';

import { setupZCFTest } from './setupZcfTest';

test(`zcfSeat.stage, zcf.reallocate introducing new empty amount`, async t => {
  const { zcf } = await setupZCFTest();
  const { zcfSeat: zcfSeat1 } = zcf.makeEmptySeatKit();
  const { zcfSeat: zcfSeat2 } = zcf.makeEmptySeatKit();
  const zcfMint = await zcf.makeZCFMint('RUN');
  const { brand } = zcfMint.getIssuerRecord();

  // Get the amount allocated on zcfSeat1. It is empty for the RUN brand.
  const allocation = zcfSeat1.getAmountAllocated('RUN', brand);
  t.true(AmountMath.isEmpty(allocation));

  // Stage zcfSeat2 with the allocation from zcfSeat1
  const zcfSeat2Staging = zcfSeat2.stage({ RUN: allocation });

  // Stage zcfSeat1 with empty
  const zcfSeat1Staging = zcfSeat1.stage({ RUN: AmountMath.makeEmpty(brand) });

  zcf.reallocate(zcfSeat1Staging, zcfSeat2Staging);

  t.deepEqual(zcfSeat1.getCurrentAllocation(), {
    RUN: AmountMath.make(0n, brand),
  });
  t.deepEqual(zcfSeat2.getCurrentAllocation(), {
    RUN: AmountMath.make(0n, brand),
  });
});

test(`zcfSeat.stage, zcf.reallocate "dropping" empty amount`, async t => {
  const { zcf } = await setupZCFTest();
  const { zcfSeat: zcfSeat1 } = zcf.makeEmptySeatKit();
  const { zcfSeat: zcfSeat2 } = zcf.makeEmptySeatKit();
  const zcfMint = await zcf.makeZCFMint('RUN');
  const { brand } = zcfMint.getIssuerRecord();

  zcfMint.mintGains({ RUN: AmountMath.make(brand, 0n) }, zcfSeat1);
  zcfMint.mintGains({ RUN: AmountMath.make(brand, 0n) }, zcfSeat2);

  // Now zcfSeat1 and zcfSeat2 both have an empty allocation for RUN.
  t.deepEqual(zcfSeat1.getCurrentAllocation(), {
    RUN: AmountMath.make(0n, brand),
  });
  t.deepEqual(zcfSeat2.getCurrentAllocation(), {
    RUN: AmountMath.make(0n, brand),
  });

  // Stage zcfSeat1 with an entirely empty allocation
  const zcfSeat1Staging = zcfSeat2.stage({});

  // Stage zcfSeat2 with an entirely empty allocation
  const zcfSeat2Staging = zcfSeat1.stage({});

  // Because of how we merge staged allocations with the current
  // allocation (we don't delete keys), the RUN keyword still remains:
  t.deepEqual(zcfSeat1Staging.getStagedAllocation(), {
    RUN: AmountMath.make(0n, brand),
  });
  t.deepEqual(zcfSeat2Staging.getStagedAllocation(), {
    RUN: AmountMath.make(0n, brand),
  });

  zcf.reallocate(zcfSeat1Staging, zcfSeat2Staging);

  // The reallocation succeeds without error, but because of how we
  // merge new allocations with old allocations (we don't delete
  // keys), the RUN keyword still remains as is.
  t.deepEqual(zcfSeat1.getCurrentAllocation(), {
    RUN: AmountMath.make(0n, brand),
  });
  t.deepEqual(zcfSeat2.getCurrentAllocation(), {
    RUN: AmountMath.make(0n, brand),
  });
});
