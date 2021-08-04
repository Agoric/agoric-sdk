// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { makeNotifierKit } from '@agoric/notifier';
import makeStore from '@agoric/store';
import { Nat, isNat } from '@agoric/nat';
import { AmountMath } from '@agoric/ertp';
import { assert, details as X } from '@agoric/assert';
import {
  calculateMedian,
  natSafeMath,
  makeOnewayPriceAuthorityKit,
} from '../contractSupport';

import '../../tools/types';

const { add, subtract, multiply, floorDivide, ceilDivide, isGTE } = natSafeMath;

/**
 * This contract aggregates price values from a set of oracleStatuses and provides a
 * PriceAuthority for their median.
 *
 * @type {ContractStartFn}
 */
const start = async zcf => {
  const {
    timer: rawTimer,
    brands: { In: brandIn, Out: brandOut },
    maxSubmissionCount,
    minSubmissionCount,
    restartDelay,
    timeout,
    minSubmissionValue,
    maxSubmissionValue,

    unitAmountIn = AmountMath.make(1n, brandIn),
  } = zcf.getTerms();

  const unitIn = AmountMath.getValue(unitAmountIn, brandIn);

  /** @type {TimerService} */
  const timer = rawTimer;

  /** @type {IssuerRecord & { mint: ERef<Mint> }} */
  let quoteKit;

  /** @type {PriceAuthority} */
  let priceAuthority;

  /** @type {number} */
  let lastValueOutForUnitIn;

  // --- [begin] Chainlink specific values
  /** @type {bigint} */
  let reportingRoundId = BigInt(0);

  /** @type {Store<Instance, { startingRound: bigint, endingRound: bigint, lastReportedRound: bigint, lastStartedRound: bigint, latestSubmission: bigint, index: number }>} */
  const oracleStatuses = makeStore('oracleStatus');

  /** @type {Store<bigint, { answer: number, startedAt: bigint, updatedAt: bigint, answeredInRound: bigint }>} */
  const rounds = makeStore('rounds');

  /** @type {Store<bigint, { submissions: bigint[], maxSubmissions: number, minSubmissions: number, roundTimeout: number }>} */
  const details = makeStore('details');

  /** @type {bigint} */
  const ROUND_MAX = BigInt(2 ** 32 - 1);

  /** @type {string} */
  const V3_NO_DATA_ERROR = 'No data present';
  // --- [end] Chainlink specific values

  /**
   * @param {number} answer
   * @param {bigint} startedAt
   * @param {bigint} updatedAt
   * @param {bigint} answeredInRound
   * @returns {{ answer: number, startedAt: bigint, updatedAt: bigint, answeredInRound: bigint }}
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
   * @returns {{ submissions: bigint[], maxSubmissions: number, minSubmissions: number, roundTimeout: number }}
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
   * @returns {{ startingRound: bigint, endingRound: bigint, lastReportedRound: bigint, lastStartedRound: bigint, latestSubmission: bigint, index: number }}
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
    const quoteAmount = AmountMath.make(quote, quoteKit.brand);
    const quotePayment = await E(quoteKit.mint).mintPayment(quoteAmount);
    return harden({ quoteAmount, quotePayment });
  };

  const { notifier } = makeNotifierKit();
  const zoe = zcf.getZoeService();

  /**
   * @typedef {Object} OracleRecord
   * @property {(timestamp: Timestamp) => Promise<void>=} querier
   * @property {number} lastSample
   */

  /** @type {Store<Instance, Set<OracleRecord>>} */
  const instanceToRecords = makeStore('oracleInstance');

  /**
   * @param {Object} param0
   * @param {number} [param0.overrideValueOut]
   * @param {Timestamp} [param0.timestamp]
   */
  const makeCreateQuote = ({ overrideValueOut, timestamp } = {}) =>
    /**
     * @param {PriceQuery} priceQuery
     * @returns {ERef<PriceQuote>=}
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
       * @returns {Amount} the amountOut that will be received
       */
      const calcAmountOut = amountIn => {
        const valueIn = AmountMath.getValue(amountIn, brandIn);
        return AmountMath.make(
          floorDivide(multiply(valueIn, valueOutForUnitIn), unitIn),
          brandOut,
        );
      };

      /**
       * @param {Amount} amountOut the wanted amountOut
       * @returns {Amount} the amountIn needed to give
       */
      const calcAmountIn = amountOut => {
        const valueOut = AmountMath.getValue(amountOut, brandOut);
        return AmountMath.make(
          ceilDivide(multiply(valueOut, unitIn), valueOutForUnitIn),
          brandIn,
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
      AmountMath.coerce(amountIn, brandIn);
      AmountMath.coerce(amountOut, brandOut);
      if (theirTimestamp !== undefined) {
        return authenticateQuote([
          { amountIn, amountOut, timer, timestamp: theirTimestamp },
        ]);
      }
      return E(timer)
        .getCurrentTimestamp()
        .then(now =>
          authenticateQuote([{ amountIn, amountOut, timer, timestamp: now }]),
        );
    };

  /**
   * @param {bigint} _roundId
   * @returns {boolean}
   */
  const timedOut = _roundId => {
    if (!details.has(_roundId) || !rounds.has(_roundId)) {
      return false;
    }

    const blockTimestamp = timer.getCurrentTimestamp();
    const startedAt = rounds.get(_roundId).startedAt;
    const roundTimeout = details.get(_roundId).roundTimeout;
    const roundTimedOut =
      startedAt > 0 &&
      roundTimeout > 0 &&
      add(startedAt, roundTimeout) < blockTimestamp;
    return roundTimedOut;
  };

  /**
   * @param {bigint} _roundId
   */
  const updateTimedOutRoundInfo = _roundId => {
    // round 0 is non-existent, so we avoid that case -- round 1 is ignored
    // because we can't copy from round 0 in that case
    if (_roundId === BigInt(0) || _roundId === BigInt(1)) {
      return;
    }

    const roundTimedOut = timedOut(_roundId);
    if (!roundTimedOut) return;

    const blockTimestamp = timer.getCurrentTimestamp();

    const prevId = subtract(_roundId, 1);

    rounds.get(_roundId).answer = rounds.get(prevId).answer;
    rounds.get(_roundId).answeredInRound = rounds.get(prevId).answeredInRound;
    rounds.get(_roundId).updatedAt = blockTimestamp;

    details.delete(_roundId);
  };

  /**
   * @param {bigint} _roundId
   */
  const newRound = _roundId => {
    return _roundId === add(reportingRoundId, 1);
  };

  /**
   * @param {bigint} _roundId
   */
  const initializeNewRound = _roundId => {
    updateTimedOutRoundInfo(subtract(_roundId, 1));

    reportingRoundId = _roundId;

    details.init(
      _roundId,
      makeRoundDetails([], maxSubmissionCount, minSubmissionCount, timeout),
    );

    rounds.init(
      _roundId,
      makeRound(
        /* answer = */ 0,
        /* startedAt = */ BigInt(0),
        /* updatedAt = */ BigInt(0),
        /* answeredInRound = */ BigInt(0),
      ),
    );

    const blockTimestamp = timer.getCurrentTimestamp();
    rounds.get(_roundId).startedAt = blockTimestamp;
  };

  /**
   * @param {bigint} _roundId
   * @param {Instance} _oracle
   */
  const oracleInitializeNewRound = (_roundId, _oracle) => {
    if (!newRound(_roundId)) return;
    const lastStarted = oracleStatuses.get(_oracle).lastStartedRound; // cache storage reads
    if (_roundId <= add(lastStarted, restartDelay) && lastStarted !== BigInt(0))
      return;
    initializeNewRound(_roundId);

    oracleStatuses.get(_oracle).lastStartedRound = _roundId;
  };

  /**
   * @param {bigint} _roundId
   * @returns {boolean}
   */
  const acceptingSubmissions = _roundId => {
    return details.has(_roundId) && details.get(_roundId).maxSubmissions !== 0;
  };

  /**
   * @param {bigint} _submission
   * @param {bigint} _roundId
   * @param {Instance} _oracle
   */
  const recordSubmission = (_submission, _roundId, _oracle) => {
    if (!acceptingSubmissions(_roundId)) {
      console.error('round not accepting submissions');
      return false;
    }

    details.get(_roundId).submissions.push(_submission);
    oracleStatuses.get(_oracle).lastReportedRound = _roundId;
    oracleStatuses.get(_oracle).latestSubmission = _submission;
    return true;
  };

  /**
   * @param {bigint} _roundId
   * @returns {[boolean, number]}
   */
  const updateRoundAnswer = _roundId => {
    if (
      details.get(_roundId).submissions.length <
      details.get(_roundId).minSubmissions
    ) {
      return [false, 0];
    }

    const newAnswer = calculateMedian(
      details
        .get(_roundId)
        .submissions.filter(sample => isNat(sample) && sample > 0n),
      { add, divide: floorDivide, isGTE },
    );

    // TODO: should we actually be using the block timestamp instead of that from the env?
    const blockTimestamp = timer.getCurrentTimestamp();

    rounds.get(_roundId).answer = newAnswer;
    rounds.get(_roundId).updatedAt = blockTimestamp;
    rounds.get(_roundId).answeredInRound = _roundId;

    return [true, newAnswer];
  };

  /**
   * @param {bigint} _roundId
   */
  const deleteRoundDetails = _roundId => {
    if (
      details.get(_roundId).submissions.length <
      details.get(_roundId).maxSubmissions
    )
      return;
    details.delete(_roundId);
  };

  /**
   * @param {bigint} _roundId
   * @returns {boolean}
   */
  const validRoundId = _roundId => {
    return _roundId <= ROUND_MAX;
  };

  /**
   * @returns {number}
   */
  const oracleCount = () => {
    return oracleStatuses.keys().length;
  };

  /**
   * @param {bigint} _roundId
   * @returns {boolean}
   */
  const supersedable = _roundId => {
    return (
      rounds.has(_roundId) &&
      (rounds.get(_roundId).updatedAt > 0 || timedOut(_roundId))
    );
  };

  /**
   * @param {bigint} _roundId
   * @param {bigint} _rrId
   * @returns {boolean}
   */
  const previousAndCurrentUnanswered = (_roundId, _rrId) => {
    return (
      add(_roundId, 1) === _rrId && rounds.get(_rrId).updatedAt === BigInt(0)
    );
  };

  /**
   * @param {Instance} _oracle
   * @param {bigint} _roundId
   * @returns {string}
   */
  const validateOracleRound = (_oracle, _roundId) => {
    // cache storage reads
    const startingRound = oracleStatuses.get(_oracle).startingRound;
    const rrId = reportingRoundId;

    let canSupersede = true;
    if (_roundId !== BigInt(1)) {
      canSupersede = supersedable(subtract(_roundId, 1));
    }

    if (startingRound === BigInt(0)) return 'not enabled oracle';
    if (startingRound > _roundId) return 'not yet enabled oracle';
    if (oracleStatuses.get(_oracle).endingRound < _roundId)
      return 'no longer allowed oracle';
    if (oracleStatuses.get(_oracle).lastReportedRound >= _roundId)
      return 'cannot report on previous rounds';
    if (
      _roundId !== rrId &&
      _roundId !== add(rrId, 1) &&
      !previousAndCurrentUnanswered(_roundId, rrId)
    )
      return 'invalid round to report';
    if (_roundId !== BigInt(1) && !canSupersede)
      return 'previous round not supersedable';
    return '';
  };

  /**
   * @param {Instance} _oracle
   * @param {bigint} _roundId
   * @returns {boolean}
   */
  const delayed = (_oracle, _roundId) => {
    const lastStarted = oracleStatuses.get(_oracle).lastStartedRound;
    return (
      _roundId > add(lastStarted, restartDelay) || lastStarted === BigInt(0)
    );
  };

  /**
   * a method to provide all current info oracleStatuses need. Intended only
   * only to be callable by oracleStatuses. Not for use by contracts to read state.
   *
   * @param {Instance} _oracle
   * @returns {{ eligibleForSpecificRound: boolean, queriedRoundId: bigint, oracleStatus: bigint, startedAt: bigint, roundTimeout: number, oracleCount: number }}
   */
  const oracleRoundStateSuggestRound = _oracle => {
    const oracle = oracleStatuses.get(_oracle);

    const shouldSupersede =
      oracle.lastReportedRound === reportingRoundId ||
      !acceptingSubmissions(reportingRoundId);
    // Instead of nudging oracleStatuses to submit to the next round, the inclusion of
    // the shouldSupersede Boolean in the if condition pushes them towards
    // submitting in a currently open round.
    const canSupersede = supersedable(reportingRoundId);

    let roundId;
    let eligibleToSubmit;
    if (canSupersede && shouldSupersede) {
      roundId = add(reportingRoundId, 1);
      eligibleToSubmit = delayed(_oracle, roundId);
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

    const error = validateOracleRound(_oracle, roundId);
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
   * @param {Instance} _oracle
   * @param {bigint} _queriedRoundId
   * @returns {boolean}
   */
  const eligibleForSpecificRound = (_oracle, _queriedRoundId) => {
    const error = validateOracleRound(_oracle, _queriedRoundId);
    if (rounds.get(_queriedRoundId).startedAt > 0) {
      return acceptingSubmissions(_queriedRoundId) && error.length === 0;
    } else {
      return delayed(_oracle, _queriedRoundId) && error.length === 0;
    }
  };

  /**
   * @param {Instance} _oracle
   * @returns {bigint}
   */
  const getStartingRound = _oracle => {
    const currentRound = reportingRoundId;
    if (
      currentRound !== BigInt(0) &&
      currentRound === oracleStatuses.get(_oracle).endingRound
    ) {
      return currentRound;
    }
    return add(currentRound, 1);
  };

  /** @type {PriceAggregatorCreatorFacet} */
  const creatorFacet = Far('PriceAggregatorChainlinkCreatorFacet', {
    async initializeQuoteMint(quoteMint) {
      const quoteIssuerRecord = await zcf.saveIssuer(
        E(quoteMint).getIssuer(),
        'Quote',
      );
      quoteKit = {
        ...quoteIssuerRecord,
        mint: quoteMint,
      };

      const paKit = makeOnewayPriceAuthorityKit({
        createQuote: makeCreateQuote(),
        notifier,
        quoteIssuer: quoteKit.issuer,
        timer,
        actualBrandIn: brandIn,
        actualBrandOut: brandOut,
      });
      ({ priceAuthority } = paKit);
    },

    // unlike the median case, no query argument is passed, since polling behavior is undesired
    async initOracle(oracleInstance) {
      assert(quoteKit, X`Must initializeQuoteMint before adding an oracle`);

      /** @type {OracleRecord} */
      const record = { querier: undefined, lastSample: 0 };

      /** @type {Set<OracleRecord>} */
      let records;
      if (instanceToRecords.has(oracleInstance)) {
        records = instanceToRecords.get(oracleInstance);
      } else {
        records = new Set();
        instanceToRecords.init(oracleInstance, records);

        const oracleStatus = makeOracleStatus(
          /* startingRound = */ getStartingRound(oracleInstance),
          /* endingRound = */ ROUND_MAX,
          /* lastReportedRound = */ BigInt(0),
          /* lastStartedRound = */ BigInt(0),
          /* latestSubmission = */ BigInt(0),
          /* index = */ oracleStatuses.keys().length,
        );
        oracleStatuses.init(oracleInstance, oracleStatus);
      }
      records.add(record);

      const pushResult = async (_roundIdRaw, _submissionRaw) => {
        const roundId = Nat(_roundIdRaw);
        const parsedSubmission = Nat(parseInt(_submissionRaw, 10));

        const error = validateOracleRound(oracleInstance, roundId);
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

        oracleInitializeNewRound(roundId, oracleInstance);
        const recorded = recordSubmission(
          parsedSubmission,
          roundId,
          oracleInstance,
        );
        if (!recorded) {
          return;
        }

        updateRoundAnswer(roundId);
        deleteRoundDetails(roundId);
      };

      // Obtain the oracle's publicFacet.
      await E(zoe).getPublicFacet(oracleInstance);
      assert(records.has(record), X`Oracle record is already deleted`);

      /** @type {OracleAdmin} */
      const oracleAdmin = {
        async delete() {
          assert(records.has(record), X`Oracle record is already deleted`);

          // The actual deletion is synchronous.
          oracleStatuses.delete(oracleInstance);
          records.delete(record);

          if (
            records.size === 0 &&
            instanceToRecords.has(oracleInstance) &&
            instanceToRecords.get(oracleInstance) === records
          ) {
            // We should remove the entry entirely, as it is empty.
            instanceToRecords.delete(oracleInstance);
          }
        },
        async pushResult(roundId, result) {
          // Sample of NaN, 0, or negative numbers get culled in
          // the median calculation.
          pushResult(roundId, result);
        },
      };

      return harden(oracleAdmin);
    },

    /**
     * consumers are encouraged to check
     * that they're receiving fresh data by inspecting the updatedAt and
     * answeredInRound return values.
     * return is: [roundId, answer, startedAt, updatedAt, answeredInRound], where
     * roundId is the round ID for which data was retrieved
     * answer is the answer for the given round
     * startedAt is the timestamp when the round was started. This is 0
     * if the round hasn't been started yet.
     * updatedAt is the timestamp when the round last was updated (i.e.
     * answer was last computed)
     * answeredInRound is the round ID of the round in which the answer
     * was computed. answeredInRound may be smaller than roundId when the round
     * timed out. answeredInRound is equal to roundId when the round didn't time out
     * and was completed regularly.
     *
     * @param {bigint} _roundIdRaw
     * @returns {Promise<{ roundId: bigint; answer: number; startedAt: bigint; updatedAt: bigint; answeredInRound: bigint; }>}
     */
    async getRoundData(_roundIdRaw) {
      const roundId = Nat(_roundIdRaw);

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
     * @param {Instance} _oracle
     * @param {bigint} _queriedRoundId
     * @returns Promise<{{ eligibleForSpecificRound: boolean, queriedRoundId: bigint, oracleStatus: bigint, startedAt: bigint, roundTimeout: number, oracleCount: number }}>
     */
    async oracleRoundState(_oracle, _queriedRoundId) {
      if (_queriedRoundId > 0) {
        const round = rounds.get(_queriedRoundId);
        const detail = details.get(_queriedRoundId);
        return {
          eligibleForSpecificRound: eligibleForSpecificRound(
            _oracle,
            _queriedRoundId,
          ),
          queriedRoundId: _queriedRoundId,
          oracleStatus: oracleStatuses.get(_oracle).latestSubmission,
          startedAt: round.startedAt,
          roundTimeout: detail.roundTimeout,
          oracleCount: oracleCount(),
        };
      } else {
        return oracleRoundStateSuggestRound(_oracle);
      }
    },
  });

  const publicFacet = Far('publicFacet', {
    getPriceAuthority() {
      return priceAuthority;
    },
  });

  return harden({ creatorFacet, publicFacet });
};

export { start };
