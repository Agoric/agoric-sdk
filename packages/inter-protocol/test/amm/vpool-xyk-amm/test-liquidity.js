import { test as unknownTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { setup } from '@agoric/zoe/test/unitTests/setupBasicMints.js';
import { assertPayoutAmount } from '@agoric/zoe/test/zoeTestHelpers.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { E } from '@endo/eventual-send';
import { subscriptionTracker } from '../../metrics.js';
import { setupAmmServices } from './setup.js';

/** @typedef {Record<string, any> & {
 *   bundleCache: Awaited<ReturnType<typeof unsafeMakeBundleCache>>,
 * }} Context */
/** @type {import('ava').TestFn<Context>} */
const test = unknownTest;

test.before(async t => {
  const bundleCache = await unsafeMakeBundleCache('bundles/');
  t.context = { bundleCache };
});

const makeLiquidityInvitations = async (
  t,
  zoe,
  amm,
  moolaKit,
  centralR,
  moolaLiquidityIssuer,
) => {
  const centralTokens = value => AmountMath.make(centralR.brand, value);
  const makeMoola = value => AmountMath.make(moolaKit.brand, value);
  const moolaLiquidityBrand = await E(moolaLiquidityIssuer).getBrand();
  const moolaLiquidity = value => AmountMath.make(moolaLiquidityBrand, value);

  const addLiquidity = async (moola, central) => {
    const addLiquidityInvitation = E(
      amm.ammPublicFacet,
    ).makeAddLiquidityInvitation();

    const aliceMoolaPayment1 = moolaKit.mint.mintPayment(makeMoola(moola));
    const aliceCentralPayment1 = centralR.mint.mintPayment(
      centralTokens(central),
    );

    const aliceProposal = harden({
      want: { Liquidity: moolaLiquidity(1000n) },
      give: { Secondary: makeMoola(moola), Central: centralTokens(central) },
    });
    const alicePayments = {
      Secondary: aliceMoolaPayment1,
      Central: aliceCentralPayment1,
    };

    const addLiquiditySeat = await E(zoe).offer(
      addLiquidityInvitation,
      aliceProposal,
      alicePayments,
    );

    t.is(
      await E(addLiquiditySeat).getOfferResult(),
      'Added liquidity.',
      `Alice added moola and central liquidity`,
    );

    return E(addLiquiditySeat).getPayouts();
  };

  const removeLiquidity = async (liquidityTokens, liquidity) => {
    const removeLiquidityInvitation = E(
      amm.ammPublicFacet,
    ).makeRemoveLiquidityInvitation();

    const emptyLiquidity = moolaLiquidity(liquidity);
    const aliceProposal = harden({
      give: { Liquidity: emptyLiquidity },
      want: {
        Secondary: makeMoola(0n),
        Central: centralTokens(0n),
      },
    });
    const alicePayments = { Liquidity: liquidityTokens };

    const removeLiquiditySeat = await E(zoe).offer(
      removeLiquidityInvitation,
      aliceProposal,
      alicePayments,
    );

    t.is(
      await E(removeLiquiditySeat).getOfferResult(),
      'Liquidity successfully removed.',
      `Alice removed liquidity`,
    );

    return E(removeLiquiditySeat).getPayouts();
  };
  return { addLiquidity, removeLiquidity };
};

const makeAssertPayouts = (
  t,
  moolaLiquidityIssuer,
  liquidityBrand,
  centralR,
  moolaKit,
) => {
  return async (
    lPayment,
    lExpected,
    cPayment,
    cExpected,
    sPayment,
    sExpected,
  ) => {
    const lAmount = AmountMath.make(liquidityBrand, lExpected);
    await assertPayoutAmount(
      t,
      moolaLiquidityIssuer,
      lPayment,
      lAmount,
      'Liquidity payout',
    );
    const cAmount = AmountMath.make(centralR.brand, cExpected);
    await assertPayoutAmount(
      t,
      centralR.issuer,
      cPayment,
      cAmount,
      'central payout',
    );
    const sAmount = AmountMath.make(moolaKit.brand, sExpected);
    await assertPayoutAmount(
      t,
      moolaKit.issuer,
      sPayment,
      sAmount,
      'moola Payout',
    );
  };
};

test('amm add issuers in parallel', async t => {
  // Set up central token
  const centralR = makeIssuerKit('central');
  const moolaR = makeIssuerKit('moola');

  const { amm } = await setupAmmServices(
    t,
    { committeeName: 'EnBancPanel', committeeSize: 3 },
    centralR,
  );

  const [issuer1, issuer2, issuer3] = await Promise.all([
    E(amm.ammPublicFacet).addIssuer(moolaR.issuer, 'Moola1'),
    E(amm.ammPublicFacet).addIssuer(moolaR.issuer, 'Moola2'),
    E(amm.ammPublicFacet).addIssuer(moolaR.issuer, 'Moola3'),
  ]);

  t.is(issuer1, issuer2);
  t.is(issuer1, issuer3);

  const issuer4 = await E(amm.ammPublicFacet).addIssuer(
    moolaR.issuer,
    'Moola4',
  );
  t.is(issuer1, issuer4);
});

test('amm add issuer in parallel same keyword', async t => {
  // Set up central token
  const centralR = makeIssuerKit('central');
  const moolaR = makeIssuerKit('moola');

  const { amm } = await setupAmmServices(
    t,
    { committeeName: 'EnBancPanel', committeeSize: 3 },
    centralR,
  );

  const [issuer1, issuer2, issuer3] = await Promise.all([
    E(amm.ammPublicFacet).addIssuer(moolaR.issuer, 'Moola'),
    E(amm.ammPublicFacet).addIssuer(moolaR.issuer, 'Moola'),
    E(amm.ammPublicFacet).addIssuer(moolaR.issuer, 'Moola'),
  ]);

  t.is(issuer1, issuer2);
  t.is(issuer1, issuer3);
});

test('amm add and remove liquidity', async t => {
  const centralLiquidityValue = 1_500_000_000n;
  const secondaryLiquidityValue = 300_000_000n;

  // Set up central token
  const centralR = makeIssuerKit('central');
  const moolaKit = makeIssuerKit('moola');
  const moola = value => AmountMath.make(moolaKit.brand, value);
  const central = value => AmountMath.make(centralR.brand, value);

  const { zoe, amm } = await setupAmmServices(
    t,
    { committeeName: 'EnBancPanel', committeeSize: 3 },
    centralR,
  );

  const liquidityIssuer = await E(amm.ammPublicFacet).addIssuer(
    moolaKit.issuer,
    'Moola',
  );
  const liquidityBrand = await E(liquidityIssuer).getBrand();
  const addPoolInvitation = await E(amm.ammPublicFacet).addPoolInvitation();

  const proposal = harden({
    give: {
      Secondary: moola(secondaryLiquidityValue),
      Central: central(centralLiquidityValue),
    },
    want: { Liquidity: AmountMath.make(liquidityBrand, 1000n) },
  });
  const payments = {
    Secondary: moolaKit.mint.mintPayment(moola(secondaryLiquidityValue)),
    Central: centralR.mint.mintPayment(central(centralLiquidityValue)),
  };

  const addLiquiditySeat = await E(zoe).offer(
    addPoolInvitation,
    proposal,
    payments,
  );
  t.is(
    await E(addLiquiditySeat).getOfferResult(),
    'Added liquidity.',
    `Added Moola and Central Liquidity`,
  );

  const poolMetrics = await E(amm.ammPublicFacet).getPoolMetrics(
    moolaKit.brand,
  );
  const tracker = await subscriptionTracker(t, poolMetrics);
  await tracker.assertInitial({
    centralAmount: central(0n),
    liquidityTokens: AmountMath.makeEmpty(liquidityBrand),
    secondaryAmount: moola(0n),
  });

  const poolLiquidity = {
    centralAmount: { value: 1500000000n },
    liquidityTokens: { value: 1500000000n },
    secondaryAmount: { value: 300000000n },
  };
  await tracker.assertChange(poolLiquidity);

  const alloc = await E(addLiquiditySeat).getFinalAllocation();
  t.deepEqual(alloc, {
    Central: central(0n),
    Liquidity: AmountMath.make(liquidityBrand, 1_499_999_000n),
    Secondary: moola(0n),
  });

  const allocation = (c, l, s) => ({
    Central: AmountMath.make(centralR.brand, c),
    Liquidity: AmountMath.make(liquidityBrand, l),
    Secondary: moola(s),
  });
  const { addLiquidity, removeLiquidity } = await makeLiquidityInvitations(
    t,
    zoe,
    amm,
    moolaKit,
    centralR,
    liquidityIssuer,
  );
  const assertPayouts = makeAssertPayouts(
    t,
    liquidityIssuer,
    liquidityBrand,
    centralR,
    moolaKit,
  );

  t.deepEqual(
    await E(amm.ammPublicFacet).getPoolAllocation(moolaKit.brand),
    {
      Central: central(centralLiquidityValue),
      Liquidity: AmountMath.makeEmpty(liquidityBrand),
      Secondary: moola(secondaryLiquidityValue),
    },
    `The pool will hava an initial Allocation`,
  );

  // add liquidity at 10_000:50_000
  const {
    Central: c1,
    Liquidity: l1,
    Secondary: s1,
  } = await addLiquidity(10000n, 50_000n);
  // We get liquidity back. All the central and secondary is accepted
  await assertPayouts(l1, 50_000n, c1, 0n, s1, 0n);
  t.deepEqual(
    await E(amm.ammPublicFacet).getPoolAllocation(moolaKit.brand),
    allocation(
      centralLiquidityValue + 50_000n,
      0n,
      secondaryLiquidityValue + 10000n,
    ),
    `poolAllocation after initialization`,
  );

  poolLiquidity.centralAmount.value += 50000n;
  poolLiquidity.liquidityTokens.value += 50000n;
  poolLiquidity.secondaryAmount.value += 10000n;
  await tracker.assertChange(poolLiquidity);

  // Add liquidity. Offer 20_000:70_000. It will be accepted at a ratio of 5:1
  const {
    Central: c2,
    Liquidity: l2,
    Secondary: s2,
  } = await addLiquidity(20_000n, 70_000n);
  // After the trade, this will increase the pool by about 140%
  await assertPayouts(l2, 70_000n, c2, 0n, s2, 6000n);
  // The pool should now have grown by 50K + 70K and 24K
  t.deepEqual(
    await E(amm.ammPublicFacet).getPoolAllocation(moolaKit.brand),
    allocation(
      centralLiquidityValue + 120_000n,
      0n,
      secondaryLiquidityValue + 24_000n,
    ),
    `poolAllocation after adding more`,
  );

  poolLiquidity.centralAmount.value += 70000n;
  poolLiquidity.liquidityTokens.value += 70000n;
  poolLiquidity.secondaryAmount.value += 14000n;
  await tracker.assertChange(poolLiquidity);

  const [l40Payment, _l30Payment] = await E(liquidityIssuer).split(
    l2,
    AmountMath.make(liquidityBrand, 40_000n),
  );

  // remove liquidity. 40K is 1/3 of liquidity. Should get 1/3 of Moola and RUN.
  const {
    Central: c3,
    Liquidity: l3,
    Secondary: s3,
  } = await removeLiquidity(l40Payment, 40_000n);
  await assertPayouts(l3, 0n, c3, 40_000n, s3, 8000n);
  t.deepEqual(
    await E(amm.ammPublicFacet).getPoolAllocation(moolaKit.brand),
    allocation(
      centralLiquidityValue + 80_000n,
      40_000n,
      secondaryLiquidityValue + 16_000n,
    ),
    `poolAllocation after removing liquidity`,
  );

  poolLiquidity.centralAmount.value -= 40000n;
  poolLiquidity.liquidityTokens.value -= 40000n;
  poolLiquidity.secondaryAmount.value -= 8000n;
  await tracker.assertChange(poolLiquidity);
});

test('MinInitialPoolLiquidity to reserve', async t => {
  const centralLiquidityValue = 1_500_000_000n;
  const secondaryLiquidityValue = 300_000_000n;

  // Set up central token
  const centralR = makeIssuerKit('central');
  const moolaKit = makeIssuerKit('moola');
  const moola = value => AmountMath.make(moolaKit.brand, value);
  const central = value => AmountMath.make(centralR.brand, value);

  const { zoe, amm, space } = await setupAmmServices(
    t,
    { committeeName: 'EnBancPanel', committeeSize: 3 },
    centralR,
  );
  const { reserveKit } = space.consume;

  const liquidityIssuer = await E(amm.ammPublicFacet).addIssuer(
    moolaKit.issuer,
    'Moola',
  );
  const liquidityBrand = await E(liquidityIssuer).getBrand();

  const addPoolInvitation = await E(amm.ammPublicFacet).addPoolInvitation();

  const proposal = harden({
    give: {
      Secondary: moola(secondaryLiquidityValue),
      Central: central(centralLiquidityValue),
    },
    want: { Liquidity: AmountMath.make(liquidityBrand, 1000n) },
  });
  const payments = {
    Secondary: moolaKit.mint.mintPayment(moola(secondaryLiquidityValue)),
    Central: centralR.mint.mintPayment(central(centralLiquidityValue)),
  };

  const addLiquiditySeat = await E(zoe).offer(
    addPoolInvitation,
    proposal,
    payments,
  );
  t.is(
    await E(addLiquiditySeat).getOfferResult(),
    'Added liquidity.',
    `Added Moola and Central Liquidity`,
  );

  const reserveCreatorFacet = E.get(reserveKit).creatorFacet;
  const reserveAllocations = await E(reserveCreatorFacet).getAllocations();
  t.deepEqual(reserveAllocations, {
    RmoolaLiquidity: AmountMath.make(liquidityBrand, 1000n),
  });
});

/// /#5293.   AddLiquidity with wrong token in want increments liqTokenSupply and then breaks
test('add wrong liquidity', async t => {
  const centralLiquidityValue = 1_500_000_000n;
  const secondaryLiquidityValue = 300_000_000n;

  // Set up central token
  const centralR = makeIssuerKit('central');
  const moolaKit = makeIssuerKit('moola');
  const moola = value => AmountMath.make(moolaKit.brand, value);
  const central = value => AmountMath.make(centralR.brand, value);

  const { zoe, amm } = await setupAmmServices(
    t,
    { committeeName: 'EnBancPanel', committeeSize: 3 },
    centralR,
  );

  const liquidityIssuer = await E(amm.ammPublicFacet).addIssuer(
    moolaKit.issuer,
    'Moola',
  );
  const liquidityBrand = await E(liquidityIssuer).getBrand();
  const addPoolInvitation = await E(amm.ammPublicFacet).addPoolInvitation();

  const proposal = harden({
    give: {
      Secondary: moola(secondaryLiquidityValue),
      Central: central(centralLiquidityValue),
    },
    want: { Liquidity: AmountMath.make(liquidityBrand, 1000n) },
  });
  const payments = {
    Secondary: moolaKit.mint.mintPayment(moola(secondaryLiquidityValue)),
    Central: centralR.mint.mintPayment(central(centralLiquidityValue)),
  };

  const addLiquiditySeat = await E(zoe).offer(
    addPoolInvitation,
    proposal,
    payments,
  );
  t.is(
    await E(addLiquiditySeat).getOfferResult(),
    'Added liquidity.',
    `Added Moola and Central Liquidity`,
  );

  const poolMetrics = await E(amm.ammPublicFacet).getPoolMetrics(
    moolaKit.brand,
  );
  const tracker = await subscriptionTracker(t, poolMetrics);
  await tracker.assertInitial({
    centralAmount: central(0n),
    liquidityTokens: AmountMath.makeEmpty(liquidityBrand),
    secondaryAmount: moola(0n),
  });

  const poolLiquidity = {
    centralAmount: { value: 1500000000n },
    liquidityTokens: { value: 1500000000n },
    secondaryAmount: { value: 300000000n },
  };
  await tracker.assertChange(poolLiquidity);

  t.deepEqual(
    await E(amm.ammPublicFacet).getPoolAllocation(moolaKit.brand),
    harden({
      Central: central(poolLiquidity.centralAmount.value),
      Liquidity: AmountMath.makeEmpty(liquidityBrand),
      Secondary: moola(poolLiquidity.secondaryAmount.value),
    }),
  );

  const alloc = await E(addLiquiditySeat).getFinalAllocation();
  t.deepEqual(alloc, {
    Central: central(0n),
    Liquidity: AmountMath.make(liquidityBrand, 1_499_999_000n),
    Secondary: moola(0n),
  });

  const m = moola(10000n);
  const c = central(15000n);

  // deliberately incorrect token in want. Should be moolaLiquidity
  const aliceBrokenProposal = harden({
    want: { Liquidity: moola(1000n) },
    give: { Secondary: m, Central: c },
  });
  const alicePayments = {
    Secondary: moolaKit.mint.mintPayment(m),
    Central: centralR.mint.mintPayment(c),
  };

  const addLiquiditySeatBreaking = await E(zoe).offer(
    E(amm.ammPublicFacet).makeAddLiquidityInvitation(),
    aliceBrokenProposal,
    alicePayments,
  );

  await t.throwsAsync(() => E(addLiquiditySeatBreaking).getOfferResult(), {
    message: 'liquidity brand must be "[Alleged: MoolaLiquidity brand]"',
  });

  await E(addLiquiditySeatBreaking).getPayouts();

  t.deepEqual(
    await E(amm.ammPublicFacet).getPoolAllocation(moolaKit.brand),
    harden({
      Central: central(poolLiquidity.centralAmount.value),
      Liquidity: AmountMath.make(liquidityBrand, 0n),
      Secondary: moola(poolLiquidity.secondaryAmount.value),
    }),
  );

  // Add liquidity correctly, so we can see Liquidity token balance in tracker
  const aliceProposal = harden({
    want: { Liquidity: AmountMath.make(liquidityBrand, 1000n) },
    give: { Secondary: m, Central: c },
  });
  const aliceNewPayments = {
    Secondary: moolaKit.mint.mintPayment(m),
    Central: centralR.mint.mintPayment(c),
  };
  const addLiquiditySeatCorrect = await E(zoe).offer(
    E(amm.ammPublicFacet).makeAddLiquidityInvitation(),
    aliceProposal,
    aliceNewPayments,
  );

  t.deepEqual(
    await E(addLiquiditySeatCorrect).getOfferResult(),
    'Added liquidity.',
  );

  await E(addLiquiditySeatCorrect).getPayouts();

  const poolLiquidity2 = {
    centralAmount: { value: 1500000000n + 15000n },
    liquidityTokens: { value: 1500000000n + 15000n },
    secondaryAmount: { value: 300000000n + 3000n },
  };
  t.deepEqual(
    await E(amm.ammPublicFacet).getPoolAllocation(moolaKit.brand),
    harden({
      Central: central(poolLiquidity2.centralAmount.value),
      Liquidity: AmountMath.make(liquidityBrand, 0n),
      Secondary: moola(poolLiquidity2.secondaryAmount.value),
    }),
  );
  await tracker.assertChange(poolLiquidity2);
});

test('amm remove zero liquidity', async t => {
  const centralLiquidityValue = 1_500_000_000n;
  const secondaryLiquidityValue = 300_000_000n;

  // Set up central token
  const centralR = makeIssuerKit('central');
  const moolaKit = makeIssuerKit('moola');
  const centralTokens = value => AmountMath.make(centralR.brand, value);
  const makeMoola = value => AmountMath.make(moolaKit.brand, value);
  const moola = value => AmountMath.make(moolaKit.brand, value);
  const central = value => AmountMath.make(centralR.brand, value);

  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };
  // This timer is only used to build quotes. Let's make it non-zero
  const timer = buildManualTimer(console.log, 30n);

  const { zoe, amm } = await setupAmmServices(
    t,
    electorateTerms,
    centralR,
    timer,
  );

  const liquidityIssuer = await E(amm.ammPublicFacet).addIssuer(
    moolaKit.issuer,
    'Moola',
  );
  const liquidityBrand = await E(liquidityIssuer).getBrand();
  const addPoolInvitation = await E(amm.ammPublicFacet).addPoolInvitation();

  const fundPoolProposal = harden({
    give: {
      Secondary: moola(secondaryLiquidityValue),
      Central: central(centralLiquidityValue),
    },
    want: { Liquidity: AmountMath.make(liquidityBrand, 1000n) },
  });
  const payments = {
    Secondary: moolaKit.mint.mintPayment(moola(secondaryLiquidityValue)),
    Central: centralR.mint.mintPayment(central(centralLiquidityValue)),
  };

  const addLiquiditySeat = await E(zoe).offer(
    addPoolInvitation,
    fundPoolProposal,
    payments,
  );
  t.is(
    await E(addLiquiditySeat).getOfferResult(),
    'Added liquidity.',
    `Added Moola and Central Liquidity`,
  );

  const emptyLiquidity = AmountMath.makeEmpty(liquidityBrand);
  const liqPurse = E(liquidityIssuer).makeEmptyPurse();
  const emptyPayment = await E(liqPurse).withdraw(emptyLiquidity);
  const paymentRecord = {
    Liquidity: emptyPayment,
  };

  const removeLiquidityInvitation = E(
    amm.ammPublicFacet,
  ).makeRemoveLiquidityInvitation();

  const proposal = harden({
    give: { Liquidity: emptyLiquidity },
    want: {
      Secondary: makeMoola(0n),
      Central: centralTokens(0n),
    },
  });

  const removeLiquiditySeat = await E(zoe).offer(
    removeLiquidityInvitation,
    proposal,
    harden(paymentRecord),
  );

  t.is(
    await E(removeLiquiditySeat).getOfferResult(),
    'request to remove zero liquidity',
    `No liquidity removed`,
  );
});

