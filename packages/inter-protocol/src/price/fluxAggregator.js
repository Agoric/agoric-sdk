/** @file
 * Adaptation of Chainlink algorithm to the Agoric platform.
 * Modeled on https://github.com/smartcontractkit/chainlink/blob/master/contracts/src/v0.6/FluxAggregator.sol (version?)
 */
import { Fail } from '@agoric/assert';
import { AmountMath } from '@agoric/ertp';
import { assertAllDefined, makeTracer } from '@agoric/internal';
import {
  makeNotifierFromSubscriber,
  observeNotifier,
  pipeTopicToStorage,
  prepareDurablePublishKit,
} from '@agoric/notifier';
import { makeScalarBigMapStore } from '@agoric/vat-data';
import {
  makeOnewayPriceAuthorityKit,
  makeStorageNodePathProvider,
} from '@agoric/zoe/src/contractSupport/index.js';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { makeOracleAdminKit } from './priceOracleKit.js';
import { makeRoundsManagerKit } from './roundsManager.js';

const trace = makeTracer('FlxAgg', false);

export const INVITATION_MAKERS_DESC = 'oracle invitation';

/**
 * @typedef {import('@agoric/vat-data').Baggage} Baggage
 * @typedef {import('@agoric/time/src/types').Timestamp} Timestamp
 * @typedef {import('@agoric/time/src/types').RelativeTime} RelativeTime
 * // TODO: use RelativeTime, not RelativeTimeValue
 * @typedef {import('@agoric/time/src/types').RelativeTimeValue} RelativeTimeValue
 * @typedef {import('@agoric/time/src/types').TimerService} TimerService
 */

/** @type {(quote: PriceQuote) => PriceDescription} */
const priceDescriptionFromQuote = quote => quote.quoteAmount.value[0];

/**
 * @typedef {object} RoundState
 * @property {boolean} eligibleForSpecificRound
 * @property {bigint} queriedRoundId
 * @property {bigint} latestSubmission
 * @property {Timestamp} startedAt
 * @property {number} roundTimeout
 * @property {number} oracleCount
 */

// Partly documented at https://github.com/smartcontractkit/chainlink/blob/b045416ebca769aa69bde2da23b5109abe07a8b5/contracts/src/v0.6/FluxAggregator.sol#L153
/**
 * @typedef {object} ChainlinkConfig
 * @property {number} maxSubmissionCount
 * @property {number} minSubmissionCount
 * @property {RelativeTimeValue} restartDelay the number of rounds an Oracle has to wait before they can initiate a round
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
 * @param {Baggage} baggage
 * @param {ZCF<ChainlinkConfig & {
 * timer: TimerService,
 * brandIn: Brand<'nat'>,
 * brandOut: Brand<'nat'>,
 * unitAmountIn?: Amount<'nat'>,
 * }>} zcf
 * @param {TimerService} timerPresence
 * @param {IssuerRecord<'set'> & { mint: Mint<'set'> }} quoteKit
 * @param {StorageNode} storageNode
 * @param {Marshaller} marshaller
 */
