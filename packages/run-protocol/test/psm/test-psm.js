// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import '@agoric/zoe/exported.js';
import '../../src/vaultFactory/types.js';

import path from 'path';
import { E } from '@agoric/eventual-send';
import bundleSource from '@endo/bundle-source';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import { makeZoeKit } from '@agoric/zoe';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { resolve as importMetaResolve } from 'import-meta-resolve';
import { makeLoopback } from '@endo/captp';
import { makeTracer } from '../../src/makeTracer.js';

const pathname = new URL(import.meta.url).pathname;
const dirname = path.dirname(pathname);

const psmRoot = `${dirname}/../../src/psm/psm.js`;
const trace = makeTracer('TestPSM');

// /**
//  * The properties will be asssigned by `setTestJig` in the contract.
//  *
//  * @typedef {Object} TestContext
//  * @property {ContractFacet} zcf
//  * @property {ZCFMint} runMint
//  * @property {IssuerKit} collateralKit
//  * @property {PSM} psm
//  * @property {Function} setInterestRate
//  */
// let testJig;
// const setJig = jig => {
//   testJig = jig;
// };

const makeBundle = async sourceRoot => {
  const url = await importMetaResolve(sourceRoot, import.meta.url);
  const contractBundle = await bundleSource(new URL(url).pathname);
  console.log(`makeBundle ${sourceRoot}`);
  return contractBundle;
};

// makeBundle is slow, so we bundle each contract once and reuse in all tests.
const [psmBundle] = await Promise.all([makeBundle(psmRoot)]);
const installBundle = (zoe, contractBundle) => E(zoe).install(contractBundle);

const setUpZoeForTest = async setJig => {
  const { makeFar, makeNear: makeRemote } = makeLoopback('zoeTest');
  const { zoeService, feeMintAccess: nonFarFeeMintAccess } = makeZoeKit(
    makeFakeVatAdmin(setJig, makeRemote).admin,
  );
  /** @type {ERef<ZoeService>} */
  const zoe = makeFar(zoeService);
  trace('makeZoe');
  const feeMintAccess = await makeFar(nonFarFeeMintAccess);
  return {
    zoe,
    feeMintAccess,
  };
};

const BASIS_POINTS = 10000n;
const FEE_BP = 2n;
const MINT_LIMIT = 20_000_000n * 1_000_000n;

const minusFee = amount =>
  AmountMath.make(
    amount.brand,
    BigInt((amount.value * (BASIS_POINTS - FEE_BP)) / BASIS_POINTS),
  );

const startContract = async () => {
  const { zoe, feeMintAccess } = await setUpZoeForTest(() => {});
  const runIssuer = E(zoe).getFeeIssuer();
  const runBrand = await E(runIssuer).getBrand();
  const anchorKit = makeIssuerKit('aUSD');
  const { brand: anchorBrand, issuer: anchorIssuer } = anchorKit;
  const psmInstall = await installBundle(zoe, psmBundle);
  const mintLimit = AmountMath.make(anchorBrand, MINT_LIMIT);
  const terms = {
    anchorBrand,
    main: { FeeBP: FEE_BP, MintLimit: mintLimit },
  };
  const { creatorFacet, publicFacet } = await E(zoe).startInstance(
    psmInstall,
    harden({ AUSD: anchorIssuer }),
    terms,
    harden({ feeMintAccess }),
  );
  return {
    runIssuer,
    runBrand,
    anchorKit,
    creatorFacet,
    publicFacet,
    feeMintAccess,
    zoe,
  };
};

test('simple trades', async t => {
  const { runIssuer, runBrand, _creatorFacet, publicFacet, anchorKit, zoe } =
    await startContract();

  const {
    brand: anchorBrand,
    issuer: anchorIssuer,
    mint: anchorMint,
  } = anchorKit;
  const give = AmountMath.make(anchorBrand, 200n * 1_000_000n);
  // TODO we should not need to await the swap invitation
  const seat1 = await E(zoe).offer(
    await E(publicFacet).makeSwapInvitation(),
    harden({ give: { In: give } }),
    harden({ In: anchorMint.mintPayment(give) }),
  );
  const runPayout = await E(seat1).getPayout('Out');
  const expectedRun = minusFee(AmountMath.make(runBrand, give.value));
  const actualRun = await E(runIssuer).getAmountOf(runPayout);
  t.deepEqual(expectedRun, actualRun);
  const liq = await E(publicFacet).getCurrentLiquidity();
  t.true(AmountMath.isEqual(liq, give));
  trace('get stable', { give, expectedRun, actualRun, liq });
  const runGive = AmountMath.make(runBrand, 100n * 1_000_000n);
  const [runPayment, _moreRun] = await E(runIssuer).split(runPayout, runGive);
  const seat2 = await E(zoe).offer(
    await E(publicFacet).makeSwapInvitation(),
    harden({ give: { In: runGive } }),
    harden({ In: runPayment }),
  );
  const anchorPayout = await E(seat2).getPayout('Out');
  const actualAnchor = await E(anchorIssuer).getAmountOf(anchorPayout);
  const expectedAnchor = AmountMath.make(anchorBrand, minusFee(runGive).value);
  t.deepEqual(expectedAnchor, actualAnchor);
  const liq2 = await E(publicFacet).getCurrentLiquidity();
  t.deepEqual(AmountMath.subtract(give, expectedAnchor), liq2);
  trace('get anchor', { runGive, expectedRun, actualAnchor, liq2 });
});

// test('bootstrap payment - only minted once', async t => {
//   // This test value is not a statement about the actual value to
//   // be minted
//   const bootstrapPaymentValue = 20000n * 10n ** 6n;

//   const { runIssuer, runBrand, creatorFacet, publicFacet, anchorKit } =
//     await startContract();

//   const bootstrapPayment = E(creatorFacet).getBootstrapPayment();

//   const issuers = { RUN: runIssuer };

//   const claimedPayment = await E(issuers.RUN).claim(bootstrapPayment);
//   const bootstrapAmount = await E(issuers.RUN).getAmountOf(claimedPayment);

//   t.true(
//     AmountMath.isEqual(
//       bootstrapAmount,
//       AmountMath.make(runBrand, bootstrapPaymentValue),
//     ),
//   );

//   // Try getting another payment

//   const bootstrapPayment2 = E(creatorFacet).getBootstrapPayment();

//   await t.throwsAsync(() => E(issuers.RUN).claim(bootstrapPayment2), {
//     message: /was not a live payment/,
//   });
// });

// test('bootstrap payment - default value is 0n', async t => {
//   const { runIssuer, creatorFacet, runBrand } = await startContract(0n);

//   const issuers = { RUN: runIssuer };

//   const bootstrapPayment = E(creatorFacet).getBootstrapPayment();

//   const bootstrapAmount = await E(issuers.RUN).getAmountOf(bootstrapPayment);

//   t.true(AmountMath.isEqual(bootstrapAmount, AmountMath.make(runBrand, 0n)));
// });
