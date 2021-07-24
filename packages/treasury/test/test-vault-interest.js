// @ts-check
/* global require */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import '@agoric/zoe/exported';

import { E } from '@agoric/eventual-send';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin';
import { makeLoopback } from '@agoric/captp';
import { makeZoe } from '@agoric/zoe';
import bundleSource from '@agoric/bundle-source';

import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio';
import { AmountMath } from '@agoric/ertp';
import { assert } from '@agoric/assert';
import { makeTracer } from '../src/makeTracer';

const vaultRoot = './vault-contract-wrapper.js';
const trace = makeTracer('TestVault');

/**
 * The properties will be asssigned by `setTestJig` in the contract.
 *
 * @typedef {Object} TestContext
 * @property {ContractFacet} zcf
 * @property {ZCFMint} runMint
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

const { zoeService: /** @type {ERef<ZoeService>} */ zoe } = await makeFar(
  makeZoe(makeFakeVatAdmin(setJig, makeRemote).admin),
);
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
  const {
    runMint,
    collateralKit: { mint: collateralMint, brand: collaterlBrand },
  } = testJig;
  const { brand: runBrand } = runMint.getIssuerRecord();

  const collateral50 = AmountMath.make(50000n, collaterlBrand);
  const proposal = harden({
    give: { Collateral: collateral50 },
    want: { RUN: AmountMath.make(70000n, runBrand) },
  });
  const payments = harden({
    Collateral: collateralMint.mintPayment(collateral50),
  });
  assert(creatorInvitation);
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
  // RUN (charging 3 RUN fee), which uses an autoswap that presents a
  // fixed price of 4 RUN per Collateral.
  const { notifier, actions } = await E(creatorSeat).getOfferResult();
  const {
    runMint,
    collateralKit: { brand: collateralBrand },
    vault,
    timer,
  } = testJig;
  const { brand: runBrand } = runMint.getIssuerRecord();

  const { value: v1, updateCount: c1 } = await E(notifier).getUpdateSince();
  t.deepEqual(v1.debt, AmountMath.make(73500n, runBrand));
  t.deepEqual(v1.locked, AmountMath.make(50000n, collateralBrand));
  t.is(c1, 2);

  t.deepEqual(
    vault.getDebtAmount(),
    AmountMath.make(73500n, runBrand),
    'borrower owes 73 RUN',
  );
  t.deepEqual(
    vault.getCollateralAmount(),
    AmountMath.make(50000n, collateralBrand),
    'vault holds 50 Collateral',
  );

  timer.tick();
  const noInterest = actions.accrueInterestAndAddToPool(1n);
  t.truthy(AmountMath.isEqual(noInterest, AmountMath.makeEmpty(runBrand)));

  // { chargingPeriod: 3, recordingPeriod: 9 }  charge 2% 3 times
  for (let i = 0; i < 12; i += 1) {
    timer.tick();
  }

  const nextInterest = actions.accrueInterestAndAddToPool(
    timer.getCurrentTimestamp(),
  );
  t.truthy(
    AmountMath.isEqual(nextInterest, AmountMath.make(63n, runBrand)),
    `interest should be 3, was ${nextInterest.value}`,
  );
  const { value: v2, updateCount: c2 } = await E(notifier).getUpdateSince(c1);
  t.deepEqual(v2.debt, AmountMath.make(73500n + 63n, runBrand));
  t.deepEqual(v2.interestRate, makeRatio(5, runBrand, 100n));
  t.deepEqual(v2.liquidationRatio, makeRatio(105n, runBrand));
  const collateralization = v2.collateralizationRatio;
  t.truthy(
    collateralization.numerator.value > collateralization.denominator.value,
  );
  t.is(c2, 3);
});
