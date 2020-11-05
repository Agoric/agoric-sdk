// @ts-check
import { makeIssuerKit, MathKind, makeLocalAmountMath } from '@agoric/ertp';
import { makePromiseKit } from '@agoric/promise-kit';
import { E } from '@agoric/eventual-send';
import { assert, details } from '@agoric/assert';
import { makeNotifierKit } from '@agoric/notifier';
import { natSafeMath } from '../src/contractSupport';

import './types';

/**
 * @typedef {Object} FakePriceAuthorityOptions
 * @property {AmountMath} mathIn
 * @property {AmountMath} mathOut
 * @property {Array<number>} priceList
 * @property {ERef<TimerService>} timer
 * @property {RelativeTime} [quoteInterval]
 * @property {ERef<Mint>} [quoteMint]
 * @property {Amount} [unitAmountIn]
 */

/**
 * @param {FakePriceAuthorityOptions} options
 * @returns {Promise<PriceAuthority>}
 */
export async function makeFakePriceAuthority(options) {
  const {
    mathIn,
    mathOut,
    priceList,
    timer,
    unitAmountIn = mathIn.make(1),
    quoteInterval = 1,
    quoteMint = makeIssuerKit('quote', MathKind.SET).mint,
  } = options;

  const unitValueIn = mathIn.getValue(unitAmountIn);

  const comparisonQueue = [];

  let currentPriceIndex = 0;

  function currentPrice() {
    return priceList[currentPriceIndex % priceList.length];
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

  /** @type {NotifierRecord<PriceQuote>} */
  const { notifier, updater } = makeNotifierKit();

  /**
   *
   * @param {Amount} amountIn
   * @param {Brand} brandOut
   * @param {Timestamp} quoteTime
   * @returns {PriceQuote}
   */
  function priceInQuote(amountIn, brandOut, quoteTime) {
    assertBrands(amountIn.brand, brandOut);
    const quoteAmount = quoteMath.make(
      harden([
        {
          amountIn,
          amountOut: mathOut.make(
            natSafeMath.floorDivide(
              currentPrice() * amountIn.value,
              unitValueIn,
            ),
          ),
          timer,
          timestamp: quoteTime,
        },
      ]),
    );
    const quote = harden({
      quotePayment: E(quoteMint).mintPayment(quoteAmount),
      quoteAmount,
    });
    updater.updateState(quote);
    return quote;
  }

  /**
   * @param {Brand} brandIn
   * @param {Amount} amountOut
   * @param {Timestamp} currentTime
   * @returns {PriceQuote}
   */
  function priceOutQuote(brandIn, amountOut, currentTime) {
    assertBrands(brandIn, amountOut.brand);
    const desiredValue = mathOut.getValue(amountOut);
    const price = currentPrice();
    const quoteAmount = quoteMath.make(
      harden([
        {
          amountIn: mathIn.make(natSafeMath.floorDivide(desiredValue, price)),
          amountOut,
          timer,
          timestamp: currentTime,
        },
      ]),
    );
    const quote = harden({
      quotePayment: E(quoteMint).mintPayment(quoteAmount),
      quoteAmount,
    });
    updater.updateState(quote);
    return quote;
  }

  function startTimer() {
    let firstTime = true;
    const handler = harden({
      wake: async t => {
        if (firstTime) {
          firstTime = false;
        } else {
          currentPriceIndex += 1;
        }
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
    E(repeater).schedule(handler);
  }
  startTimer();

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
    getPriceNotifier: async (brandIn, brandOut) => {
      assertBrands(brandIn, brandOut);
      return notifier;
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
