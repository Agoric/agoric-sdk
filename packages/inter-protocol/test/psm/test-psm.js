// @ts-check

import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import '@agoric/zoe/exported.js';
import '../../src/vaultFactory/types.js';

import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { CONTRACT_ELECTORATE, ParamTypes } from '@agoric/governance';
import committeeBundle from '@agoric/governance/bundles/bundle-committee.js';
import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { makeBoard } from '@agoric/vats/src/lib-board.js';
import {
  floorDivideBy,
  floorMultiplyBy,
  makeRatio,
  natSafeMath as NatMath,
} from '@agoric/zoe/src/contractSupport/index.js';
import { E } from '@endo/eventual-send';
import path from 'path';
import { makeTracer } from '../../src/makeTracer.js';
import {
  makeMockChainStorageRoot,
  setUpZoeForTest,
  subscriptionKey,
  withAmountUtils,
} from '../supports.js';

/** @type {import('ava').TestFn<Awaited<ReturnType<makeTestContext>>>} */
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

const makeTestContext = async () => {
  const bundleCache = await unsafeMakeBundleCache('bundles/');
  const psmBundle = await bundleCache.load(psmRoot, 'psm');
  const { zoe, feeMintAccess } = setUpZoeForTest();

  const stableIssuer = await E(zoe).getFeeIssuer();
  const stableBrand = await E(stableIssuer).getBrand();
  const anchor = withAmountUtils(makeIssuerKit('aUSD'));

  const committeeInstall = await E(zoe).install(committeeBundle);
  const psmInstall = await E(zoe).install(psmBundle);
  const mintLimit = AmountMath.make(anchor.brand, MINT_LIMIT);

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

  const mockChainStorage = makeMockChainStorageRoot();

  return {
    bundles: { psmBundle },
    zoe: await zoe,
    mockChainStorage,
    privateArgs: harden({
      feeMintAccess: await feeMintAccess,
      initialPoserInvitation,
      storageNode: mockChainStorage.makeChildNode('psm'),
      marshaller: makeBoard().getReadonlyMarshaller(),
    }),
    stable: { issuer: stableIssuer, brand: stableBrand },
    anchor,
    installs: { committeeInstall, psmInstall },
    mintLimit,
    terms: {
      anchorBrand: anchor.brand,
      anchorPerStable: makeRatio(100n, anchor.brand, 100n, stableBrand),
      governedParams: {
        [CONTRACT_ELECTORATE]: {
          type: ParamTypes.INVITATION,
          value: invitationAmount,
        },
        GiveStableFee: {
          type: ParamTypes.RATIO,
          value: makeRatio(GiveStableFeeBP, stableBrand, BASIS_POINTS),
        },
        MintLimit: { type: ParamTypes.AMOUNT, value: mintLimit },
        WantStableFee: {
          type: ParamTypes.RATIO,
          value: makeRatio(WantStableFeeBP, stableBrand, BASIS_POINTS),
        },
      },
    },
  };
};

test.before(async t => {
  t.context = await makeTestContext();
});

/**
 *
 * @param {import('ava').ExecutionContext<Awaited<ReturnType<makeTestContext>>>} t
 * @param {{}} [customTerms]
 */
async function makePsmDriver(t, customTerms) {
  const {
    zoe,
    privateArgs,
    terms,
    installs: { psmInstall },
    anchor,
  } = t.context;
  /** @type {Awaited<ReturnType<import('../../src/psm/psm.js').start>>} */
  const { creatorFacet, publicFacet } = await E(zoe).startInstance(
    psmInstall,
    harden({ AUSD: anchor.issuer }),
    { ...terms, ...customTerms },
    privateArgs,
  );

  return {
    publicFacet,

    /** @param {Amount<'nat'>} expected */
    async assertPoolBalance(expected) {
      const balance = await E(publicFacet).getPoolBalance();
      t.deepEqual(balance, expected);
    },

    async getFeePayout() {
      // @ts-expect-error XXX governance types
      const limitedCreatorFacet = E(creatorFacet).getLimitedCreatorFacet();
      const collectFeesSeat = await E(zoe).offer(
        E(limitedCreatorFacet).makeCollectFeesInvitation(),
      );
      await E(collectFeesSeat).getOfferResult();
      const feePayoutAmount = await E.get(
        E(collectFeesSeat).getCurrentAllocationJig(),
      ).Fee;
      return feePayoutAmount;
    },

    /** @param {Amount<'nat'>} giveAnchor */
    swapAnchorForRun(giveAnchor) {
      const seat = E(zoe).offer(
        E(publicFacet).makeSwapInvitation(),
        harden({ give: { In: giveAnchor } }),
        // @ts-expect-error known defined
        harden({ In: anchor.mint.mintPayment(giveAnchor) }),
      );
      return E(seat).getPayouts();
    },

    /**
     * @param {Amount<'nat'>} giveRun
     * @param {Payment<'nat'>} runPayment
     */
    swapRunForAnchor(giveRun, runPayment) {
      const seat = E(zoe).offer(
        E(publicFacet).makeSwapInvitation(),
        harden({ give: { In: giveRun } }),
        harden({ In: runPayment }),
      );
      return E(seat).getPayouts();
    },
  };
}

