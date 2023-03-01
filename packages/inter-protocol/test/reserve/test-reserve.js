// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { E } from '@endo/eventual-send';

import { setupReserveServices } from './setup.js';
import { reserveInitialState, subscriptionTracker } from '../metrics.js';
import { subscriptionKey } from '../supports.js';

/**
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
  const moolaKit = makeIssuerKit('moola');
  const moola = value => AmountMath.make(moolaKit.brand, value);

  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };
  const timer = buildManualTimer(t.log);

  const { zoe, reserve } = await setupReserveServices(
    t,
    electorateTerms,
    timer,
  );

  await E(reserve.reserveCreatorFacet).addIssuer(moolaKit.issuer, 'Moola');
  const invitation = await E(
    reserve.reservePublicFacet,
  ).makeAddCollateralInvitation();

  const proposal = { give: { Collateral: moola(100_000n) } };
  const moolaPayment = moolaKit.mint.mintPayment(moola(100000n));
  const payments = { Collateral: moolaPayment };
  const collateralSeat = E(zoe).offer(invitation, proposal, payments);

  t.is(
    await E(collateralSeat).getOfferResult(),
    'added Collateral to the Reserve',
    `added moola to the collateral Reserve`,
  );
});

test('check allocations', async t => {
  /** @param {NatValue} value */
  const moolaKit = makeIssuerKit('moola');
  const moola = value => AmountMath.make(moolaKit.brand, value);

  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 1 };
  const timer = buildManualTimer(t.log);

  const { zoe, reserve } = await setupReserveServices(
    t,
    electorateTerms,
    timer,
  );

  const invitation = await E(
    reserve.reservePublicFacet,
  ).makeAddCollateralInvitation();
  await E(reserve.reserveCreatorFacet).addIssuer(moolaKit.issuer, 'Moola');

  const proposal = { give: { Collateral: moola(10_000n) } };
  const moolaPayment = moolaKit.mint.mintPayment(moola(10_000n));
  const payments = { Collateral: moolaPayment };
  const collateralSeat = E(zoe).offer(invitation, proposal, payments);

  t.is(
    await E(collateralSeat).getOfferResult(),
    'added Collateral to the Reserve',
    `added moola to the collateral Reserve`,
  );

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
  const timer = buildManualTimer(t.log);

  const { reserve, space, zoe } = await setupReserveServices(
    t,
    electorateTerms,
    timer,
  );

  const runBrand = await space.brand.consume.IST;

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
  await m.assertInitial(reserveInitialState(AmountMath.makeEmpty(runBrand)));
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

  const runBrand = await space.brand.consume.IST;

  const shortfallReporterSeat = await E(zoe).offer(
    E(reserve.reserveCreatorFacet).makeShortfallReportingInvitation(),
  );
  const reporterFacet = await E(shortfallReporterSeat).getOfferResult();

  const oneKRun = AmountMath.make(runBrand, 1000n);
  await E(reporterFacet).increaseLiquidationShortfall(oneKRun);
  const runningShortfall = 1000n;

  const metricsSub = await E(reserve.reserveCreatorFacet).getMetrics();
  const m = await subscriptionTracker(t, metricsSub);
  await m.assertInitial(reserveInitialState(AmountMath.makeEmpty(runBrand)));
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
    harden({ Fee: oneKRun }),
    'expecting more',
  );

  const params = harden([oneKRun]);
  // @ts-expect-error puppet governor
  await E(governor.governorCreatorFacet).invokeAPI(
    'burnFeesToReduceShortfall',
    params,
  );

  await m.assertChange({
    allocations: { Fee: AmountMath.makeEmpty(runBrand) },
    totalFeeBurned: { value: 1000n },
  });
});

test('storage keys', async t => {
  /** @param {NatValue} value */
  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };
  const timer = buildManualTimer(t.log);

  const { reserve } = await setupReserveServices(t, electorateTerms, timer);

  t.is(
    await subscriptionKey(E(reserve.reservePublicFacet).getSubscription()),
    'mockChainStorageRoot.reserve.governance',
  );

  t.is(
    await subscriptionKey(E(reserve.reserveCreatorFacet).getMetrics()),
    'mockChainStorageRoot.reserve.metrics',
  );
});
