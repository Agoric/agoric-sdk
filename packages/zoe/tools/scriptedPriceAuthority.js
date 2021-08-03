// @ts-check

import { AmountMath, makeIssuerKit, AssetKind } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { observeNotifier } from '@agoric/notifier';
import {
  natSafeMath,
  makeOnewayPriceAuthorityKit,
} from '../src/contractSupport.js';

export function makeScriptedPriceAuthority(options) {
  const {
    actualBrandIn,
    actualBrandOut,
    priceList,
    timer,
    unitAmountIn = AmountMath.make(1n, actualBrandIn),
    quoteInterval = 1n,
    quoteIssuerKit = makeIssuerKit('quote', AssetKind.SET),
  } = options;
  const { brand, issuer: quoteIssuer, mint: quoteMint } = quoteIssuerKit;
  let currentPrice = priceList[0];

  /** @param {PriceQuoteValue} quote */
  const authenticateQuote = quote => {
    const quoteAmount = AmountMath.make(quote, brand);
    const quotePayment = quoteMint.mintPayment(quoteAmount);
    return harden({ quoteAmount, quotePayment });
  };

  const calcAmountOut = amountIn => {
    AmountMath.coerce(actualBrandIn, amountIn);

    return AmountMath.make(
      natSafeMath.floorDivide(
        natSafeMath.multiply(currentPrice, amountIn.value),
        unitAmountIn.value,
      ),
      actualBrandOut,
    );
  };
  const calcAmountIn = amountOut => {
    AmountMath.coerce(actualBrandOut, amountOut);
    return AmountMath.make(
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

  /** @type {ERef<Notifier<Timestamp>>} */
  const notifier = E(timer).makeNotifier(0n, quoteInterval);
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
        priceList[Number(Number(t / quoteInterval) % priceList.length)];

      fireTriggers(createQuote);
    },
  });
  observeNotifier(notifier, priceObserver);

  return priceAuthority;
}
