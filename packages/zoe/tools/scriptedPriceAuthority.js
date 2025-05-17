import { AmountMath } from '@agoric/ertp';
import { observeNotifier } from '@agoric/notifier';
import { TimeMath } from '@agoric/time';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import {
  makeOnewayPriceAuthorityKit,
  makePriceQuoteIssuer,
  natSafeMath,
} from '../src/contractSupport/index.js';

/**
 * @import {PriceAuthority, PriceDescription, PriceQuote, PriceQuoteValue, PriceQuery,} from '@agoric/zoe/tools/types.js';
 */

export function makeScriptedPriceAuthority(options) {
  const {
    actualBrandIn,
    actualBrandOut,
    priceList,
    timer,
    unitAmountIn = AmountMath.make(actualBrandIn, 1n),
    quoteInterval = 1n,
    quoteIssuerKit = makePriceQuoteIssuer(),
  } = options;
  const { brand, issuer: quoteIssuer, mint: quoteMint } = quoteIssuerKit;
  let currentPrice = priceList[0];

  /** @param {PriceQuoteValue} quote */
  const authenticateQuote = quote => {
    const quoteAmount = AmountMath.make(brand, harden(quote));
    const quotePayment = quoteMint.mintPayment(quoteAmount);
    return harden({ quoteAmount, quotePayment });
  };

  const calcAmountOut = amountIn => {
    AmountMath.coerce(actualBrandIn, amountIn);

    return AmountMath.make(
      actualBrandOut,
      natSafeMath.floorDivide(
        natSafeMath.multiply(currentPrice, amountIn.value),
        unitAmountIn.value,
      ),
    );
  };
  const calcAmountIn = amountOut => {
    AmountMath.coerce(actualBrandOut, amountOut);
    return AmountMath.make(
      actualBrandOut,
      natSafeMath.floorDivide(
        natSafeMath.multiply(unitAmountIn.value, amountOut.value),
        currentPrice,
      ),
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

  /** @type {ERef<Notifier<import('@agoric/time').Timestamp>>} */
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
      t = TimeMath.absValue(t);
      currentPrice =
        priceList[Number(Number(t / quoteInterval) % priceList.length)];

      void fireTriggers(createQuote);
    },
  });
  void observeNotifier(notifier, priceObserver);

  return priceAuthority;
}
