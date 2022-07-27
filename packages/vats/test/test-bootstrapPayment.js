// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { E } from '@endo/far';
import { makeLoopback } from '@endo/captp';
import { deeplyFulfilled } from '@endo/marshal';

import '@agoric/zoe/exported.js';

import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import { makeZoeKit } from '@agoric/zoe';
import { AmountMath } from '@agoric/ertp';
import centralSupplyBundle from '../bundles/bundle-centralSupply.js';
import { Stable } from '../src/tokens.js';

const setUpZoeForTest = setJig => {
  const { makeFar } = makeLoopback('zoeTest');
  const { zoeService, feeMintAccess: nonFarFeeMintAccess } = makeZoeKit(
    makeFakeVatAdmin(setJig).admin,
    undefined,
    {
      name: Stable.symbol,
      assetKind: Stable.assetKind,
      displayInfo: Stable.displayInfo,
    },
  );
  /** @type {ERef<ZoeService>} */
  const zoe = makeFar(zoeService);
  const feeMintAccess = makeFar(nonFarFeeMintAccess);
  return {
    zoe,
    feeMintAccess,
  };
};

/** @template T @typedef {import('@agoric/zoe/src/zoeService/utils').Installation<T>} Installation<T> */
/**
 * @typedef {import('ava').ExecutionContext<{
 *   zoe: ZoeService,
 *   feeMintAccess: FeeMintAccess,
 *   issuer: Record<'IST', Issuer>,
 *   brand: Record<'IST', Brand>,
 *   installation: Record<'centralSupply', Installation<import('../src/centralSupply.js').CentralSupplyContract>>,
 * }>} CentralSupplyTestContext
 */

test.before(async (/** @type {CentralSupplyTestContext} */ t) => {
  const { zoe, feeMintAccess } = await setUpZoeForTest(() => {});
  const issuer = {
    IST: E(zoe).getFeeIssuer(),
  };
  const brand = {
    IST: E(issuer.IST).getBrand(),
  };

  const installation = {
    centralSupply: E(zoe).install(centralSupplyBundle),
  };

  t.context = await deeplyFulfilled(
    harden({
      zoe,
      feeMintAccess,
      issuer,
      brand,
      installation,
    }),
  );
});

/**
 * @param {CentralSupplyTestContext} t
 * @param {bigint} bootstrapPaymentValue
 */
const startContract = (t, bootstrapPaymentValue) => {
  const {
    zoe,
    feeMintAccess,
    installation: { centralSupply: centralSupplyInstall },
  } = t.context;

  const terms = {
    bootstrapPaymentValue,
  };
  return E(zoe).startInstance(
    centralSupplyInstall,
    harden({}),
    terms,
    harden({ feeMintAccess }),
  );
};

test('bootstrap payment', async (/** @type {CentralSupplyTestContext} */ t) => {
  const bootstrapPaymentValue = 20000n * 10n ** 6n;
  const {
    issuer: { IST: runIssuer },
    brand: { IST: runBrand },
  } = t.context;

  const { creatorFacet } = await startContract(t, bootstrapPaymentValue);

  const bootstrapPayment = E(creatorFacet).getBootstrapPayment();

  const bootstrapAmount = await E(runIssuer).getAmountOf(bootstrapPayment);

  t.true(
    AmountMath.isEqual(
      bootstrapAmount,
      AmountMath.make(runBrand, bootstrapPaymentValue),
    ),
  );
});

test('bootstrap payment - only minted once', async (/** @type {CentralSupplyTestContext} */ t) => {
  // This test value is not a statement about the actual value to
  // be minted
  const bootstrapPaymentValue = 20000n * 10n ** 6n;

  const {
    issuer: { IST: istIssuer },
    brand: { IST: istBrand },
  } = t.context;
  const { creatorFacet } = await startContract(t, bootstrapPaymentValue);
  const bootstrapPayment = E(creatorFacet).getBootstrapPayment();

  const issuers = { IST: istIssuer };

  const claimedPayment = await E(issuers.IST).claim(bootstrapPayment);
  const bootstrapAmount = await E(issuers.IST).getAmountOf(claimedPayment);

  t.true(
    AmountMath.isEqual(
      bootstrapAmount,
      AmountMath.make(istBrand, bootstrapPaymentValue),
    ),
  );

  // Try getting another payment

  const bootstrapPayment2 = E(creatorFacet).getBootstrapPayment();

  await t.throwsAsync(() => E(issuers.IST).claim(bootstrapPayment2), {
    message: /was not a live payment/,
  });
});

test('bootstrap payment - default value is 0n', async (/** @type {CentralSupplyTestContext} */ t) => {
  const {
    issuer: { IST: runIssuer },
    brand: { IST: runBrand },
  } = t.context;
  const { creatorFacet } = await startContract(t, 0n);

  const issuers = { IST: runIssuer };

  const bootstrapPayment = E(creatorFacet).getBootstrapPayment();

  const bootstrapAmount = await E(issuers.IST).getAmountOf(bootstrapPayment);

  t.true(AmountMath.isEqual(bootstrapAmount, AmountMath.make(runBrand, 0n)));
});

test('bootstrap payment - contract exits', async (/** @type {CentralSupplyTestContext} */ t) => {
  const { adminFacet, creatorFacet } = await startContract(t, 0n);

  const pmt = await E(creatorFacet).getBootstrapPayment();
  t.log({ pmt });
  const completion = await E(adminFacet).getVatShutdownPromise();
  t.log({ completion });
  t.pass();
});
