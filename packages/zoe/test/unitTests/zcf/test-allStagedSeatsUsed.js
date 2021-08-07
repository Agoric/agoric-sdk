// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AssetKind, AmountMath } from '@agoric/ertp';
import { makeOffer } from '../makeOffer.js';

import { setup } from '../setupBasicMints.js';

import { setupZCFTest } from './setupZcfTest.js';

test(`allStagedSeatsUsed should not be asserted`, async t => {
  const { moolaKit, moola } = setup();
  const { zoe, zcf } = await setupZCFTest({
    Moola: moolaKit.issuer,
  });

  const { zcfSeat: zcfSeat1 } = await makeOffer(
    zoe,
    zcf,
    harden({ give: { B: moola(3) } }),
    harden({ B: moolaKit.mint.mintPayment(moola(3)) }),
  );

  const { zcfSeat: zcfSeat2 } = await makeOffer(
    zoe,
    zcf,
    harden({ give: { B: moola(3) } }),
    harden({ B: moolaKit.mint.mintPayment(moola(3)) }),
  );

  zcfSeat1.incrementBy(zcfSeat2.decrementBy({ B: moola(2) }));
  // Seats have staged allocations
  t.true(zcfSeat1.hasStagedAllocation());

  const zcfMint = await zcf.makeZCFMint('Token', AssetKind.NAT, {
    decimalPlaces: 6,
  });

  const { brand: tokenBrand } = zcfMint.getIssuerRecord();

  const zcfSeat3 = zcfMint.mintGains({
    MyToken: AmountMath.make(tokenBrand, 100n),
  });

  // This test was failing due to this bug: https://github.com/Agoric/agoric-sdk/issues/3613
  t.deepEqual(zcfSeat3.getCurrentAllocation(), {
    MyToken: AmountMath.make(tokenBrand, 100n),
  });
});

test(`allStagedSeatsUsed should be asserted`, async t => {
  const { moolaKit, moola } = setup();
  const { zoe, zcf } = await setupZCFTest({
    Moola: moolaKit.issuer,
  });

  const { zcfSeat: zcfSeat1 } = await makeOffer(
    zoe,
    zcf,
    harden({ give: { B: moola(3) } }),
    harden({ B: moolaKit.mint.mintPayment(moola(3)) }),
  );

  const { zcfSeat: zcfSeat2 } = await makeOffer(
    zoe,
    zcf,
    harden({ give: { B: moola(3) } }),
    harden({ B: moolaKit.mint.mintPayment(moola(3)) }),
  );

  const { zcfSeat: zcfSeat3 } = await makeOffer(
    zoe,
    zcf,
    harden({ give: { B: moola(3) } }),
    harden({ B: moolaKit.mint.mintPayment(moola(3)) }),
  );

  zcfSeat1.incrementBy(zcfSeat2.decrementBy({ B: moola(2) }));

  zcfSeat3.incrementBy({ B: moola(3) });

  t.true(zcfSeat3.hasStagedAllocation());

  // zcfSeat3 has a staged allocation but was not included in reallocate
  t.throws(() => zcf.reallocate(zcfSeat1, zcfSeat2), {
    message:
      'At least one seat has a staged allocation but was not included in the call to reallocate',
  });
});
