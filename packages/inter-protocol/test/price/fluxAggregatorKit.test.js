import { test as unknownTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AssetKind, makeIssuerKit } from '@agoric/ertp';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/far';

import { makeMockChainStorageRoot } from '@agoric/internal/src/storage-test-utils.js';
import { subscribeEach } from '@agoric/notifier';
import {
  eventLoopIteration,
  makeFakeMarshaller,
} from '@agoric/notifier/tools/testSupports.js';
import { makeScalarBigMapStore } from '@agoric/vat-data';
import { setupZCFTest } from '@agoric/zoe/test/unitTests/zcf/setupZcfTest.js';
import { buildZoeManualTimer } from '@agoric/zoe/tools/manualTimer.js';
import { TimeMath } from '@agoric/time';
import { prepareRecorderKitMakers } from '@agoric/zoe/src/contractSupport/recorder.js';
import { documentStorageSchema } from '@agoric/governance/tools/storageDoc.js';
import { prepareFluxAggregatorKit } from '../../src/price/fluxAggregatorKit.js';
import { topicPath } from '../supports.js';

/** @type {import('ava').TestFn<Awaited<ReturnType<typeof makeContext>>>} */
const test = unknownTest;

const defaultConfig = {
  maxSubmissionCount: 1000,
  minSubmissionCount: 2,
  restartDelay: 5,
  timeout: 10,
  minSubmissionValue: 100,
  maxSubmissionValue: 10000,
};

const makeContext = async () => {
  const link = makeIssuerKit('$LINK', AssetKind.NAT);
  const usd = makeIssuerKit('$USD', AssetKind.NAT);

  async function makeTestFluxAggregator(config) {
    const terms = { ...config, brandIn: link.brand, brandOut: usd.brand };
    const zcfTestKit = await setupZCFTest(undefined, terms);

    // ??? why do we need the Far here and not in VaultFactory tests?
    const marshaller = Far('fake marshaller', { ...makeFakeMarshaller() });
    const mockStorageRoot = makeMockChainStorageRoot();
    const storageNode = E(mockStorageRoot).makeChildNode('priceAggregator');

    const manualTimer = buildZoeManualTimer(() => {});
    const timerBrand = manualTimer.getTimerBrand();
    const toTS = val => TimeMath.coerceTimestampRecord(val, timerBrand);

    const baggage = makeScalarBigMapStore('test baggage');
    const quoteIssuerKit = makeIssuerKit('quote', AssetKind.SET);

    const { makeDurablePublishKit, makeRecorder } = prepareRecorderKitMakers(
      baggage,
      marshaller,
    );

    const makeFluxAggregator = await prepareFluxAggregatorKit(
      baggage,
      zcfTestKit.zcf,
      manualTimer,
      { ...quoteIssuerKit, displayInfo: { assetKind: 'set' } },
      await E(storageNode).makeChildNode('LINK-USD_price_feed'),
      makeDurablePublishKit,
      makeRecorder,
    );

    const aggregator = makeFluxAggregator();

    return { ...aggregator, manualTimer, mockStorageRoot, toTS };
  }

  return { makeTestFluxAggregator };
};

test.before('setup aggregator and oracles', async t => {
  t.context = await makeContext();
});

