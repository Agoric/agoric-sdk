/** @file
 * Adaptation of Chainlink algorithm to the Agoric platform.
 * Modeled on https://github.com/smartcontractkit/chainlink/blob/master/contracts/src/v0.6/FluxAggregator.sol (version?)
 */
import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import {
  makeNotifierKit,
  makeStoredPublishKit,
  observeNotifier,
} from '@agoric/notifier';
import { makeLegacyMap } from '@agoric/store';
import { Nat, isNat } from '@agoric/nat';
import { TimeMath } from '@agoric/swingset-vat/src/vats/timer/timeMath.js';
import { Fail } from '@agoric/assert';
import { assertAllDefined } from '@agoric/internal';
import {
  calculateMedian,
  natSafeMath,
  makeOnewayPriceAuthorityKit,
} from '../contractSupport/index.js';

import '../../tools/types.js';
import { assertParsableNumber } from '../contractSupport/ratio.js';
import {
  INVITATION_MAKERS_DESC,
  priceDescriptionFromQuote,
} from './priceAggregator.js';

export { INVITATION_MAKERS_DESC };

/**
 * @typedef {{ roundId: number | undefined, unitPrice: NatValue }} PriceRound
 */

const { add, subtract, multiply, floorDivide, ceilDivide, isGTE } = natSafeMath;

/**
 * @typedef {object} RoundData
 * @property {bigint} roundId  the round ID for which data was retrieved
 * @property {bigint} answer the answer for the given round
 * @property {Timestamp} startedAt the timestamp when the round was started. This is 0
 * if the round hasn't been started yet.
 * @property {Timestamp} updatedAt the timestamp when the round last was updated (i.e.
 * answer was last computed)
 * @property {bigint} answeredInRound the round ID of the round in which the answer
 * was computed. answeredInRound may be smaller than roundId when the round
 * timed out. answeredInRound is equal to roundId when the round didn't time out
 * and was completed regularly.
 */

/**
 * @typedef {Pick<RoundData, 'roundId' | 'startedAt'>} LatestRound
 */

// Partly documented at https://github.com/smartcontractkit/chainlink/blob/b045416ebca769aa69bde2da23b5109abe07a8b5/contracts/src/v0.6/FluxAggregator.sol#L153
/**
 * @typedef {object} ChainlinkConfig
 * @property {number} maxSubmissionCount
 * @property {number} minSubmissionCount
 * @property {RelativeTime} restartDelay the number of rounds an Oracle has to wait before they can initiate a round
 * @property {number} minSubmissionValue an immutable check for a lower bound of what
 * submission values are accepted from an oracle
 * @property {number} maxSubmissionValue an immutable check for an upper bound of what
 * submission values are accepted from an oracle
 * @property {number} timeout the number of seconds after the previous round that
 * allowed to lapse before allowing an oracle to skip an unfinished round
 */

/**
 * PriceAuthority for their median. This approximates the *Node Operator
 * Aggregation* logic of [Chainlink price
 * feeds](https://blog.chain.link/levels-of-data-aggregation-in-chainlink-price-feeds/).
 *
 * @param {ZCF<ChainlinkConfig & {
 * timer: TimerService,
 * brandIn: Brand<'nat'>,
 * brandOut: Brand<'nat'>,
 * unitAmountIn?: Amount<'nat'>,
 * }>} zcf
 * @param {{
 * marshaller: Marshaller,
 * quoteMint?: ERef<Mint<'set'>>,
 * storageNode: ERef<StorageNode>,
 * }} privateArgs
 */
