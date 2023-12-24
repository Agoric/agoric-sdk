import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

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
    harden({ give: { B: moola(3n) } }),
    harden({ B: moolaKit.mint.mintPayment(moola(3n)) }),
  );

  const { zcfSeat: zcfSeat2 } = await makeOffer(
    zoe,
    zcf,
    harden({ give: { B: moola(3n) } }),
    harden({ B: moolaKit.mint.mintPayment(moola(3n)) }),
  );

  zcfSeat1.incrementBy(zcfSeat2.decrementBy(harden({ B: moola(2n) })));
  // Seats have staged allocations
  t.true(zcfSeat1.hasStagedAllocation());

  const zcfMint = await zcf.makeZCFMint(
    'Token',
    AssetKind.NAT,
    harden({
      decimalPlaces: 6,
    }),
  );

  const { brand: tokenBrand } = zcfMint.getIssuerRecord();

  const zcfSeat3 = zcfMint.mintGains(
    harden({
      MyToken: AmountMath.make(tokenBrand, 100n),
    }),
  );

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
    harden({ give: { B: moola(3n) } }),
    harden({ B: moolaKit.mint.mintPayment(moola(3n)) }),
  );

  const { zcfSeat: zcfSeat2 } = await makeOffer(
    zoe,
    zcf,
    harden({ give: { B: moola(3n) } }),
    harden({ B: moolaKit.mint.mintPayment(moola(3n)) }),
  );

  const { zcfSeat: zcfSeat3 } = await makeOffer(
    zoe,
    zcf,
    harden({ give: { B: moola(3n) } }),
    harden({ B: moolaKit.mint.mintPayment(moola(3n)) }),
  );

  zcfSeat1.incrementBy(harden(zcfSeat2.decrementBy(harden({ B: moola(2n) }))));

  zcfSeat3.incrementBy(harden({ B: moola(3n) }));

  t.true(zcfSeat3.hasStagedAllocation());

  // zcfSeat3 has a staged allocation but was not included in reallocate.
  // This is now legal, so we now test that this reallocate does
  // not throw.
  t.notThrows(() => zcf.reallocate(zcfSeat1, zcfSeat2));
});