test('basic, with snapshot', async t => {
  const aggregator = await t.context.makeTestFluxAggregator(defaultConfig);
  const oracleTimer = aggregator.manualTimer;

  const { oracle: oracleA } = await E(aggregator.creator).initOracle(
    'agorice1priceOracleA',
  );
  const { oracle: oracleB } = await E(aggregator.creator).initOracle(
    'agorice1priceOracleB',
  );
  const { oracle: oracleC } = await E(aggregator.creator).initOracle(
    'agorice1priceOracleC',
  );

  t.log('----- round 1: basic consensus');
  await oracleTimer.tick();
  await E(oracleA).pushPrice({ roundId: 1, unitPrice: 100n });
  await E(oracleB).pushPrice({ roundId: 1, unitPrice: 200n });
  await E(oracleC).pushPrice({ roundId: 1, unitPrice: 300n });
  await oracleTimer.tick();

  const round1Attempt1 = await E(aggregator.creator).getRoundData(1);
  t.is(round1Attempt1.roundId, 1n);
  t.is(round1Attempt1.answer, 200n);

  t.log('----- round 2: check restartDelay implementation');
  // since oracle A initialized the last round, it CANNOT start another round before
  // the restartDelay, which means its submission will be IGNORED. this means the median
  // should ONLY be between the OracleB and C values, which is why it is 25000
  await oracleTimer.tick();
  await t.throwsAsync(E(oracleA).pushPrice({ roundId: 2, unitPrice: 1000n }), {
    message:
      'round 2 not accepting submissions from oracle "agorice1priceOracleA"',
  });
  await E(oracleB).pushPrice({ roundId: 2, unitPrice: 2000n });
  await E(oracleC).pushPrice({ roundId: 2, unitPrice: 3000n });
  await oracleTimer.tick();

  const round1Attempt2 = await E(aggregator.creator).getRoundData(1);
  t.is(round1Attempt2.answer, 200n);
  const round2Attempt1 = await E(aggregator.creator).getRoundData(2);
  t.is(round2Attempt1.answer, 2500n);

  t.log('----- round 3: check oracle submission order');
  // unlike the previous test, if C initializes, all submissions should be recorded,
  // which means the median will be the expected 5000 here
  await oracleTimer.tick();
  await E(oracleC).pushPrice({ roundId: 3, unitPrice: 5000n });
  await E(oracleA).pushPrice({ roundId: 3, unitPrice: 4000n });
  await E(oracleB).pushPrice({ roundId: 3, unitPrice: 6000n });
  await oracleTimer.tick();

  const round1Attempt3 = await E(aggregator.creator).getRoundData(1);
  t.is(round1Attempt3.answer, 200n);
  const round3Attempt1 = await E(aggregator.creator).getRoundData(3);
  t.is(round3Attempt1.answer, 5000n);

  const doc = {
    node: 'priceAggregator',
    owner: 'a tree of price aggregator contract instances',
  };
  await documentStorageSchema(t, aggregator.mockStorageRoot, doc);
});

test('timeout', async t => {
  const aggregator = await t.context.makeTestFluxAggregator({
    ...defaultConfig,
    restartDelay: 2,
    timeout: 5,
  });
  const oracleTimer = aggregator.manualTimer;

  const { oracle: oracleA } = await E(aggregator.creator).initOracle(
    'agorice1priceOracleA',
  );
  const { oracle: oracleB } = await E(aggregator.creator).initOracle(
    'agorice1priceOracleB',
  );
  const { oracle: oracleC } = await E(aggregator.creator).initOracle(
    'agorice1priceOracleC',
  );

  // ----- round 1: basic consensus w/ ticking: should work EXACTLY the same
  await oracleTimer.tick();
  await E(oracleA).pushPrice({ roundId: 1, unitPrice: 100n });
  await oracleTimer.tick();
  await E(oracleB).pushPrice({ roundId: 1, unitPrice: 200n });
  await oracleTimer.tick();
  await E(oracleC).pushPrice({ roundId: 1, unitPrice: 300n });

  const round1Attempt1 = await E(aggregator.creator).getRoundData(1);
  t.is(round1Attempt1.roundId, 1n);
  t.is(round1Attempt1.answer, 200n);

  // ----- round 2: check restartDelay implementation
  // timeout behavior is, if more ticks pass than the timeout param (5 here), the round is
  // considered "timedOut," at which point, the values are simply copied from the previous round
  await oracleTimer.tick();
  await E(oracleB).pushPrice({ roundId: 2, unitPrice: 2000n });
  await oracleTimer.tick();
  await oracleTimer.tick();
  await oracleTimer.tick();
  await oracleTimer.tick();
  await oracleTimer.tick();
  await oracleTimer.tick(); // --- should time out here
  await E(oracleC).pushPrice({ roundId: 3, unitPrice: 1000n });
  await E(oracleA).pushPrice({ roundId: 3, unitPrice: 3000n });

  const round1Attempt2 = await E(aggregator.creator).getRoundData(1);
  t.is(round1Attempt2.answer, 200n);
  const round2Attempt1 = await E(aggregator.creator).getRoundData(2);
  t.is(round2Attempt1.answer, 200n);
  const round3Attempt1 = await E(aggregator.creator).getRoundData(3);
  t.is(round3Attempt1.answer, 2000n);
});