test('amm bad add liquidity offer', async t => {
  const centralLiquidityValue = 1_500_000_000n;
  const secondaryLiquidityValue = 300_000_000n;

  const { moolaKit, simoleanKit, bucksKit, moola, bucks } = setup();

  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };
  // This timer is only used to build quotes. Let's make it non-zero
  const timer = buildManualTimer(console.log, 30n);

  const { zoe, amm } = await setupAmmServices(
    t,
    electorateTerms,
    simoleanKit,
    timer,
  );

  await E(amm.ammPublicFacet).addIssuer(bucksKit.issuer, 'Bucks');

  const liquidityIssuer = await E(amm.ammPublicFacet).addIssuer(
    moolaKit.issuer,
    'Moola',
  );
  const liquidityBrand = await E(liquidityIssuer).getBrand();
  const addPoolInvitation = await E(amm.ammPublicFacet).addPoolInvitation();

  const fundPoolProposal = harden({
    give: {
      Secondary: moola(secondaryLiquidityValue),
      Central: bucks(centralLiquidityValue),
    },
    want: { Liquidity: AmountMath.make(liquidityBrand, 1000n) },
  });
  const payments = {
    Secondary: moolaKit.mint.mintPayment(moola(secondaryLiquidityValue)),
    Central: bucksKit.mint.mintPayment(bucks(centralLiquidityValue)),
  };

  const addLiquiditySeat = await E(zoe).offer(
    addPoolInvitation,
    fundPoolProposal,
    payments,
  );
  await t.throwsAsync(async () => E(addLiquiditySeat).getOfferResult(), {
    message:
      'Brands in left "[Alleged: bucks brand]" and right "[Alleged: simoleans brand]" should match but do not',
  });

  await t.throwsAsync(
    async () => E(amm.ammPublicFacet).getPoolMetrics(moolaKit.brand),
    { message: '"secondaryBrandToPool" not found: "[Alleged: moola brand]"' },
  );
});