export const provideFluxAggregator = (
  baggage,
  zcf,
  timerPresence,
  quoteKit,
  storageNode,
  marshaller,
) => {
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
    unitAmountIn,
  });

  const makeDurablePublishKit = prepareDurablePublishKit(
    baggage,
    'Price Aggregator publish kit',
  );

  let pushIsPaused = false;

  // For publishing priceAuthority values to off-chain storage
  /** @type {PublishKit<PriceDescription>} */
  const { publisher: pricePublisher, subscriber: quoteSubscriber } =
    makeDurablePublishKit();
  pipeTopicToStorage(quoteSubscriber, storageNode, marshaller);

  /** @type {PublishKit<import('./roundsManager.js').LatestRound>} */
  const { publisher: latestRoundPublisher, subscriber: latestRoundSubscriber } =
    makeDurablePublishKit();
  const latestRoundStorageNode = E(storageNode).makeChildNode('latestRound');
  pipeTopicToStorage(latestRoundSubscriber, latestRoundStorageNode, marshaller);

  const memoizedPath = makeStorageNodePathProvider(baggage);

  /** @type {MapStore<string, import('./priceOracleKit.js').OracleKit>} */
  const oracles = makeScalarBigMapStore('oracles', {
    durable: true,
  });

  // --- [end] Chainlink specific values

  /**
   * This is just a signal that there's a new answer, which is read from `lastValueOutForUnitIn`
   *
   * @type {PublishKit<void>}
   */
  const { publisher: answerPublisher, subscriber: answerSubscriber } =
    makeDurablePublishKit();

  const roundsManagerKit = makeRoundsManagerKit(
    harden({
      answerPublisher,
      brandIn,
      brandOut,
      latestRoundPublisher,
      minSubmissionCount,
      maxSubmissionCount,
      minSubmissionValue,
      maxSubmissionValue,
      quoteKit,
      restartDelay,
      timerPresence,
      timeout,
      unitAmountIn,
    }),
  );

  const { priceAuthority } = makeOnewayPriceAuthorityKit({
    createQuote: roundsManagerKit.contract.makeCreateQuote(),
    notifier: makeNotifierFromSubscriber(answerSubscriber),
    quoteIssuer: quoteKit.issuer,
    timer: timerPresence,
    actualBrandIn: brandIn,
    actualBrandOut: brandOut,
  });

  // for each new quote from the priceAuthority, publish it to off-chain storage
  void observeNotifier(
    priceAuthority.makeQuoteNotifier(unitAmountIn, brandOut),
    {
      updateState: quote =>
        pricePublisher.publish(priceDescriptionFromQuote(quote)),
      fail: reason => {
        throw Error(`priceAuthority observer failed: ${reason}`);
      },
      finish: done => {
        throw Error(`priceAuthority observer died: ${done}`);
      },
    },
  );

  const creatorFacet = Far('PriceAggregatorChainlinkCreatorFacet', {
    /**
     * An "oracle invitation" is an invitation to be able to submit data to
     * include in the priceAggregator's results.
     *
     * The offer result from this invitation is a OracleAdmin, which can be used
     * directly to manage the price submissions as well as to terminate the
     * relationship.
     *
     * @param {string} oracleId unique per contract instance
     */
    makeOracleInvitation: async oracleId => {
      trace('makeOracleInvitation', oracleId);
      /**
       * If custom arguments are supplied to the `zoe.offer` call, they can
       * indicate an OraclePriceSubmission notifier and a corresponding
       * `shiftValueOut` that should be adapted as part of the priceAuthority's
       * reported data.
       *
       * @param {ZCFSeat} seat
       */
      const offerHandler = async seat => {
        const { oracle } = await creatorFacet.initOracle(oracleId);
        const invitationMakers = Far('invitation makers', {
          /** @param {import('./roundsManager.js').PriceRound} result */
          PushPrice(result) {
            if (pushIsPaused) {
              Fail`cannot PushPrice until unpaused`;
            }
            return zcf.makeInvitation(
              /** @param {ZCFSeat} cSeat */
              async cSeat => {
                cSeat.exit();
                await oracle.pushPrice(result);
              },
              'PushPrice',
            );
          },
        });
        seat.exit();

        return harden({
          invitationMakers,
          oracle,
        });
      };

      return zcf.makeInvitation(offerHandler, INVITATION_MAKERS_DESC);
    },
    /** @param {string} oracleId */
    removeOracle: async oracleId => {
      trace('deleteOracle', oracleId);
      const kit = oracles.get(oracleId);
      kit.admin.disable();
      oracles.delete(oracleId);
    },

    getRoundData: roundIdRaw => {
      return roundsManagerKit.contract.getRoundData(roundIdRaw);
    },

    /** @param {string} oracleId */
    async initOracle(oracleId) {
      trace('initOracle', oracleId);
      assert.typeof(oracleId, 'string');

      const oracleKit = makeOracleAdminKit(
        harden({
          minSubmissionValue,
          maxSubmissionValue,
          oracleId, // must be unique per vat
          roundPowers: roundsManagerKit.oracle,
          timer: timerPresence,
        }),
      );
      oracles.init(oracleId, oracleKit);

      return oracleKit;
    },

    /**
     * a method to provide all current info oracleStatuses need. Intended only
     * only to be callable by oracleStatuses. Not for use by contracts to read state.
     *
     * @param {string} oracleId
     * @param {bigint} queriedRoundId
     * @returns {Promise<RoundState>}
     */
    async oracleRoundState(oracleId, queriedRoundId) {
      const blockTimestamp = await E(timerPresence).getCurrentTimestamp();
      const status = await E(oracles.get(oracleId).oracle).getStatus();

      const oracleCount = oracles.getSize();

      const { contract } = roundsManagerKit;
      if (queriedRoundId > 0) {
        const roundStatus = contract.getRoundStatus(queriedRoundId);
        return {
          eligibleForSpecificRound: contract.eligibleForSpecificRound(
            status,
            queriedRoundId,
            blockTimestamp,
          ),
          queriedRoundId,
          latestSubmission: status.latestSubmission,
          startedAt: roundStatus.startedAt,
          roundTimeout: roundStatus.roundTimeout,
          oracleCount,
        };
      } else {
        return {
          ...contract.oracleRoundStateSuggestRound(status, blockTimestamp),
          oracleCount,
        };
      }
    },

    /**
     * Pause (or unpause) whether PushPrice offers can proceed
     *
     * @param {boolean} paused
     */
    setPaused(paused) {
      pushIsPaused = paused;
    },
  });

  const publicFacet = Far('publicFacet', {
    getPriceAuthority() {
      return priceAuthority;
    },
    /** @deprecated use getPublicTopics */
    getSubscriber: () => {
      return quoteSubscriber;
    },
    /** @deprecated use getPublicTopics */
    getRoundStartNotifier() {
      return latestRoundSubscriber;
    },
    getPublicTopics() {
      return {
        quotes: {
          description: 'Quotes from this price aggregator',
          subscriber: quoteSubscriber,
          storagePath: memoizedPath(storageNode),
        },
        latestRound: {
          description: 'Notification of each round',
          subscriber: latestRoundSubscriber,
          storagePath: memoizedPath(latestRoundStorageNode),
        },
      };
    },
  });

  return harden({ creatorFacet, publicFacet });
};
harden(provideFluxAggregator);
/** @typedef {ReturnType<typeof provideFluxAggregator>} FluxAggregator */
