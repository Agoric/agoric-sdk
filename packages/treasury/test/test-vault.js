// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import '@agoric/zoe/exported.js';

import { E } from '@agoric/eventual-send';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import { makeLoopback } from '@agoric/captp';
import { makeZoe } from '@agoric/zoe';
import bundleSource from '@agoric/bundle-source';
import { resolve as importMetaResolve } from 'import-meta-resolve';

import { makeIssuerKit, AmountMath } from '@agoric/ertp';

import { assert } from '@agoric/assert';
import { makeTracer } from '../src/makeTracer.js';

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

/* @type {TestContext} */
let testJig;
const setJig = jig => {
  testJig = jig;
};

const { makeFar, makeNear: makeRemote } = makeLoopback('zoeTest');

const { zoeService, feeMintAccess: nonFarFeeMintAccess } = makeZoe(
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

  const collateral50 = AmountMath.make(50n, collaterlBrand);
  const proposal = harden({
    give: { Collateral: collateral50 },
    want: { RUN: AmountMath.make(70n, runBrand) },
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

test('first', async t => {
  const { creatorSeat, creatorFacet } = await helperContract;

  // Our wrapper gives us a Vault which holds 50 Collateral, has lent out 70
  // RUN (charging 3 RUN fee), which uses an autoswap that presents a
  // fixed price of 4 RUN per Collateral.
  await E(creatorSeat).getOfferResult();
  const { runMint, collateralKit, vault } = testJig;
  const { brand: runBrand } = runMint.getIssuerRecord();

  const { issuer: cIssuer, mint: cMint, brand: cBrand } = collateralKit;

  t.deepEqual(
    vault.getDebtAmount(),
    AmountMath.make(73n, runBrand),
    'borrower owes 73 RUN',
  );
  t.deepEqual(
    vault.getCollateralAmount(),
    AmountMath.make(50n, cBrand),
    'vault holds 50 Collateral',
  );

  // Add more collateral to an existing loan. We get nothing back but a warm
  // fuzzy feeling.

  const collateralAmount = AmountMath.make(20n, cBrand);
  const invite = await E(creatorFacet).makeAdjustBalancesInvitation();
  const giveCollateralSeat = await E(zoe).offer(
    invite,
    harden({
      give: { Collateral: collateralAmount },
      want: {}, // RUN: AmountMath.make(2n, runBrand) },
    }),
    harden({
      // TODO
      Collateral: cMint.mintPayment(collateralAmount),
    }),
  );

  await E(giveCollateralSeat).getOfferResult();
  t.deepEqual(
    vault.getCollateralAmount(),
    AmountMath.make(70n, cBrand),
    'vault holds 70 Collateral',
  );
  trace('addCollateral');

  // partially payback
  const collateralWanted = AmountMath.make(1n, cBrand);
  const paybackAmount = AmountMath.make(3n, runBrand);
  const payback = await E(creatorFacet).mintRun(paybackAmount);
  const paybackSeat = E(zoe).offer(
    vault.makeAdjustBalancesInvitation(),
    harden({
      give: { RUN: paybackAmount },
      want: { Collateral: collateralWanted },
    }),
    harden({ RUN: payback }),
  );
  await E(paybackSeat).getOfferResult();

  const returnedCollateral = await E(paybackSeat).getPayout('Collateral');
  trace('returnedCollateral', returnedCollateral, cIssuer);
  const returnedAmount = await cIssuer.getAmountOf(returnedCollateral);
  t.deepEqual(
    vault.getDebtAmount(),
    AmountMath.make(70n, runBrand),
    'debt reduced to 70 RUN',
  );
  t.deepEqual(
    vault.getCollateralAmount(),
    AmountMath.make(69n, cBrand),
    'vault holds 69 Collateral',
  );
  t.deepEqual(
    returnedAmount,
    AmountMath.make(1n, cBrand),
    'withdrew 1 collateral',
  );
  t.is(returnedAmount.value, 1n, 'withdrew 1 collateral');
});

test('bad collateral', async t => {
  const { creatorSeat: offerKit } = await helperContract;

  const { runMint, collateralKit, vault } = testJig;

  // Our wrapper gives us a Vault which holds 50 Collateral, has lent out 70
  // RUN (charging 3 RUN fee), which uses an autoswap that presents a
  // fixed price of 4 RUN per Collateral.
  await E(offerKit).getOfferResult();
  const { brand: collateralBrand } = collateralKit;
  const { brand: runBrand } = runMint.getIssuerRecord();

  t.deepEqual(
    vault.getCollateralAmount(),
    AmountMath.make(50n, collateralBrand),
    'vault should hold 50 Collateral',
  );
  t.deepEqual(
    vault.getDebtAmount(),
    AmountMath.make(73n, runBrand),
    'borrower owes 73 RUN',
  );

  const collateralAmount = AmountMath.make(2n, collateralBrand);

  // adding the wrong kind of collateral should be rejected
  const { mint: wrongMint, brand: wrongBrand } = makeIssuerKit('wrong');
  const wrongAmount = AmountMath.make(2n, wrongBrand);
  const p = E(zoe).offer(
    vault.makeAdjustBalancesInvitation(),
    harden({
      give: { Collateral: collateralAmount },
      want: {},
    }),
    harden({
      Collateral: wrongMint.mintPayment(wrongAmount),
    }),
  );
  try {
    await p;
    t.fail('not rejected when it should have been');
  } catch (e) {
    console.log(`yup, it was rejected`);
    t.truthy(true, 'yay rejection');
  }
  // p.then(_ => console.log('oops passed'),
  //       rej => console.log('reg', rej));
  // t.rejects(p, / /, 'addCollateral requires the right kind', {});
  // t.throws(async () => { await p; }, /payment not found for/);
});
