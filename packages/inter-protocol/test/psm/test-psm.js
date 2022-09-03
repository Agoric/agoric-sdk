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
import centralSupplyBundle from '@agoric/vats/bundles/bundle-centralSupply.js';
import { E } from '@endo/eventual-send';
import { NonNullish } from '@agoric/assert';
import path from 'path';
import { eventLoopIteration } from '@agoric/zoe/tools/eventLoopIteration.js';
import { makeTracer } from '../../src/makeTracer.js';
import {
  makeMockChainStorageRoot,
  mintRunPayment,
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
  /** @type {Brand<'nat'>} */
  const stableBrand = await E(stableIssuer).getBrand();
  const anchor = withAmountUtils(makeIssuerKit('aUSD'));

  const committeeInstall = await E(zoe).install(committeeBundle);
  const psmInstall = await E(zoe).install(psmBundle);
  const centralSupply = await E(zoe).install(centralSupplyBundle);

  const mintLimit = AmountMath.make(anchor.brand, MINT_LIMIT);

  const marshaller = makeBoard().getReadonlyMarshaller();

  const { creatorFacet: committeeCreator } = await E(zoe).startInstance(
    committeeInstall,
    harden({}),
    {
      committeeName: 'Demos',
      committeeSize: 1,
    },
    {
      storageNode: makeMockChainStorageRoot().makeChildNode('thisCommittee'),
      marshaller,
    },
  );

  const initialPoserInvitation = await E(committeeCreator).getPoserInvitation();
  const invitationAmount = await E(E(zoe).getInvitationIssuer()).getAmountOf(
    initialPoserInvitation,
  );

  return {
    bundles: { psmBundle },
    zoe: await zoe,
    feeMintAccess: await feeMintAccess,
    initialPoserInvitation,
    stable: { issuer: stableIssuer, brand: stableBrand },
    anchor,
    installs: { committeeInstall, psmInstall, centralSupply },
    mintLimit,
    marshaller,
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
    feeMintAccess,
    initialPoserInvitation,
    terms,
    installs: { psmInstall },
    anchor,
  } = t.context;

  // Each driver needs its own to avoid state pollution between tests
  const mockChainStorage = makeMockChainStorageRoot();

  /** @type {Awaited<ReturnType<import('../../src/psm/psm.js').start>>} */
  const { creatorFacet, publicFacet } = await E(zoe).startInstance(
    psmInstall,
    harden({ AUSD: anchor.issuer }),
    { ...terms, ...customTerms },
    harden({
      feeMintAccess,
      initialPoserInvitation,
      storageNode: mockChainStorage.makeChildNode('thisPsm'),
      marshaller: makeBoard().getReadonlyMarshaller(),
    }),
  );

  /**
   * @param {Amount<'nat'>} giveAnchor
   * @param {Amount<'nat'>} [wantStable]
   */
  const swapAnchorForStableSeat = async (giveAnchor, wantStable) => {
    const seat = E(zoe).offer(
      E(publicFacet).makeWantStableInvitation(),
      harden({
        give: { In: giveAnchor },
        ...(wantStable ? { want: { Out: wantStable } } : {}),
      }),
      // @ts-expect-error known defined
      harden({ In: anchor.mint.mintPayment(giveAnchor) }),
    );
    await eventLoopIteration();
    return seat;
  };

  /**
   * @param {Amount<'nat'>} giveRun
   * @param {Payment<'nat'>} runPayment
   * @param {Amount<'nat'>} [wantAnchor]
   */
  const swapStableForAnchorSeat = async (giveRun, runPayment, wantAnchor) => {
    const seat = E(zoe).offer(
      E(publicFacet).makeGiveStableInvitation(),
      harden({
        give: { In: giveRun },
        ...(wantAnchor ? { want: { Out: wantAnchor } } : {}),
      }),
      harden({ In: runPayment }),
    );
    await eventLoopIteration();
    return seat;
  };

  return {
    mockChainStorage,
    publicFacet,

    /** @param {Amount<'nat'>} expected */
    async assertPoolBalance(expected) {
      const balance = await E(publicFacet).getPoolBalance();
      t.deepEqual(balance, expected);
    },

    /** @type {(subpath: string) => object} */
    getStorageChildBody(subpath) {
      return mockChainStorage.getBody(
        `mockChainStorageRoot.thisPsm.${subpath}`,
      );
    },

    async getFeePayout() {
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

    /**
     * @param {Amount<'nat'>} giveAnchor
     * @param {Amount<'nat'>} [wantStable]
     */
    async swapAnchorForStable(giveAnchor, wantStable) {
      const seat = swapAnchorForStableSeat(giveAnchor, wantStable);
      return E(seat).getPayouts();
    },
    swapAnchorForStableSeat,

    /**
     * @param {Amount<'nat'>} giveRun
     * @param {Payment<'nat'>} runPayment
     * @param {Amount<'nat'>} [wantAnchor]
     */
    async swapStableForAnchor(giveRun, runPayment, wantAnchor) {
      const seat = swapStableForAnchorSeat(giveRun, runPayment, wantAnchor);
      return E(seat).getPayouts();
    },
    swapStableForAnchorSeat,
  };
}

test('simple trades', async t => {
  const { terms, stable, anchor } = t.context;
  const driver = await makePsmDriver(t);

  const giveAnchor = AmountMath.make(anchor.brand, 200n * 1_000_000n);

  const runPayouts = await driver.swapAnchorForStable(giveAnchor);
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
  const anchorPayouts = await driver.swapStableForAnchor(giveRun, runPayment);
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
  await driver.swapAnchorForStable(initialPool);
  await driver.assertPoolBalance(initialPool);

  trace('test going over limit');
  const give = mintLimit;
  const paymentPs = await driver.swapAnchorForStable(give);
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

/** @type {[kind: 'want' | 'give', give: number, want: number, ok: boolean, wants?: number][]} */
const trades = [
  ['give', 200, 190, false],
  ['want', 101, 100, true, 1],
  ['give', 50, 50, false],
  ['give', 51, 50, true, 1],
];

test('mix of trades: failures do not prevent later service', async t => {
  const {
    terms,
    stable,
    anchor,
    feeMintAccess,
    zoe,
    installs: { centralSupply },
  } = t.context;
  const driver = await makePsmDriver(t);

  const ist100 = await mintRunPayment(500n * 1_000_000n, {
    centralSupply,
    feeMintAccess,
    zoe,
  });

  assert(anchor.issuer);
  const anchorPurse = await E(anchor.issuer).makeEmptyPurse();
  const stablePurse = await E(stable.issuer).makeEmptyPurse();
  await E(stablePurse).deposit(ist100);

  const scale6 = x => BigInt(Math.round(x * 1_000_000));

  const wantStable = async (ix, give, want, ok, wants) => {
    t.log('wantStable', ix, give, want, ok, wants);
    const giveAnchor = AmountMath.make(anchor.brand, scale6(give));
    const wantAmt = AmountMath.make(stable.brand, scale6(want));
    const seat = await driver.swapAnchorForStableSeat(giveAnchor, wantAmt);
    if (!ok) {
      await t.throwsAsync(E(seat).getOfferResult());
      return;
    }
    await E(seat).getOfferResult();
    t.is(await E(seat).numWantsSatisfied(), wants);
    if (wants === 0) {
      return;
    }
    const runPayouts = await E(seat).getPayouts();
    const expectedRun = minusAnchorFee(giveAnchor, terms.anchorPerStable);
    const actualRun = await E(stablePurse).deposit(await runPayouts.Out);
    t.deepEqual(actualRun, expectedRun);
  };

  const giveStable = async (ix, give, want, ok, wants) => {
    t.log('giveStable', ix, give, want, ok, wants);
    const giveRun = AmountMath.make(stable.brand, scale6(give));
    const runPayment = await E(stablePurse).withdraw(giveRun);
    const wantAmt = AmountMath.make(anchor.brand, scale6(want));
    const seat = await driver.swapStableForAnchorSeat(
      giveRun,
      runPayment,
      wantAmt,
    );
    const anchorPayouts = await E(seat).getPayouts();
    if (!ok) {
      await t.throwsAsync(E(seat).getOfferResult());
      return;
    }
    await E(seat).getOfferResult();

    t.is(await E(seat).numWantsSatisfied(), wants);
    if (wants === 0) {
      return;
    }
    const actualAnchor = await E(anchorPurse).deposit(await anchorPayouts.Out);
    const expectedAnchor = AmountMath.make(
      anchor.brand,
      minusStableFee(giveRun).value,
    );
    t.deepEqual(actualAnchor, expectedAnchor);
  };

  let ix = 0;
  for (const [kind, give, want, ok, wants] of trades) {
    switch (kind) {
      case 'give':
        // eslint-disable-next-line no-await-in-loop
        await giveStable(ix, give, want, ok, wants);
        break;
      case 'want':
        // eslint-disable-next-line no-await-in-loop
        await wantStable(ix, give, want, ok, wants);
        break;
      default:
        assert.fail(kind);
    }
    if (kind === 'give') {
      // eslint-disable-next-line no-await-in-loop
    }
    ix += 1;
  }
});

test('anchor is 2x stable', async t => {
  const { stable, anchor } = t.context;
  const anchorPerStable = makeRatio(200n, anchor.brand, 100n, stable.brand);
  const driver = await makePsmDriver(t, { anchorPerStable });

  const giveAnchor = AmountMath.make(anchor.brand, 400n * 1_000_000n);
  const runPayouts = await driver.swapAnchorForStable(giveAnchor);

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
  const anchorPayouts = await driver.swapStableForAnchor(giveRun, runPayment);
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

test('governance', async t => {
  const driver = await makePsmDriver(t);
  t.is(
    await subscriptionKey(E(driver.publicFacet).getSubscription()),
    'mockChainStorageRoot.thisPsm.governance',
  );

  t.like(driver.getStorageChildBody('governance'), {
    current: {
      Electorate: { type: 'invitation' },
      GiveStableFee: { type: 'ratio' },
      MintLimit: { type: 'amount' },
      WantStableFee: { type: 'ratio' },
    },
  });
});

test('metrics', async t => {
  const driver = await makePsmDriver(t);
  t.is(
    await subscriptionKey(E(driver.publicFacet).getMetrics()),
    'mockChainStorageRoot.thisPsm.metrics',
  );

  const { anchor, stable } = t.context;
  // Test keys and brands, then assume they don't change
  t.deepEqual(Object.keys(driver.getStorageChildBody('metrics')), [
    'anchorPoolBalance',
    'feePoolBalance',

    'totalAnchorProvided',
    'totalStableProvided',
  ]);
  t.like(driver.getStorageChildBody('metrics'), {
    anchorPoolBalance: { brand: { iface: 'Alleged: aUSD brand' }, value: 0n },
    feePoolBalance: { brand: { iface: 'Alleged: IST brand' }, value: 0n },
    totalAnchorProvided: {
      brand: { iface: 'Alleged: aUSD brand' },
      value: 0n,
    },
    totalStableProvided: {
      brand: { iface: 'Alleged: IST brand' },
      value: 0n,
    },
  });
  const giveAnchor = anchor.make(200n * 1_000_000n);

  // grow the pool
  const stablePayouts = await driver.swapAnchorForStable(giveAnchor);
  t.like(driver.getStorageChildBody('metrics'), {
    anchorPoolBalance: {
      value: giveAnchor.value,
    },
    feePoolBalance: { value: 20_000n },
    totalAnchorProvided: {
      value: 0n,
    },
    totalStableProvided: {
      value: giveAnchor.value,
    },
  });

  // no change
  await driver.swapAnchorForStable(anchor.make(0n));
  t.like(driver.getStorageChildBody('metrics'), {
    anchorPoolBalance: {
      value: giveAnchor.value,
    },
    feePoolBalance: { value: 20_000n },
    totalAnchorProvided: {
      value: 0n,
    },
    totalStableProvided: {
      value: giveAnchor.value,
    },
  });

  // get anchor
  const giveStable = AmountMath.make(stable.brand, 100n * 1_000_000n);
  const [runPayment, _moreRun] = await E(stable.issuer).split(
    stablePayouts.Out,
    giveStable,
  );
  const fee = 30_000n;
  await driver.swapStableForAnchor(giveStable, runPayment);
  t.like(driver.getStorageChildBody('metrics'), {
    anchorPoolBalance: {
      value: giveStable.value + fee,
    },
    feePoolBalance: { value: 50_000n },
    totalAnchorProvided: {
      value: giveStable.value - fee,
    },
    totalStableProvided: {
      value: giveAnchor.value,
    },
  });
});

test('wrong give giveStableInvitaion', async t => {
  const { zoe, anchor } = t.context;
  const { publicFacet } = await makePsmDriver(t);
  const giveAnchor = AmountMath.make(anchor.brand, 200n * 1_000_000n);
  await t.throwsAsync(
    () =>
      E(zoe).offer(
        E(publicFacet).makeGiveStableInvitation(),
        harden({ give: { In: giveAnchor } }),
        harden({ In: NonNullish(anchor.mint).mintPayment(giveAnchor) }),
      ),
    {
      message:
        'proposal: required-parts: give: In: brand: "[Alleged: aUSD brand]" - Must be: "[Alleged: IST brand]"',
    },
  );
});
