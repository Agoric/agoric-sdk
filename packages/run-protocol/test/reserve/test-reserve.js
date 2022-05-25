// @ts-check
/* global setImmediate */

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { E } from '@endo/eventual-send';
import { makeIssuerKit, AmountMath } from '@agoric/ertp';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { makePromiseKit } from '@endo/promise-kit';

import { setupReserveServices } from './setup.js';
import { unsafeMakeBundleCache } from '../bundleTool.js';
import { subscriptionTracker } from '../metrics.js';

// Some notifier updates aren't propogating sufficiently quickly for the tests.
// This invocation (thanks to Warner) waits for all promises that can fire to
// have all their callbacks run
const waitForPromisesToSettle = async () => {
  const pk = makePromiseKit();
  setImmediate(pk.resolve);
  return pk.promise;
};

const addLiquidPool = async (
  runPayment,
  runIssuer,
  space,
  t,
  moola,
  moolaR,
  zoe,
) => {
  const poolVal = 1000n;
  const { ammPublicFacet } = space.amm;

  const runAmount = await E(runIssuer).getAmountOf(runPayment);
  const ammProposal = harden({
    give: {
      Secondary: moola(poolVal),
      Central: runAmount,
    },
  });
  const ammPayments = {
    Secondary: moolaR.mint.mintPayment(moola(poolVal)),
    Central: runPayment,
  };

  await E(ammPublicFacet).addIssuer(moolaR.issuer, 'Moola');
  const addPoolInvitation = await E(ammPublicFacet).addPoolInvitation();

  const addLiquiditySeat = await E(zoe).offer(
    addPoolInvitation,
    ammProposal,
    ammPayments,
  );
  return E(addLiquiditySeat).getOfferResult();
};

const getRunFromFaucet = async (
  zoe,
  feeMintAccess,
  faucetInstallation,
  runInitialLiquidity,
) => {
  // On-chain, there will be pre-existing RUN. The faucet replicates that
  const { creatorFacet: faucetCreator } = await E(zoe).startInstance(
    faucetInstallation,
    {},
    {},
    harden({ feeMintAccess }),
  );
  const faucetSeat = E(zoe).offer(
    await E(faucetCreator).makeFaucetInvitation(),
    harden({
      give: {},
      want: { RUN: runInitialLiquidity },
    }),
  );

  const runPayment = await E(faucetSeat).getPayout('RUN');
  return runPayment;
};

test.before(async t => {
  const bundleCache = await unsafeMakeBundleCache('bundles/');
  t.context = { bundleCache };
});

test('reserve add collateral', async t => {
  /** @param {NatValue} value */
  const moolaR = makeIssuerKit('moola');
  const moola = value => AmountMath.make(moolaR.brand, value);

  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };
  const timer = buildManualTimer(console.log);

  const { zoe, reserve, space, feeMintAccess, faucetInstallation } =
    await setupReserveServices(t, electorateTerms, timer);
  const runBrand = await space.brand.consume.RUN;
  const runIssuer = await space.issuer.consume.RUN;
  const runPayment = getRunFromFaucet(
    zoe,
    feeMintAccess,
    faucetInstallation,
    AmountMath.make(runBrand, 1000n),
  );
  await addLiquidPool(runPayment, runIssuer, space, t, moola, moolaR, zoe);
  await E(reserve.reserveCreatorFacet).addIssuer(moolaR.issuer, 'Moola');
  const invitation = await E(
    reserve.reservePublicFacet,
  ).makeAddCollateralInvitation();

  const proposal = { give: { Collateral: moola(100_000n) } };
  const moolaPayment = moolaR.mint.mintPayment(moola(100000n));
  const payments = { Collateral: moolaPayment };
  const collateralSeat = E(zoe).offer(invitation, proposal, payments);

  t.is(
    await E(collateralSeat).getOfferResult(),
    'added Collateral to the Reserve',
    `added moola to the collateral Reserve`,
  );

  t.deepEqual(
    await E(reserve.reserveCreatorFacet).getAllocations(),
    harden({ Moola: moola(100_000n) }),
    'expecting more',
  );
});

