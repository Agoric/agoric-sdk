// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import path from 'path';

import bundleSource from '@agoric/bundle-source';
import { makeIssuerKit, AmountMath, AssetKind } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';
import fakeVatAdmin from '../../../../tools/fakeVatAdmin.js';

// noinspection ES6PreferShortImport
import { makeZoeKit } from '../../../../src/zoeService/zoe.js';
import buildManualTimer from '../../../../tools/manualTimer.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const multipoolAutoswapRoot = `${dirname}/../../../../src/contracts/multipoolAutoswap/multipoolAutoswap`;

const setupPoolAndAddLiquidity = async (
  { t, zoe, publicFacet, bldIssuerKit, centralIssuerKit, atomIssuerKit },
  issuer,
  name,
  give,
) => {
  const addLiquidityInvitation = E(publicFacet).makeAddLiquidityInvitation();

  const liquidityIssuer = await E(publicFacet).addPool(issuer, name);
  const liquidityBrand = await E(liquidityIssuer).getBrand();

  const proposal = harden({
    give,
    want: {
      Liquidity: { brand: liquidityBrand, value: 0n },
    },
  });

  let secondaryPayment;
  if (proposal.give.Secondary.brand === bldIssuerKit.brand) {
    secondaryPayment = bldIssuerKit.mint.mintPayment(proposal.give.Secondary);
  } else {
    secondaryPayment = atomIssuerKit.mint.mintPayment(proposal.give.Secondary);
  }

  const payments = harden({
    Secondary: secondaryPayment,
    Central: centralIssuerKit.mint.mintPayment(proposal.give.Central),
  });

  const addLiquiditySeat = await E(zoe).offer(
    addLiquidityInvitation,
    proposal,
    payments,
  );

  t.is(await E(addLiquiditySeat).getOfferResult(), 'Added liquidity.');

  await addLiquiditySeat.getPayout('Liquidity');
};

const swap = async (
  { t, publicFacet, centralIssuerKit, bldIssuerKit, atomIssuerKit, zoe },
  proposal,
  expectedCentralPayout,
  expectedBldPayout,
) => {
  const swapInvitation = await E(publicFacet).makeSwapInInvitation();

  let payment;
  if (proposal.give.In.brand === centralIssuerKit.brand) {
    payment = centralIssuerKit.mint.mintPayment(proposal.give.In);
  } else if (proposal.give.In.brand === bldIssuerKit.brand) {
    payment = bldIssuerKit.mint.mintPayment(proposal.give.In);
  } else {
    payment = atomIssuerKit.mint.mintPayment(proposal.give.In);
  }

  const payments = harden({
    In: payment,
  });
  const seat = await E(zoe).offer(swapInvitation, harden(proposal), payments);

  const centralPayout = await seat.getPayout('In');
  const bldPayout = await seat.getPayout('Out');

  if (expectedCentralPayout) {
    t.deepEqual(
      await centralIssuerKit.issuer.getAmountOf(centralPayout),
      expectedCentralPayout,
    );
  }

  if (expectedBldPayout) {
    t.deepEqual(
      await bldIssuerKit.issuer.getAmountOf(bldPayout),
      expectedBldPayout,
    );
  }
  return seat;
};

const setup = async t => {
  const bldIssuerKit = makeIssuerKit('BLD', AssetKind.NAT, {
    decimalPlaces: 6,
  });
  const atomIssuerKit = makeIssuerKit('ATOM', AssetKind.NAT, {
    decimalPlaces: 6,
  });
  const centralIssuerKit = makeIssuerKit('central', AssetKind.NAT, {
    decimalPlaces: 6,
  });
  const { zoeService } = makeZoeKit(fakeVatAdmin);
  const feePurse = E(zoeService).makeFeePurse();
  const zoe = E(zoeService).bindDefaultFeePurse(feePurse);

  // Pack the contract.
  const bundle = await bundleSource(multipoolAutoswapRoot);

  const installation = await E(zoe).install(bundle);
  // This timer is only used to build quotes. Let's make it non-zero
  const fakeTimer = buildManualTimer(console.log, 30n);
  const { publicFacet } = await E(zoe).startInstance(
    installation,
    harden({ Central: centralIssuerKit.issuer }),
    { timer: fakeTimer },
  );

  const central = value => AmountMath.make(centralIssuerKit.brand, value);
  const bld = value => AmountMath.make(bldIssuerKit.brand, value);
  const atom = value => AmountMath.make(atomIssuerKit.brand, value);

  return harden({
    bldIssuerKit,
    centralIssuerKit,
    atomIssuerKit,
    central,
    bld,
    atom,
    publicFacet,
    zoe,
    t,
  });
};

test('replicate testnet 17 error', async t => {
  const context = await setup(t);

  await setupPoolAndAddLiquidity(context, context.bldIssuerKit.issuer, 'BLD', {
    Secondary: context.bld(19919961991173n),
    Central: context.central(560258868148399n),
  });

  await setupPoolAndAddLiquidity(
    context,
    context.atomIssuerKit.issuer,
    'ATOM',
    {
      Secondary: context.atom(1000008121258n),
      Central: context.central(18609852659317n),
    },
  );

  const seat1 = await swap(
    context,
    {
      give: { In: context.central(1435110341n) },
      want: { Out: context.bld(0n) },
    },
    context.central(22n),
    context.bld(50872034n),
  );

  t.is(await E(seat1).getOfferResult(), 'Swap successfully completed.');

  const seat2 = await swap(context, {
    want: { Out: context.bld(52011005n) },
    give: { In: context.central(1000000000n) },
  });

  await t.throwsAsync(() => E(seat2).getOfferResult(), {
    message:
      'Offer safety was violated by the proposed allocation: {"In":{"brand":"[Alleged: central brand]","value":"[20n]"},"Out":{"brand":"[Alleged: BLD brand]","value":"[35448015n]"}}. Proposal was {"want":{"Out":{"brand":"[Alleged: BLD brand]","value":"[52011005n]"}},"give":{"In":{"brand":"[Alleged: central brand]","value":"[1000000000n]"}},"exit":{"onDemand":null}}',
  });

  const seat3 = await swap(context, {
    want: { Out: context.central(90338356n) },
    give: { In: context.atom(5000000n) },
  });

  await t.throwsAsync(() => E(seat3).getOfferResult(), {
    message:
      'At least one seat has a staged allocation but was not included in the call to reallocate',
  });

  const seat4 = await swap(context, {
    want: { Out: context.central(0n) },
    give: { In: context.bld(51053409n) },
  });

  await t.throwsAsync(() => E(seat4).getOfferResult(), {
    message: 'rights were not conserved for brand "[Alleged: BLD brand]"',
  });
});
