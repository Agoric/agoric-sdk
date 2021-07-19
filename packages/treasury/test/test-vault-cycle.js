/* global require */
// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import { E } from '@agoric/eventual-send';
import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
import { makeZoe } from '@agoric/zoe';
import fakeVatAdmin from '@agoric/zoe/tools/fakeVatAdmin';
import bundleSource from '@agoric/bundle-source';
import buildManualTimer from '@agoric/zoe/tools/manualTimer';
import { makePromiseKit } from '@agoric/promise-kit';
import { makeScriptedPriceAuthority } from '@agoric/zoe/tools/scriptedPriceAuthority';
import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio';

import '@agoric/zoe/exported';

const stablecoinRoot = '../src/stablecoinMachine.js';
const liquidationRoot = '../src/liquidateMinimum.js';
const autoswapRoot = '@agoric/zoe/src/contracts/newSwap/multipoolAutoswap';

const BASIS_POINTS = 10000n;
const PERCENT = 100n;

const openVault = async (
  zoe,
  treasuryPublicFacet,
  bldPurse,
  runPurse,
  bldToLock,
  wantedRun,
) => {
  const openInvitationP = E(treasuryPublicFacet).makeLoanInvitation();
  const proposal = harden({
    give: {
      Collateral: bldToLock,
    },
    want: {
      RUN: wantedRun,
    },
  });
  const payment = harden({ Collateral: E(bldPurse).withdraw(bldToLock) });
  const seatP = E(zoe).offer(openInvitationP, proposal, payment);
  await seatP;
  const [bldPayout, runPayout] = await Promise.all([
    E(seatP).getPayout('Collateral'),
    E(seatP).getPayout('RUN'),
  ]);
  await Promise.all([
    E(bldPurse).deposit(bldPayout),
    E(runPurse).deposit(runPayout),
  ]);
  const offerResult = await E(seatP).getOfferResult();
  return offerResult;
};

const closeVault = async (zoe, bldBrand, bldPurse, runPurse, vault) => {
  const runNeeded = await E(vault).getDebtAmount();
  const closeInvitationP = E(vault).makeCloseInvitation();
  const proposal = harden({
    give: {
      RUN: runNeeded,
    },
    want: {
      Collateral: AmountMath.makeEmpty(bldBrand),
    },
  });
  const payment = harden({ RUN: E(runPurse).withdraw(runNeeded) });
  const seatP = E(zoe).offer(closeInvitationP, proposal, payment);
  const [runPayout, bldPayout] = await Promise.all([
    E(seatP).getPayout('RUN'),
    E(seatP).getPayout('Collateral'),
  ]);
  await Promise.all([
    E(runPurse).deposit(runPayout),
    E(bldPurse).deposit(bldPayout),
  ]);
  return runNeeded;
};

const makePriceAuthority = (
  brandIn,
  brandOut,
  priceList,
  tradeList,
  timer,
  quoteMint,
  unitAmountIn,
  quoteInterval,
) => {
  const options = {
    actualBrandIn: brandIn,
    actualBrandOut: brandOut,
    priceList,
    tradeList,
    timer,
    quoteMint,
    unitAmountIn,
    quoteInterval,
  };
  return makeScriptedPriceAuthority(options);
};

function makeRates(runBrand, bldBrand) {
  return harden({
    // exchange rate
    initialPrice: makeRatio(201n, runBrand, PERCENT, bldBrand),
    // margin required to open a loan
    initialMargin: makeRatio(120n, runBrand),
    // margin required to maintain a loan
    liquidationMargin: makeRatio(105n, runBrand),
    // periodic interest rate (per charging period)
    interestRate: makeRatio(100n, runBrand, BASIS_POINTS),
    // charge to create or increase loan balance
    loanFee: makeRatio(500n, runBrand, BASIS_POINTS),
  });
}

