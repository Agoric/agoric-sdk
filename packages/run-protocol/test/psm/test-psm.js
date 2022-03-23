/// no @ts-check because AVA context is hard to type

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import '@agoric/zoe/exported.js';
import '../../src/vaultFactory/types.js';

import path from 'path';
import { E } from '@endo/eventual-send';
import bundleSource from '@endo/bundle-source';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import { makeZoeKit } from '@agoric/zoe';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { resolve as importMetaResolve } from 'import-meta-resolve';
import { makeLoopback } from '@endo/captp';
import {
  makeRatio,
  floorDivideBy,
  floorMultiplyBy,
} from '@agoric/zoe/src/contractSupport/index.js';
import { makeTracer } from '../../src/makeTracer.js';

const pathname = new URL(import.meta.url).pathname;
const dirname = path.dirname(pathname);

const psmRoot = `${dirname}/../../src/psm/psm.js`;
const trace = makeTracer('TestPSM');

const makeBundle = async sourceRoot => {
  const url = await importMetaResolve(sourceRoot, import.meta.url);
  const contractBundle = await bundleSource(new URL(url).pathname);
  console.log(`makeBundle ${sourceRoot}`);
  return contractBundle;
};

const BASIS_POINTS = 10000n;
const WantStableFeeBP = 1n;
const GiveStableFeeBP = 3n;
const MINT_LIMIT = 20_000_000n * 1_000_000n;

/**
 * Compute the fee for giving an Amount in stable.
 *
 * @param {Amount<'nat'>} stable
 * @returns {Amount<'nat'>}
 */
const minusStableFee = stable => {
  const feeBP = GiveStableFeeBP;
  return AmountMath.make(
    stable.brand,
    BigInt((stable.value * (BASIS_POINTS - feeBP)) / BASIS_POINTS),
  );
};

/**
 * Compute the fee in the stable asset of an Amount given in anchor.
 *
 * @param {Amount<'nat'>} anchor
 * @param {Ratio} anchorPerStable
 * @returns {Amount<'nat'>}
 */
const minusAnchorFee = (anchor, anchorPerStable) => {
  const stable = floorDivideBy(anchor, anchorPerStable);
  return AmountMath.make(
    stable.brand,
    BigInt((stable.value * (BASIS_POINTS - WantStableFeeBP)) / BASIS_POINTS),
  );
};

// let testJig;
const setJig = _jig => {
  // testJig = jig;
};

/**
 * @param {ExecuteContract} t
 */
test.before(async t => {
  // makeBundle is slow, so we bundle each contract once and reuse in all tests.
  const [psmBundle] = await Promise.all([makeBundle(psmRoot)]);
  t.context.bundles = { psmBundle };
  const { makeFar, makeNear: makeRemote } = makeLoopback('zoeTest');
  const { zoeService, feeMintAccess: nonFarFeeMintAccess } = makeZoeKit(
    makeFakeVatAdmin(setJig, makeRemote).admin,
  );
  /** @type {ERef<ZoeService>} */
  const zoe = makeFar(zoeService);
  t.context.zoe = zoe;
  trace('makeZoe');
  const feeMintAccess = await makeFar(nonFarFeeMintAccess);
  t.context.feeMintAccess = feeMintAccess;

  const runIssuer = await E(zoe).getFeeIssuer();
  const runBrand = await E(runIssuer).getBrand();
  t.context.runKit = { runIssuer, runBrand };
  const anchorKit = makeIssuerKit('aUSD');
  t.context.anchorKit = anchorKit;

  const { brand: anchorBrand } = anchorKit;
  const psmInstall = await E(zoe).install(psmBundle);
  t.context.installs = { psmInstall };
  const mintLimit = AmountMath.make(anchorBrand, MINT_LIMIT);
  t.context.mintLimit = mintLimit;
  t.context.terms = {
    anchorBrand,
    anchorPerStable: makeRatio(100n, anchorBrand, 100n, runBrand),
    main: { WantStableFeeBP, GiveStableFeeBP, MintLimit: mintLimit },
  };
});

test('simple trades', async t => {
  const {
    zoe,
    feeMintAccess,
    terms,
    installs: { psmInstall },
    runKit: { runIssuer, runBrand },
    anchorKit: { brand: anchorBrand, issuer: anchorIssuer, mint: anchorMint },
  } = t.context;
  const { publicFacet, creatorFacet } = await E(zoe).startInstance(
    psmInstall,
    harden({ AUSD: anchorIssuer }),
    terms,
    harden({ feeMintAccess }),
  );
  const giveAnchor = AmountMath.make(anchorBrand, 200n * 1_000_000n);
  const seat1 = await E(zoe).offer(
    E(publicFacet).makeSwapInvitation(),
    harden({ give: { In: giveAnchor } }),
    harden({ In: anchorMint.mintPayment(giveAnchor) }),
  );
  const runPayout = await E(seat1).getPayout('Out');
  const expectedRun = minusAnchorFee(giveAnchor, terms.anchorPerStable);
  const actualRun = await E(runIssuer).getAmountOf(runPayout);
  t.deepEqual(actualRun, expectedRun);
  const liq = await E(publicFacet).getCurrentLiquidity();
  t.true(AmountMath.isEqual(liq, giveAnchor));
  const giveRun = AmountMath.make(runBrand, 100n * 1_000_000n);
  trace('get stable', { giveRun, expectedRun, actualRun, liq });
  const [runPayment, _moreRun] = await E(runIssuer).split(runPayout, giveRun);
  const seat2 = await E(zoe).offer(
    E(publicFacet).makeSwapInvitation(),
    harden({ give: { In: giveRun } }),
    harden({ In: runPayment }),
  );
  const anchorPayout = await E(seat2).getPayout('Out');
  const actualAnchor = await E(anchorIssuer).getAmountOf(anchorPayout);
  const expectedAnchor = AmountMath.make(
    anchorBrand,
    minusStableFee(giveRun).value,
  );
  t.deepEqual(actualAnchor, expectedAnchor);
  const liq2 = await E(publicFacet).getCurrentLiquidity();
  t.deepEqual(AmountMath.subtract(giveAnchor, expectedAnchor), liq2);
  trace('get anchor', { runGive: giveRun, expectedRun, actualAnchor, liq2 });

  // Check the fees
  // 1BP per anchor = 30000n plus 3BP per stable = 20000n
  const collectFeesSeat = await E(zoe).offer(
    E(creatorFacet).makeCollectFeesInvitation(),
  );
  await E(collectFeesSeat).getOfferResult();
  const feePayoutAmount = await E.get(E(collectFeesSeat).getCurrentAllocation())
    .RUN;
  const expectedFee = AmountMath.make(runBrand, 50000n);
  trace('Reward Fee', { feePayoutAmount, expectedFee });
  t.truthy(AmountMath.isEqual(feePayoutAmount, expectedFee));
});

