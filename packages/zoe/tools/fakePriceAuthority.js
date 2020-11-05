// ts-check

import '../exported';

import { makeIssuerKit, MathKind } from '@agoric/ertp';
import { makePromiseKit } from '@agoric/promise-kit';
import { makeNotifierKit } from '@agoric/notifier';

import { E } from '@agoric/eventual-send';
import { assert, details } from '@agoric/assert';
import { natSafeMath } from '../src/contractSupport';

import './types';

/**
 * TODO: multiple price Schedules for different goods, or for moving the price
 * in different directions?
 *
 * @param {AmonutMath} mathIn
 * @param {AmountMath} mathOut
 * @param {Array<number>} priceList
 * @param {TimerService} timer
 * @param {RelativeTime} quoteInterval
 */
export function makeFakePriceAuthority(
  mathIn,
  mathOut,
  priceList,
  timer,
  quoteInterval = 1,
) {
  const comparisonQueue = [];

  let currentPriceIndex = 0;

  function currentPrice() {
    return priceList[currentPriceIndex % priceList.length];
  }

  function* nextPrice() {
    while (true) {
      const result = currentPrice();
      currentPriceIndex += 1;
      yield result;
    }
  }
  const nextPriceGenerator = nextPrice();

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

  const {
    mint: quoteMint,
    issuer: quoteIssuer,
    amountMath: quote,
  } = makeIssuerKit('quote', MathKind.SET);

  /**
   *
   * @param {Amount} amountIn
   * @param {Brand} brandOut
   * @param {Timestamp} quoteTime
   */
  function priceInQuote(amountIn, brandOut, quoteTime) {
    assertBrands(amountIn.brand, brandOut);
    const quoteAmount = quote.make(
      harden([
        {
          amountIn,
          amountOut: mathOut.make(currentPrice() * amountIn.value),
          timer,
          timestamp: quoteTime,
        },
      ]),
    );
    return harden({
      quotePayment: quoteMint.mintPayment(quoteAmount),
      quoteAmount,
    });
  }

  /**
   * @param {Brand} brandIn
   * @param {Amount} amountOut
   * @param {Timestamp} currentTime
   */
  function priceOutQuote(brandIn, amountOut, currentTime) {
    assertBrands(brandIn, amountOut.brand);
    const desiredValue = mathOut.getValue(amountOut);
    const price = currentPrice();
    const quoteAmount = quote.make(
      harden([
        {
          amountIn: mathIn.make(natSafeMath.floorDivide(desiredValue, price)),
          amountOut,
          timer,
          timestamp: currentTime,
        },
      ]),
    );
    return harden({
      quotePayment: quoteMint.mintPayment(quoteAmount),
      quoteAmount,
    });
  }

  function startTimer() {
    const handler = harden({
      wake: async t => {
        nextPriceGenerator.next();
        for (const req of comparisonQueue) {
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
    // TODO(hibbert): getPriceNotifier
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
    // TODO: implement
    getPriceNotifier: () => {
      const { notifier } = makeNotifierKit();
      return notifier;
    },
  };
  return priceAuthority;
}
