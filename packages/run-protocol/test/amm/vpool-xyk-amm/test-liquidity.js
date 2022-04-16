// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit, AmountMath } from '@agoric/ertp';
import { E } from '@endo/eventual-send';

import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { assertPayoutAmount } from '@agoric/zoe/test/zoeTestHelpers.js';
import { setupAmmServices } from './setup.js';
import { unsafeMakeBundleCache } from '../../bundleTool.js';

test.before(async t => {
  const bundleCache = await unsafeMakeBundleCache('bundles/');
  t.context = { bundleCache };
});

const makeLiquidityInvitations = async (
  t,
  zoe,
  amm,
  moolaR,
  centralR,
  moolaLiquidityIssuer,
) => {
  const centralTokens = value => AmountMath.make(centralR.brand, value);
  const makeMoola = value => AmountMath.make(moolaR.brand, value);
  const moolaLiquidityBrand = await E(moolaLiquidityIssuer).getBrand();
  const moolaLiquidity = value => AmountMath.make(moolaLiquidityBrand, value);

  const addLiquidity = async (moola, central) => {
    const addLiquidityInvitation = E(
      amm.ammPublicFacet,
    ).makeAddLiquidityInvitation();

    const aliceMoolaPayment1 = moolaR.mint.mintPayment(makeMoola(moola));
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

    const addLiquiditySeat = await E(zoe).offer(
      removeLiquidityInvitation,
      aliceProposal,
      alicePayments,
    );

    t.is(
      await E(addLiquiditySeat).getOfferResult(),
      'Liquidity successfully removed.',
      `Alice removed liquidity`,
    );

    return E(addLiquiditySeat).getPayouts();
  };
  return { addLiquidity, removeLiquidity };
};

const makeAssertPayouts = (
  t,
  moolaLiquidityIssuer,
  liquidityBrand,
  centralR,
  moolaR,
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
    const sAmount = AmountMath.make(moolaR.brand, sExpected);
    await assertPayoutAmount(
      t,
      moolaR.issuer,
      sPayment,
      sAmount,
      'moola Payout',
    );
  };
};

test('amm add and remove liquidity', async t => {
  // Set up central token
  const centralR = makeIssuerKit('central');
  const moolaR = makeIssuerKit('moola');
  const moola = value => AmountMath.make(moolaR.brand, value);

  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };
  // This timer is only used to build quotes. Let's make it non-zero
  const timer = buildManualTimer(console.log, 30n);

  const { zoe, amm } = await setupAmmServices(
    t,
    electorateTerms,
    centralR,
    timer,
  );
  const moolaLiquidityIssuer = await E(amm.ammPublicFacet).addPool(
    moolaR.issuer,
    'Moola',
  );
  const liquidityBrand = await E(moolaLiquidityIssuer).getBrand();

  const allocation = (c, l, s) => ({
    Central: AmountMath.make(centralR.brand, c),
    Liquidity: AmountMath.make(liquidityBrand, l),
    Secondary: moola(s),
  });
  const { addLiquidity, removeLiquidity } = await makeLiquidityInvitations(
    t,
    zoe,
    amm,
    moolaR,
    centralR,
    moolaLiquidityIssuer,
  );
  const assertPayouts = makeAssertPayouts(
    t,
    moolaLiquidityIssuer,
    liquidityBrand,
    centralR,
    moolaR,
  );

  t.deepEqual(
    await E(amm.ammPublicFacet).getPoolAllocation(moolaR.brand),
    {},
    `The poolAllocation object values for moola should be empty`,
  );

  // add initial liquidity at 10_000:50_000
  const {
    Central: c1,
    Liquidity: l1,
    Secondary: s1,
  } = await addLiquidity(10000n, 50_000n);
  // We get liquidity back. All the central and secondary is accepted
  await assertPayouts(l1, 50_000n, c1, 0n, s1, 0n);
  t.deepEqual(
    await E(amm.ammPublicFacet).getPoolAllocation(moolaR.brand),
    allocation(50_000n, 0n, 10000n),
    `poolAllocation after initialization`,
  );

  // Add liquidity. Offer 20_000:70_000. It will be accepted at a ratio of 5:1
  const {
    Central: c2,
    Liquidity: l2,
    Secondary: s2,
  } = await addLiquidity(20_000n, 70_000n);
  // After the trade, this will increase the pool by about 140%
  await assertPayouts(l2, 70_000n, c2, 0n, s2, 6000n);
  // The pool should now have 50K + 70K and 10K + 20K
  t.deepEqual(
    await E(amm.ammPublicFacet).getPoolAllocation(moolaR.brand),
    allocation(120_000n, 0n, 24_000n),
    `poolAllocation after initialization`,
  );

  const [l40Payment, _l30Payment] = await E(moolaLiquidityIssuer).split(
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
    await E(amm.ammPublicFacet).getPoolAllocation(moolaR.brand),
    allocation(80_000n, 40_000n, 16_000n),
    `poolAllocation after initialization`,
  );
});
