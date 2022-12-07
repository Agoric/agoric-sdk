import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { makeNotifierKit } from '@agoric/notifier';
import { makeLegacyMap } from '@agoric/store';
import { Nat, isNat } from '@agoric/nat';
import { TimeMath } from '@agoric/swingset-vat/src/vats/timer/timeMath.js';
import { Fail } from '@agoric/assert';
import {
  calculateMedian,
  natSafeMath,
  makeOnewayPriceAuthorityKit,
} from '../contractSupport/index.js';

import '../../tools/types.js';
import { assertParsableNumber } from '../contractSupport/ratio.js';
import { INVITATION_MAKERS_DESC } from './priceAggregator';

/**
 * @typedef {{ roundId: number | undefined, data: string }} PriceRound
 * `data` is a string encoded integer (Number.MAX_SAFE_INTEGER)
 */

const { add, subtract, multiply, floorDivide, ceilDivide, isGTE } = natSafeMath;

/**
 * @typedef {object} RoundData
 * @property {bigint} roundId  the round ID for which data was retrieved
 * @property {number} answer the answer for the given round
 * @property {Timestamp} startedAt the timestamp when the round was started. This is 0
 * if the round hasn't been started yet.
 * @property {Timestamp} updatedAt the timestamp when the round last was updated (i.e.
 * answer was last computed)
 * @property {bigint} answeredInRound the round ID of the round in which the answer
 * was computed. answeredInRound may be smaller than roundId when the round
 * timed out. answeredInRound is equal to roundId when the round didn't time out
 * and was completed regularly.
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
 * PriceAuthority for their median. Unlike the simpler `priceAggregator.js`, this approximates
 * the *Node Operator Aggregation* logic of [Chainlink price
 * feeds](https://blog.chain.link/levels-of-data-aggregation-in-chainlink-price-feeds/).
 *
 * @param {ZCF<ChainlinkConfig & {
 * timer: TimerService,
 * brandIn: Brand<'nat'>,
 * brandOut: Brand<'nat'>,
 * unitAmountIn?: Amount<'nat'>,
 * }>} zcf
 * @param {object} root0
 * @param {ERef<Mint<'set'>>} [root0.quoteMint]
 */
