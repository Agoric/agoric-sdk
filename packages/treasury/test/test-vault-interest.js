// @ts-check
/* global require */

import '@agoric/zoe/tools/prepare-test-env';
import '@agoric/zoe/exported';

// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import { E } from '@agoric/eventual-send';
import { makeFakeVatAdmin } from '@agoric/zoe/src/contractFacet/fakeVatAdmin';
import { makeLoopback } from '@agoric/captp';
import { makeZoe } from '@agoric/zoe';
import bundleSource from '@agoric/bundle-source';

import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio';
import { makeTracer } from '../src/makeTracer';

const vaultRoot = './vault-contract-wrapper.js';
const trace = makeTracer('TestVault');

/**
 * The properties will be asssigned by `setTestJig` in the contract.
 *
 * @typedef {Object} TestContext
 * @property {ContractFacet} zcf
 * @property {ZCFMint} sconeMint
 * @property {IssuerKit} collateralKit
 * @property {Vault} vault
 * @property {TimerService} timer
 */

// There's one copy of Vault shared across each test file, so this test runs in
// a separate context from test-vault.js

/* @type {TestContext} */
let testJig;
const setJig = jig => {
  testJig = jig;
};

const { makeFar, makeNear: makeRemote } = makeLoopback('zoeTest');

/** @type {ERef<ZoeService>} */
const zoe = makeFar(makeZoe(makeFakeVatAdmin(setJig, makeRemote).admin));
trace('makeZoe');

/**
 * @param {ERef<ZoeService>} zoeP
 * @param {string} sourceRoot
 */
async function launch(zoeP, sourceRoot) {
  const contractBundle = await bundleSource(require.resolve(sourceRoot));
  const installation = await E(zoeP).install(contractBundle);
  const { creatorInvitation, creatorFacet, instance } = await E(
    zoeP,
  ).startInstance(installation);
  const { sconeMint, collateralKit } = testJig;
  const sconeMath = sconeMint.getIssuerRecord().amountMath;
  const collateral50 = collateralKit.amountMath.make(50n);
  const proposal = harden({
    give: { Collateral: collateral50 },
    want: { Scones: sconeMath.make(70n) },
  });
  const payments = harden({
    Collateral: collateralKit.mint.mintPayment(collateral50),
  });
  return {
    creatorSeat: E(zoeP).offer(creatorInvitation, proposal, payments),
    creatorFacet,
    instance,
  };
}

const helperContract = launch(zoe, vaultRoot);

test('interest', async t => {
  const { creatorSeat } = await helperContract;

  // Our wrapper gives us a Vault which holds 50 Collateral, has lent out 70
  // Scones (charging 3 scones fee), which uses an autoswap that presents a
  // fixed price of 4 Scones per Collateral.
  const { notifier, actions } = await E(creatorSeat).getOfferResult();
  const { sconeMint, collateralKit, vault, timer } = testJig;

  const { amountMath: cMath } = collateralKit;
  const {
    amountMath: sconeMath,
    brand: sconeBrand,
  } = sconeMint.getIssuerRecord();

  const { value: v1, updateCount: c1 } = await E(notifier).getUpdateSince();
  t.deepEqual(v1.debt, sconeMath.make(73n));
  t.deepEqual(v1.locked, collateralKit.amountMath.make(50n));
  t.is(c1, 2);

  t.deepEqual(
    vault.getDebtAmount(),
    sconeMath.make(73n),
    'borrower owes 73 Scones',
  );
  t.deepEqual(
    vault.getCollateralAmount(),
    cMath.make(50n),
    'vault holds 50 Collateral',
  );

  timer.tick();
  const noInterest = actions.accrueInterestAndAddToPool(1n);
  t.truthy(sconeMath.isEqual(noInterest, sconeMath.getEmpty()));

  // { chargingPeriod: 3, recordingPeriod: 9 }  charge 2% 3 times
  for (let i = 0; i < 12; i += 1) {
    timer.tick();
  }

  const nextInterest = actions.accrueInterestAndAddToPool(10n);
  t.truthy(
    sconeMath.isEqual(nextInterest, sconeMath.make(3n)),
    `interest should be 3, was ${nextInterest.value}`,
  );
  const { value: v2, updateCount: c2 } = await E(notifier).getUpdateSince(c1);
  t.deepEqual(v2.debt, sconeMath.make(76n));
  t.deepEqual(v2.interestRate, makeRatio(200n, sconeBrand, 10000n));
  t.deepEqual(v2.liquidationRatio, makeRatio(105n, sconeBrand));
  const collateralization = v2.collateralizationRatio;
  t.truthy(
    collateralization.numerator.value > collateralization.denominator.value,
  );
  t.is(c2, 3);
});
