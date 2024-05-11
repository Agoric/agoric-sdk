// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath } from '@agoric/ertp';
import {
  fromOnly,
  toOnly,
} from '../../../src/contractSupport/atomicTransfer.js';

import { setupZCFTest } from './setupZcfTest.js';
import { makeOffer } from '../makeOffer.js';
import { setup } from '../setupBasicMints.js';

const zcfMintUtils = async (zcf, name) => {
  const mint = await zcf.makeZCFMint(name);
  const { brand } = mint.getIssuerRecord();

  return {
    make: v => AmountMath.make(brand, v),
    makeEmpty: () => AmountMath.makeEmpty(brand),
    brand: () => brand,
    mintGains: (seat, v, t) =>
      mint.mintGains(harden({ [t]: AmountMath.make(brand, v) }), seat),
  };
};

const assertAllocations = (t, seat, expectedAllocations) => {
  const allocations = seat.getCurrentAllocation();
  t.deepEqual(allocations, expectedAllocations, 'allocations did not match');
};

test(`zcf.atomicRearrange all Legal Combinations`, async t => {
  const { zcf } = await setupZCFTest();
  const moola = await zcfMintUtils(zcf, 'Moola');
  const bucks = await zcfMintUtils(zcf, 'Bucks');

  const { zcfSeat: alice } = zcf.makeEmptySeatKit();
  const { zcfSeat: bob } = zcf.makeEmptySeatKit();
  const { zcfSeat: carol } = zcf.makeEmptySeatKit();

  moola.mintGains(alice, 100n, 'M');
  bucks.mintGains(bob, 50n, 'B');

  zcf.atomicRearrange([
    [alice, bob, { M: moola.make(20n) }],
    [bob, carol, { B: bucks.make(30n) }],
    [alice, carol, { M: moola.make(15n) }, { C: moola.make(15n) }],
    fromOnly(bob, { B: bucks.make(12n) }),
    toOnly(alice, { N: bucks.make(12n) }),
  ]);
  assertAllocations(t, alice, { M: moola.make(65n), N: bucks.make(12n) });
  assertAllocations(t, bob, { B: bucks.make(8n), M: moola.make(20n) });
  assertAllocations(t, carol, { B: bucks.make(30n), C: moola.make(15n) });
});

test(`zcf.atomicRearrange missing to amount`, async t => {
  const { zcf } = await setupZCFTest();
  const moola = await zcfMintUtils(zcf, 'Moola');
  const bucks = await zcfMintUtils(zcf, 'Bucks');

  const { zcfSeat: alice } = zcf.makeEmptySeatKit();
  const { zcfSeat: bob } = zcf.makeEmptySeatKit();
  const { zcfSeat: carol } = zcf.makeEmptySeatKit();

  moola.mintGains(alice, 100n, 'M');
  bucks.mintGains(bob, 50n, 'B');

  t.throws(() => zcf.atomicRearrange([[undefined, carol, undefined]]), {
    message: /must say how much/,
  });
});

test(`zcf.atomicRearrange too few argumemnts`, async t => {
  const { zcf } = await setupZCFTest();
  const moola = await zcfMintUtils(zcf, 'Moola');
  const bucks = await zcfMintUtils(zcf, 'Bucks');

  const { zcfSeat: alice } = zcf.makeEmptySeatKit();
  const { zcfSeat: bob } = zcf.makeEmptySeatKit();

  moola.mintGains(alice, 100n, 'M');
  bucks.mintGains(bob, 50n, 'B');

  t.throws(
    () =>
      zcf.atomicRearrange([
        [alice, bob, { M: moola.make(20n) }],
        // @ts-expect-error Testing
        [bob, { B: bucks.make(30n) }],
      ]),
    { message: /Expected at least 3 arguments/ },
  );
});

test(`zcf.atomicRearrange no seats`, async t => {
  const { zcf } = await setupZCFTest();
  const moola = await zcfMintUtils(zcf, 'Moola');
  const bucks = await zcfMintUtils(zcf, 'Bucks');

  const { zcfSeat: alice } = zcf.makeEmptySeatKit();
  const { zcfSeat: bob } = zcf.makeEmptySeatKit();

  moola.mintGains(alice, 100n, 'M');
  bucks.mintGains(bob, 50n, 'B');

  t.throws(
    () =>
      zcf.atomicRearrange([
        [alice, bob, { M: moola.make(20n) }],
        [undefined, undefined, { B: bucks.make(30n) }],
      ]),
    { message: /Transfer must have at least one of fromSeat or toSeat/ },
  );
});