test('limit', async t => {
  const {
    zoe,
    feeMintAccess,
    terms,
    mintLimit,
    installs: { psmInstall },
    anchorKit: { brand: anchorBrand, issuer: anchorIssuer, mint: anchorMint },
  } = t.context;
  const { publicFacet } = await E(zoe).startInstance(
    psmInstall,
    harden({ AUSD: anchorIssuer }),
    terms,
    harden({ feeMintAccess }),
  );
  const initialPool = AmountMath.make(anchorBrand, 1n);
  await E(zoe).offer(
    E(publicFacet).makeSwapInvitation(),
    harden({ give: { In: initialPool } }),
    harden({ In: anchorMint.mintPayment(initialPool) }),
  );
  t.assert(
    AmountMath.isEqual(await E(publicFacet).getCurrentLiquidity(), initialPool),
  );
  trace('test going over limit');
  const give = mintLimit;
  const seat1 = await E(zoe).offer(
    E(publicFacet).makeSwapInvitation(),
    harden({ give: { In: give } }),
    harden({ In: anchorMint.mintPayment(give) }),
  );
  trace('gone over limit');

  const paymentPs = await E(seat1).getPayouts();
  // We should get 0 RUN and all our anchor back
  // TODO should this be expecteed to be an empty Out?
  t.falsy(t.Out);
  // const actualRun = await E(runIssuer).getAmountOf(runPayout);
  // t.deepEqual(actualRun, AmountMath.makeEmpty(runBrand));
  const anchorReturn = await paymentPs.In;
  const actualAnchor = await E(anchorIssuer).getAmountOf(anchorReturn);
  t.deepEqual(actualAnchor, give);
  // The pool should be unchanged
  t.assert(
    AmountMath.isEqual(await E(publicFacet).getCurrentLiquidity(), initialPool),
  );
  // TODO Offer result should be an error
  // t.throwsAsync(() => await E(seat1).getOfferResult());
});

test('anchor is 2x stable', async t => {
  const {
    zoe,
    feeMintAccess,
    terms,
    installs: { psmInstall },
    runKit: { runIssuer, runBrand },
    anchorKit: { brand: anchorBrand, issuer: anchorIssuer, mint: anchorMint },
  } = t.context;
  const anchorPerStable = makeRatio(200n, anchorBrand, 100n, runBrand);
  const { publicFacet } = await E(zoe).startInstance(
    psmInstall,
    harden({ AUSD: anchorIssuer }),
    { ...terms, anchorPerStable },
    harden({ feeMintAccess }),
  );
  const giveAnchor = AmountMath.make(anchorBrand, 400n * 1_000_000n);
  const seat1 = await E(zoe).offer(
    E(publicFacet).makeSwapInvitation(),
    harden({ give: { In: giveAnchor } }),
    harden({ In: anchorMint.mintPayment(giveAnchor) }),
  );
  const runPayout = await E(seat1).getPayout('Out');
  const expectedRun = minusAnchorFee(giveAnchor, anchorPerStable);
  const actualRun = await E(runIssuer).getAmountOf(runPayout);
  t.deepEqual(actualRun, expectedRun);
  const liq = await E(publicFacet).getCurrentLiquidity();
  t.true(AmountMath.isEqual(liq, giveAnchor));
  const giveRun = AmountMath.make(runBrand, 100n * 1_000_000n);
  trace('get stable ratio', { giveRun, expectedRun, actualRun, liq });
  const [runPayment, _moreRun] = await E(runIssuer).split(runPayout, giveRun);
  const seat2 = await E(zoe).offer(
    E(publicFacet).makeSwapInvitation(),
    harden({ give: { In: giveRun } }),
    harden({ In: runPayment }),
  );
  const anchorPayout = await E(seat2).getPayout('Out');
  const actualAnchor = await E(anchorIssuer).getAmountOf(anchorPayout);
  const expectedAnchor = floorMultiplyBy(
    minusStableFee(giveRun),
    anchorPerStable,
  );
  t.deepEqual(actualAnchor, expectedAnchor);
  const liq2 = await E(publicFacet).getCurrentLiquidity();
  t.deepEqual(AmountMath.subtract(giveAnchor, expectedAnchor), liq2);
  trace('get anchor', { runGive: giveRun, expectedRun, actualAnchor, liq2 });
});
