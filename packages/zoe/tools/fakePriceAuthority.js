// @ts-check
import { makeIssuerKit, MathKind, makeLocalAmountMath } from '@agoric/ertp';
import { makePromiseKit } from '@agoric/promise-kit';
import {
  makeNotifierKit,
  makeNotifierFromAsyncIterable,
} from '@agoric/notifier';
import { E } from '@agoric/eventual-send';
import { assert, details } from '@agoric/assert';

import { natSafeMath } from '../src/contractSupport';

import './types';
import '../exported';

/**
 * @typedef {Object} FakePriceAuthorityOptions
 * @property {AmountMath} mathIn
 * @property {AmountMath} mathOut
 * @property {Array<number>} [priceList]
 * @property {Array<[number, number]>} [tradeList]
 * @property {ERef<TimerService>} timer
 * @property {RelativeTime} [quoteInterval]
 * @property {ERef<Mint>} [quoteMint]
 * @property {Amount} [unitAmountIn]
 */

/**
 * TODO: multiple price Schedules for different goods, or for moving the price
 * in different directions?
 *
 * @param {FakePriceAuthorityOptions} options
 * @returns {Promise<PriceAuthority>}
 */
export async function makeFakePriceAuthority(options) {
  const {
    mathIn,
    mathOut,
    priceList,
    tradeList,
    timer,
    unitAmountIn = mathIn.make(1),
    quoteInterval = 1,
    quoteMint = makeIssuerKit('quote', MathKind.SET).mint,
  } = options;

  assert(
    tradeList || priceList,
    details`One of priceList or tradeList must be specified`,
  );

  const unitValueIn = mathIn.getValue(unitAmountIn);

  const comparisonQueue = [];

  let currentPriceIndex = 0;

  function currentTrade() {
    if (tradeList) {
      return tradeList[currentPriceIndex % tradeList.length];
    }
    return [unitValueIn, priceList[currentPriceIndex % priceList.length]];
  }

  /**
   * @param {Brand} brandIn
   * @param {Brand} brandOut
   */
  const assertBrands = (brandIn, brandOut) => {
    assert.equal(
      brandIn,
      mathIn.getBrand(),
      details`${brandIn} is not an expected input brand`,
    );
    assert.equal(
      brandOut,
      mathOut.getBrand(),
      details`${brandOut} is not an expected output brand`,
    );
  };

  const quoteIssuer = E(quoteMint).getIssuer();
  const quoteMath = await makeLocalAmountMath(quoteIssuer);

  /**
   * @type {NotifierRecord<Timestamp>} We need to have a notifier driven by the
   * TimerService because if the timer pushes updates to individual
   * QuoteNotifiers, we have a dependency inversion and the timer can never know
   * when the QuoteNotifier goes away.  (Don't even mention WeakRefs... they're
   * not exposed to userspace under Swingset because they're nondeterministic.)
   *
   * TODO It would be desirable to add a timestamp notifier interface to the
   * TimerService https://github.com/Agoric/agoric-sdk/issues/2002
   *
   * Caveat: even if we had a timestamp notifier, we can't use it for triggers
   * yet unless we rewrite our manualTimer tests not to depend on when exactly a
   * trigger has been fired for a given tick.
   */
  const { notifier: ticker, updater: tickUpdater } = makeNotifierKit();

  /**
   *
   * @param {Amount} amountIn
   * @param {Brand} brandOut
   * @param {Timestamp} quoteTime
   * @returns {PriceQuote}
   */
  function priceInQuote(amountIn, brandOut, quoteTime) {
    assertBrands(amountIn.brand, brandOut);
    mathIn.coerce(amountIn);
    const [tradeValueIn, tradeValueOut] = currentTrade();
    const valueOut = natSafeMath.floorDivide(
      natSafeMath.multiply(amountIn.value, tradeValueOut),
      tradeValueIn,
    );
    const quoteAmount = quoteMath.make(
      harden([
        {
          amountIn,
          amountOut: mathOut.make(valueOut),
          timer,
          timestamp: quoteTime,
        },
      ]),
    );
    const quote = harden({
      quotePayment: E(quoteMint).mintPayment(quoteAmount),
      quoteAmount,
    });
    return quote;
  }

  /**
   * @param {Brand} brandIn
   * @param {Amount} amountOut
   * @param {Timestamp} quoteTime
   * @returns {PriceQuote}
   */
  function priceOutQuote(brandIn, amountOut, quoteTime) {
    assertBrands(brandIn, amountOut.brand);
    const valueOut = mathOut.getValue(amountOut);
    const [tradeValueIn, tradeValueOut] = currentTrade();
    const valueIn = natSafeMath.ceilDivide(
      natSafeMath.multiply(valueOut, tradeValueIn),
      tradeValueOut,
    );
    return priceInQuote(mathIn.make(valueIn), amountOut.brand, quoteTime);
  }

  async function startTimer() {
    let firstTime = true;
    const handler = harden({
      wake: async t => {
        if (firstTime) {
          firstTime = false;
        } else {
          currentPriceIndex += 1;
        }
        tickUpdater.updateState(t);
        for (const req of comparisonQueue) {
          // eslint-disable-next-line no-await-in-loop
          const priceQuote = priceInQuote(req.amountIn, req.brandOut, t);
          const { amountOut: quotedOut } = priceQuote.quoteAmount.value[0];
          if (req.operator(req.math, quotedOut)) {
            req.resolve(priceQuote);
            comparisonQueue.splice(comparisonQueue.indexOf(req), 1);
          }
        }
      },
    });
    const repeater = E(timer).createRepeater(0, quoteInterval);
    return E(repeater).schedule(handler);
  }
  await startTimer();

  function resolveQuoteWhen(operator, amountIn, amountOutLimit) {
    assertBrands(amountIn.brand, amountOutLimit.brand);
    const promiseKit = makePromiseKit();
    comparisonQueue.push({
      operator,
      math: mathOut,
      amountIn,
      brandOut: amountOutLimit.brand,
      resolve: promiseKit.resolve,
    });
    return promiseKit.promise;
  }

  async function* generateQuotes(amountIn, brandOut) {
    let record = await ticker.getUpdateSince();
    while (record.updateCount) {
      // eslint-disable-next-line no-await-in-loop
      const { value: timestamp } = record; // = await E(timer).getCurrentTimestamp();
      yield priceInQuote(amountIn, brandOut, timestamp);
      // eslint-disable-next-line no-await-in-loop
      record = await ticker.getUpdateSince(record.updateCount);
    }
  }

  /** @type {PriceAuthority} */
  const priceAuthority = {
    getQuoteIssuer: (brandIn, brandOut) => {
      assertBrands(brandIn, brandOut);
      return quoteIssuer;
    },
    getTimerService: (brandIn, brandOut) => {
      assertBrands(brandIn, brandOut);
      return timer;
    },
    makeQuoteNotifier: async (amountIn, brandOut) => {
      assertBrands(amountIn.brand, brandOut);
      return makeNotifierFromAsyncIterable(generateQuotes(amountIn, brandOut));
    },
    quoteAtTime: (timeStamp, amountIn, brandOut) => {
      assertBrands(amountIn.brand, brandOut);
      const { promise, resolve } = makePromiseKit();
      E(timer).setWakeup(
        timeStamp,
        harden({
          wake: time => {
            return resolve(priceInQuote(amountIn, brandOut, time));
          },
        }),
      );
      return promise;
    },
    quoteGiven: async (amountIn, brandOut) => {
      assertBrands(amountIn.brand, brandOut);
      const timestamp = await E(timer).getCurrentTimestamp();
      return priceInQuote(amountIn, brandOut, timestamp);
    },
    quoteWanted: async (brandIn, amountOut) => {
      assertBrands(brandIn, amountOut.brand);
      const timestamp = await E(timer).getCurrentTimestamp();
      return priceOutQuote(brandIn, amountOut, timestamp);
    },
    quoteWhenGTE: (amountIn, amountOutLimit) => {
      const compareGTE = (math, amount) => math.isGTE(amount, amountOutLimit);
      return resolveQuoteWhen(compareGTE, amountIn, amountOutLimit);
    },
    quoteWhenGT: (amountIn, amountOutLimit) => {
      const compareGT = (math, amount) => !math.isGTE(amountOutLimit, amount);
      return resolveQuoteWhen(compareGT, amountIn, amountOutLimit);
    },
    quoteWhenLTE: (amountIn, amountOutLimit) => {
      const compareLTE = (math, amount) => math.isGTE(amountOutLimit, amount);
      return resolveQuoteWhen(compareLTE, amountIn, amountOutLimit);
    },
    quoteWhenLT: (amountIn, amountOutLimit) => {
      const compareLT = (math, amount) => !math.isGTE(amount, amountOutLimit);
      return resolveQuoteWhen(compareLT, amountIn, amountOutLimit);
    },
  };
  return priceAuthority;
}
