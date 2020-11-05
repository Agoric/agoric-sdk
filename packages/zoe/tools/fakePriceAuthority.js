import { makeIssuerKit, MathKind } from '@agoric/ertp';
import { makePromiseKit } from '@agoric/promise-kit';
import { E } from '@agoric/eventual-send';
import { natSafeMath } from '../src/contractSupport';

export function makeFakePriceAuthority(amountMaths, priceList, timer) {
  const comparisonQueue = [];
  let comparisonQueueScheduled;

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

  const {
    mint: quoteMint,
    issuer: quoteIssuer,
    amountMath: quote,
  } = makeIssuerKit('quote', MathKind.SET);

  function priceInQuote(
    amountIn,
    brandOut,
    quoteTime = timer.getCurrentTimestamp(),
  ) {
    const mathOut = amountMaths.get(brandOut.getAllegedName());
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

  function priceOutQuote(currentTime, brandIn, amountOut) {
    const mathIn = amountMaths.get(brandIn.getAllegedName());
    const mathOut = amountMaths.get(amountOut.brand.getAllegedName());
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
      wake: t => {
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
    const repeater = E(timer).createRepeater(0, 1);
    E(repeater).schedule(handler);
  }
  startTimer();

  function resolveQuoteWhen(operator, amountIn, amountOutLimit) {
    const promiseKit = makePromiseKit();
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
            return resolve(priceInQuote(amountIn, brandOut, time));
          },
        }),
      );
      return promise;
    },
    quoteGiven: (amountIn, brandOut) => priceInQuote(amountIn, brandOut),
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