test('issue check', async t => {
  const aggregator = await t.context.makeTestFluxAggregator({
    ...defaultConfig,
    restartDelay: 2,
  });
  const oracleTimer = aggregator.manualTimer;

  const { oracle: oracleA } = await E(aggregator.creator).initOracle(
    'agorice1priceOracleA',
  );
  const { oracle: oracleB } = await E(aggregator.creator).initOracle(
    'agorice1priceOracleB',
  );
  const { oracle: oracleC } = await E(aggregator.creator).initOracle(
    'agorice1priceOracleC',
  );

  // ----- round 1: ignore too low values
  await oracleTimer.tick();
  await t.throwsAsync(E(oracleA).pushPrice({ roundId: 1, unitPrice: 50n }), {
    message: 'value below minSubmissionValue 100',
  });
  await oracleTimer.tick();
  await E(oracleB).pushPrice({ roundId: 1, unitPrice: 200n });
  await oracleTimer.tick();
  await E(oracleC).pushPrice({ roundId: 1, unitPrice: 300n });

  const round1Attempt1 = await E(aggregator.creator).getRoundData(1);
  t.is(round1Attempt1.answer, 250n);

  // ----- round 2: ignore too high values
  await oracleTimer.tick();
  await t.throwsAsync(E(oracleB).pushPrice({ roundId: 2, unitPrice: 20000n }), {
    message: 'value above maxSubmissionValue 10000',
  });
  await E(oracleC).pushPrice({ roundId: 2, unitPrice: 1000n });
  await E(oracleA).pushPrice({ roundId: 2, unitPrice: 3000n });
  await oracleTimer.tick();

  const round2Attempt1 = await E(aggregator.creator).getRoundData(2);
  t.is(round2Attempt1.answer, 2000n);
});

test('supersede', async t => {
  const aggregator = await t.context.makeTestFluxAggregator({
    ...defaultConfig,
    restartDelay: 1,
  });
  const oracleTimer = aggregator.manualTimer;

  const { oracle: oracleA } = await E(aggregator.creator).initOracle(
    'agorice1priceOracleA',
  );
  const { oracle: oracleB } = await E(aggregator.creator).initOracle(
    'agorice1priceOracleB',
  );
  const { oracle: oracleC } = await E(aggregator.creator).initOracle(
    'agorice1priceOracleC',
  );

  // ----- round 1: round 1 is NOT supersedable when 3 submits, meaning it will be ignored
  await oracleTimer.tick();
  await E(oracleA).pushPrice({ roundId: 1, unitPrice: 100n });
  await t.throwsAsync(E(oracleC).pushPrice({ roundId: 2, unitPrice: 300n }), {
    message: 'previous round not supersedable',
  });
  await E(oracleB).pushPrice({ roundId: 1, unitPrice: 200n });
  await oracleTimer.tick();

  const round1Attempt1 = await E(aggregator.creator).getRoundData(1);
  t.is(round1Attempt1.answer, 150n);

  // ----- round 2: oracle C's value from before should have been IGNORED
  await oracleTimer.tick();
  await E(oracleB).pushPrice({ roundId: 2, unitPrice: 2000n });
  await E(oracleA).pushPrice({ roundId: 2, unitPrice: 1000n });
  await oracleTimer.tick();

  const round2Attempt1 = await E(aggregator.creator).getRoundData(2);
  t.is(round2Attempt1.answer, 1500n);

  // ----- round 3: oracle C should NOT be able to supersede round 3
  await oracleTimer.tick();
  await t.throwsAsync(E(oracleC).pushPrice({ roundId: 4, unitPrice: 1000n }), {
    message: 'invalid round to report',
  });

  try {
    await E(aggregator.creator).getRoundData(4);
  } catch (error) {
    t.is(error.message, 'No data present');
  }
});

