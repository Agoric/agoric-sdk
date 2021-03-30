// @ts-check
/* global require */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import '@agoric/zoe/exported';

import { E } from '@agoric/eventual-send';
import { makeFakeVatAdmin } from '@agoric/zoe/src/contractFacet/fakeVatAdmin';
import { makeLoopback } from '@agoric/captp';
import { makeZoe } from '@agoric/zoe';
import bundleSource from '@agoric/bundle-source';

import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio';
import { amountMath } from '@agoric/ertp';
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
  const {
    sconeMint,
    collateralKit: { mint: collateralMint, brand: collaterlBrand },
  } = testJig;
  const { brand: sconeBrand } = sconeMint.getIssuerRecord();

  const collateral50 = amountMath.make(50n, collaterlBrand);
  const proposal = harden({
    give: { Collateral: collateral50 },
    want: { Scones: amountMath.make(70n, sconeBrand) },
  });
  const payments = harden({
    Collateral: collateralMint.mintPayment(collateral50),
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
  const {
    sconeMint,
    collateralKit: { brand: collateralBrand },
    vault,
    timer,
  } = testJig;
  const { brand: sconeBrand } = sconeMint.getIssuerRecord();

  const { value: v1, updateCount: c1 } = await E(notifier).getUpdateSince();
  t.deepEqual(v1.debt, amountMath.make(73n, sconeBrand));
  t.deepEqual(v1.locked, amountMath.make(50n, collateralBrand));
  t.is(c1, 2);

  t.deepEqual(
    vault.getDebtAmount(),
    amountMath.make(73n, sconeBrand),
    'borrower owes 73 Scones',
  );
  t.deepEqual(
    vault.getCollateralAmount(),
    amountMath.make(50n, collateralBrand),
    'vault holds 50 Collateral',
  );

  timer.tick();
  const noInterest = actions.accrueInterestAndAddToPool(1n);
  t.truthy(amountMath.isEqual(noInterest, amountMath.makeEmpty(sconeBrand)));

  // { chargingPeriod: 3, recordingPeriod: 9 }  charge 2% 3 times
  for (let i = 0; i < 12; i += 1) {
    timer.tick();
  }

  const nextInterest = actions.accrueInterestAndAddToPool(10n);
  t.truthy(
    amountMath.isEqual(nextInterest, amountMath.make(3n, sconeBrand)),
    `interest should be 3, was ${nextInterest.value}`,
  );
  const { value: v2, updateCount: c2 } = await E(notifier).getUpdateSince(c1);
  t.deepEqual(v2.debt, amountMath.make(76n, sconeBrand));
  t.deepEqual(v2.interestRate, makeRatio(200n, sconeBrand, 10000n));
  t.deepEqual(v2.liquidationRatio, makeRatio(105n, sconeBrand));
  const collateralization = v2.collateralizationRatio;
  t.truthy(
    collateralization.numerator.value > collateralization.denominator.value,
  );
  t.is(c2, 3);
});