test('reserve unregistered', async t => {
  /** @param {NatValue} value */
  const moolaR = makeIssuerKit('moola');
  const moola = value => AmountMath.make(moolaR.brand, value);

  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };
  const timer = buildManualTimer(console.log);

  const { zoe, reserve, space, faucetInstallation, feeMintAccess } =
    await setupReserveServices(t, electorateTerms, timer);
  const runBrand = await space.brand.consume.RUN;
  const runIssuer = await space.issuer.consume.RUN;
  const runPayment = getRunFromFaucet(
    zoe,
    feeMintAccess,
    faucetInstallation,
    AmountMath.make(runBrand, 1000n),
  );
  await addLiquidPool(runPayment, runIssuer, space, t, moola, moolaR, zoe);

  const invitation = await E(
    reserve.reservePublicFacet,
  ).makeAddCollateralInvitation();

  const proposal = { give: { Collateral: moola(100_000n) } };
  const moolaPayment = moolaR.mint.mintPayment(moola(100000n));
  const payments = { Collateral: moolaPayment };
  const collateralSeat = E(zoe).offer(invitation, proposal, payments);

  await t.throwsAsync(
    () => E(collateralSeat).getOfferResult(),
    {
      message:
        'Issuer not defined for brand [object Alleged: moola brand]; first call addIssuer()',
    },
    'Should not accept unregistered brand',
  );
});

test('governance add Liquidity to the AMM', async t => {
  /** @param {NatValue} value */
  const moolaR = makeIssuerKit('moola');
  const moola = value => AmountMath.make(moolaR.brand, value);

  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 1 };
  const timer = buildManualTimer(console.log);

  const { zoe, reserve, space, governor, faucetInstallation, feeMintAccess } =
    await setupReserveServices(t, electorateTerms, timer);
  const runBrand = await space.brand.consume.RUN;
  const runIssuer = await space.issuer.consume.RUN;
  const runPayment = getRunFromFaucet(
    zoe,
    feeMintAccess,
    faucetInstallation,
    AmountMath.make(runBrand, 1000n),
  );

  const { ammPublicFacet } = space.amm;

  await addLiquidPool(runPayment, runIssuer, space, t, moola, moolaR, zoe);

  const moolaLiquidityIssuer = E(ammPublicFacet).getLiquidityIssuer(
    moolaR.brand,
  );
  const moolaLiquidityBrand = await E(moolaLiquidityIssuer).getBrand();

  t.deepEqual(
    await E(ammPublicFacet).getPoolAllocation(moolaR.brand),
    harden({
      Central: AmountMath.make(runBrand, 1000n),
      Secondary: moola(1000n),
      Liquidity: AmountMath.makeEmpty(moolaLiquidityBrand),
    }),
    'should be 80K',
  );

  await E(reserve.reserveCreatorFacet).addIssuer(moolaR.issuer, 'Moola');
  const invitation = await E(
    reserve.reservePublicFacet,
  ).makeAddCollateralInvitation();

  const proposal = { give: { Collateral: moola(100_000n) } };
  const moolaPayment = moolaR.mint.mintPayment(moola(100_000n));
  const payments = { Collateral: moolaPayment };
  const collateralSeat = E(zoe).offer(invitation, proposal, payments);

  t.is(
    await E(collateralSeat).getOfferResult(),
    'added Collateral to the Reserve',
    `added moola to the collateral Reserve`,
  );

  const [voterInvitation] = await E(
    space.consume.economicCommitteeCreatorFacet,
  ).getVoterInvitations();

  const voterFacet = await E(E(zoe).offer(voterInvitation)).getOfferResult();

  const params = harden([moola(90_000n), AmountMath.make(runBrand, 80_000n)]);
  const { details: detailsP } = await E(
    governor.governorCreatorFacet,
  ).voteOnApiInvocation(
    'addLiquidityToAmmPool',
    params,
    await space.installation.consume.binaryVoteCounter,
    timer.getCurrentTimestamp() + 2n,
  );
  const details = await detailsP;

  await E(voterFacet).castBallotFor(details.questionHandle, [
    details.positions[0],
  ]);
  timer.tick();
  timer.tick();
  await waitForPromisesToSettle();

  t.deepEqual(
    await E(reserve.reserveCreatorFacet).getAllocations(),
    harden({
      Moola: moola(10_000n),
      MoolaLiquidity: AmountMath.make(moolaLiquidityBrand, 84_622n),
    }),
    'expecting more',
  );

  t.deepEqual(
    await E(ammPublicFacet).getPoolAllocation(moolaR.brand),
    harden({
      Central: AmountMath.make(runBrand, 80_999n),
      Secondary: moola(90_675n),
      Liquidity: AmountMath.makeEmpty(moolaLiquidityBrand),
    }),
    'should be 80K',
  );
});

