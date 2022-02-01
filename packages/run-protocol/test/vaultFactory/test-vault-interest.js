// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import '@agoric/zoe/exported.js';

import { E } from '@agoric/eventual-send';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import { makeLoopback } from '@endo/captp';
import { makeZoeKit } from '@agoric/zoe';
import bundleSource from '@endo/bundle-source';
import { resolve as importMetaResolve } from 'import-meta-resolve';

import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio.js';
import { AmountMath } from '@agoric/ertp';
import { assert } from '@agoric/assert';
import { makeTracer } from '../../src/makeTracer.js';

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

const { zoeService, feeMintAccess: nonFarFeeMintAccess } = makeZoeKit(
  makeFakeVatAdmin(setJig, makeRemote).admin,
);
/** @type {ERef<ZoeService>} */
const zoe = makeFar(zoeService);
trace('makeZoe');
const feeMintAccessP = makeFar(nonFarFeeMintAccess);

/**
 * @param {ERef<ZoeService>} zoeP
 * @param {string} sourceRoot
 */
async function launch(zoeP, sourceRoot) {
  const contractUrl = await importMetaResolve(sourceRoot, import.meta.url);
  const contractPath = new URL(contractUrl).pathname;
  const contractBundle = await bundleSource(contractPath);
  const installation = await E(zoeP).install(contractBundle);
  const feeMintAccess = await feeMintAccessP;
  const { creatorInvitation, creatorFacet, instance } = await E(
    zoeP,
  ).startInstance(
    installation,
    undefined,
    undefined,
    harden({ feeMintAccess }),
  );
  const {
    runMint,
    collateralKit: { mint: collateralMint, brand: collaterlBrand },
  } = testJig;
  const { brand: runBrand } = runMint.getIssuerRecord();

  const collateral50 = AmountMath.make(collaterlBrand, 50000n);
  const proposal = harden({
    give: { Collateral: collateral50 },
    want: { RUN: AmountMath.make(runBrand, 70000n) },
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
  // RUN (charging 3 RUN fee), which uses an automatic market maker that
  // presents a fixed price of 4 RUN per Collateral.
  const { notifier, actions } = await E(creatorSeat).getOfferResult();
  const {
    runMint,
    collateralKit: { brand: collateralBrand },
    vault,
    timer,
  } = testJig;
  const { brand: runBrand } = runMint.getIssuerRecord();

  const { value: v1, updateCount: c1 } = await E(notifier).getUpdateSince();
  t.deepEqual(v1.debt, AmountMath.make(runBrand, 73500n));
  t.deepEqual(v1.locked, AmountMath.make(collateralBrand, 50000n));
  t.is(c1, 2);

  t.deepEqual(
    vault.getDebtAmount(),
    AmountMath.make(runBrand, 73_500n),
    'borrower owes 73,500 RUN',
  );
  t.deepEqual(
    vault.getCollateralAmount(),
    AmountMath.make(collateralBrand, 50_000n),
    'vault holds 50,000 Collateral',
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
    AmountMath.isEqual(nextInterest, AmountMath.make(runBrand, 70n)),
    `interest should be 70, was ${nextInterest.value}`,
  );
  const { value: v2, updateCount: c2 } = await E(notifier).getUpdateSince(c1);
  t.deepEqual(v2.debt, AmountMath.make(runBrand, 73500n + 70n));
  t.deepEqual(v2.interestRate, makeRatio(5n, runBrand, 100n));
  t.deepEqual(v2.liquidationRatio, makeRatio(105n, runBrand));
  const collateralization = v2.collateralizationRatio;
  t.truthy(
    collateralization.numerator.value > collateralization.denominator.value,
  );
  t.is(c2, 3);
});