test('interleaved', async t => {
  const aggregator = await t.context.makeTestFluxAggregator({
    ...defaultConfig,
    maxSubmissionCount: 3,
    minSubmissionCount: 3, // requires ALL the oracles for consensus in this case
    restartDelay: 1,
    timeout: 5,
  });
  const oracleTimer = aggregator.manualTimer;

  const { oracle: oracleA } = await E(aggregator.creator).initOracle(
    'agorice1priceOracleA',
  );
  const { oracle: oracleB } = await E(aggregator.creator).initOracle(
    'agorice1priceOracleB',
  );
  const { oracle: oracleC } = await E(aggregator.creator).initOracle(
    'agorice1priceOracleC',
  );

  // ----- round 1: we now need unanimous submission for a round for it to have consensus
  await oracleTimer.tick();
  await E(oracleA).pushPrice({ roundId: 1, unitPrice: 100n });
  await t.throwsAsync(E(oracleC).pushPrice({ roundId: 2, unitPrice: 300n }), {
    message: 'previous round not supersedable',
  });
  await E(oracleB).pushPrice({ roundId: 1, unitPrice: 200n });
  await oracleTimer.tick();

  try {
    await E(aggregator.creator).getRoundData(1);
  } catch (error) {
    t.is(error.message, 'No data present');
  }

  // ----- round 2: interleaved round submission -- just making sure this works
  await oracleTimer.tick();
  await E(oracleC).pushPrice({ roundId: 1, unitPrice: 300n });
  await oracleTimer.tick();
  await E(oracleB).pushPrice({ roundId: 2, unitPrice: 2000n });
  await E(oracleA).pushPrice({ roundId: 2, unitPrice: 1000n });
  await oracleTimer.tick();
  await t.throwsAsync(E(oracleC).pushPrice({ roundId: 3, unitPrice: 9000n }), {
    message: 'previous round not supersedable',
  });
  await oracleTimer.tick();
  await E(oracleC).pushPrice({ roundId: 2, unitPrice: 3000n }); // assumes oracle C is going for a resubmission
  await oracleTimer.tick();
  await oracleTimer.tick();
  await E(oracleA).pushPrice({ roundId: 3, unitPrice: 5000n });
  await oracleTimer.tick();

  const round1Attempt2 = await E(aggregator.creator).getRoundData(1);
  const round2Attempt1 = await E(aggregator.creator).getRoundData(2);

  t.is(round1Attempt2.answer, 200n);
  t.is(round2Attempt1.answer, 2000n);

  try {
    await E(aggregator.creator).getRoundData(3);
  } catch (error) {
    t.is(error.message, 'No data present');
  }

  // ----- round 3/4: complicated supersedable case
  await oracleTimer.tick();
  await oracleTimer.tick();
  await oracleTimer.tick();
  await oracleTimer.tick();
  await oracleTimer.tick();
  await oracleTimer.tick();
  // round 3 is NOT yet supersedeable (since no value present and not yet timed out), so these should fail
  await t.throwsAsync(E(oracleA).pushPrice({ roundId: 4, unitPrice: 4000n }), {
    message:
      'round 4 not accepting submissions from oracle "agorice1priceOracleA"',
  });
  await E(oracleB).pushPrice({ roundId: 4, unitPrice: 5000n });
  await E(oracleC).pushPrice({ roundId: 4, unitPrice: 6000n });
  await oracleTimer.tick(); // --- round 3 has NOW timed out, meaning it is now supersedable

  try {
    await E(aggregator.creator).getRoundData(3);
  } catch (error) {
    t.is(error.message, 'No data present');
  }

  try {
    await E(aggregator.creator).getRoundData(4);
  } catch (error) {
    t.is(error.message, 'No data present');
  }

  // so NOW we should be able to submit round 4, and round 3 should just be copied from round 2
  await E(oracleA).pushPrice({ roundId: 4, unitPrice: 4000n });
  await t.throwsAsync(E(oracleB).pushPrice({ roundId: 4, unitPrice: 5000n }), {
    message: /cannot report on previous rounds/,
  });
  await t.throwsAsync(E(oracleC).pushPrice({ roundId: 4, unitPrice: 6000n }), {
    message: /cannot report on previous rounds/,
  });
  await oracleTimer.tick();

  const round3Attempt3 = await E(aggregator.creator).getRoundData(3);
  const round4Attempt2 = await E(aggregator.creator).getRoundData(4);

  t.is(round3Attempt3.answer, 2000n);
  t.is(round4Attempt2.answer, 5000n);

  // ----- round 5: ping-ponging should be possible (although this is an unlikely pernicious case)
  await E(oracleC).pushPrice({ roundId: 5, unitPrice: 1000n });
  await oracleTimer.tick();
  await oracleTimer.tick();
  await oracleTimer.tick();
  await oracleTimer.tick();
  await oracleTimer.tick();
  await oracleTimer.tick();
  await oracleTimer.tick();
  await E(oracleA).pushPrice({ roundId: 6, unitPrice: 1000n });
  await oracleTimer.tick();
  await oracleTimer.tick();
  await oracleTimer.tick();
  await oracleTimer.tick();
  await oracleTimer.tick();
  await oracleTimer.tick();
  await E(oracleC).pushPrice({ roundId: 7, unitPrice: 1000n });

  const round5Attempt1 = await E(aggregator.creator).getRoundData(5);
  const round6Attempt1 = await E(aggregator.creator).getRoundData(6);

  t.is(round5Attempt1.answer, 5000n);
  t.is(round6Attempt1.answer, 5000n);
});

