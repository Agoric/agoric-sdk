import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { buildZoeManualTimer } from '@agoric/zoe/tools/manualTimer.js';
import { E } from '@endo/eventual-send';

import { documentStorageSchema } from '@agoric/governance/tools/storageDoc.js';
import { reserveInitialState, subscriptionTracker } from '../metrics.js';
import { setupReserveServices } from './setup.js';

/**
 * @param {ERef<ZoeService>} zoe
 * @param {ERef<FeeMintAccess>} feeMintAccessP
 * @param {any} faucetInstallation
 * @param {any} stableInitialLiquidity
 */
const getRunFromFaucet = async (
  zoe,
  feeMintAccessP,
  faucetInstallation,
  stableInitialLiquidity,
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
      want: { RUN: stableInitialLiquidity },
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
  const timer = buildZoeManualTimer(t.log);

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
  const timer = buildZoeManualTimer(t.log);

  const { zoe, reserve, space } = await setupReserveServices(
    t,
    electorateTerms,
    timer,
  );

  const stableBrand = await space.brand.consume.IST;
  const metricsTopic = await E.get(
    E(reserve.reservePublicFacet).getPublicTopics(),
  ).metrics;
  const m = await subscriptionTracker(t, metricsTopic);
  await m.assertInitial(reserveInitialState(AmountMath.makeEmpty(stableBrand)));

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
  await m.assertChange({
    allocations: { Moola: moola(10_000n) },
  });
});

test('reserve track shortfall', async t => {
  /** @param {NatValue} value */
  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };
  const timer = buildZoeManualTimer(t.log);

  const { reserve, space, zoe } = await setupReserveServices(
    t,
    electorateTerms,
    timer,
  );

  const stableBrand = await space.brand.consume.IST;

  const shortfallReporterSeat = await E(zoe).offer(
    E(reserve.reserveCreatorFacet).makeShortfallReportingInvitation(),
  );
  const reporterFacet = await E(shortfallReporterSeat).getOfferResult();

  await E(reporterFacet).increaseLiquidationShortfall(
    AmountMath.make(stableBrand, 1000n),
  );
  let runningShortfall = 1000n;

  const metricsTopic = await E.get(
    E(reserve.reservePublicFacet).getPublicTopics(),
  ).metrics;
  const m = await subscriptionTracker(t, metricsTopic);
  await m.assertInitial(reserveInitialState(AmountMath.makeEmpty(stableBrand)));
  await m.assertChange({
    shortfallBalance: { value: runningShortfall },
  });

  await E(reporterFacet).increaseLiquidationShortfall(
    AmountMath.make(stableBrand, 500n),
  );
  runningShortfall += 500n;

  await m.assertChange({
    shortfallBalance: { value: runningShortfall },
  });

  await E(reporterFacet).reduceLiquidationShortfall(
    AmountMath.make(stableBrand, 200n),
  );
  runningShortfall -= 200n;
  await m.assertChange({
    shortfallBalance: { value: runningShortfall },
  });

  await E(reporterFacet).reduceLiquidationShortfall(
    AmountMath.make(stableBrand, 2000n),
  );
  runningShortfall = 0n;
  await m.assertChange({
    shortfallBalance: { value: runningShortfall },
  });
});

test('reserve burn IST, with snapshot', async t => {
  /** @param {NatValue} value */
  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 1 };
  const timer = buildZoeManualTimer(t.log);

  const {
    zoe,
    reserve,
    space,
    feeMintAccess,
    faucetInstallation,
    governor,
    mockChainStorage,
  } = await setupReserveServices(t, electorateTerms, timer);

  const stableBrand = await space.brand.consume.IST;

  const shortfallReporterSeat = await E(zoe).offer(
    E(reserve.reserveCreatorFacet).makeShortfallReportingInvitation(),
  );
  const reporterFacet = await E(shortfallReporterSeat).getOfferResult();

  const oneK = AmountMath.make(stableBrand, 1000n);
  await E(reporterFacet).increaseLiquidationShortfall(oneK);

  const metricsTopic = await E.get(
    E(reserve.reservePublicFacet).getPublicTopics(),
  ).metrics;
  const m = await subscriptionTracker(t, metricsTopic);
  await m.assertInitial(reserveInitialState(AmountMath.makeEmpty(stableBrand)));
  await m.assertChange({
    shortfallBalance: { value: oneK.value },
  });

  const runPayment = getRunFromFaucet(
    zoe,
    feeMintAccess,
    faucetInstallation,
    oneK,
  );

  const invitation = await E(
    reserve.reservePublicFacet,
  ).makeAddCollateralInvitation();

  const proposal = { give: { Collateral: oneK } };
  const payments = { Collateral: runPayment };
  const collateralSeat = E(zoe).offer(invitation, proposal, payments);

  t.is(
    await E(collateralSeat).getOfferResult(),
    'added Collateral to the Reserve',
    `added RUN to the collateral Reserve`,
  );
  await m.assertChange({
    allocations: { Fee: oneK },
  });

  t.deepEqual(
    await E(reserve.reserveCreatorFacet).getAllocations(),
    harden({ Fee: oneK }),
    'expecting more',
  );

  const params = harden([oneK]);
  // @ts-expect-error puppet governor
  await E(governor.governorCreatorFacet).invokeAPI(
    'burnFeesToReduceShortfall',
    params,
  );

  await m.assertChange({
    allocations: { Fee: { value: 0n } },
    totalFeeBurned: { value: 1000n },
  });

  const doc = {
    node: 'reserve',
    owner: 'the reserve contract',
  };
  await documentStorageSchema(t, mockChainStorage, doc);
});

test('storage keys', async t => {
  /** @param {NatValue} value */
  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };
  const timer = buildZoeManualTimer(t.log);

  const { reserve } = await setupReserveServices(t, electorateTerms, timer);

  // TODO restore governance public mixin
  // t.is(
  //   await subscriptionKey(E(reserve.reservePublicFacet).getSubscription()),
  //   'mockChainStorageRoot.reserve.governance',
  // );

  const publicTopics = await E(reserve.reservePublicFacet).getPublicTopics();
  t.is(
    await publicTopics.metrics.storagePath,
    'mockChainStorageRoot.reserve.metrics',
  );
});
