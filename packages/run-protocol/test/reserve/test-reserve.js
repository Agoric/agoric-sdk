// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { E } from '@endo/eventual-send';
import { makeIssuerKit, AmountMath } from '@agoric/ertp';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';

import { setupReserveServices } from './setup.js';
import { unsafeMakeBundleCache } from '../bundleTool.js';
import { subscriptionTracker } from '../metrics.js';
import { eventLoopIteration } from '../supports.js';

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

/**
 *
 * @param {ERef<ZoeService>} zoe
 * @param {ERef<FeeMintAccess>} feeMintAccessP
 * @param {*} faucetInstallation
 * @param {*} runInitialLiquidity
 */
const getRunFromFaucet = async (
  zoe,
  feeMintAccessP,
  faucetInstallation,
  runInitialLiquidity,
) => {
  const feeMintAccess = await feeMintAccessP;
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
  const timer = buildManualTimer(t.log);

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

  const { ammPublicFacet } = space.amm;
  const moolaLiquidityIssuer = E(ammPublicFacet).getLiquidityIssuer(
    moolaR.brand,
  );
  const moolaLiquidityBrand = await E(moolaLiquidityIssuer).getBrand();
  t.deepEqual(
    await E(reserve.reserveCreatorFacet).getAllocations(),
    harden({
      Rmoola: moola(100_000n),
      RmoolaLiquidity: AmountMath.make(moolaLiquidityBrand, 1000n),
    }),
    'expecting more',
  );
});

test('governance add Liquidity to the AMM', async t => {
  /** @param {NatValue} value */
  const moolaR = makeIssuerKit('moola');
  const moola = value => AmountMath.make(moolaR.brand, value);

  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 1 };
  const timer = buildManualTimer(t.log);

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
  await timer.tick();
  await timer.tick();
  await eventLoopIteration();

  t.deepEqual(
    await E(reserve.reserveCreatorFacet).getAllocations(),
    harden({
      Rmoola: moola(10_000n),
      RmoolaLiquidity: AmountMath.make(moolaLiquidityBrand, 85_622n),
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
  const timer = buildManualTimer(t.log);

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
    await space.installation.consume.binaryVoteCounter,
    timer.getCurrentTimestamp() + 2n,
  );
  const details = await detailsP;

  await E(voterFacet).castBallotFor(details.questionHandle, [
    details.positions[0],
  ]);
  await timer.tick();
  await timer.tick();

  await outcomeOfUpdate
    .then(() => t.fail('expecting failure'))
    .catch(e => t.is(e.message, 'insufficient reserves for that transaction'));

  const { ammPublicFacet } = space.amm;
  const moolaLiquidityIssuer = E(ammPublicFacet).getLiquidityIssuer(
    moolaR.brand,
  );
  const moolaLiquidityBrand = await E(moolaLiquidityIssuer).getBrand();
  t.deepEqual(
    await E(reserve.reserveCreatorFacet).getAllocations(),
    harden({
      Rmoola: moola(10_000n),
      RmoolaLiquidity: AmountMath.make(moolaLiquidityBrand, 1000n),
    }),
    'expecting more',
  );
});

test('reserve track shortfall', async t => {
  /** @param {NatValue} value */
  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };
  const timer = buildManualTimer(t.log);

  const { reserve, space, zoe } = await setupReserveServices(
    t,
    electorateTerms,
    timer,
  );

  const runBrand = await space.brand.consume.RUN;

  const shortfallReporterSeat = await E(zoe).offer(
    E(reserve.reserveCreatorFacet).makeShortfallReportingInvitation(),
  );
  const reporterFacet = await E(shortfallReporterSeat).getOfferResult();

  await E(reporterFacet).increaseLiquidationShortfall(
    AmountMath.make(runBrand, 1000n),
  );
  let runningShortfall = 1000n;

  const metricsSub = await E(reserve.reserveCreatorFacet).getMetrics();
  const m = await subscriptionTracker(t, metricsSub);
  await m.assertInitial({
    allocations: {},
    shortfallBalance: AmountMath.makeEmpty(runBrand),
  });
  await m.assertChange({
    shortfallBalance: { value: runningShortfall },
  });

  await E(reporterFacet).increaseLiquidationShortfall(
    AmountMath.make(runBrand, 500n),
  );
  runningShortfall += 500n;

  await m.assertChange({
    shortfallBalance: { value: runningShortfall },
  });

  await E(reporterFacet).reduceLiquidationShortfall(
    AmountMath.make(runBrand, 200n),
  );
  runningShortfall -= 200n;
  await m.assertChange({
    shortfallBalance: { value: runningShortfall },
  });

  await E(reporterFacet).reduceLiquidationShortfall(
    AmountMath.make(runBrand, 2000n),
  );
  runningShortfall = 0n;
  await m.assertChange({
    shortfallBalance: { value: runningShortfall },
  });
});

test('reserve burn IST', async t => {
  /** @param {NatValue} value */
  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 1 };
  const timer = buildManualTimer(t.log);

  const { zoe, reserve, space, feeMintAccess, faucetInstallation, governor } =
    await setupReserveServices(t, electorateTerms, timer);

  const runBrand = await space.brand.consume.RUN;

  const shortfallReporterSeat = await E(zoe).offer(
    E(reserve.reserveCreatorFacet).makeShortfallReportingInvitation(),
  );
  const reporterFacet = await E(shortfallReporterSeat).getOfferResult();

  const oneKRun = AmountMath.make(runBrand, 1000n);
  await E(reporterFacet).increaseLiquidationShortfall(oneKRun);
  let runningShortfall = 1000n;

  const metricsSub = await E(reserve.reserveCreatorFacet).getMetrics();
  const m = await subscriptionTracker(t, metricsSub);
  await m.assertInitial({
    allocations: {},
    shortfallBalance: AmountMath.makeEmpty(runBrand),
  });
  await m.assertChange({
    shortfallBalance: { value: runningShortfall },
  });

  const runPayment = getRunFromFaucet(
    zoe,
    feeMintAccess,
    faucetInstallation,
    oneKRun,
  );

  const invitation = await E(
    reserve.reservePublicFacet,
  ).makeAddCollateralInvitation();

  const proposal = { give: { Collateral: oneKRun } };
  const payments = { Collateral: runPayment };
  const collateralSeat = E(zoe).offer(invitation, proposal, payments);

  t.is(
    await E(collateralSeat).getOfferResult(),
    'added Collateral to the Reserve',
    `added RUN to the collateral Reserve`,
  );

  t.deepEqual(
    await E(reserve.reserveCreatorFacet).getAllocations(),
    harden({ RUN: oneKRun }),
    'expecting more',
  );

  const [voterInvitation] = await E(
    space.consume.economicCommitteeCreatorFacet,
  ).getVoterInvitations();

  const voterFacet = await E(E(zoe).offer(voterInvitation)).getOfferResult();

  const params = harden([oneKRun]);
  const { details: detailsP } = await E(
    governor.governorCreatorFacet,
  ).voteOnApiInvocation(
    'burnRUNToReduceShortfall',
    params,
    await space.installation.consume.binaryVoteCounter,
    timer.getCurrentTimestamp() + 2n,
  );
  const details = await detailsP;
  await E(voterFacet).castBallotFor(details.questionHandle, [
    details.positions[0],
  ]);
  await timer.tick();
  await timer.tick();

  runningShortfall = 0n;

  await m.assertChange({
    shortfallBalance: {
      value: runningShortfall,
    },
    allocations: { RUN: AmountMath.makeEmpty(runBrand) },
  });
});