test('larger', async t => {
  const aggregator = await t.context.makeTestFluxAggregator({
    ...defaultConfig,
    minSubmissionCount: 3,
    restartDelay: 1,
    timeout: 5,
  });
  const oracleTimer = aggregator.manualTimer;

  const { oracle: oracleA } = await E(aggregator.creator).initOracle(
    'agorice1priceOracleA',
  );
  const { oracle: oracleB } = await E(aggregator.creator).initOracle(
    'agorice1priceOracleB',
  );
  const { oracle: oracleC } = await E(aggregator.creator).initOracle(
    'agorice1priceOracleC',
  );
  const { oracle: oracleD } = await E(aggregator.creator).initOracle(
    'agorice1priceOracleD',
  );
  const { oracle: oracleE } = await E(aggregator.creator).initOracle(
    'agorice1priceOracleE',
  );

  // ----- round 1: usual case
  await oracleTimer.tick();
  await E(oracleA).pushPrice({ roundId: 1, unitPrice: 100n });
  await E(oracleB).pushPrice({ roundId: 1, unitPrice: 200n });
  await oracleTimer.tick();
  await oracleTimer.tick();
  await t.throwsAsync(E(oracleC).pushPrice({ roundId: 2, unitPrice: 1000n }), {
    message: 'previous round not supersedable',
  });
  await oracleTimer.tick();
  await t.throwsAsync(E(oracleD).pushPrice({ roundId: 3, unitPrice: 3000n }), {
    message: 'invalid round to report',
  });
  await oracleTimer.tick();
  await oracleTimer.tick();
  await oracleTimer.tick();
  await E(oracleE).pushPrice({ roundId: 1, unitPrice: 300n });

  const round1Attempt1 = await E(aggregator.creator).getRoundData(1);
  t.is(round1Attempt1.answer, 200n);

  // ----- round 2: ignore late arrival
  await oracleTimer.tick();
  await E(oracleB).pushPrice({ roundId: 2, unitPrice: 600n });
  await oracleTimer.tick();
  await E(oracleA).pushPrice({ roundId: 2, unitPrice: 500n });
  await oracleTimer.tick();
  await t.throwsAsync(E(oracleC).pushPrice({ roundId: 3, unitPrice: 1000n }), {
    message: 'previous round not supersedable',
  });
  await oracleTimer.tick();
  await E(oracleD).pushPrice({ roundId: 1, unitPrice: 500n });
  await oracleTimer.tick();
  await oracleTimer.tick();
  await oracleTimer.tick();
  await E(oracleC).pushPrice({ roundId: 2, unitPrice: 1000n });
  await oracleTimer.tick();
  await t.throwsAsync(
    E(oracleC).pushPrice({ roundId: 1, unitPrice: 700n }),
    // oracle C has already sent round 2
    { message: 'cannot report on previous rounds' },
  );

  const round1Attempt2 = await E(aggregator.creator).getRoundData(1);
  const round2Attempt1 = await E(aggregator.creator).getRoundData(2);
  t.is(round1Attempt2.answer, 250n);
  t.is(round2Attempt1.answer, 600n);
});

