import { AmountMath } from '@agoric/ertp';
import {
  makeNotifierFromSubscriber,
  observeIteration,
  subscribeLatest,
} from '@agoric/notifier';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

import { makeOnewayPriceAuthorityKit } from '@agoric/zoe/src/contractSupport/index.js';

/**
 *
 * @param {*} getOutputForGivenInput
 * @param {*} getInputForWantedOutput
 * @param {Brand<'nat'>} actualBrandIn
 * @param {Brand<'nat'>} actualBrandOut
 * @param {import('@agoric/time/src/types').TimerService} timer
 * @param {Subscriber<import('./pool').NotificationState>} subscriber
 * @param {IssuerKit<'set'>} quoteIssuerKit
 * @returns {PriceAuthority}
 */
export const makePriceAuthority = (
  getOutputForGivenInput,
  getInputForWantedOutput,
  actualBrandIn,
  actualBrandOut,
  timer,
  subscriber,
  quoteIssuerKit,
) => {
  const { brand, issuer: quoteIssuer } = quoteIssuerKit;

  /** @param {PriceQuoteValue} quote */
  const authenticateQuote = quote => {
    const quoteAmount = AmountMath.make(brand, harden(quote));
    const quotePayment = quoteIssuerKit.mint.mintPayment(quoteAmount);
    return harden({ quoteAmount, quotePayment });
  };

  // called by createQuote for each trigger to compare price to trigger level
  const calcAmountOut = amountIn =>
    getOutputForGivenInput(amountIn, actualBrandOut).amountOut;
  const calcAmountIn = amountOut =>
    getInputForWantedOutput(actualBrandIn, amountOut).amountIn;

  /**
   * @param {PriceQuery} priceQuery
   * @returns {ERef<PriceQuote> | undefined}
   */
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

  const priceAuthorityOptions = harden({
    timer,
    createQuote,
    actualBrandIn,
    actualBrandOut,
    quoteIssuer,
    notifier: makeNotifierFromSubscriber(subscriber),
  });

  const {
    priceAuthority,
    adminFacet: { fireTriggers },
  } = makeOnewayPriceAuthorityKit(priceAuthorityOptions);

  // An observer on a notifier that gets updated when the pool's balances
  // change via swap or liquidity operations. It checks the comparison predicate
  // for each active trigger. Due to `subscribeLatest` below it may drop
  // intermediate values.
  const priceObserver = Far('priceObserver', {
    updateState: () => {
      void fireTriggers(createQuote);
    },
  });

  void observeIteration(subscribeLatest(subscriber), priceObserver);

  return priceAuthority;
};
