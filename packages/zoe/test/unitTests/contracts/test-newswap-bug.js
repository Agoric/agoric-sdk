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

const multipoolAutoswapRoot = `${__dirname}/../../../src/contracts/newSwap/multipoolAutoswap.js`;

const DEFAULT_POOL_FEE = 24n;
const DEFAULT_PROTOCOL_FEE = 6n;

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
  const invitationIssuer = await E(zoe).getInvitationIssuer();
  const invitationBrand = await E(invitationIssuer).getBrand();

  // Setup Alice
  const aliceRunPayment = runKit.mint.mintPayment(
    amountMath.make(runKit.brand, 100n * 10n ** 6n),
  );

  // Pack the contract.
  const bundle = await bundleSource(multipoolAutoswapRoot);

  const installation = await zoe.install(bundle);
  // This timer is only used to build quotes. Let's make it non-zero
  const fakeTimer = buildManualTimer(console.log, 30n);
  const { instance, publicFacet } = await zoe.startInstance(
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

  // Alice adds liquidity
  // 10 moola = 5 central tokens at the time of the liquidity adding
  // aka 2 moola = 1 central token
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

  const liquidityPayout = await addLiquiditySeat.getPayout('Liquidity');

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
