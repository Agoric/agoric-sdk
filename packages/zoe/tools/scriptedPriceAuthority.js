// @ts-check

import { amountMath, makeIssuerKit, MathKind } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { observeNotifier } from '@agoric/notifier';
import {
  natSafeMath,
  makeOnewayPriceAuthorityKit,
} from '../src/contractSupport';

export function makeScriptedPriceAuthority(options) {
  const {
    actualBrandIn,
    actualBrandOut,
    priceList,
    timer,
    unitAmountIn = amountMath.make(1n, actualBrandIn),
    quoteInterval = 1n,
    quoteIssuerKit = makeIssuerKit('quote', MathKind.SET),
  } = options;
  const { brand, issuer: quoteIssuer, mint: quoteMint } = quoteIssuerKit;
  let currentPrice = priceList[0];

  /** @param {PriceQuoteValue} quote */
  const authenticateQuote = quote => {
    const quoteAmount = amountMath.make(quote, brand);
    const quotePayment = quoteMint.mintPayment(quoteAmount);
    return harden({ quoteAmount, quotePayment });
  };

  const calcAmountOut = amountIn => {
    amountMath.coerce(actualBrandIn, amountIn);

    return amountMath.make(
      natSafeMath.floorDivide(
        natSafeMath.multiply(currentPrice, amountIn.value),
        unitAmountIn.value,
      ),
      actualBrandOut,
    );
  };
  const calcAmountIn = amountOut => {
    amountMath.coerce(actualBrandOut, amountOut);
    return amountMath.make(
      natSafeMath.floorDivide(
        natSafeMath.multiply(unitAmountIn.value, amountOut.value),
        currentPrice,
      ),
      actualBrandOut,
    );
  };

  function createQuote(priceQuery) {
    const quote = priceQuery(calcAmountOut, calcAmountIn);
    if (!quote) {
      return undefined;
    }

    const { amountIn, amountOut } = quote;
    return E(timer)
      .getCurrentTimestamp()
      .then(now =>
        authenticateQuote([{ amountIn, amountOut, timer, timestamp: now }]),
      );
  }

  const notifier = timer.makeNotifier(0n, 1n);

  const priceAuthorityOptions = harden({
    timer,
    createQuote,
    actualBrandIn,
    actualBrandOut,
    quoteIssuer,
    notifier,
  });

  const {
    priceAuthority,
    adminFacet: { fireTriggers },
  } = makeOnewayPriceAuthorityKit(priceAuthorityOptions);

  const priceObserver = Far('priceObserver', {
    updateState: t => {
      currentPrice =
        priceList[Number(t) % (priceList.length * Number(quoteInterval))];

      fireTriggers(createQuote);
    },
  });
  observeNotifier(notifier, priceObserver);

  return priceAuthority;
}
