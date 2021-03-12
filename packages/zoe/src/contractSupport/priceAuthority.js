import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { assert, details as X } from '@agoric/assert';
import { makePromiseKit } from '@agoric/promise-kit';

import '../../exported';

/**
 * @callback CompareAmount
 * @param {DeprecatedAmountMath} math
 * @param {Amount} amount
 * @param {Amount} amountLimit
 * @returns {boolean}
 */

/** @type {CompareAmount} */
const isLT = (math, amountOut, amountLimit) =>
  !math.isGTE(amountOut, amountLimit);

/** @type {CompareAmount} */
const isLTE = (math, amount, amountLimit) => math.isGTE(amountLimit, amount);

/** @type {CompareAmount} */
const isGTE = (math, amount, amountLimit) => math.isGTE(amount, amountLimit);

/** @type {CompareAmount} */
const isGT = (math, amount, amountLimit) => !math.isGTE(amountLimit, amount);

/**
 * @typedef {Object} OnewayPriceAuthorityOptions
 * @property {Issuer} quoteIssuer
 * @property {DeprecatedAmountMath} mathIn
 * @property {DeprecatedAmountMath} mathOut
 * @property {Notifier<PriceQuote>} notifier
 * @property {TimerService} timer
 * @property {PriceQuoteCreate} createQuote
 */

/**
 * @callback Trigger
 * @param {Timestamp} timestamp
 * @returns {Promise<void>}
 */

/**
 * @param {OnewayPriceAuthorityOptions} opts
 * @returns {PriceAuthorityKit}
 */
export function makeOnewayPriceAuthorityKit(opts) {
  const { timer, createQuote, mathIn, mathOut, quoteIssuer, notifier } = opts;

  const paBrandIn = mathIn.getBrand();
  const paBrandOut = mathOut.getBrand();

  let haveFirstQuote = false;
  notifier.getUpdateSince().then(_ => (haveFirstQuote = true));

  /** @type {Set<Trigger>} */
  const triggers = new Set();

  /**
   * @param {PriceQuoteCreate} triggerCreateQuote
   * @returns {Promise<void>}
   */
  const fireTriggers = async triggerCreateQuote => {
    if (!haveFirstQuote) {
      return;
    }
    await Promise.all(
      [...triggers].map(trigger => trigger(triggerCreateQuote)),
    );
  };

  /**
   * Create a quoteWhen* function.
   *
   * @param {CompareAmount} compareAmount
   */
  const makeQuoteWhenOut = compareAmount =>
    /**
     * Return a quote when triggerWhen is true of the arguments.
     *
     * @param {Amount} amountIn the input value to the calcAmountTrigger
     * @param {Amount} amountOutLimit the value to compare with the output
     * of calcAmountTrigger
     */
    async function quoteWhenOutTrigger(amountIn, amountOutLimit) {
      mathIn.coerce(amountIn);
      mathOut.coerce(amountOutLimit);

      /** @type {PromiseRecord<PriceQuote>} */
      const triggerPK = makePromiseKit();

      /** @type {PriceQuoteTrigger} */
      const trigger = async createInstantQuote => {
        try {
          const quoteP = createInstantQuote(calcAmountOut => {
            if (!triggers.has(trigger)) {
              // Already fired.
              return undefined;
            }
            const amountOut = calcAmountOut(amountIn);

            if (!compareAmount(mathOut, amountOut, amountOutLimit)) {
              // Don't fire the trigger yet.
              return undefined;
            }

            // Generate the quote.
            return { amountIn, amountOut };
          });

          if (!quoteP) {
            // We shouldn't resolve yet.
            return;
          }

          triggers.delete(trigger);
          triggerPK.resolve(quoteP);
        } catch (e) {
          // Trigger failed, so reject and drop.
          triggerPK.reject(e);
          triggers.delete(trigger);
        }
      };

      triggers.add(trigger);

      // Fire now, just in case.
      await trigger(createQuote);

      return triggerPK.promise;
    };

  /**
   * Ensure that the brandIn/brandOut pair is supported.
   *
   * @param {Brand} brandIn
   * @param {Brand} brandOut
   */
  const assertBrands = (brandIn, brandOut) => {
    assert.equal(
      brandIn,
      paBrandIn,
      X`Desired brandIn ${brandIn} must match ${paBrandIn}`,
    );
    assert.equal(
      brandOut,
      paBrandOut,
      X`Desired brandOut ${brandOut} must match ${paBrandOut}`,
    );
  };

  /** @type {PriceAuthority} */
  const priceAuthority = Far('PriceAuthority', {
    getQuoteIssuer(brandIn, brandOut) {
      assertBrands(brandIn, brandOut);
      return quoteIssuer;
    },
    getTimerService(brandIn, brandOut) {
      assertBrands(brandIn, brandOut);
      return timer;
    },
    getPriceNotifier(brandIn, brandOut) {
      assertBrands(brandIn, brandOut);
      return notifier;
    },
    async quoteGiven(amountIn, brandOut) {
      mathIn.coerce(amountIn);
      assertBrands(amountIn.brand, brandOut);

      await notifier.getUpdateSince();
      return createQuote(calcAmountOut => ({
        amountIn,
        amountOut: calcAmountOut(amountIn),
      }));
    },
    async quoteWanted(brandIn, amountOut) {
      mathOut.coerce(amountOut);
      assertBrands(brandIn, amountOut.brand);

      await notifier.getUpdateSince();
      return createQuote((calcAmountOut, calcAmountIn) => {
        // We need to determine an amountIn that guarantees at least the amountOut.
        const amountIn = calcAmountIn(amountOut);
        const actualAmountOut = calcAmountOut(amountIn);

        assert(
          mathOut.isGTE(actualAmountOut, amountOut),
          X`Calculation of ${actualAmountOut} didn't cover expected ${amountOut}`,
        );
        return { amountIn, amountOut };
      });
    },
    async quoteAtTime(deadline, amountIn, brandOut) {
      assert.typeof(deadline, 'bigint');
      mathIn.coerce(amountIn);
      assertBrands(amountIn.brand, brandOut);

      await notifier.getUpdateSince();
      const quotePK = makePromiseKit();
      await E(timer).setWakeup(
        deadline,
        Far('wakeObj', {
          async wake(timestamp) {
            try {
              const quoteP = createQuote(calcAmountOut => ({
                amountIn,
                amountOut: calcAmountOut(amountIn),
                timestamp,
              }));

              // We don't wait for the quote to be authenticated; resolve
              // immediately.
              quotePK.resolve(quoteP);
              await quotePK.promise;
            } catch (e) {
              quotePK.reject(e);
            }
          },
        }),
      );

      // Wait until the wakeup passes.
      return quotePK.promise;
    },
    quoteWhenLT: makeQuoteWhenOut(isLT),
    quoteWhenLTE: makeQuoteWhenOut(isLTE),
    quoteWhenGTE: makeQuoteWhenOut(isGTE),
    quoteWhenGT: makeQuoteWhenOut(isGT),
  });

  return { priceAuthority, adminFacet: { fireTriggers } };
}