test('simple trades', async t => {
  const { terms, stable, anchor } = t.context;
  const driver = await makePsmDriver(t);

  const giveAnchor = AmountMath.make(anchor.brand, 200n * 1_000_000n);

  const runPayouts = await driver.swapAnchorForRun(giveAnchor);
  const expectedRun = minusAnchorFee(giveAnchor, terms.anchorPerStable);
  const actualRun = await E(stable.issuer).getAmountOf(runPayouts.Out);
  t.deepEqual(actualRun, expectedRun);
  await driver.assertPoolBalance(giveAnchor);

  const giveRun = AmountMath.make(stable.brand, 100n * 1_000_000n);
  trace('get stable', { giveRun, expectedRun, actualRun });
  const [runPayment, _moreRun] = await E(stable.issuer).split(
    runPayouts.Out,
    giveRun,
  );
  const anchorPayouts = await driver.swapRunForAnchor(giveRun, runPayment);
  // @ts-expect-error known non-null
  const actualAnchor = await E(anchor.issuer).getAmountOf(anchorPayouts.Out);
  const expectedAnchor = AmountMath.make(
    anchor.brand,
    minusStableFee(giveRun).value,
  );
  t.deepEqual(actualAnchor, expectedAnchor);
  await driver.assertPoolBalance(
    AmountMath.subtract(giveAnchor, expectedAnchor),
  );
  trace('get anchor', { runGive: giveRun, expectedRun, actualAnchor });

  // Check the fees
  // 1BP per anchor = 30000n plus 3BP per stable = 20000n
  const feePayoutAmount = await driver.getFeePayout();
  const expectedFee = AmountMath.make(stable.brand, 50000n);
  trace('Reward Fee', { feePayoutAmount, expectedFee });
  t.truthy(AmountMath.isEqual(feePayoutAmount, expectedFee));
});

test('limit', async t => {
  const { mintLimit, anchor } = t.context;

  const driver = await makePsmDriver(t);

  const initialPool = AmountMath.make(anchor.brand, 1n);
  await driver.swapAnchorForRun(initialPool);
  await driver.assertPoolBalance(initialPool);

  trace('test going over limit');
  const give = mintLimit;
  const paymentPs = await driver.swapAnchorForRun(give);
  trace('gone over limit');

  // We should get 0 Stable  and all our anchor back
  // TODO should this be expecteed to be an empty Out?
  t.falsy(paymentPs.Out);
  // const actualRun = await E(runIssuer).getAmountOf(runPayout);
  // t.deepEqual(actualRun, AmountMath.makeEmpty(runBrand));
  const anchorReturn = await paymentPs.In;
  // @ts-expect-error known non-null
  const actualAnchor = await E(anchor.issuer).getAmountOf(anchorReturn);
  t.deepEqual(actualAnchor, give);
  // The pool should be unchanged
  driver.assertPoolBalance(initialPool);
  // TODO Offer result should be an error
  // t.throwsAsync(() => await E(seat1).getOfferResult());
});

test('anchor is 2x stable', async t => {
  const { stable, anchor } = t.context;
  const anchorPerStable = makeRatio(200n, anchor.brand, 100n, stable.brand);
  const driver = await makePsmDriver(t, { anchorPerStable });

  const giveAnchor = AmountMath.make(anchor.brand, 400n * 1_000_000n);
  const runPayouts = await driver.swapAnchorForRun(giveAnchor);

  const expectedRun = minusAnchorFee(giveAnchor, anchorPerStable);
  const actualRun = await E(stable.issuer).getAmountOf(runPayouts.Out);
  t.deepEqual(actualRun, expectedRun);

  driver.assertPoolBalance(giveAnchor);

  const giveRun = AmountMath.make(stable.brand, 100n * 1_000_000n);
  trace('get stable ratio', { giveRun, expectedRun, actualRun });
  const [runPayment, _moreRun] = await E(stable.issuer).split(
    runPayouts.Out,
    giveRun,
  );
  const anchorPayouts = await driver.swapRunForAnchor(giveRun, runPayment);
  // @ts-expect-error known non-null
  const actualAnchor = await E(anchor.issuer).getAmountOf(anchorPayouts.Out);
  const expectedAnchor = floorMultiplyBy(
    minusStableFee(giveRun),
    anchorPerStable,
  );
  t.deepEqual(actualAnchor, expectedAnchor);
  driver.assertPoolBalance(AmountMath.subtract(giveAnchor, expectedAnchor));
  trace('get anchor', { runGive: giveRun, expectedRun, actualAnchor });
});

test('psm.governance', async t => {
  const { publicFacet } = await makePsmDriver(t);
  t.is(
    await subscriptionKey(E(publicFacet).getSubscription()),
    'mockChainStorageRoot.psm.governance',
  );

  const { mockChainStorage } = t.context;
  t.like(mockChainStorage.getBody('mockChainStorageRoot.psm.governance'), {
    current: {
      Electorate: { type: 'invitation' },
      GiveStableFee: { type: 'ratio' },
      MintLimit: { type: 'amount' },
      WantStableFee: { type: 'ratio' },
    },
  });
});
});