test(`zcf.atomicRearrange no transfers`, async t => {
  const { zcf } = await setupZCFTest();
  const moola = await zcfMintUtils(zcf, 'Moola');
  const bucks = await zcfMintUtils(zcf, 'Bucks');

  const { zcfSeat: alice } = zcf.makeEmptySeatKit();
  const { zcfSeat: bob } = zcf.makeEmptySeatKit();

  moola.mintGains(alice, 100n, 'M');
  bucks.mintGains(bob, 50n, 'B');

  t.throws(
    () =>
      zcf.atomicRearrange([
        [alice, bob, { M: moola.make(20n) }],
        // @ts-expect-error Testing
        [bob, alice, bob],
      ]),
    { message: /Must be a copyRecord/ },
  );

  t.throws(
    () =>
      zcf.atomicRearrange([
        [alice, bob, { M: moola.make(20n) }],
        [bob, alice, undefined, undefined],
      ]),
    { message: / must say how much/ },
  );
});

test(`zcf.atomicRearrange no FromAmount`, async t => {
  const { zcf } = await setupZCFTest();
  const moola = await zcfMintUtils(zcf, 'Moola');
  const bucks = await zcfMintUtils(zcf, 'Bucks');

  const { zcfSeat: alice } = zcf.makeEmptySeatKit();
  const { zcfSeat: bob } = zcf.makeEmptySeatKit();

  moola.mintGains(alice, 100n, 'M');
  bucks.mintGains(bob, 50n, 'B');

  t.throws(
    () =>
      zcf.atomicRearrange([
        [alice, bob, { M: moola.make(20n) }],
        [alice, bob, undefined, { M: moola.make(20n) }],
      ]),
    { message: /must say how much/ },
  );
});

test(`zcf.atomicRearrange FromAmount w/o fromSeat`, async t => {
  const { zcf } = await setupZCFTest();
  const moola = await zcfMintUtils(zcf, 'Moola');
  const bucks = await zcfMintUtils(zcf, 'Bucks');

  const { zcfSeat: alice } = zcf.makeEmptySeatKit();
  const { zcfSeat: bob } = zcf.makeEmptySeatKit();

  moola.mintGains(alice, 100n, 'M');
  bucks.mintGains(bob, 50n, 'B');

  t.throws(
    () =>
      zcf.atomicRearrange([
        [alice, bob, { M: moola.make(20n) }],
        [undefined, bob, { B: bucks.make(37n) }, { M: moola.make(20n) }],
      ]),
    { message: /Transfer without fromSeat cannot have fromAmounts/ },
  );
});

test(`zcf.atomicRearrange toAmount w/o toSeat`, async t => {
  const { zcf } = await setupZCFTest();
  const moola = await zcfMintUtils(zcf, 'Moola');
  const bucks = await zcfMintUtils(zcf, 'Bucks');

  const { zcfSeat: alice } = zcf.makeEmptySeatKit();
  const { zcfSeat: bob } = zcf.makeEmptySeatKit();

  moola.mintGains(alice, 100n, 'M');
  bucks.mintGains(bob, 50n, 'B');

  t.throws(
    () =>
      zcf.atomicRearrange([
        [alice, bob, { M: moola.make(20n) }],
        [alice, undefined, { B: bucks.make(37n) }, { M: moola.make(20n) }],
      ]),
    { message: /Transfer without toSeat cannot have toAmounts/ },
  );
});

test(`zcf.atomicRearrange breaks conservation`, async t => {
  const { zcf } = await setupZCFTest();
  const moola = await zcfMintUtils(zcf, 'Moola');
  const bucks = await zcfMintUtils(zcf, 'Bucks');

  const { zcfSeat: alice } = zcf.makeEmptySeatKit();
  const { zcfSeat: bob } = zcf.makeEmptySeatKit();

  moola.mintGains(alice, 100n, 'M');
  bucks.mintGains(bob, 50n, 'B');

  t.throws(
    () =>
      zcf.atomicRearrange([
        [alice, bob, { M: moola.make(20n) }],
        toOnly(bob, { C: bucks.make(27n) }),
      ]),
    { message: /rights were not conserved for brand / },
  );
  t.throws(
    () =>
      zcf.atomicRearrange([
        [alice, bob, { M: moola.make(20n) }],
        fromOnly(bob, { B: bucks.make(10n) }),
      ]),
    { message: /rights were not conserved for brand / },
  );
});

test(`zcf.atomicRearrange breaks offerSafety`, async t => {
  const { moolaKit, moola, bucksKit, bucks } = setup();
  const { zoe, zcf } = await setupZCFTest({
    M: moolaKit.issuer,
    B: bucksKit.issuer,
  });

  const { zcfSeat: alice } = await makeOffer(
    zoe,
    zcf,
    harden({ give: { M: moola(30n) }, want: { B: bucks(200n) } }),
    harden({ M: moolaKit.mint.mintPayment(moola(30n)) }),
  );

  const { zcfSeat: bob } = await makeOffer(
    zoe,
    zcf,
    harden({ give: { B: bucks(20n) } }),
    harden({ B: bucksKit.mint.mintPayment(bucks(20n)) }),
  );

  t.throws(
    () =>
      zcf.atomicRearrange([
        [bob, alice, { B: bucks(20n) }],
        [alice, bob, { M: moola(30n) }],
      ]),
    { message: /Offer safety was violated/ },
  );
});
