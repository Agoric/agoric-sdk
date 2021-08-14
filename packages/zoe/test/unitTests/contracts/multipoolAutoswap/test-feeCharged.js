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
import { setup } from '../../setupBasicMints.js';

import buildManualTimer from '../../../../tools/manualTimer.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const multipoolAutoswapRoot = `${dirname}/../../../../src/contracts/multipoolAutoswap/multipoolAutoswap`;

test('multipoolAutoSwap with valid offers', async t => {
  const { moolaR, moola } = setup();
  const feeIssuerConfig = harden({
    name: 'RUN',
    assetKind: AssetKind.NAT,
    displayInfo: { decimalPlaces: 6, assetKind: AssetKind.NAT },
    initialFunds: 10_000_000n,
  });
  // This timer is only used to build quotes. Let's make it non-zero
  const timerStart = 30n;
  const fakeTimer = buildManualTimer(console.log, timerStart);

  const zoeFeeConfig = harden({
    getPublicFacetFee: 0n,
    installFee: 0n,
    startInstanceFee: 0n,
    offerFee: 0n,
    timeAuthority: fakeTimer,
    lowFee: 500_000n,
    highFee: 10_000_000n,
    shortExp: 1000n * 60n * 5n, // 5 min in milliseconds
    longExp: 1000n * 60n * 60n * 24n * 1n, // 1 day in milliseconds
  });
  const { zoeService, initialFeeFunds } = makeZoeKit(
    fakeVatAdmin,
    undefined,
    feeIssuerConfig,
    zoeFeeConfig,
  );
  const aliceFeePurse = E(zoeService).makeFeePurse();
  const bobFeePurse = E(zoeService).makeFeePurse();
  await E(bobFeePurse).deposit(initialFeeFunds);
  const invitationIssuer = await E(zoeService).getInvitationIssuer();
  const feeIssuer = await E(zoeService).getFeeIssuer();
  const feeBrand = await E(feeIssuer).getBrand();

  // Set up central token
  const centralR = makeIssuerKit('central');
  const centralTokens = value => AmountMath.make(value, centralR.brand);

  // Setup Alice
  const aliceMoolaPayment = moolaR.mint.mintPayment(moola(100));
  // Let's assume that central tokens are worth 2x as much as moola
  const aliceCentralPayment = centralR.mint.mintPayment(centralTokens(50));

  // Setup Bob
  const bobMoolaPayment = moolaR.mint.mintPayment(moola(17));

  // Alice creates an autoswap instance

  // Pack the contract.
  const bundle = await bundleSource(multipoolAutoswapRoot);

  const installation = await E(zoeService).install(bundle, aliceFeePurse);
  const { publicFacet } = await E(zoeService).startInstance(
    installation,
    harden({ Central: centralR.issuer }),
    { timer: fakeTimer },
    undefined,
    aliceFeePurse,
  );
  const aliceAddLiquidityInvitation = E(
    publicFacet,
  ).makeAddLiquidityInvitation();

  const moolaLiquidityIssuer = await E(publicFacet).addPool(
    moolaR.issuer,
    'Moola',
  );
  const moolaLiquidityBrand = await E(moolaLiquidityIssuer).getBrand();
  const moolaLiquidity = value => AmountMath.make(value, moolaLiquidityBrand);

  // Alice adds liquidity
  // 10 moola = 5 central tokens at the time of the liquidity adding
  // aka 2 moola = 1 central token
  const aliceProposal = harden({
    want: { Liquidity: moolaLiquidity(50) },
    give: { Secondary: moola(100), Central: centralTokens(50) },
  });
  const alicePayments = {
    Secondary: aliceMoolaPayment,
    Central: aliceCentralPayment,
  };

  const addLiquiditySeat = await E(zoeService).offer(
    aliceAddLiquidityInvitation,
    aliceProposal,
    alicePayments,
    undefined,
    aliceFeePurse,
  );

  await addLiquiditySeat.getPayout('Liquidity');

  // Bob creates a swap invitation for himself
  const bobSwapInvitation1 = await E(publicFacet).makeSwapInInvitation();

  const {
    value: [bobInvitationValue],
  } = await E(invitationIssuer).getAmountOf(bobSwapInvitation1);

  // Swap is LOW_FEE and SHORT_EXP
  const expectedFee = AmountMath.make(feeBrand, zoeFeeConfig.lowFee);
  const expectedExpiry = timerStart + zoeFeeConfig.shortExp;

  t.deepEqual(bobInvitationValue.fee, expectedFee);
  t.deepEqual(bobInvitationValue.expiry, expectedExpiry);

  const bobMoolaForCentralProposal = harden({
    want: { Out: centralTokens(7) },
    give: { In: moola(17) },
  });
  const bobMoolaForCentralPayments = harden({ In: bobMoolaPayment });

  // Bob swaps
  await E(zoeService).offer(
    bobSwapInvitation1,
    bobMoolaForCentralProposal,
    bobMoolaForCentralPayments,
    undefined,
    bobFeePurse,
  );

  const expectedAfterOffer = AmountMath.subtract(
    AmountMath.subtract(
      AmountMath.make(feeBrand, feeIssuerConfig.initialFunds),
      AmountMath.make(feeBrand, zoeFeeConfig.offerFee),
    ),
    expectedFee,
  );

  const afterOffer = await E(bobFeePurse).getCurrentAmount();
  t.deepEqual(afterOffer, expectedAfterOffer);
});
