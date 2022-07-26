// @ts-check

import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import '@agoric/zoe/exported.js';
import '../../src/vaultFactory/types.js';

import path from 'path';
import { E } from '@endo/eventual-send';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import {
  makeRatio,
  floorDivideBy,
  floorMultiplyBy,
  natSafeMath as NatMath,
} from '@agoric/zoe/src/contractSupport/index.js';
import committeeBundle from '@agoric/governance/bundles/bundle-committee.js';
import { CONTRACT_ELECTORATE, ParamTypes } from '@agoric/governance';
import { makeBoard } from '@agoric/vats/src/lib-board.js';

import { makeTracer } from '../../src/makeTracer.js';
import { unsafeMakeBundleCache } from '../bundleTool.js';
import {
  mockChainStorageRoot,
  setUpZoeForTest,
  subscriptionKey,
} from '../supports.js';

/** @type {import('ava').TestInterface<Awaited<ReturnType<makeTestContext>>>} */
// @ts-expect-error cast
const test = anyTest;

const pathname = new URL(import.meta.url).pathname;
const dirname = path.dirname(pathname);

const psmRoot = `${dirname}/../../src/psm/psm.js`;
const trace = makeTracer('TestPSM', false);

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
    NatMath.floorDivide(
      NatMath.multiply(stable.value, NatMath.subtract(BASIS_POINTS, feeBP)),
      BASIS_POINTS,
    ),
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
  const feeBP = WantStableFeeBP;
  return AmountMath.make(
    stable.brand,
    NatMath.floorDivide(
      NatMath.multiply(stable.value, NatMath.subtract(BASIS_POINTS, feeBP)),
      BASIS_POINTS,
    ),
  );
};

// let testJig;
const setJig = _jig => {
  // testJig = jig;
};

const makeTestContext = async () => {
  const bundleCache = await unsafeMakeBundleCache('bundles/');
  const psmBundle = await bundleCache.load(psmRoot, 'psm');
  const { zoe, feeMintAccess } = setUpZoeForTest(setJig);

  const runIssuer = await E(zoe).getFeeIssuer();
  const runBrand = await E(runIssuer).getBrand();
  const anchorKit = makeIssuerKit('aUSD');

  const { brand: anchorBrand } = anchorKit;
  const committeeInstall = await E(zoe).install(committeeBundle);
  const psmInstall = await E(zoe).install(psmBundle);
  const mintLimit = AmountMath.make(anchorBrand, MINT_LIMIT);

  const { creatorFacet: committeeCreator } = await E(zoe).startInstance(
    committeeInstall,
    harden({}),
    {
      committeeName: 'Demos',
      committeeSize: 1,
    },
  );

  const initialPoserInvitation = await E(committeeCreator).getPoserInvitation();
  const invitationAmount = await E(E(zoe).getInvitationIssuer()).getAmountOf(
    initialPoserInvitation,
  );

  return {
    bundles: { psmBundle },
    zoe: await zoe,
    privateArgs: harden({
      feeMintAccess: await feeMintAccess,
      initialPoserInvitation,
      storageNode: mockChainStorageRoot().getChildNode('psm'),
      marshaller: makeBoard().getReadonlyMarshaller(),
    }),
    run: { issuer: runIssuer, brand: runBrand },
    anchorKit,
    installs: { committeeInstall, psmInstall },
    mintLimit,
    terms: {
      anchorBrand,
      anchorPerStable: makeRatio(100n, anchorBrand, 100n, runBrand),
      governedParams: {
        [CONTRACT_ELECTORATE]: {
          type: ParamTypes.INVITATION,
          value: invitationAmount,
        },
        GiveStableFee: {
          type: ParamTypes.RATIO,
          value: makeRatio(GiveStableFeeBP, runBrand, BASIS_POINTS),
        },
        MintLimit: { type: ParamTypes.AMOUNT, value: mintLimit },
        WantStableFee: {
          type: ParamTypes.RATIO,
          value: makeRatio(WantStableFeeBP, runBrand, BASIS_POINTS),
        },
      },
    },
  };
};

test.before(async t => {
  t.context = await makeTestContext();
});

