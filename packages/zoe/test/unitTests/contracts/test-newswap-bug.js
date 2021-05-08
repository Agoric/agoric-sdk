/* global __dirname */
// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import bundleSource from '@agoric/bundle-source';
import { makeIssuerKit, amountMath, MathKind } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';
import fakeVatAdmin from '../../../tools/fakeVatAdmin';

import { makeZoe } from '../../../src/zoeService/zoe';
import buildManualTimer from '../../../tools/manualTimer';

import { multiplyBy, makeRatio } from '../../../src/contractSupport/ratio';

const multipoolAutoswapRoot = `${__dirname}/../../../src/contracts/newSwap/multipoolAutoswap.js`;

const DEFAULT_POOL_FEE = 24n;
const DEFAULT_PROTOCOL_FEE = 6n;
const BASIS_POINTS = 10000n;

test('test bug scenario', async t => {
  const runKit = makeIssuerKit(
    'RUN',
    MathKind.NAT,
    harden({ decimalPlaces: 6 }),
  );
  const bldKit = makeIssuerKit(
    'BLD',
    MathKind.NAT,
    harden({ decimalPlaces: 6 }),
  );
  const zoe = makeZoe(fakeVatAdmin);

  // Pack the contract.
  const bundle = await bundleSource(multipoolAutoswapRoot);

  const installation = await zoe.install(bundle);
  const fakeTimer = buildManualTimer(console.log, 30n);
  const { publicFacet } = await zoe.startInstance(
    installation,
    harden({ Central: runKit.issuer }),
    {
      timer: fakeTimer,
      poolFee: DEFAULT_POOL_FEE,
      protocolFee: DEFAULT_PROTOCOL_FEE,
    },
  );
  const aliceAddLiquidityInvitation = E(
    publicFacet,
  ).makeAddLiquidityInvitation();

  const bldLiquidityIssuer = await E(publicFacet).addPool(bldKit.issuer, 'BLD');
  const bldLiquidityBrand = await E(bldLiquidityIssuer).getBrand();

  const bldPoolAllocation = amountMath.make(bldKit.brand, 2196247730468n);
  const runPoolAllocation = amountMath.make(runKit.brand, 50825056949339n);

  const aliceProposal = harden({
    give: {
      Secondary: bldPoolAllocation,
      Central: runPoolAllocation,
    },
    want: { Liquidity: amountMath.make(bldLiquidityBrand, 0n) },
  });

  const alicePayments = {
    Secondary: bldKit.mint.mintPayment(bldPoolAllocation),
    Central: runKit.mint.mintPayment(runPoolAllocation),
  };

  const addLiquiditySeat = await zoe.offer(
    aliceAddLiquidityInvitation,
    aliceProposal,
    alicePayments,
  );

  t.is(
    await E(addLiquiditySeat).getOfferResult(),
    'Added liquidity.',
    `Alice added bld and run liquidity`,
  );

  await addLiquiditySeat.getPayout('Liquidity');

  const priceQuote = await E(publicFacet).getPriceGivenAvailableInput(
    amountMath.make(runKit.brand, 73000000n),
    bldKit.brand,
  );

  console.log('price quote', priceQuote);

  const proposal = harden({
    give: { In: priceQuote.amountIn },
    want: { Out: priceQuote.amountOut },
  });
  const payment = harden({ In: runKit.mint.mintPayment(priceQuote.amountIn) });

  const seatP = E(zoe).offer(
    E(publicFacet).makeSwapInInvitation(),
    proposal,
    payment,
  );

  const offerResult = await E(seatP).getOfferResult();

  console.log(offerResult);
});

// 30n/10000n = 0.003 or 0.3%
const conductTrade = async (t, reduceWantOutBP = 30n) => {
  const runKit = makeIssuerKit(
    'RUN',
    MathKind.NAT,
    harden({ decimalPlaces: 6 }),
  );
  const bldKit = makeIssuerKit(
    'BLD',
    MathKind.NAT,
    harden({ decimalPlaces: 6 }),
  );
  const zoe = makeZoe(fakeVatAdmin);

  // Pack the contract.
  const bundle = await bundleSource(multipoolAutoswapRoot);

  const installation = await zoe.install(bundle);
  const fakeTimer = buildManualTimer(console.log, 30n);
  const { publicFacet } = await zoe.startInstance(
    installation,
    harden({ Central: runKit.issuer }),
    {
      timer: fakeTimer,
      poolFee: DEFAULT_POOL_FEE,
      protocolFee: DEFAULT_PROTOCOL_FEE,
    },
  );
  const aliceAddLiquidityInvitation = E(
    publicFacet,
  ).makeAddLiquidityInvitation();

  const bldLiquidityIssuer = await E(publicFacet).addPool(bldKit.issuer, 'BLD');
  const bldLiquidityBrand = await E(bldLiquidityIssuer).getBrand();

  const bldPoolAllocation = amountMath.make(bldKit.brand, 2196247730468n);
  const runPoolAllocation = amountMath.make(runKit.brand, 50825056949339n);

  const aliceProposal = harden({
    give: {
      Secondary: bldPoolAllocation,
      Central: runPoolAllocation,
    },
    want: { Liquidity: amountMath.make(bldLiquidityBrand, 0n) },
  });

  const alicePayments = {
    Secondary: bldKit.mint.mintPayment(bldPoolAllocation),
    Central: runKit.mint.mintPayment(runPoolAllocation),
  };

  const addLiquiditySeat = await zoe.offer(
    aliceAddLiquidityInvitation,
    aliceProposal,
    alicePayments,
  );

  t.is(
    await E(addLiquiditySeat).getOfferResult(),
    'Added liquidity.',
    `Alice added bld and run liquidity`,
  );

  await addLiquiditySeat.getPayout('Liquidity');

  const priceQuote = await E(publicFacet).getPriceGivenAvailableInput(
    amountMath.make(runKit.brand, 73000000n),
    bldKit.brand,
  );

  console.log('price quote', priceQuote);

  const percentToReduceBy = makeRatio(
    reduceWantOutBP,
    priceQuote.amountOut.brand,
    BASIS_POINTS,
  );
  const wantOutReduced = amountMath.subtract(
    priceQuote.amountOut,
    multiplyBy(priceQuote.amountOut, percentToReduceBy),
  );

  const proposal = harden({
    give: { In: priceQuote.amountIn },
    want: { Out: wantOutReduced },
  });

  const payment = harden({ In: runKit.mint.mintPayment(priceQuote.amountIn) });

  const seatP = E(zoe).offer(
    E(publicFacet).makeSwapInInvitation(),
    proposal,
    payment,
  );

  const offerResult = await E(seatP).getOfferResult();

  console.log(offerResult);
};

test('test bug scenario with 0% reduction in want', async t => {
  await conductTrade(t, 0n);
});

test('test bug scenario with 0.2% reduction in want', async t => {
  await conductTrade(t, 20n);
});

test('test bug scenario with 0.3% reduction in want', async t => {
  await conductTrade(t, 30n);
});

test('test bug scenario with 3% reduction in want', async t => {
  await conductTrade(t, 300n);
});
