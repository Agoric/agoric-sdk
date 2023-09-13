import '@agoric/zoe/exported.js';
import { test as unknownTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { E } from '@endo/eventual-send';

import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import { assertPayoutAmount } from '@agoric/zoe/test/zoeTestHelpers.js';

import { makeDriverContext, makeManagerDriver } from './driver.js';

/** @typedef {import('./driver.js').DriverContext & {}} Context */
/** @type {import('ava').TestFn<Context>} */
const test = unknownTest;

const trace = makeTracer('TestVault', false);

test.before(async t => {
  t.context = await makeDriverContext();
  trace(t, 'CONTEXT');
});

test('first', async t => {
  const { aeth, run } = t.context;
  const cBrand = aeth.brand;
  const stableBrand = run.brand;

  // Open a Vault with 50 Collateral, and take out 70
  // Minted (charging 3 Minted fee).

  const md = await makeManagerDriver(t);
  const withdraw = run.make(70n);
  let debt = run.make(74n);
  let collateral = aeth.make(50n);
  const vd = await md.makeVaultDriver(collateral, withdraw);

  const mintFee = makeRatio(5n, run.brand, 100n);
  await vd.checkBorrowed(withdraw, mintFee);
  await vd.checkBalance(debt, collateral);

  // Add more collateral to an existing loan. We get nothing back but a warm
  // fuzzy feeling.

  const addedC = 20n;
  const addedCollateral = AmountMath.make(cBrand, addedC);
  collateral = AmountMath.add(collateral, addedCollateral);

  await vd.giveCollateral(addedC, aeth);
  await vd.checkBalance(debt, collateral);

  trace('addCollateral');

  // partially payback
  const collateralWanted = AmountMath.make(cBrand, 1n);
  const paybackAmount = AmountMath.make(stableBrand, 3n);

  const seat = await vd.giveMinted(3n, aeth, 1n);
  collateral = AmountMath.subtract(collateral, collateralWanted);
  debt = AmountMath.subtract(debt, paybackAmount);
  await vd.checkBalance(debt, collateral);

  t.deepEqual(
    await E(seat).getOfferResult(),
    'We have adjusted your balances, thank you for your business',
  );
  const payouts = await E(seat).getPayouts();
  await assertPayoutAmount(
    t,
    aeth.issuer,
    payouts.Collateral,
    aeth.make(1n),
    'aeth',
  );
  await assertPayoutAmount(
    t,
    run.issuer,
    payouts.Minted,
    run.makeEmpty(),
    'run',
  );
});

test('bad collateral', async t => {
  const { aeth, run, zoe } = t.context;
  const cBrand = aeth.brand;

  // Open a Vault with 50 Collateral, and take out 70
  // Minted (charging 3 Minted fee).

  const md = await makeManagerDriver(t);
  const withdraw = run.make(70n);
  const debt = run.make(74n);
  const collateral = aeth.make(50n);
  const vd = await md.makeVaultDriver(collateral, withdraw);

  const mintFee = makeRatio(5n, run.brand, 100n);
  await vd.checkBorrowed(withdraw, mintFee);
  await vd.checkBalance(debt, collateral);

  const collateralAmount = AmountMath.make(cBrand, 2n);

  // adding the wrong kind of collateral should be rejected
  const { mint: wrongMint, brand: wrongBrand } = makeIssuerKit('wrong');
  const wrongAmount = AmountMath.make(wrongBrand, 2n);

  const p = E(zoe).offer(
    E(vd.vault()).makeAdjustBalancesInvitation(),
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
    t.truthy(true, 'yay rejection');
  }
});