test('suggest', async t => {
  const aggregator = await t.context.makeTestFluxAggregator({
    ...defaultConfig,
    minSubmissionCount: 3,
    restartDelay: 1,
    timeout: 5,
  });
  const oracleTimer = aggregator.manualTimer;
  const { toTS } = aggregator;

  const { oracle: oracleA } = await E(aggregator.creator).initOracle(
    'agorice1priceOracleA',
  );
  const { oracle: oracleB } = await E(aggregator.creator).initOracle(
    'agorice1priceOracleB',
  );
  const { oracle: oracleC } = await E(aggregator.creator).initOracle(
    'agorice1priceOracleC',
  );

  // ----- round 1: basic consensus
  await oracleTimer.tick();
  await E(oracleA).pushPrice({ roundId: 1, unitPrice: 100n });
  await E(oracleB).pushPrice({ roundId: 1, unitPrice: 200n });
  await E(oracleC).pushPrice({ roundId: 1, unitPrice: 300n });
  await oracleTimer.tick();

  const round1Attempt1 = await E(aggregator.creator).getRoundData(1);
  t.is(round1Attempt1.roundId, 1n);
  t.is(round1Attempt1.answer, 200n);

  // ----- round 2: add a new oracle and confirm the suggested round is correct
  await oracleTimer.tick();
  await E(oracleB).pushPrice({ roundId: 2, unitPrice: 1000n });

  t.deepEqual(
    await E(aggregator.creator).oracleRoundState('agorice1priceOracleC', 1n),
    {
      eligibleForSpecificRound: false,
      oracleCount: 3,
      latestSubmission: 300n,
      queriedRoundId: 1n,
      roundTimeout: 5,
      startedAt: toTS(1n),
    },
  );

  t.deepEqual(
    await E(aggregator.creator).oracleRoundState('agorice1priceOracleB', 0n),
    {
      eligibleForSpecificRound: false,
      oracleCount: 3,
      latestSubmission: 1000n,
      queriedRoundId: 2n,
      roundTimeout: 5,
      startedAt: toTS(3n),
    },
  );

  await oracleTimer.tick();
  await E(oracleA).pushPrice({ roundId: 2, unitPrice: 2000n });
  await oracleTimer.tick();
  await oracleTimer.tick();
  await E(oracleC).pushPrice({ roundId: 2, unitPrice: 3000n });

  t.deepEqual(
    await E(aggregator.creator).oracleRoundState('agorice1priceOracleA', 0n),
    {
      eligibleForSpecificRound: true,
      oracleCount: 3,
      latestSubmission: 2000n,
      queriedRoundId: 3n,
      roundTimeout: 0,
      // note: 'startedAt' is still a Timestamp (not a
      // TimestampRecord), so it is allowed to be a plain bigint, and
      // the not-yet-started sentinel value is 0n, so no toTS(0n) here
      startedAt: 0n, // round 3 hasn't yet started, so it should be zeroed
    },
  );

  // ----- round 3: try using suggested round
  await E(oracleC).pushPrice({ roundId: 3, unitPrice: 100n });
  await oracleTimer.tick();
  await E(oracleA).pushPrice({ roundId: undefined, unitPrice: 200n });
  await oracleTimer.tick();
  await oracleTimer.tick();
  await E(oracleB).pushPrice({ roundId: undefined, unitPrice: 300n });

  const round3Attempt1 = await E(aggregator.creator).getRoundData(3);
  t.is(round3Attempt1.roundId, 3n);
  t.is(round3Attempt1.answer, 200n);
});

