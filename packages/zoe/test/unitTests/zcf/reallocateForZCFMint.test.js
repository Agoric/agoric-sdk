import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { AssetKind, AmountMath } from '@agoric/ertp';
import { makeOffer } from '../makeOffer.js';

import { setup } from '../setupBasicMints.js';

import { setupZCFTest } from './setupZcfTest.js';

// Test that `zcfSeat.incrementBy()` and `zcfSeat.decrementBy()` can
// be interleaved at any point with `zcfMint.mintGains()` and
// `zcfMint.burnLosses()` with no problems. This test only performs a
// subset of all possible interleavings, but it should cover a fair amount
//
// Order of calls:
// 1. zcfSeat2.decrementBy with non-zcfMint token
// 2. zcfMint.mintGains on zcfSeat2
// 3. zcfMint.mintGains on zcfSeat1
// 4. zcfSeat1.incrementBy non-zcfMint token
// 5. reallocate(zcfSeat1, zcfSeat2)
// 6. zcfSeat1.decrementBy zcfMint token and non-zcfMint token
// 7. zcfMint.burnLosses on zcfSeat1
// 8. zcfMint.burnLosses on zcfSeat2
// 9. zcfSeat2.incrementBy zcfMint token and non-zcfMint token
// 10. zcfMint.mintGains on zcfSeat2
// 11 reallocate(zcfSeat1, zcfSeat2)