const start = async (zcf, privateArgs) => {
  // brands come from named terms instead of `brands` key because the latter is
  // a StandardTerm that Zoe creates from the `issuerKeywordRecord` argument and
  // Oracle brands are inert (without issuers or mints).
  const {
    brandIn,
    brandOut,
    maxSubmissionCount,
    maxSubmissionValue,
    minSubmissionCount,
    minSubmissionValue,
    restartDelay,
    timeout,
    timer,

    unitAmountIn = AmountMath.make(brandIn, 1n),
  } = zcf.getTerms();

  assertAllDefined({
    brandIn,
    brandOut,
    maxSubmissionCount,
    maxSubmissionValue,
    minSubmissionCount,
    minSubmissionValue,
    restartDelay,
    timeout,
    timer,
    unitAmountIn,
  });

  const unitIn = AmountMath.getValue(brandIn, unitAmountIn);

  // Get the timer's identity.
  const timerPresence = await timer;

  const quoteMint =
    privateArgs.quoteMint || makeIssuerKit('quote', AssetKind.SET).mint;
  const quoteIssuerRecord = await zcf.saveIssuer(
    E(quoteMint).getIssuer(),
    'Quote',
  );
  const quoteKit = {
    ...quoteIssuerRecord,
    mint: quoteMint,
  };

  /** @type {bigint} */
  let lastValueOutForUnitIn;

  // --- [begin] Chainlink specific values
  /** @type {bigint} */
  let reportingRoundId = 0n;

  const { marshaller, storageNode } = privateArgs;
  assertAllDefined({ marshaller, storageNode });

  // For publishing priceAuthority values to off-chain storage
  /** @type {StoredPublishKit<PriceDescription>} */
  const { publisher: pricePublisher, subscriber: quoteSubscriber } =
    makeStoredPublishKit(storageNode, marshaller);

  /** @type {StoredPublishKit<LatestRound>} */
  const { publisher: latestRoundPublisher, subscriber: latestRoundSubscriber } =
    makeStoredPublishKit(
      E(storageNode).makeChildNode('latestRound'),
      marshaller,
    );

  /** @type {LegacyMap<string, ReturnType<typeof makeOracleStatus>>} */
  const oracleStatuses = makeLegacyMap('oracleStatus');

  /** @type {LegacyMap<bigint, ReturnType<typeof makeRound>>} */
  const rounds = makeLegacyMap('rounds');

  /** @type {LegacyMap<bigint, ReturnType<typeof makeRoundDetails>>} */
  const details = makeLegacyMap('details');

  /** @type {bigint} */
  const ROUND_MAX = BigInt(2 ** 32 - 1);

  /** @type {string} */
  const V3_NO_DATA_ERROR = 'No data present';
  // --- [end] Chainlink specific values

  /**
   * @param {bigint} answer
   * @param {Timestamp} startedAt
   * @param {Timestamp} updatedAt
   * @param {bigint} answeredInRound
   */
  const makeRound = (answer, startedAt, updatedAt, answeredInRound) => {
    return {
      answer,
      startedAt,
      updatedAt,
      answeredInRound,
    };
  };

  /**
   * @param {bigint[]} submissions
   * @param {number} maxSubmissions
   * @param {number} minSubmissions
   * @param {number} roundTimeout
   */
  const makeRoundDetails = (
    submissions,
    maxSubmissions,
    minSubmissions,
    roundTimeout,
  ) => {
    return {
      submissions,
      maxSubmissions,
      minSubmissions,
      roundTimeout,
    };
  };

  /**
   * @param {bigint} startingRound
   * @param {bigint} endingRound
   * @param {bigint} lastReportedRound
   * @param {bigint} lastStartedRound
   * @param {bigint} latestSubmission
   * @param {number} index
   */
  const makeOracleStatus = (
    startingRound,
    endingRound,
    lastReportedRound,
    lastStartedRound,
    latestSubmission,
    index,
  ) => {
    return {
      startingRound,
      endingRound,
      lastReportedRound,
      lastStartedRound,
      latestSubmission,
      index,
    };
  };

  /**
   *
   * @param {PriceQuoteValue} quote
   */
  const authenticateQuote = async quote => {
    const quoteAmount = AmountMath.make(quoteKit.brand, harden(quote));
    const quotePayment = await E(quoteKit.mint).mintPayment(quoteAmount);
    return harden({ quoteAmount, quotePayment });
  };

  /**
   * This is just a signal that there's a new answer, which is read from `lastValueOutForUnitIn`
   *
   * @type {NotifierRecord<void>}
   */
  const { notifier: answerNotifier, updater: answerUpdator } =
    makeNotifierKit();

  /**
   * @typedef {object} OracleRecord
   * @property {(timestamp: Timestamp) => Promise<void>=} querier
   * @property {number} lastSample
   */

  /** @type {LegacyMap<string, Set<OracleRecord>>} */
  const keyToRecords = makeLegacyMap('oracleAddr');

  /**
   * @param {object} param0
   * @param {number} [param0.overrideValueOut]
   * @param {Timestamp} [param0.timestamp]
   */
  const makeCreateQuote = ({ overrideValueOut, timestamp } = {}) =>
    /**
     * @param {PriceQuery} priceQuery
     */
    function createQuote(priceQuery) {
      // Sniff the current baseValueOut.
      const valueOutForUnitIn =
        overrideValueOut === undefined
          ? lastValueOutForUnitIn // Use the latest value.
          : overrideValueOut; // Override the value.
      if (valueOutForUnitIn === undefined) {
        // We don't have a quote, so abort.
        return undefined;
      }

      /**
       * @param {Amount} amountIn the given amountIn
       */
      const calcAmountOut = amountIn => {
        const valueIn = AmountMath.getValue(brandIn, amountIn);
        return AmountMath.make(
          brandOut,
          floorDivide(multiply(valueIn, valueOutForUnitIn), unitIn),
        );
      };

      /**
       * @param {Amount} amountOut the wanted amountOut
       */
      const calcAmountIn = amountOut => {
        const valueOut = AmountMath.getValue(brandOut, amountOut);
        return AmountMath.make(
          brandIn,
          ceilDivide(multiply(valueOut, unitIn), valueOutForUnitIn),
        );
      };

      // Calculate the quote.
      const quote = priceQuery(calcAmountOut, calcAmountIn);
      if (!quote) {
        return undefined;
      }

      const {
        amountIn,
        amountOut,
        timestamp: theirTimestamp = timestamp,
      } = quote;
      AmountMath.coerce(brandIn, amountIn);
      AmountMath.coerce(brandOut, amountOut);
      if (theirTimestamp !== undefined) {
        return authenticateQuote([
          {
            amountIn,
            amountOut,
            timer: timerPresence,
            timestamp: theirTimestamp,
          },
        ]);
      }
      return E(timer)
        .getCurrentTimestamp()
        .then(now =>
          authenticateQuote([
            { amountIn, amountOut, timer: timerPresence, timestamp: now },
          ]),
        );
    };

  const { priceAuthority } = makeOnewayPriceAuthorityKit({
    createQuote: makeCreateQuote(),
    notifier: answerNotifier,
    quoteIssuer: quoteKit.issuer,
    timer,
    actualBrandIn: brandIn,
    actualBrandOut: brandOut,
  });

  // for each new quote from the priceAuthority, publish it to off-chain storage
  observeNotifier(priceAuthority.makeQuoteNotifier(unitAmountIn, brandOut), {
    updateState: quote =>
      pricePublisher.publish(priceDescriptionFromQuote(quote)),
    fail: reason => {
      throw Error(`priceAuthority observer failed: ${reason}`);
    },
    finish: done => {
      throw Error(`priceAuthority observer died: ${done}`);
    },
  });

  /**
   * @param {bigint} roundId
   * @param {Timestamp} blockTimestamp
   */
  const timedOut = (roundId, blockTimestamp) => {
    if (!details.has(roundId) || !rounds.has(roundId)) {
      return false;
    }

    const startedAt = rounds.get(roundId).startedAt;
    const roundTimeout = details.get(roundId).roundTimeout;
    // TODO Better would be to make `roundTimeout` a `RelativeTime`
    // everywhere, and to rename it to a name that does not
    // mistakenly imply that it is an absolute time.
    const roundTimeoutDuration = TimeMath.toRel(roundTimeout);
    const roundTimedOut =
      TimeMath.absValue(startedAt) > 0n &&
      TimeMath.relValue(roundTimeoutDuration) > 0n &&
      TimeMath.compareAbs(
        TimeMath.addAbsRel(startedAt, roundTimeoutDuration),
        blockTimestamp,
      ) < 0;

    return roundTimedOut;
  };

  /**
   * @param {bigint} roundId
   * @param {Timestamp} blockTimestamp
   */
  const updateTimedOutRoundInfo = (roundId, blockTimestamp) => {
    // round 0 is non-existent, so we avoid that case -- round 1 is ignored
    // because we can't copy from round 0 in that case
    if (roundId === 0n || roundId === 1n) {
      return;
    }

    const roundTimedOut = timedOut(roundId, blockTimestamp);
    if (!roundTimedOut) return;

    const prevId = subtract(roundId, 1);

    const round = rounds.get(roundId);
    round.answer = rounds.get(prevId).answer;
    round.answeredInRound = rounds.get(prevId).answeredInRound;
    round.updatedAt = blockTimestamp;

    details.delete(roundId);
  };

  /**
   * @param {bigint} roundId
   */
  const newRound = roundId => {
    return roundId === add(reportingRoundId, 1);
  };

  /**
   * @param {bigint} roundId
   * @param {Timestamp} blockTimestamp
   */
  const initializeNewRound = (roundId, blockTimestamp) => {
    newRound(roundId) || Fail`Round ${roundId} already started`;

    updateTimedOutRoundInfo(subtract(roundId, 1), blockTimestamp);

    reportingRoundId = roundId;
    latestRoundPublisher.publish({
      roundId: reportingRoundId,
      startedAt: blockTimestamp,
    });

    details.init(
      roundId,
      makeRoundDetails([], maxSubmissionCount, minSubmissionCount, timeout),
    );

    rounds.init(
      roundId,
      makeRound(
        /* answer = */ 0n,
        /* startedAt = */ 0n,
        /* updatedAt = */ 0n,
        /* answeredInRound = */ 0n,
      ),
    );

    rounds.get(roundId).startedAt = blockTimestamp;
  };

  /**
   * @param {bigint} roundId
   * @param {string} oracleAddr
   * @param {Timestamp} blockTimestamp
   */
  const proposeNewRound = (roundId, oracleAddr, blockTimestamp) => {
    if (!newRound(roundId)) return;
    const lastStarted = oracleStatuses.get(oracleAddr).lastStartedRound; // cache storage reads
    if (roundId <= add(lastStarted, restartDelay) && lastStarted !== 0n) return;
    initializeNewRound(roundId, blockTimestamp);

    oracleStatuses.get(oracleAddr).lastStartedRound = roundId;
  };

  /**
   * @param {bigint} roundId
   */
  const acceptingSubmissions = roundId => {
    return details.has(roundId) && details.get(roundId).maxSubmissions !== 0;
  };

  /**
   * @param {bigint} submission
   * @param {bigint} roundId
   * @param {string} oracleAddr
   */
  const recordSubmission = (submission, roundId, oracleAddr) => {
    if (!acceptingSubmissions(roundId)) {
      console.error('round not accepting submissions');
      return false;
    }

    details.get(roundId).submissions.push(submission);
    oracleStatuses.get(oracleAddr).lastReportedRound = roundId;
    oracleStatuses.get(oracleAddr).latestSubmission = submission;
    return true;
  };

  /**
   * @param {bigint} roundId
   * @param {Timestamp} blockTimestamp
   */
  const updateRoundAnswer = (roundId, blockTimestamp) => {
    if (
      details.get(roundId).submissions.length <
      details.get(roundId).minSubmissions
    ) {
      return [false, 0];
    }

    /** @type {bigint | undefined} */
    const newAnswer = calculateMedian(
      details
        .get(roundId)
        .submissions.filter(sample => isNat(sample) && sample > 0n),
      { add, divide: floorDivide, isGTE },
    );

    assert(newAnswer, 'insufficient samples');

    rounds.get(roundId).answer = newAnswer;
    rounds.get(roundId).updatedAt = blockTimestamp;
    rounds.get(roundId).answeredInRound = roundId;

    lastValueOutForUnitIn = newAnswer;
    answerUpdator.updateState(undefined);

    return [true, newAnswer];
  };

  /**
   * @param {bigint} roundId
   */
  const deleteRoundDetails = roundId => {
    if (
      details.get(roundId).submissions.length <
      details.get(roundId).maxSubmissions
    )
      return;
    details.delete(roundId);
  };

  /**
   * @param {bigint} roundId
   */
  const validRoundId = roundId => {
    return roundId <= ROUND_MAX;
  };

  /**
   */
  const oracleCount = () => {
    return oracleStatuses.getSize();
  };

  /**
   * @param {bigint} roundId
   * @param {Timestamp} blockTimestamp
   */
  const supersedable = (roundId, blockTimestamp) => {
    return (
      rounds.has(roundId) &&
      (TimeMath.absValue(rounds.get(roundId).updatedAt) > 0n ||
        timedOut(roundId, blockTimestamp))
    );
  };

  /**
   * @param {bigint} roundId
   * @param {bigint} rrId reporting round ID
   */
  const previousAndCurrentUnanswered = (roundId, rrId) => {
    return add(roundId, 1) === rrId && rounds.get(rrId).updatedAt === 0n;
  };

  /**
   * @param {string} oracleAddr
   * @param {bigint} roundId
   * @param {Timestamp} blockTimestamp
   * @returns {string?} error message, if there is one
   */
  const validateOracleRound = (oracleAddr, roundId, blockTimestamp) => {
    // cache storage reads
    const startingRound = oracleStatuses.get(oracleAddr).startingRound;
    const rrId = reportingRoundId;

    let canSupersede = true;
    if (roundId > 1n) {
      canSupersede = supersedable(subtract(roundId, 1), blockTimestamp);
    }

    if (startingRound === 0n) return 'not enabled oracle';
    if (startingRound > roundId) return 'not yet enabled oracle';
    if (oracleStatuses.get(oracleAddr).endingRound < roundId)
      return 'no longer allowed oracle';
    if (oracleStatuses.get(oracleAddr).lastReportedRound >= roundId)
      return 'cannot report on previous rounds';
    if (
      roundId !== rrId &&
      roundId !== add(rrId, 1) &&
      !previousAndCurrentUnanswered(roundId, rrId)
    )
      return 'invalid round to report';
    if (roundId !== 1n && !canSupersede)
      return 'previous round not supersedable';
    return null;
  };

  /**
   * @param {string} oracleAddr
   * @param {bigint} roundId
   */
  const delayed = (oracleAddr, roundId) => {
    const lastStarted = oracleStatuses.get(oracleAddr).lastStartedRound;
    return roundId > add(lastStarted, restartDelay) || lastStarted === 0n;
  };

  /**
   * a method to provide all current info oracleStatuses need. Intended only
   * only to be callable by oracleStatuses. Not for use by contracts to read state.
   *
   * @param {string} oracleAddr
   * @param {Timestamp} blockTimestamp
   */
  const oracleRoundStateSuggestRound = (oracleAddr, blockTimestamp) => {
    const oracle = oracleStatuses.get(oracleAddr);

    const shouldSupersede =
      oracle.lastReportedRound === reportingRoundId ||
      !acceptingSubmissions(reportingRoundId);
    // Instead of nudging oracleStatuses to submit to the next round, the inclusion of
    // the shouldSupersede Boolean in the if condition pushes them towards
    // submitting in a currently open round.
    const canSupersede = supersedable(reportingRoundId, blockTimestamp);

    let roundId;
    let eligibleToSubmit;
    if (canSupersede && shouldSupersede) {
      roundId = add(reportingRoundId, 1);
      eligibleToSubmit = delayed(oracleAddr, roundId);
    } else {
      roundId = reportingRoundId;
      eligibleToSubmit = acceptingSubmissions(roundId);
    }

    let round;
    let startedAt;
    let roundTimeout;
    if (rounds.has(roundId)) {
      round = rounds.get(roundId);
      startedAt = round.startedAt;
      roundTimeout = details.get(roundId).roundTimeout;
    } else {
      startedAt = 0n;
      roundTimeout = 0;
    }

    const error = validateOracleRound(oracleAddr, roundId, blockTimestamp);
    if (error !== null) {
      eligibleToSubmit = false;
    }

    return {
      eligibleForSpecificRound: eligibleToSubmit,
      queriedRoundId: roundId,
      oracleStatus: oracle.latestSubmission,
      startedAt,
      roundTimeout,
      oracleCount: oracleCount(),
    };
  };

  /**
   * @param {string} oracleAddr
   * @param {bigint} queriedRoundId
   * @param {Timestamp} blockTimestamp
   */
  const eligibleForSpecificRound = (
    oracleAddr,
    queriedRoundId,
    blockTimestamp,
  ) => {
    const error = validateOracleRound(
      oracleAddr,
      queriedRoundId,
      blockTimestamp,
    );
    if (TimeMath.absValue(rounds.get(queriedRoundId).startedAt) > 0n) {
      return acceptingSubmissions(queriedRoundId) && error === null;
    } else {
      return delayed(oracleAddr, queriedRoundId) && error === null;
    }
  };

  /**
   * @param {string} oracleAddr
   */
  const getStartingRound = oracleAddr => {
    const currentRound = reportingRoundId;
    if (
      currentRound !== 0n &&
      currentRound === oracleStatuses.get(oracleAddr).endingRound
    ) {
      return currentRound;
    }
    return add(currentRound, 1);
  };

  const creatorFacet = Far('PriceAggregatorChainlinkCreatorFacet', {
    /**
     * An "oracle invitation" is an invitation to be able to submit data to
     * include in the priceAggregator's results.
     *
     * The offer result from this invitation is a OracleAdmin, which can be used
     * directly to manage the price submissions as well as to terminate the
     * relationship.
     *
     * @param {string} oracleAddr Bech32 of oracle operator smart wallet
     */
    makeOracleInvitation: async oracleAddr => {
      /**
       * If custom arguments are supplied to the `zoe.offer` call, they can
       * indicate an OraclePriceSubmission notifier and a corresponding
       * `shiftValueOut` that should be adapted as part of the priceAuthority's
       * reported data.
       *
       * @param {ZCFSeat} seat
       * @returns {Promise<{admin: OracleAdmin<PriceRound>, invitationMakers: {PushPrice: (result: PriceRound) => Promise<Invitation<void>>} }>}
       */
      const offerHandler = async seat => {
        const admin = await creatorFacet.initOracle(oracleAddr);
        const invitationMakers = Far('invitation makers', {
          /** @param {PriceRound} result */
          PushPrice(result) {
            assertParsableNumber(result.unitPrice);
            return zcf.makeInvitation(cSeat => {
              cSeat.exit();
              admin.pushResult(result);
            }, 'PushPrice');
          },
        });
        seat.exit();

        return harden({
          admin,

          invitationMakers,
        });
      };

      return zcf.makeInvitation(offerHandler, INVITATION_MAKERS_DESC);
    },
    /** @param {string} oracleAddr */
    deleteOracle: async oracleAddr => {
      const records = keyToRecords.get(oracleAddr);
      for (const record of records) {
        records.delete(record);
      }

      oracleStatuses.delete(oracleAddr);

      // We should remove the entry entirely, as it is empty.
      keyToRecords.delete(oracleAddr);
    },

    // unlike the median case, no query argument is passed, since polling behavior is undesired
    /**
     * @param {string} oracleAddr Bech32 of oracle operator smart wallet
     * @returns {Promise<OracleAdmin<PriceRound>>}
     */
    async initOracle(oracleAddr) {
      assert.typeof(oracleAddr, 'string');
      /** @type {OracleRecord} */
      const record = { querier: undefined, lastSample: 0 };

      /** @type {Set<OracleRecord>} */
      let records;
      if (keyToRecords.has(oracleAddr)) {
        records = keyToRecords.get(oracleAddr);
      } else {
        records = new Set();
        keyToRecords.init(oracleAddr, records);

        const oracleStatus = makeOracleStatus(
          /* startingRound = */ getStartingRound(oracleAddr),
          /* endingRound = */ ROUND_MAX,
          /* lastReportedRound = */ 0n,
          /* lastStartedRound = */ 0n,
          /* latestSubmission = */ 0n,
          /* index = */ oracleStatuses.getSize(),
        );
        oracleStatuses.init(oracleAddr, oracleStatus);
      }
      records.add(record);

      /** @param {PriceRound} result */
      const pushResult = async ({
        roundId: roundIdRaw = undefined,
        unitPrice: valueRaw,
      }) => {
        const value = Nat(valueRaw);
        const blockTimestamp = await E(timer).getCurrentTimestamp();

        let roundId;
        if (roundIdRaw === undefined) {
          const suggestedRound = oracleRoundStateSuggestRound(
            oracleAddr,
            blockTimestamp,
          );
          roundId = suggestedRound.eligibleForSpecificRound
            ? suggestedRound.queriedRoundId
            : add(suggestedRound.queriedRoundId, 1);
        } else {
          roundId = Nat(roundIdRaw);
        }

        const error = validateOracleRound(oracleAddr, roundId, blockTimestamp);
        if (!(value >= minSubmissionValue)) {
          console.error('value below minSubmissionValue', minSubmissionValue);
          return;
        }

        if (!(value <= maxSubmissionValue)) {
          console.error('value above maxSubmissionValue');
          return;
        }

        if (!(error === null)) {
          console.error(error);
          return;
        }

        proposeNewRound(roundId, oracleAddr, blockTimestamp);
        const recorded = recordSubmission(value, roundId, oracleAddr);
        if (!recorded) {
          return;
        }

        updateRoundAnswer(roundId, blockTimestamp);
        deleteRoundDetails(roundId);
      };

      // Obtain the oracle's publicFacet.
      assert(records.has(record), 'Oracle record is already deleted');

      /** @type {OracleAdmin<PriceRound>} */
      const oracleAdmin = Far('OracleAdmin', {
        async delete() {
          assert(records.has(record), 'Oracle record is already deleted');

          // The actual deletion is synchronous.
          oracleStatuses.delete(oracleAddr);
          records.delete(record);

          if (
            records.size === 0 &&
            keyToRecords.has(oracleAddr) &&
            keyToRecords.get(oracleAddr) === records
          ) {
            // We should remove the entry entirely, as it is empty.
            keyToRecords.delete(oracleAddr);
          }
        },
        pushResult,
      });

      return harden(oracleAdmin);
    },

    /**
     * consumers are encouraged to check
     * that they're receiving fresh data by inspecting the updatedAt and
     * answeredInRound return values.
     *
     * @param {bigint | number} roundIdRaw
     * @returns {Promise<RoundData>}
     */
    async getRoundData(roundIdRaw) {
      const roundId = Nat(roundIdRaw);

      assert(rounds.has(roundId), V3_NO_DATA_ERROR);

      const r = rounds.get(roundId);

      assert(r.answeredInRound > 0 && validRoundId(roundId), V3_NO_DATA_ERROR);

      return {
        roundId,
        answer: r.answer,
        startedAt: r.startedAt,
        updatedAt: r.updatedAt,
        answeredInRound: r.answeredInRound,
      };
    },

    /**
     * a method to provide all current info oracleStatuses need. Intended only
     * only to be callable by oracleStatuses. Not for use by contracts to read state.
     *
     * @param {string} oracleAddr Bech32 of oracle operator smart wallet
     * @param {bigint} queriedRoundId
     */
    async oracleRoundState(oracleAddr, queriedRoundId) {
      const blockTimestamp = await E(timer).getCurrentTimestamp();
      if (queriedRoundId > 0) {
        const round = rounds.get(queriedRoundId);
        const detail = details.get(queriedRoundId);
        return {
          eligibleForSpecificRound: eligibleForSpecificRound(
            oracleAddr,
            queriedRoundId,
            blockTimestamp,
          ),
          queriedRoundId,
          oracleStatus: oracleStatuses.get(oracleAddr).latestSubmission,
          startedAt: round.startedAt,
          roundTimeout: detail.roundTimeout,
          oracleCount: oracleCount(),
        };
      } else {
        return oracleRoundStateSuggestRound(oracleAddr, blockTimestamp);
      }
    },
  });

  const publicFacet = Far('publicFacet', {
    getPriceAuthority() {
      return priceAuthority;
    },
    getSubscriber: () => quoteSubscriber,
    getRoundStartNotifier() {
      return latestRoundSubscriber;
    },
  });

  return harden({ creatorFacet, publicFacet });
};

export { start };