test('vault cycle', async t => {
  const zoe = makeZoe(fakeVatAdmin);

  const install = async root => {
    const path = require.resolve(root);
    const bundle = await bundleSource(path);
    console.log(root);
    const installation = await E(zoe).install(bundle);
    return installation;
  };

  const treasuryInstallation = await install(stablecoinRoot);
  const liquidationInstallation = await install(liquidationRoot);
  const autoswapInstallation = await install(autoswapRoot);
  console.log(
    treasuryInstallation,
    liquidationInstallation,
    autoswapInstallation,
  );

  const bldKit = makeIssuerKit('BLD', AssetKind.NAT, { decimalPlaces: 6 });

  const priceAuthorityPromiseKit = makePromiseKit();
  const priceAuthorityPromise = priceAuthorityPromiseKit.promise;
  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 10n,
    poolFee: 24n,
    protocolFee: 6n,
  };
  const manualTimer = buildManualTimer(console.log);
  const {
    creatorFacet: treasuryCreatorFacet,
    publicFacet: treasuryPublicFacet,
    instance: treasuryInstance,
  } = await E(zoe).startInstance(
    treasuryInstallation,
    {},
    {
      autoswapInstall: autoswapInstallation,
      priceAuthority: priceAuthorityPromise,
      loanParams,
      timerService: manualTimer,
      liquidationInstall: liquidationInstallation,
    },
  );

  /** @type {Issuer} */
  const runIssuer = await E(treasuryPublicFacet).getRunIssuer();
  const runBrand = await E(runIssuer).getBrand();

  const quoteMint = makeIssuerKit('quote', AssetKind.SET).mint;

  // priceAuthority needs the RUN brand, which isn't available until the
  // stablecoinMachine has been built, so resolve priceAuthorityPromiseKit here
  const priceAuthority = makePriceAuthority(
    bldKit.brand,
    runBrand,
    [500n, 15n],
    null,
    manualTimer,
    quoteMint,
    AmountMath.make(900n, bldKit.brand),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  const {
    brands: { Governance: govBrand },
  } = await E(zoe).getTerms(treasuryInstance);

  // Add a pool with 900 bld collateral at a 201 bld/RUN rate
  const capitalAmount = AmountMath.make(900n, bldKit.brand);
  const rates = makeRates(runBrand, bldKit.brand);

  const addTypeInvitation = await E(treasuryCreatorFacet).makeAddTypeInvitation(
    bldKit.issuer,
    'BLD',
    rates,
  );
  const addTypeSeat = await E(zoe).offer(
    addTypeInvitation,
    harden({
      give: { Collateral: capitalAmount },
      want: { Governance: AmountMath.makeEmpty(govBrand) },
    }),
    harden({
      Collateral: bldKit.mint.mintPayment(capitalAmount),
    }),
  );
  await E(addTypeSeat).getOfferResult();

  const bldPurse = E(bldKit.issuer).makeEmptyPurse();
  const runPurse = E(runIssuer).makeEmptyPurse();

  const bldToLock = AmountMath.make(bldKit.brand, 100000n);
  const wantedRun = AmountMath.make(runBrand, 200n);

  E(bldPurse).deposit(bldKit.mint.mintPayment(bldToLock));

  const offerResult1 = await openVault(
    zoe,
    treasuryPublicFacet,
    bldPurse,
    runPurse,
    bldToLock,
    wantedRun,
  );

  const {
    // uiNotifier,
    // invitationMakers,
    vault,
    liquidationPayout,
  } = offerResult1;

  // Open a vault twice in order to get enough run to pay back a loan
  E(bldPurse).deposit(bldKit.mint.mintPayment(bldToLock));
  const offerResult2 = await openVault(
    zoe,
    treasuryPublicFacet,
    bldPurse,
    runPurse,
    bldToLock,
    wantedRun,
  );

  const bldBalance = await E(bldPurse).getCurrentAmount();
  const runBalance = await E(runPurse).getCurrentAmount();
  // console.log('BALANCES', bldBalance, runBalance);
  t.deepEqual(bldBalance, AmountMath.make(bldKit.brand, 0n));
  t.deepEqual(runBalance, AmountMath.make(runBrand, 400n));

  const runPaidBack = await closeVault(
    zoe,
    bldKit.brand,
    bldPurse,
    runPurse,
    vault,
  );

  const bldBalanceAfterClose = await E(bldPurse).getCurrentAmount();
  const runBalanceAfterClose = await E(runPurse).getCurrentAmount();
  t.deepEqual(bldBalanceAfterClose, AmountMath.make(bldKit.brand, 100000n));
  t.deepEqual(runBalanceAfterClose, AmountMath.make(runBrand, 190n));

  const vaultSeatPayments = await liquidationPayout;
  console.log(vaultSeatPayments);
  const runReturned = await E(runIssuer).getAmountOf(vaultSeatPayments.RUN);
  const collateralReturned = await E(bldKit.issuer).getAmountOf(
    vaultSeatPayments.Collateral,
  );
  t.deepEqual(runReturned, runPaidBack); // this is a bug, the user is getting access to the RUN they paid
  t.deepEqual(collateralReturned, AmountMath.makeEmpty(bldKit.brand));
});
