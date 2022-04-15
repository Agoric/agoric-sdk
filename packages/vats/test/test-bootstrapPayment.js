// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { E } from '@endo/far';
import { makeLoopback } from '@endo/captp';

import '@agoric/zoe/exported.js';

import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import { makeZoeKit } from '@agoric/zoe';
import { AmountMath } from '@agoric/ertp';
import centralSupplyBundle from '../bundles/bundle-centralSupply.js';

const installBundle = (zoe, contractBundle) => E(zoe).install(contractBundle);

const setUpZoeForTest = setJig => {
  const { makeFar } = makeLoopback('zoeTest');
  const { zoeService, feeMintAccess: nonFarFeeMintAccess } = makeZoeKit(
    makeFakeVatAdmin(setJig).admin,
  );
  /** @type {ERef<ZoeService>} */
  const zoe = makeFar(zoeService);
  const feeMintAccess = makeFar(nonFarFeeMintAccess);
  return {
    zoe,
    feeMintAccess,
  };
};

const startContract = async bootstrapPaymentValue => {
  const { zoe, feeMintAccess: feeMintAccessP } = setUpZoeForTest();
  const runIssuer = E(zoe).getFeeIssuer();
  const runBrand = await E(runIssuer).getBrand();
  const feeMintAccess = await feeMintAccessP;

  /** @type {import('@agoric/zoe/src/zoeService/utils').Installation<import('@agoric/vats/src/centralSupply.js').CentralSupplyContract>} */
  const centralSupplyInstall = await installBundle(zoe, centralSupplyBundle);

  const terms = {
    bootstrapPaymentValue,
  };

  const { creatorFacet } = await E(zoe).startInstance(
    centralSupplyInstall,
    harden({}),
    terms,
    harden({ feeMintAccess }),
  );

  return { runIssuer, creatorFacet, runBrand };
};

test('bootstrap payment', async t => {
  const bootstrapPaymentValue = 20000n * 10n ** 6n;
  const { runIssuer, creatorFacet, runBrand } = await startContract(
    bootstrapPaymentValue,
  );

  const bootstrapPayment = E(creatorFacet).getBootstrapPayment();

  const bootstrapAmount = await E(runIssuer).getAmountOf(bootstrapPayment);

  t.true(
    AmountMath.isEqual(
      bootstrapAmount,
      AmountMath.make(runBrand, bootstrapPaymentValue),
    ),
  );
});

test('bootstrap payment - only minted once', async t => {
  // This test value is not a statement about the actual value to
  // be minted
  const bootstrapPaymentValue = 20000n * 10n ** 6n;

  const { runIssuer, creatorFacet, runBrand } = await startContract(
    bootstrapPaymentValue,
  );

  const bootstrapPayment = E(creatorFacet).getBootstrapPayment();

  const issuers = { RUN: runIssuer };

  const claimedPayment = await E(issuers.RUN).claim(bootstrapPayment);
  const bootstrapAmount = await E(issuers.RUN).getAmountOf(claimedPayment);

  t.true(
    AmountMath.isEqual(
      bootstrapAmount,
      AmountMath.make(runBrand, bootstrapPaymentValue),
    ),
  );

  // Try getting another payment

  const bootstrapPayment2 = E(creatorFacet).getBootstrapPayment();

  await t.throwsAsync(() => E(issuers.RUN).claim(bootstrapPayment2), {
    message: /was not a live payment/,
  });
});

test('bootstrap payment - default value is 0n', async t => {
  const { runIssuer, creatorFacet, runBrand } = await startContract(0n);

  const issuers = { RUN: runIssuer };

  const bootstrapPayment = E(creatorFacet).getBootstrapPayment();

  const bootstrapAmount = await E(issuers.RUN).getAmountOf(bootstrapPayment);

  t.true(AmountMath.isEqual(bootstrapAmount, AmountMath.make(runBrand, 0n)));
});