test('simple trades', async t => {
  const {
    zoe,
    privateArgs,
    terms,
    installs: { psmInstall },
    run,
    anchorKit: { brand: anchorBrand, issuer: anchorIssuer, mint: anchorMint },
  } = t.context;
  const { publicFacet, creatorFacet } = await E(zoe).startInstance(
    psmInstall,
    harden({ AUSD: anchorIssuer }),
    terms,
    privateArgs,
  );
  const giveAnchor = AmountMath.make(anchorBrand, 200n * 1_000_000n);
  const seat1 = await E(zoe).offer(
    E(publicFacet).makeSwapInvitation(),
    harden({ give: { In: giveAnchor } }),
    harden({ In: anchorMint.mintPayment(giveAnchor) }),
  );
  const runPayout = await E(seat1).getPayout('Out');
  const expectedRun = minusAnchorFee(giveAnchor, terms.anchorPerStable);
  const actualRun = await E(run.issuer).getAmountOf(runPayout);
  t.deepEqual(actualRun, expectedRun);
  const liq = await E(publicFacet).getPoolBalance();
  t.true(AmountMath.isEqual(liq, giveAnchor));
  const giveRun = AmountMath.make(run.brand, 100n * 1_000_000n);
  trace('get stable', { giveRun, expectedRun, actualRun, liq });
  const [runPayment, _moreRun] = await E(run.issuer).split(runPayout, giveRun);
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
  const liq2 = await E(publicFacet).getPoolBalance();
  t.deepEqual(AmountMath.subtract(giveAnchor, expectedAnchor), liq2);
  trace('get anchor', { runGive: giveRun, expectedRun, actualAnchor, liq2 });

  // Check the fees
  // 1BP per anchor = 30000n plus 3BP per stable = 20000n
  const limitedCreatorFacet = E(creatorFacet).getLimitedCreatorFacet();
  const collectFeesSeat = await E(zoe).offer(
    E(limitedCreatorFacet).makeCollectFeesInvitation(),
  );
  await E(collectFeesSeat).getOfferResult();
  const feePayoutAmount = await E.get(
    E(collectFeesSeat).getCurrentAllocationJig(),
  ).RUN;
  const expectedFee = AmountMath.make(run.brand, 50000n);
  trace('Reward Fee', { feePayoutAmount, expectedFee });
  t.truthy(AmountMath.isEqual(feePayoutAmount, expectedFee));
});

test('limit', async t => {
  const {
    zoe,
    privateArgs,
    terms,
    mintLimit,
    installs: { psmInstall },
    anchorKit: { brand: anchorBrand, issuer: anchorIssuer, mint: anchorMint },
  } = t.context;

  const { publicFacet } = await E(zoe).startInstance(
    psmInstall,
    harden({ AUSD: anchorIssuer }),
    terms,
    privateArgs,
  );
  const initialPool = AmountMath.make(anchorBrand, 1n);
  await E(zoe).offer(
    E(publicFacet).makeSwapInvitation(),
    harden({ give: { In: initialPool } }),
    harden({ In: anchorMint.mintPayment(initialPool) }),
  );
  t.assert(
    AmountMath.isEqual(await E(publicFacet).getPoolBalance(), initialPool),
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
  t.falsy(paymentPs.Out);
  // const actualRun = await E(runIssuer).getAmountOf(runPayout);
  // t.deepEqual(actualRun, AmountMath.makeEmpty(runBrand));
  const anchorReturn = await paymentPs.In;
  const actualAnchor = await E(anchorIssuer).getAmountOf(anchorReturn);
  t.deepEqual(actualAnchor, give);
  // The pool should be unchanged
  t.assert(
    AmountMath.isEqual(await E(publicFacet).getPoolBalance(), initialPool),
  );
  // TODO Offer result should be an error
  // t.throwsAsync(() => await E(seat1).getOfferResult());
});

test('anchor is 2x stable', async t => {
  const {
    zoe,
    privateArgs,
    terms,
    installs: { psmInstall },
    run,
    anchorKit: { brand: anchorBrand, issuer: anchorIssuer, mint: anchorMint },
  } = t.context;
  const anchorPerStable = makeRatio(200n, anchorBrand, 100n, run.brand);
  const { publicFacet } = await E(zoe).startInstance(
    psmInstall,
    harden({ AUSD: anchorIssuer }),
    { ...terms, anchorPerStable },
    privateArgs,
  );
  const giveAnchor = AmountMath.make(anchorBrand, 400n * 1_000_000n);
  const seat1 = await E(zoe).offer(
    E(publicFacet).makeSwapInvitation(),
    harden({ give: { In: giveAnchor } }),
    harden({ In: anchorMint.mintPayment(giveAnchor) }),
  );
  const runPayout = await E(seat1).getPayout('Out');
  const expectedRun = minusAnchorFee(giveAnchor, anchorPerStable);
  const actualRun = await E(run.issuer).getAmountOf(runPayout);
  t.deepEqual(actualRun, expectedRun);
  const liq = await E(publicFacet).getPoolBalance();
  t.true(AmountMath.isEqual(liq, giveAnchor));
  const giveRun = AmountMath.make(run.brand, 100n * 1_000_000n);
  trace('get stable ratio', { giveRun, expectedRun, actualRun, liq });
  const [runPayment, _moreRun] = await E(run.issuer).split(runPayout, giveRun);
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
  const liq2 = await E(publicFacet).getPoolBalance();
  t.deepEqual(AmountMath.subtract(giveAnchor, expectedAnchor), liq2);
  trace('get anchor', { runGive: giveRun, expectedRun, actualAnchor, liq2 });
});

// NB: most 'storage keys' tests integrate bootstrap config, but this uses startInstance directly
// because there are as yet no startPSM tests.
test('storage keys', async t => {
  const {
    zoe,
    privateArgs,
    terms,
    installs: { psmInstall },
    anchorKit: { issuer: anchorIssuer },
  } = t.context;
  /** @type {Awaited<ReturnType<typeof import('../../src/psm/psm.js').start>>} */
  const { publicFacet } = await E(zoe).startInstance(
    psmInstall,
    harden({ AUSD: anchorIssuer }),
    terms,
    privateArgs,
  );

  t.is(
    // @ts-expect-error problem with E() and GovernedPublicFacet<>
    await subscriptionKey(E(publicFacet).getSubscription()),
    'mockChainStorageRoot.psm.governance',
  );
});
