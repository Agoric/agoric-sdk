import { makeIssuerKit, MathKind } from '@agoric/ertp';
import { makePromiseKit } from '@agoric/promise-kit';
import { E } from '@agoric/eventual-send';
import { natSafeMath } from '../src/contractSupport';

// TODO: multiple price Schedules for different goods, or for moving the price
// in different directions?
export function makeFakePriceAuthority(amountMaths, priceSchedule, timer) {
  const comparisonQueue = [];
  let comparisonQueueScheduled;

  const {
    mint: quoteMint,
    issuer: quoteIssuer,
    amountMath: quote,
  } = makeIssuerKit('quote', MathKind.SET);

  function priceFromSchedule(targetTime) {
    let freshestPrice = 0;
    let freshestTime = -1;
    for (const tick of priceSchedule) {
      if (tick.time > freshestTime && tick.time <= targetTime) {
        freshestTime = tick.time;
        freshestPrice = tick.price;
      }
    }
    return freshestPrice;
  }

  function priceInQuote(currentTime, amountIn, brandOut) {
    const mathOut = amountMaths.get(brandOut.getAllegedName());
    const price = priceFromSchedule(currentTime);
    const quoteAmount = quote.make(
      harden([
        {
          amountIn,
          amountOut: mathOut.make(price * amountIn.value),
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

  function priceOutQuote(currentTime, brandIn, amountOut) {
    const mathIn = amountMaths.get(brandIn.getAllegedName());
    const mathOut = amountMaths.get(amountOut.brand.getAllegedName());
    const desiredValue = mathOut.getValue(amountOut);
    const price = priceFromSchedule(currentTime);
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
    if (comparisonQueueScheduled) {
      return;
    }

    comparisonQueueScheduled = true;
    const repeater = E(timer).createRepeater(0, 1);
    const handler = harden({
      wake: t => {
        for (const req of comparisonQueue) {
          const priceQuote = priceInQuote(t, req.amountIn, req.brandOut);
          const { amountOut: quotedOut } = priceQuote.quoteAmount.value[0];
          if (req.operator(req.math, quotedOut)) {
            req.resolve(priceQuote);
            comparisonQueue.splice(comparisonQueue.indexOf(req), 1);
          }
        }
      },
    });
    E(repeater).schedule(handler);
  }

  function resolveQuoteWhen(operator, amountIn, amountOutLimit) {
    const promiseKit = makePromiseKit();
    startTimer();
    comparisonQueue.push({
      operator,
      math: amountMaths.get(amountOutLimit.brand.getAllegedName()),
      amountIn,
      brandOut: amountOutLimit.brand,
      resolve: promiseKit.resolve,
    });
    return promiseKit.promise;
  }

  /** @type {PriceAuthority} */
  const priceAuthority = {
    getQuoteIssuer: () => quoteIssuer,
    getTimerService: () => timer,
    // TODO(hibbert): getPriceNotifier
    quoteAtTime: (timeStamp, amountIn, brandOut) => {
      const { promise, resolve } = makePromiseKit();
      E(timer).setWakeup(
        timeStamp,
        harden({
          wake: time => {
            return resolve(priceInQuote(time, amountIn, brandOut));
          },
        }),
      );
      return promise;
    },
    quoteGiven: (amountIn, brandOut) =>
      priceInQuote(timer.getCurrentTimestamp(), amountIn, brandOut),
    quoteWanted: (brandIn, amountOut) =>
      priceOutQuote(timer.getCurrentTimestamp(), brandIn, amountOut),
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