test('request more collateral than available', async t => {
  /** @param {NatValue} value */
  const moolaR = makeIssuerKit('moola');
  const moola = value => AmountMath.make(moolaR.brand, value);

  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 1 };
  const timer = buildManualTimer(console.log);

  const { zoe, reserve, space, governor, faucetInstallation, feeMintAccess } =
    await setupReserveServices(t, electorateTerms, timer);

  const runBrand = await space.brand.consume.RUN;
  const runIssuer = await space.issuer.consume.RUN;
  const runPayment = getRunFromFaucet(
    zoe,
    feeMintAccess,
    faucetInstallation,
    AmountMath.make(runBrand, 1000n),
  );
  await addLiquidPool(runPayment, runIssuer, space, t, moola, moolaR, zoe);

  await E(reserve.reserveCreatorFacet).addIssuer(moolaR.issuer, 'Moola');
  const invitation = await E(
    reserve.reservePublicFacet,
  ).makeAddCollateralInvitation();

  const proposal = { give: { Collateral: moola(10_000n) } };
  const moolaPayment = moolaR.mint.mintPayment(moola(10_000n));
  const payments = { Collateral: moolaPayment };
  const collateralSeat = E(zoe).offer(invitation, proposal, payments);

  t.is(
    await E(collateralSeat).getOfferResult(),
    'added Collateral to the Reserve',
    `added moola to the collateral Reserve`,
  );

  const [voterInvitation] = await E(
    space.consume.economicCommitteeCreatorFacet,
  ).getVoterInvitations();

  const voterFacet = await E(E(zoe).offer(voterInvitation)).getOfferResult();

  const params = harden([moola(90_000n), AmountMath.make(runBrand, 80_000n)]);
  const { details: detailsP, outcomeOfUpdate } = await E(
    governor.governorCreatorFacet,
  ).voteOnApiInvocation(
    'addLiquidityToAmmPool',
    params,
    space.installation.consume.binaryVoteCounter,
    timer.getCurrentTimestamp() + 2n,
  );
  const details = await detailsP;

  await E(voterFacet).castBallotFor(details.questionHandle, [
    details.positions[0],
  ]);
  timer.tick();
  timer.tick();
  await waitForPromisesToSettle();

  await outcomeOfUpdate
    .then(() => t.fail('expecting failure'))
    .catch(e => t.is(e.message, 'insufficient reserves for that transaction'));

  t.deepEqual(
    await E(reserve.reserveCreatorFacet).getAllocations(),
    harden({
      Moola: moola(10_000n),
    }),
    'expecting more',
  );
});

test('reserve track shortfall', async t => {
  /** @param {NatValue} value */
  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };
  const timer = buildManualTimer(console.log);

  const { reserve, space, zoe } = await setupReserveServices(
    t,
    electorateTerms,
    timer,
  );

  const runBrand = await space.brand.consume.RUN;

  const shortfallReporterSeat = await E(zoe).offer(
    E(reserve.reserveCreatorFacet).getShortfallReportInvitation(),
  );
  const reporterFacet = await E(shortfallReporterSeat).getOfferResult();

  await E(reporterFacet).addLiquidationShortfall(
    AmountMath.make(runBrand, 1000n),
  );
  const metricsSub = await E(reserve.reserveCreatorFacet).getMetrics();
  const m = await subscriptionTracker(t, metricsSub);
  await m.assertInitial({
    allocations: {},
    shortfall: AmountMath.makeEmpty(runBrand),
  });
  await m.assertChange({
    shortfall: { value: 1000n },
  });

  await E(reporterFacet).addLiquidationShortfall(
    AmountMath.make(runBrand, 500n),
  );
  await m.assertChange({
    shortfall: { value: 1500n },
  });

  await E(reporterFacet).reduceLiquidationShortfall(
    AmountMath.make(runBrand, 200n),
  );
  await m.assertChange({
    shortfall: { value: 1300n },
  });
  await E(reporterFacet).reduceLiquidationShortfall(
    AmountMath.make(runBrand, 2000n),
  );
  await m.assertChange({
    shortfall: { value: 0n },
  });
});