const start = async (
  zcf,
  { quoteMint = makeIssuerKit('quote', AssetKind.SET).mint } = {},
) => {
  // brands come from named terms instead of `brands` key because the latter is
  // a StandardTerm that Zoe creates from the `issuerKeywordRecord` argument and
  // Oracle brands are inert (without issuers or mints).
  const {
    timer,
    brandIn,
    brandOut,
    maxSubmissionCount,
    minSubmissionCount,
    restartDelay,
    timeout,
    minSubmissionValue,
    maxSubmissionValue,

    unitAmountIn = AmountMath.make(brandIn, 1n),
  } = zcf.getTerms();
  // TODO helper like: assertDefined({ brandIn, brandOut, timer, unitAmountIn })
  assert(brandIn, 'missing brandIn');
  assert(brandOut, 'missing brandOut');
  assert(timer, 'missing timer');
  assert(unitAmountIn, 'missing unitAmountIn');

  const unitIn = AmountMath.getValue(brandIn, unitAmountIn);

  // Get the timer's identity.
  const timerPresence = await timer;

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
  const { notifier: roundStartNotifier, updater: roundStartUpdater } =
    makeNotifierKit(
      // Start with the first round.
      add(reportingRoundId, 1),
    );

  /** @type {LegacyMap<OracleKey, ReturnType<typeof makeOracleStatus>>} */
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
   * @param {number} answer
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

  // FIXME: We throw away the updater but shouldn't.
  const { notifier } = makeNotifierKit();

  /**
   * @typedef {object} OracleRecord
   * @property {(timestamp: Timestamp) => Promise<void>=} querier
   * @property {number} lastSample
   */

  /**
   * @typedef {{}} OracleKey
   */

  /** @type {LegacyMap<OracleKey, Set<OracleRecord>>} */
  const keyToRecords = makeLegacyMap('oracleKey');

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
    notifier,
    quoteIssuer: quoteKit.issuer,
    timer,
    actualBrandIn: brandIn,
    actualBrandOut: brandOut,
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
    roundStartUpdater.updateState(reportingRoundId);

    details.init(
      roundId,
      makeRoundDetails([], maxSubmissionCount, minSubmissionCount, timeout),
    );

    rounds.init(
      roundId,
      makeRound(
        /* answer = */ 0,
        /* startedAt = */ 0n,
        /* updatedAt = */ 0n,
        /* answeredInRound = */ 0n,
      ),
    );

    rounds.get(roundId).startedAt = blockTimestamp;
  };

  /**
   * @param {bigint} roundId
   * @param {OracleKey} oracleKey
   * @param {Timestamp} blockTimestamp
   */
  const proposeNewRound = (roundId, oracleKey, blockTimestamp) => {
    if (!newRound(roundId)) return;
    const lastStarted = oracleStatuses.get(oracleKey).lastStartedRound; // cache storage reads
    if (roundId <= add(lastStarted, restartDelay) && lastStarted !== 0n) return;
    initializeNewRound(roundId, blockTimestamp);

    oracleStatuses.get(oracleKey).lastStartedRound = roundId;
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
   * @param {OracleKey} oracleKey
   */
  const recordSubmission = (submission, roundId, oracleKey) => {
    if (!acceptingSubmissions(roundId)) {
      console.error('round not accepting submissions');
      return false;
    }

    details.get(roundId).submissions.push(submission);
    oracleStatuses.get(oracleKey).lastReportedRound = roundId;
    oracleStatuses.get(oracleKey).latestSubmission = submission;
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

    const newAnswer = calculateMedian(
      details
        .get(roundId)
        .submissions.filter(sample => isNat(sample) && sample > 0n),
      { add, divide: floorDivide, isGTE },
    );

    rounds.get(roundId).answer = newAnswer;
    rounds.get(roundId).updatedAt = blockTimestamp;
    rounds.get(roundId).answeredInRound = roundId;

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
   * @param {OracleKey} oracleKey
   * @param {bigint} roundId
   * @param {Timestamp} blockTimestamp
   */
  const validateOracleRound = (oracleKey, roundId, blockTimestamp) => {
    // cache storage reads
    const startingRound = oracleStatuses.get(oracleKey).startingRound;
    const rrId = reportingRoundId;

    let canSupersede = true;
    if (roundId > 1n) {
      canSupersede = supersedable(subtract(roundId, 1), blockTimestamp);
    }

    if (startingRound === 0n) return 'not enabled oracle';
    if (startingRound > roundId) return 'not yet enabled oracle';
    if (oracleStatuses.get(oracleKey).endingRound < roundId)
      return 'no longer allowed oracle';
    if (oracleStatuses.get(oracleKey).lastReportedRound >= roundId)
      return 'cannot report on previous rounds';
    if (
      roundId !== rrId &&
      roundId !== add(rrId, 1) &&
      !previousAndCurrentUnanswered(roundId, rrId)
    )
      return 'invalid round to report';
    if (roundId !== 1n && !canSupersede)
      return 'previous round not supersedable';
    return '';
  };

  /**
   * @param {OracleKey} oracleKey
   * @param {bigint} roundId
   */
  const delayed = (oracleKey, roundId) => {
    const lastStarted = oracleStatuses.get(oracleKey).lastStartedRound;
    return roundId > add(lastStarted, restartDelay) || lastStarted === 0n;
  };

  /**
   * a method to provide all current info oracleStatuses need. Intended only
   * only to be callable by oracleStatuses. Not for use by contracts to read state.
   *
   * @param {OracleKey} oracleKey
   * @param {Timestamp} blockTimestamp
   */
  const oracleRoundStateSuggestRound = (oracleKey, blockTimestamp) => {
    const oracle = oracleStatuses.get(oracleKey);

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
      eligibleToSubmit = delayed(oracleKey, roundId);
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

    const error = validateOracleRound(oracleKey, roundId, blockTimestamp);
    if (error.length !== 0) {
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
   * @param {OracleKey} oracleKey
   * @param {bigint} queriedRoundId
   * @param {Timestamp} blockTimestamp
   */
  const eligibleForSpecificRound = (
    oracleKey,
    queriedRoundId,
    blockTimestamp,
  ) => {
    const error = validateOracleRound(
      oracleKey,
      queriedRoundId,
      blockTimestamp,
    );
    if (TimeMath.absValue(rounds.get(queriedRoundId).startedAt) > 0n) {
      return acceptingSubmissions(queriedRoundId) && error.length === 0;
    } else {
      return delayed(oracleKey, queriedRoundId) && error.length === 0;
    }
  };

  /**
   * @param {OracleKey} oracleKey
   */
  const getStartingRound = oracleKey => {
    const currentRound = reportingRoundId;
    if (
      currentRound !== 0n &&
      currentRound === oracleStatuses.get(oracleKey).endingRound
    ) {
      return currentRound;
    }
    return add(currentRound, 1);
  };

  /**
   * @type {Omit<import('./priceAggregator').PriceAggregatorContract['creatorFacet'], 'initOracle'> & {
   *   initOracle: (instance) => Promise<OracleAdmin<PriceRound>>,
   *   getRoundData(roundId: bigint | number): Promise<RoundData>,
   *   oracleRoundState(oracleKey: OracleKey, queriedRoundId: BigInt): Promise<any>
   * }}
   */
  const creatorFacet = Far('PriceAggregatorChainlinkCreatorFacet', {
    /**
     * An "oracle invitation" is an invitation to be able to submit data to
     * include in the priceAggregator's results.
     *
     * The offer result from this invitation is a OracleAdmin, which can be used
     * directly to manage the price submissions as well as to terminate the
     * relationship.
     *
     * @param {Instance | string} [oracleKey]
     */
    makeOracleInvitation: async oracleKey => {
      /**
       * If custom arguments are supplied to the `zoe.offer` call, they can
       * indicate an OraclePriceSubmission notifier and a corresponding
       * `shiftValueOut` that should be adapted as part of the priceAuthority's
       * reported data.
       *
       * @param {ZCFSeat} seat
       * @returns {Promise<{admin: OracleAdmin<PriceRound>, invitationMakers: {makePushPriceInvitation: (result: PriceRound) => Promise<Invitation<void>>} }>}
       */
      const offerHandler = async seat => {
        const admin = await creatorFacet.initOracle(oracleKey);
        const invitationMakers = Far('invitation makers', {
          /** @param {PriceRound} result */
          makePushPriceInvitation(result) {
            assertParsableNumber(result.data);
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
    deleteOracle: async oracleKey => {
      const records = keyToRecords.get(oracleKey);
      for (const record of records) {
        records.delete(record);
      }

      oracleStatuses.delete(oracleKey);

      // We should remove the entry entirely, as it is empty.
      keyToRecords.delete(oracleKey);
    },

    // unlike the median case, no query argument is passed, since polling behavior is undesired
    async initOracle(oracleInstance) {
      /** @type {OracleKey} */
      const oracleKey = oracleInstance || Far('oracleKey', {});

      /** @type {OracleRecord} */
      const record = { querier: undefined, lastSample: 0 };

      /** @type {Set<OracleRecord>} */
      let records;
      if (keyToRecords.has(oracleKey)) {
        records = keyToRecords.get(oracleKey);
      } else {
        records = new Set();
        keyToRecords.init(oracleKey, records);

        const oracleStatus = makeOracleStatus(
          /* startingRound = */ getStartingRound(oracleKey),
          /* endingRound = */ ROUND_MAX,
          /* lastReportedRound = */ 0n,
          /* lastStartedRound = */ 0n,
          /* latestSubmission = */ 0n,
          /* index = */ oracleStatuses.getSize(),
        );
        oracleStatuses.init(oracleKey, oracleStatus);
      }
      records.add(record);

      /** @param {PriceRound} result */
      const pushResult = async ({
        roundId: roundIdRaw = undefined,
        data: submissionRaw,
      }) => {
        const parsedSubmission = Nat(parseInt(submissionRaw, 10));
        const blockTimestamp = await E(timer).getCurrentTimestamp();

        let roundId;
        if (roundIdRaw === undefined) {
          const suggestedRound = oracleRoundStateSuggestRound(
            oracleKey,
            blockTimestamp,
          );
          roundId = suggestedRound.eligibleForSpecificRound
            ? suggestedRound.queriedRoundId
            : add(suggestedRound.queriedRoundId, 1);
        } else {
          roundId = Nat(roundIdRaw);
        }

        const error = validateOracleRound(oracleKey, roundId, blockTimestamp);
        if (!(parsedSubmission >= minSubmissionValue)) {
          console.error('value below minSubmissionValue');
          return;
        }

        if (!(parsedSubmission <= maxSubmissionValue)) {
          console.error('value above maxSubmissionValue');
          return;
        }

        if (!(error.length === 0)) {
          console.error(error);
          return;
        }

        proposeNewRound(roundId, oracleKey, blockTimestamp);
        const recorded = recordSubmission(parsedSubmission, roundId, oracleKey);
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
          oracleStatuses.delete(oracleKey);
          records.delete(record);

          if (
            records.size === 0 &&
            keyToRecords.has(oracleKey) &&
            keyToRecords.get(oracleKey) === records
          ) {
            // We should remove the entry entirely, as it is empty.
            keyToRecords.delete(oracleKey);
          }
        },
        async pushResult({
          roundId: roundIdRaw = undefined,
          data: submissionRaw,
        }) {
          // Sample of NaN, 0, or negative numbers get culled in
          // the median calculation.
          pushResult({
            roundId: roundIdRaw,
            data: submissionRaw,
          }).catch(console.error);
        },
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
     * @param {OracleKey} oracleKey
     * @param {bigint} queriedRoundId
     */
    async oracleRoundState(oracleKey, queriedRoundId) {
      const blockTimestamp = await E(timer).getCurrentTimestamp();
      if (queriedRoundId > 0) {
        const round = rounds.get(queriedRoundId);
        const detail = details.get(queriedRoundId);
        return {
          eligibleForSpecificRound: eligibleForSpecificRound(
            oracleKey,
            queriedRoundId,
            blockTimestamp,
          ),
          queriedRoundId,
          oracleStatus: oracleStatuses.get(oracleKey).latestSubmission,
          startedAt: round.startedAt,
          roundTimeout: detail.roundTimeout,
          oracleCount: oracleCount(),
        };
      } else {
        return oracleRoundStateSuggestRound(oracleKey, blockTimestamp);
      }
    },
  });

  const publicFacet = Far('publicFacet', {
    getPriceAuthority() {
      return priceAuthority;
    },
    getRoundStartNotifier() {
      return roundStartNotifier;
    },
  });

  return harden({ creatorFacet, publicFacet });
};

export { start };