test('notifications', async t => {
  const aggregator = await t.context.makeTestFluxAggregator({
    ...defaultConfig,
    maxSubmissionCount: 1000,
    restartDelay: 1, // have to alternate to start rounds
  });
  const oracleTimer = aggregator.manualTimer;
  const { toTS } = aggregator;
  // mockStorage doesn't preserve identity of the timerBrand, so build
  // an equivalent shape for the t.deepEqual comparison
  const mockBrand = Far('timerBrand');
  const toMockTS = val => ({ absValue: val, timerBrand: mockBrand });

  const { oracle: oracleA } = await E(aggregator.creator).initOracle(
    'agorice1priceOracleA',
  );
  const { oracle: oracleB } = await E(aggregator.creator).initOracle(
    'agorice1priceOracleB',
  );

  const publicTopics = await E(aggregator.public).getPublicTopics();
  const eachLatestRound = subscribeEach(publicTopics.latestRound.subscriber)[
    Symbol.asyncIterator
  ]();

  await oracleTimer.tick();
  await E(oracleA).pushPrice({ roundId: 1, unitPrice: 100n });
  t.deepEqual((await eachLatestRound.next()).value, {
    roundId: 1n,
    startedAt: toTS(1n),
    startedBy: 'agorice1priceOracleA',
  });
  await E(oracleB).pushPrice({ roundId: 1, unitPrice: 200n });

  await eventLoopIteration();
  t.deepEqual(
    aggregator.mockStorageRoot.getBody(
      'mockChainStorageRoot.priceAggregator.LINK-USD_price_feed',
    ),
    {
      amountIn: { brand: Far('$LINK brand'), value: 1n },
      amountOut: {
        brand: Far('$USD brand'),
        value: 150n, // AVG(100, 200)
      },
      timer: Far('ManualTimer'),
      timestamp: toMockTS(1n),
    },
  );

  await t.throwsAsync(E(oracleA).pushPrice({ roundId: 2, unitPrice: 1000n }), {
    message:
      'round 2 not accepting submissions from oracle "agorice1priceOracleA"',
  });
  // A started last round so fails to start next round
  t.deepEqual(
    // subscribe fresh because the iterator won't advance yet
    (await publicTopics.latestRound.subscriber.subscribeAfter()).head.value,
    {
      roundId: 1n,
      startedAt: toTS(1n),
      startedBy: 'agorice1priceOracleA',
    },
  );
  // B gets to start it
  await E(oracleB).pushPrice({ roundId: 2, unitPrice: 1000n });
  t.deepEqual((await eachLatestRound.next()).value, {
    roundId: 2n,
    startedAt: toTS(1n),
    startedBy: 'agorice1priceOracleB',
  });
  // A joins in
  await E(oracleA).pushPrice({ roundId: 2, unitPrice: 1000n });
  // writes to storage
  t.deepEqual(
    aggregator.mockStorageRoot.getBody(
      'mockChainStorageRoot.priceAggregator.LINK-USD_price_feed.latestRound',
    ),
    { roundId: 2n, startedAt: toMockTS(1n), startedBy: 'agorice1priceOracleB' },
  );

  await eventLoopIteration();
  t.deepEqual(
    aggregator.mockStorageRoot.getBody(
      'mockChainStorageRoot.priceAggregator.LINK-USD_price_feed',
    ),
    {
      amountIn: { brand: Far('$LINK brand'), value: 1n },
      amountOut: {
        brand: Far('$USD brand'),
        value: 1000n, // AVG(1000, 1000)
      },
      timer: Far('ManualTimer'),
      timestamp: toMockTS(1n),
    },
  );

  // A can start again
  await E(oracleA).pushPrice({ roundId: 3, unitPrice: 1000n });
  t.deepEqual((await eachLatestRound.next()).value, {
    roundId: 3n,
    startedAt: toTS(1n),
    startedBy: 'agorice1priceOracleA',
  });
  // no new price yet publishable
});

test('storage keys', async t => {
  const { public: publicFacet } =
    await t.context.makeTestFluxAggregator(defaultConfig);

  t.is(
    await topicPath(publicFacet, 'quotes'),
    'mockChainStorageRoot.priceAggregator.LINK-USD_price_feed',
  );
});

test('disabling', async t => {
  const { creator, manualTimer } =
    await t.context.makeTestFluxAggregator(defaultConfig);

  const kitA = await creator.initOracle('agoric1priceOracleA');
  const kitB = await creator.initOracle('agoric1priceOracleB');
  const kitC = await creator.initOracle('agoric1priceOracleC');

  // ----- pushes drive a price
  await manualTimer.tick();
  await E(kitA.oracle).pushPrice({ roundId: 1, unitPrice: 100n });
  await E(kitB.oracle).pushPrice({ roundId: 1, unitPrice: 200n });
  await E(kitC.oracle).pushPrice({ roundId: 1, unitPrice: 300n });
  await manualTimer.tick();

  t.like(await E(creator).getRoundData(1), {
    roundId: 1n,
    // median of three
    answer: 200n,
  });

  // now disable kitA
  await E(kitA.admin).disable();
  await t.throwsAsync(
    E(kitA.oracle).pushPrice({ roundId: 2, unitPrice: 100n }),
    {
      message: 'pushPrice for disabled oracle',
    },
  );

  // ----- other pushes still drive a price
  await manualTimer.tick();
  await E(kitB.oracle).pushPrice({ roundId: 2, unitPrice: 200n });
  await E(kitC.oracle).pushPrice({ roundId: 2, unitPrice: 300n });
  await manualTimer.tick();
  t.like(await E(creator).getRoundData(2), {
    roundId: 2n,
    // median of two is their average
    answer: 250n,
  });
});