test(`stagedAllocations safely interleave with zcfMint calls`, async t => {
  const { moolaKit, moola } = setup();
  const { zoe, zcf } = await setupZCFTest({
    Moola: moolaKit.issuer,
  });

  // Make zcfSeat1
  const { zcfSeat: zcfSeat1 } = await makeOffer(
    zoe,
    zcf,
    harden({ give: { B: moola(3n) } }),
    harden({ B: moolaKit.mint.mintPayment(moola(3n)) }),
  );

  // Make zcfSeat2
  const { zcfSeat: zcfSeat2 } = await makeOffer(
    zoe,
    zcf,
    harden({ give: { B: moola(3n) } }),
    harden({ B: moolaKit.mint.mintPayment(moola(3n)) }),
  );

  // Make ZCFMint
  const zcfMint = await zcf.makeZCFMint(
    'Token',
    AssetKind.NAT,
    harden({
      decimalPlaces: 6,
    }),
  );
  const { brand: tokenBrand } = zcfMint.getIssuerRecord();

  // Decrement zcfSeat2 by non-zcfMintToken
  zcfSeat2.decrementBy(harden({ B: moola(2n) }));
  t.true(zcfSeat2.hasStagedAllocation());
  t.deepEqual(zcfSeat2.getStagedAllocation(), { B: moola(1n) });
  t.deepEqual(zcfSeat2.getCurrentAllocation(), { B: moola(3n) });

  // Mint gains to zcfSeat2
  zcfMint.mintGains(
    harden({
      MyToken: AmountMath.make(tokenBrand, 100n),
    }),
    zcfSeat2,
  );
  // zcfSeat2's staged allocation and the current allocation should
  // include the newly minted tokens. Staged allocations completely
  // replace the old allocations, so it is important that anything
  // added to the current allocation also gets added to any
  // in-progress staged allocation.
  t.deepEqual(zcfSeat2.getStagedAllocation(), {
    B: moola(1n),
    MyToken: AmountMath.make(tokenBrand, 100n),
  });
  t.deepEqual(zcfSeat2.getCurrentAllocation(), {
    B: moola(3n),
    MyToken: AmountMath.make(tokenBrand, 100n),
  });

  // Mint gains to zcfSeat1
  zcfMint.mintGains(
    harden({
      OtherTokens: AmountMath.make(tokenBrand, 50n),
    }),
    zcfSeat1,
  );
  // zcfSeat1 has no staged allocation, but the current
  // allocation should have changed to include the minted tokens
  t.false(zcfSeat1.hasStagedAllocation());
  t.deepEqual(zcfSeat1.getCurrentAllocation(), {
    B: moola(3n),
    OtherTokens: AmountMath.make(tokenBrand, 50n),
  });

  // zcfSeat1.incrementBy non-zcfMint token
  zcfSeat1.incrementBy(harden({ B: moola(2n) }));
  // Both the staged allocation and the current allocation show the OtherTokens
  t.deepEqual(zcfSeat1.getStagedAllocation(), {
    B: moola(5n),
    OtherTokens: AmountMath.make(tokenBrand, 50n),
  });
  t.deepEqual(zcfSeat1.getCurrentAllocation(), {
    B: moola(3n),
    OtherTokens: AmountMath.make(tokenBrand, 50n),
  });

  // Reallocate
  zcf.reallocate(zcfSeat1, zcfSeat2);
  t.false(zcfSeat1.hasStagedAllocation());
  t.false(zcfSeat2.hasStagedAllocation());
  t.deepEqual(zcfSeat1.getCurrentAllocation(), {
    B: moola(5n),
    OtherTokens: AmountMath.make(tokenBrand, 50n),
  });
  t.deepEqual(zcfSeat2.getCurrentAllocation(), {
    B: moola(1n),
    MyToken: AmountMath.make(tokenBrand, 100n),
  });

  // Test burnLosses interleaving

  // zcfSeat1 decrementBy both zcfMint token and non-zcfMint token
  zcfSeat1.decrementBy(
    harden({
      OtherTokens: AmountMath.make(tokenBrand, 5n),
      B: moola(1n),
    }),
  );

  // zcfMint.burnLosses on zcfSeat1
  zcfMint.burnLosses(
    harden({ OtherTokens: AmountMath.make(tokenBrand, 7n) }),
    zcfSeat1,
  );
  // The zcfMint losses are subtracted from both the currentAllocation and the
  // stagedAllocation, but currentAllocation does not include the
  // stagedAllocations, and will not until zcf.reallocate is called.
  t.deepEqual(zcfSeat1.getCurrentAllocation(), {
    B: moola(5n), // no change since reallocate
    OtherTokens: AmountMath.make(tokenBrand, 43n),
  });
  t.deepEqual(zcfSeat1.getStagedAllocation(), {
    B: moola(4n),
    OtherTokens: AmountMath.make(tokenBrand, 38n), // includes decrementBy and burnLosses
  });

  // zcfMint.burnLosses on zcfSeat2
  zcfMint.burnLosses(
    harden({
      MyToken: AmountMath.make(tokenBrand, 17n),
    }),
    zcfSeat2,
  );
  t.deepEqual(zcfSeat2.getCurrentAllocation(), {
    B: moola(1n),
    MyToken: AmountMath.make(tokenBrand, 83n),
  });
  t.false(zcfSeat2.hasStagedAllocation());

  // zcfSeat2.incrementBy
  zcfSeat2.incrementBy(
    harden({
      OtherTokens: AmountMath.make(tokenBrand, 5n), // let's keep this keyword separate even though we don't have to
      B: moola(1n),
    }),
  );
  t.deepEqual(zcfSeat2.getCurrentAllocation(), {
    B: moola(1n),
    MyToken: AmountMath.make(tokenBrand, 83n),
  });
  t.deepEqual(zcfSeat2.getStagedAllocation(), {
    B: moola(2n),
    MyToken: AmountMath.make(tokenBrand, 83n),
    OtherTokens: AmountMath.make(tokenBrand, 5n),
  });

  // zcfMint.mintGains on zcfSeat2
  zcfMint.mintGains(
    harden({
      AnotherOne: AmountMath.make(tokenBrand, 2n),
    }),
    zcfSeat2,
  );
  t.deepEqual(zcfSeat2.getCurrentAllocation(), {
    B: moola(1n),
    MyToken: AmountMath.make(tokenBrand, 83n),
    AnotherOne: AmountMath.make(tokenBrand, 2n),
  });
  t.deepEqual(zcfSeat2.getStagedAllocation(), {
    B: moola(2n),
    MyToken: AmountMath.make(tokenBrand, 83n),
    OtherTokens: AmountMath.make(tokenBrand, 5n),
    AnotherOne: AmountMath.make(tokenBrand, 2n),
  });

  // One last reallocate
  zcf.reallocate(zcfSeat1, zcfSeat2);
  t.deepEqual(zcfSeat2.getCurrentAllocation(), {
    B: moola(2n),
    MyToken: AmountMath.make(tokenBrand, 83n),
    OtherTokens: AmountMath.make(tokenBrand, 5n),
    AnotherOne: AmountMath.make(tokenBrand, 2n),
  });
  t.deepEqual(zcfSeat1.getCurrentAllocation(), {
    B: moola(4n),
    OtherTokens: AmountMath.make(tokenBrand, 38n),
  });
  t.false(zcfSeat1.hasStagedAllocation());
  t.false(zcfSeat2.hasStagedAllocation());
});
