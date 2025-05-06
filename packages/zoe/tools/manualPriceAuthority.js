// @jessie-check

import { AmountMath } from '@agoric/ertp';
import { makeNotifierKit } from '@agoric/notifier';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import {
  floorDivideBy,
  floorMultiplyBy,
  makeOnewayPriceAuthorityKit,
  makePriceQuoteIssuer,
} from '../src/contractSupport/index.js';

/**
 * @import {PriceAuthority, PriceDescription, PriceQuote, PriceQuoteValue, PriceQuery,} from '@agoric/zoe/tools/types.js';
 */

/**
 * @param {object} options
 * @param {Brand<'nat'>} options.actualBrandIn
 * @param {Brand<'nat'>} options.actualBrandOut
 * @param {Ratio} options.initialPrice
 * @param {import('@agoric/time').TimerService} options.timer
 * @param {IssuerKit<'set', PriceDescription>} [options.quoteIssuerKit]
 * @returns {PriceAuthority & { setPrice: (Ratio) => void; disable: () => void }}
 */
export function makeManualPriceAuthority(options) {
  const {
    actualBrandIn,
    actualBrandOut,
    initialPrice, // brandOut / brandIn
    timer,
    quoteIssuerKit = makePriceQuoteIssuer(),
  } = options;
  const { brand, issuer: quoteIssuer, mint: quoteMint } = quoteIssuerKit;

  /** @type {Ratio} */
  let currentPrice = initialPrice;
  let disabled = false;

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
    if (disabled) {
      throw Error('disabled');
    }
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

  return Far('ManualPriceAuthority', {
    setPrice: newPrice => {
      currentPrice = newPrice;
      updater.updateState(currentPrice);
      void fireTriggers(createQuote);
    },
    disable: () => {
      disabled = true;
      updater.updateState(false);
    },
    ...priceAuthority,
  });
}
/** @typedef {ReturnType<typeof makeManualPriceAuthority>} ManualPriceAuthority */
