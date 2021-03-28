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

import { makeIssuerKit } from '@agoric/ertp';

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

test('first', async t => {
  const { creatorSeat, creatorFacet } = await helperContract;

  // Our wrapper gives us a Vault which holds 50 Collateral, has lent out 70
  // Scones (charging 3 scones fee), which uses an autoswap that presents a
  // fixed price of 4 Scones per Collateral.
  await E(creatorSeat).getOfferResult();
  const { sconeMint, collateralKit, vault } = testJig;

  const { issuer: cIssuer, amountMath: cMath, mint: cMint } = collateralKit;
  const { amountMath: sconeMath } = sconeMint.getIssuerRecord();

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

  // Add more collateral to an existing loan. We get nothing back but a warm
  // fuzzy feeling.

  const collateralAmount = cMath.make(20n);
  const invite = await E(creatorFacet).makeAdjustBalancesInvitation();
  const giveCollateralSeat = await E(zoe).offer(
    invite,
    harden({
      give: { Collateral: collateralAmount },
      want: {}, // Scones: sconeMath.make(2n) },
    }),
    harden({
      // TODO
      Collateral: cMint.mintPayment(collateralAmount),
    }),
  );

  await E(giveCollateralSeat).getOfferResult();
  t.deepEqual(
    vault.getCollateralAmount(),
    cMath.make(70n),
    'vault holds 70 Collateral',
  );
  trace('addCollateral');

  // partially payback
  const collateralWanted = cMath.make(1n);
  const paybackAmount = sconeMath.make(3n);
  const payback = await E(creatorFacet).mintScones(paybackAmount);
  const paybackSeat = E(zoe).offer(
    vault.makeAdjustBalancesInvitation(),
    harden({
      give: { Scones: paybackAmount },
      want: { Collateral: collateralWanted },
    }),
    harden({ Scones: payback }),
  );
  await E(paybackSeat).getOfferResult();

  const returnedCollateral = await E(paybackSeat).getPayout('Collateral');
  trace('returnedCollateral', returnedCollateral, cIssuer);
  const returnedAmount = await cIssuer.getAmountOf(returnedCollateral);
  t.deepEqual(
    vault.getDebtAmount(),
    sconeMath.make(70n),
    'debt reduced to 70 scones',
  );
  t.deepEqual(
    vault.getCollateralAmount(),
    cMath.make(69n),
    'vault holds 69 Collateral',
  );
  t.deepEqual(returnedAmount, cMath.make(1n), 'withdrew 1 collateral');
  t.is(returnedAmount.value, 1n, 'withdrew 1 collateral');
});

test('bad collateral', async t => {
  const { creatorSeat: offerKit } = await helperContract;

  const { sconeMint, collateralKit, vault } = testJig;

  // Our wrapper gives us a Vault which holds 50 Collateral, has lent out 70
  // Scones (charging 3 scones fee), which uses an autoswap that presents a
  // fixed price of 4 Scones per Collateral.
  await E(offerKit).getOfferResult();
  const { amountMath: cMath } = collateralKit;
  const { amountMath: sconeMath } = sconeMint.getIssuerRecord();

  t.deepEqual(
    vault.getCollateralAmount(),
    cMath.make(50n),
    'vault should hold 50 Collateral',
  );
  t.deepEqual(
    vault.getDebtAmount(),
    sconeMath.make(73n),
    'borrower owes 73 Scones',
  );

  const collateralAmount = cMath.make(2n);

  // adding the wrong kind of collateral should be rejected
  const wrongKit = makeIssuerKit('wrong');
  const wrongAmount = wrongKit.amountMath.make(2n);
  const p = E(zoe).offer(
    vault.makeAdjustBalancesInvitation(),
    harden({
      give: { Collateral: collateralAmount },
      want: {},
    }),
    harden({
      Collateral: wrongKit.mint.mintPayment(wrongAmount),
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
