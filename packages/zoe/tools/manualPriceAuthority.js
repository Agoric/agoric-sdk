// @ts-check

import { AmountMath, makeIssuerKit, AssetKind } from '@agoric/ertp';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { makeNotifierKit } from '@agoric/notifier';
import {
  makeOnewayPriceAuthorityKit,
  floorMultiplyBy,
  floorDivideBy,
} from '../src/contractSupport/index.js';

export function makeManualPriceAuthority(options) {
  const {
    actualBrandIn,
    actualBrandOut,
    initialPrice, // brandOut / brandIn
    timer,
    quoteIssuerKit = makeIssuerKit('quote', AssetKind.SET),
  } = options;
  const { brand, issuer: quoteIssuer, mint: quoteMint } = quoteIssuerKit;

  /** @type {Ratio} */
  let currentPrice = initialPrice;

  const { notifier, updater } = makeNotifierKit();
  updater.updateState(currentPrice);

  /** @param {PriceQuoteValue} quote */
  const authenticateQuote = quote => {
    const quoteAmount = AmountMath.make(brand, harden(quote));
    const quotePayment = quoteMint.mintPayment(quoteAmount);
    return harden({ quoteAmount, quotePayment });
  };
  const calcAmountOut = amountIn => {
    AmountMath.coerce(actualBrandIn, amountIn);
    return floorMultiplyBy(amountIn, currentPrice);
  };

  const calcAmountIn = amountOut => {
    return floorDivideBy(amountOut, currentPrice);
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

  /* --* @type {ERef<Notifier<Timestamp>>} */
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

  return Far('PriceAuthority', {
    setPrice: newPrice => {
      currentPrice = newPrice;
      updater.updateState(currentPrice);
      fireTriggers(createQuote);
    },
    ...priceAuthority,
  });
}
