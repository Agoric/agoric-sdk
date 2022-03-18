// @ts-check
/* global setImmediate */

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { E } from '@endo/eventual-send';
import { makeIssuerKit, AmountMath } from '@agoric/ertp';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { makePromiseKit } from '@endo/promise-kit';

import { setupReserveServices } from './setup.js';

// Some notifier updates aren't propogating sufficiently quickly for the tests.
// This invocation (thanks to Warner) waits for all promises that can fire to
// have all their callbacks run
async function waitForPromisesToSettle() {
  const pk = makePromiseKit();
  setImmediate(pk.resolve);
  return pk.promise;
}

test('reserve add collateral', async t => {
  /** @param {NatValue} value */
  const moolaR = makeIssuerKit('moola');
  const moola = value => AmountMath.make(moolaR.brand, value);

  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };
  const timer = buildManualTimer(console.log);

  const { reserve, zoe, space } = await setupReserveServices(
    electorateTerms,
    timer,
  );
  const { ammPublicFacet } = space.amm;
  await E(ammPublicFacet).addPool(moolaR.issuer, 'Moola');

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

  const { reserve, zoe, space } = await setupReserveServices(
    electorateTerms,
    timer,
  );
  const { ammPublicFacet } = space.amm;
  await E(ammPublicFacet).addPool(moolaR.issuer, 'Moola');

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
      message: 'Please call addIssuer for brand [object Alleged: moola brand]',
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

  const { reserve, zoe, space, governor } = await setupReserveServices(
    electorateTerms,
    timer,
  );

  const { ammPublicFacet } = space.amm;
  await E(ammPublicFacet).addPool(moolaR.issuer, 'Moola');
  const moolaLiquidityIssuer = E(ammPublicFacet).getLiquidityIssuer(
    moolaR.brand,
  );
  const moolaLiquidityBrand = await E(moolaLiquidityIssuer).getBrand();
  const runBrand = await space.brand.consume.RUN;

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
      MoolaLiquidity: AmountMath.make(moolaLiquidityBrand, 80_000n),
    }),
    'expecting more',
  );

  t.deepEqual(
    await E(ammPublicFacet).getPoolAllocation(moolaR.brand),
    harden({
      Central: AmountMath.make(runBrand, 80_000n),
      Secondary: moola(90_000n),
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

  const { reserve, zoe, space, governor } = await setupReserveServices(
    electorateTerms,
    timer,
  );

  const { ammPublicFacet } = space.amm;
  await E(ammPublicFacet).addPool(moolaR.issuer, 'Moola');
  const runBrand = await space.brand.consume.RUN;

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
