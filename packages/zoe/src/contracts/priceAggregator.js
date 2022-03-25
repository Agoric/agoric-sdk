// @ts-check

import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { makeNotifierKit } from '@agoric/notifier';
import { makeLegacyMap } from '@agoric/store';
import { Nat, isNat } from '@agoric/nat';
import { AmountMath } from '@agoric/ertp';
import { assert, details as X } from '@agoric/assert';
import {
  calculateMedian,
  natSafeMath,
  makeOnewayPriceAuthorityKit,
} from '../contractSupport/index.js';

import '../../tools/types.js';

const { add, multiply, floorDivide, ceilDivide, isGTE } = natSafeMath;

/**
 * This contract aggregates price values from a set of oracles and provides a
 * PriceAuthority for their median.
 *
 * @param {ZCF<{
 * timer: TimerService,
 * POLL_INTERVAL: bigint,
 * brandIn: Brand,
 * brandOut: Brand,
 * unitAmountIn: Amount,
 * }>} zcf
 */
const start = async zcf => {
  const {
    timer,
    POLL_INTERVAL,
    brandIn,
    brandOut,
    unitAmountIn = AmountMath.make(brandIn, 1n),
  } = zcf.getTerms();

  const unitIn = AmountMath.getValue(brandIn, unitAmountIn);

  /** @type {IssuerRecord & { mint: ERef<Mint> }} */
  let quoteKit;

  /** @type {PriceAuthority} */
  let priceAuthority;

  /** @type {PriceAuthorityAdmin} */
  let priceAuthorityAdmin;

  /** @type {bigint} */
  let lastValueOutForUnitIn;

  /**
   *
   * @param {PriceQuoteValue} quote
   */
  const authenticateQuote = async quote => {
    const quoteAmount = AmountMath.make(quoteKit.brand, harden(quote));
    const quotePayment = await E(quoteKit.mint).mintPayment(quoteAmount);
    return harden({ quoteAmount, quotePayment });
  };

  const { notifier, updater } = makeNotifierKit();
  const zoe = zcf.getZoeService();

  /**
   * @typedef {Object} OracleRecord
   * @property {(timestamp: Timestamp) => Promise<void>=} querier
   * @property {bigint} lastSample
   */

  /** @type {Set<OracleRecord>} */
  const oracleRecords = new Set();

  /** @type {LegacyMap<Instance, Set<OracleRecord>>} */
  // Legacy because we're storing a raw JS Set
  const instanceToRecords = makeLegacyMap('oracleInstance');

  let publishedTimestamp = await E(timer).getCurrentTimestamp();

  // Wake every POLL_INTERVAL and run the queriers.
  const repeaterP = E(timer).makeRepeater(0n, POLL_INTERVAL);
  /** @type {TimerWaker} */
  const waker = Far('waker', {
    async wake(timestamp) {
      // Run all the queriers.
      const querierPs = [];
      const samples = [];
      oracleRecords.forEach(({ querier, lastSample }) => {
        if (querier) {
          querierPs.push(querier(timestamp));
        }
        // Push result.
        samples.push(lastSample);
      });
      if (!querierPs.length) {
        // Only have push results, so publish them.
        // eslint-disable-next-line no-use-before-define
        querierPs.push(updateQuote(samples, timestamp));
      }
      await Promise.all(querierPs).catch(console.error);
    },
  });
  E(repeaterP).schedule(waker);

  /**
   * @param {Object} param0
   * @param {bigint} [param0.overrideValueOut]
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
        const valueIn = AmountMath.getValue(brandIn, amountIn);
        return AmountMath.make(
          brandOut,
          floorDivide(multiply(valueIn, valueOutForUnitIn), unitIn),
        );
      };

      /**
       * @param {Amount} amountOut the wanted amountOut
       * @returns {Amount} the amountIn needed to give
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
   * @param {Array<bigint>} samples
   * @param {Timestamp} timestamp
   */
  const updateQuote = async (samples, timestamp) => {
    const median = calculateMedian(
      samples.filter(sample => isNat(sample) && sample > 0n),
      { add, divide: floorDivide, isGTE },
    );

    if (median === undefined) {
      return;
    }

    const amountOut = AmountMath.make(brandOut, median);

    /** @type {PriceDescription} */
    const quote = {
      amountIn: unitAmountIn,
      amountOut,
      timer,
      timestamp,
    };

    // Authenticate the quote by minting it with our quote issuer, then publish.
    const authenticatedQuote = await authenticateQuote([quote]);

    // Fire any triggers now; we don't care if the timestamp is fully ordered,
    // only if the limit has ever been met.
    await priceAuthorityAdmin.fireTriggers(
      makeCreateQuote({ overrideValueOut: median, timestamp }),
    );

    if (timestamp < publishedTimestamp) {
      // A more recent timestamp has been published already, so we are too late.
      return;
    }

    // Publish a new authenticated quote.
    publishedTimestamp = timestamp;
    lastValueOutForUnitIn = median;
    updater.updateState(authenticatedQuote);
  };

  /** @type {PriceAggregatorCreatorFacet} */
  const creatorFacet = Far('PriceAggregatorCreatorFacet', {
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
      ({ priceAuthority, adminFacet: priceAuthorityAdmin } = paKit);
    },
    makeOracleInvitation: async () => {
      /** @type {OfferHandler<OracleAdmin>} */
      const offerHandler = async (
        seat,
        { notifier: oracleNotifier, scaleValueOut = 1 } = {},
      ) => {
        const admin = await creatorFacet.initOracle();
        seat.exit();
        if (!oracleNotifier) {
          // No notifier to track, just let them have the direct admin.
          return admin;
        }

        // Adapt the notifier to push results.
        const recurse = ({ value, updateCount }) => {
          if (!oracleNotifier || !updateCount) {
            // Interrupt the cycle because we either are deleted or the notifier
            // finished.
            return;
          }
          // Queue the next update.
          E(oracleNotifier).getUpdateSince(updateCount).then(recurse);

          // See if we have associated parameters or just a raw value.
          const data = value.data || value;

          // Push the current scaled result.
          const scaledData = Math.floor(parseInt(data, 10) * scaleValueOut);
          const newData = BigInt(scaledData);

          if (value.data) {
            // We have some associated parameters to push.
            const newValue = { ...value, data: newData };
            admin.pushResult(newValue).catch(console.error);
          } else {
            admin.pushResult(newData).catch(console.error);
          }
        };

        // Start the notifier.
        E(oracleNotifier).getUpdateSince().then(recurse);

        return Far('oracleAdmin', {
          ...admin,
          delete: async () => {
            // Stop tracking the notifier on delete.
            oracleNotifier = undefined;
            return admin.delete();
          },
        });
      };

      return zcf.makeInvitation(offerHandler, 'oracle invitation');
    },
    async initOracle(oracleInstance = undefined, query = undefined) {
      assert(quoteKit, X`Must initializeQuoteMint before adding an oracle`);

      const oracleKey = oracleInstance || Far('fresh key');

      /** @type {OracleRecord} */
      const record = { querier: undefined, lastSample: 0n };

      /** @type {Set<OracleRecord>} */
      let records;
      if (instanceToRecords.has(oracleKey)) {
        records = instanceToRecords.get(oracleKey);
      } else {
        records = new Set();
        instanceToRecords.init(oracleKey, records);
      }
      records.add(record);
      oracleRecords.add(record);

      const pushResult = result => {
        // Sample of NaN, 0, or negative numbers get culled in the median
        // calculation.
        const sample = Nat(parseInt(result, 10));
        record.lastSample = sample;
      };

      /** @type {OracleAdmin} */
      const oracleAdmin = Far('OracleAdmin', {
        async delete() {
          assert(records.has(record), X`Oracle record is already deleted`);

          // The actual deletion is synchronous.
          oracleRecords.delete(record);
          records.delete(record);

          if (
            records.size === 0 &&
            instanceToRecords.has(oracleKey) &&
            instanceToRecords.get(oracleKey) === records
          ) {
            // We should remove the entry entirely, as it is empty.
            instanceToRecords.delete(oracleKey);
          }

          // Delete complete, so try asynchronously updating the quote.
          const deletedNow = await E(timer).getCurrentTimestamp();
          await updateQuote(
            [...oracleRecords].map(({ lastSample }) => lastSample),
            deletedNow,
          );
        },
        async pushResult(result) {
          // Sample of NaN, 0, or negative numbers get culled in
          // the median calculation.
          pushResult(result);
        },
      });

      if (query === undefined) {
        // They don't want to be polled.
        return oracleAdmin;
      }

      // Obtain the oracle's publicFacet.
      assert(oracleInstance);
      const oracle = await E(zoe).getPublicFacet(oracleInstance);
      assert(records.has(record), X`Oracle record is already deleted`);

      let lastWakeTimestamp = 0n;

      /**
       * @param {Timestamp} timestamp
       */
      record.querier = async timestamp => {
        // Submit the query.
        const result = await E(oracle).query(query);
        // Now that we've received the result, check if we're out of date.
        if (timestamp < lastWakeTimestamp || !records.has(record)) {
          return;
        }
        lastWakeTimestamp = timestamp;

        pushResult(result);
        await updateQuote(
          [...oracleRecords].map(({ lastSample }) => lastSample),
          timestamp,
        );
      };
      const now = await E(timer).getCurrentTimestamp();
      await record.querier(now);

      // Return the oracle admin object.
      return oracleAdmin;
    },
  });

  const publicFacet = Far('publicFacet', {
    getPriceAuthority() {
      return priceAuthority;
    },
    async getRoundStartNotifier() {
      return undefined;
    },
  });

  return harden({ creatorFacet, publicFacet });
};

export { start };
