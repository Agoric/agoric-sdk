import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { assert } from '@endo/errors';
import { E } from '@endo/eventual-send';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import bundleSource from '@endo/bundle-source';
import { resolve as importMetaResolve } from 'import-meta-resolve';

import { AmountMath } from '@agoric/ertp';

import { makeTracer } from '@agoric/internal';

const vaultRoot = './vault-contract-wrapper.js';
const trace = makeTracer('TestVaultInterest', false);

/**
 * The properties will be asssigned by `setTestJig` in the contract.
 *
 * @typedef {object} TestContext
 * @property {ZCF} zcf
 * @property {ZCFMint} stableMint
 * @property {IssuerKit} collateralKit
 * @property {Vault} vault
 * @property {Function} advanceRecordingPeriod
 * @property {Function} setInterestRate
 */
let testJig;
/** @param {TestContext} jig */
const setJig = jig => {
  testJig = jig;
};

const { zoe, feeMintAccessP: feeMintAccess } = await setUpZoeForTest({
  setJig,
  useNearRemote: true,
});

/**
 * @param {ERef<ZoeService>} zoeP
 * @param {string} sourceRoot
 */
async function launch(zoeP, sourceRoot) {
  const contractUrl = await importMetaResolve(sourceRoot, import.meta.url);
  const contractPath = new URL(contractUrl).pathname;
  const contractBundle = await bundleSource(contractPath);
  const installation = await E(zoeP).install(contractBundle);
  const { creatorInvitation, creatorFacet, instance } = await E(
    zoeP,
  ).startInstance(
    installation,
    undefined,
    undefined,
    harden({ feeMintAccess }),
  );
  const {
    stableMint,
    collateralKit: { mint: collateralMint, brand: collaterlBrand },
  } = testJig;
  const { brand: stableBrand } = stableMint.getIssuerRecord();

  const collateral50 = AmountMath.make(collaterlBrand, 50n);
  const proposal = harden({
    give: { Collateral: collateral50 },
    want: { Minted: AmountMath.make(stableBrand, 70n) },
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

test('charges', async t => {
  const { creatorSeat, creatorFacet } = await launch(zoe, vaultRoot);

  // Our wrapper gives us a Vault which holds 50 Collateral, has lent out 70
  // Minted (charging 3 Minted fee), which uses an automatic market maker that
  // presents a fixed price of 4 Minted per Collateral.
  await E(creatorSeat).getOfferResult();
  const { stableMint, collateralKit, vault } = testJig;
  const { brand: stableBrand } = stableMint.getIssuerRecord();

  const { brand: cBrand } = collateralKit;

  const startingDebt = 74n;
  t.deepEqual(
    vault.getCurrentDebt(),
    AmountMath.make(stableBrand, startingDebt),
    'borrower owes 74 Minted',
  );
  t.deepEqual(
    vault.getCollateralAmount(),
    AmountMath.make(cBrand, 50n),
    'vault holds 50 Collateral',
  );
  t.deepEqual(vault.getNormalizedDebt().value, startingDebt);

  let interest = 0n;
  for (const [i, charge] of [4n, 4n, 4n, 4n].entries()) {
    // XXX https://github.com/Agoric/agoric-sdk/issues/5527
    await testJig.advanceRecordingPeriod();
    interest += charge;
    t.is(
      vault.getCurrentDebt().value,
      startingDebt + interest,
      `interest charge ${i} should have been ${charge}`,
    );
    t.is(vault.getNormalizedDebt().value, startingDebt);
  }

  trace('partially payback');
  const paybackValue = 3n;
  const collateralWanted = AmountMath.make(cBrand, 1n);
  const paybackAmount = AmountMath.make(stableBrand, paybackValue);
  const payback = await E(creatorFacet).mintRun(paybackAmount);
  const paybackSeat = E(zoe).offer(
    vault.makeAdjustBalancesInvitation(),
    harden({
      give: { Minted: paybackAmount },
      want: { Collateral: collateralWanted },
    }),
    harden({ Minted: payback }),
  );
  await E(paybackSeat).getOfferResult();
  t.deepEqual(
    vault.getCurrentDebt(),
    AmountMath.make(stableBrand, startingDebt + interest - paybackValue),
  );
  const normalizedPaybackValue = paybackValue - 1n;
  t.deepEqual(
    vault.getNormalizedDebt(),
    AmountMath.make(stableBrand, startingDebt - normalizedPaybackValue),
  );

  testJig.setInterestRate(25n);

  for (const [i, charge] of [22n, 27n, 34n].entries()) {
    // XXX https://github.com/Agoric/agoric-sdk/issues/5527
    await testJig.advanceRecordingPeriod();
    interest += charge;
    t.is(
      vault.getCurrentDebt().value,
      startingDebt + interest - paybackValue,
      `interest charge ${i} should have been ${charge}`,
    );
    t.is(
      vault.getNormalizedDebt().value,
      startingDebt - normalizedPaybackValue,
    );
  }
});
