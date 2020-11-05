// @ts-check
import { assert } from '@agoric/assert';
import { makeIssuerKit, MathKind, makeLocalAmountMath } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';
import { makeNotifierKit, updateFromNotifier } from '@agoric/notifier';

import './types';

/**
 * Create a price authority whose brandIn and brandOut are exactly opposite from
 * an underlying authority.
 *
 * @param {AmountMath} ourMathIn
 * @param {AmountMath} ourMathOut
 * @param {ERef<PriceAuthority>} theirPa
 * @param {ERef<Mint>} [quoteMint]
 * @param {boolean} [DONT_TRUST_THEM=true]
 */
export const makeInversePriceAuthority = async (
  ourMathIn,
  ourMathOut,
  theirPa,
  quoteMint = makeIssuerKit('Price Quote', MathKind.SET).mint,
  DONT_TRUST_THEM = true,
) => {
  const ourQuoteIssuer = E(quoteMint).getIssuer();
  const ourQuoteMath = await makeLocalAmountMath(ourQuoteIssuer);
  const ourBrandIn = ourMathIn.getBrand();
  const ourBrandOut = ourMathOut.getBrand();

  // Get the issuer of their quotes.
  const theirQuoteIssuer = E(theirPa).getQuoteIssuer(ourBrandOut, ourBrandIn);

  /**
   * @param {Brand} brandIn
   * @param {Brand} brandOut
   */
  const theirPaFor = (brandIn, brandOut) => {
    assert.equal(brandIn, ourBrandIn);
    assert.equal(brandOut, ourBrandOut);
    return theirPa;
  };

  /**
   * @param {PriceQuote} theirQuote
   * @returns {Promise<PriceQuote>}
   */
  const getOurQuote = async theirQuote => {
    /** @type {PriceQuoteValue} */
    let value;
    if (DONT_TRUST_THEM) {
      // Check that the payment is correct.
      ({ value } = await E(theirQuoteIssuer).getAmountOf(
        theirQuote.quotePayment,
      ));
    } else {
      // Just assume the quote is correct.
      value = theirQuote.quoteAmount.value;
    }
    const [{ amountIn: theirAmountIn, amountOut: theirAmountOut }] = value;
    const ourValue = {
      ...value,
      amountIn: ourMathIn.coerce(theirAmountOut),
      amountOut: ourMathOut.coerce(theirAmountIn),
    };
    const ourQuoteAmount = ourQuoteMath.make([ourValue]);
    const ourPayment = await E(quoteMint).mintPayment(ourQuoteAmount);
    return harden({ quoteAmount: ourQuoteAmount, quotePayment: ourPayment });
  };

  const getTheirAmountIn = async ourAmountIn => {
    // eslint-disable-next-line no-use-before-define
    const { quoteAmount: ourQuoteAmount } = await priceAuthority.quoteWanted(
      ourBrandIn,
      ourAmountIn,
    );
    /** @type {PriceQuoteValue} */
    const value = ourQuoteAmount.value;
    const [{ amountOut: theirAmountIn }] = value;
    return theirAmountIn;
  };

  const getTheirAmountOut = async ourAmountOut => {
    // eslint-disable-next-line no-use-before-define
    const { quoteAmount: ourQuoteAmount } = await priceAuthority.quoteGiven(
      ourAmountOut,
      ourBrandOut,
    );
    /** @type {PriceQuoteValue} */
    const value = ourQuoteAmount.value;
    const [{ amountIn: theirAmountOut }] = value;
    return theirAmountOut;
  };

  /** @type {NotifierRecord<PriceQuote>} */
  const { notifier: ourNotifier, updater: ourUpdater } = makeNotifierKit();

  /**
   * Convert their notifier to ours.
   */
  const theirNotifierP = E(theirPa).getPriceNotifier(ourBrandOut, ourBrandIn);
  await updateFromNotifier(
    {
      fail: ourUpdater.fail,
      finish(quote) {
        getOurQuote(quote).then(ourUpdater.finish, ourUpdater.fail);
      },
      updateState(quote) {
        getOurQuote(quote).then(ourUpdater.updateState, ourUpdater.fail);
      },
    },
    theirNotifierP,
  );

  /**
   * Create a quoteWhen* method for the given condition.
   *
   * @param {'LT' | 'LTE' | 'GTE' | 'GT'} relation
   */
  const makeQuoteWhen = relation =>
    /**
     * Return a quote when relation is true of the arguments.
     *
     * @param {Amount} amountIn monitor the amountOut corresponding to this amountIn
     * @param {Amount} amountOutLimit the value to compare with the monitored amountOut
     * @returns {Promise<PriceQuote>} resolve with a quote when `amountOut
     * relation amountOutLimit` is true
     */
    async function quoteWhenRelation(amountIn, amountOutLimit) {
      theirPaFor(amountIn.brand, amountOutLimit.brand);
      const [theirAmountIn, theirAmountOutLimit] = await Promise.all([
        getTheirAmountIn(amountIn),
        getTheirAmountOut(amountOutLimit),
      ]);
      return E(theirPa)
        [`quoteWhen${relation}`](theirAmountIn, theirAmountOutLimit)
        .then(getOurQuote);
    };

  /**
   * @type {PriceAuthority}
   */
  const priceAuthority = {
    async getQuoteIssuer(brandIn, brandOut) {
      theirPaFor(brandIn, brandOut);
      return ourQuoteIssuer;
    },
    async getTimerService(brandIn, brandOut) {
      return E(theirPaFor(brandIn, brandOut)).getTimerService(
        ourBrandOut,
        ourBrandIn,
      );
    },
    async quoteGiven(amountIn, brandOut) {
      return E(theirPaFor(amountIn.brand, brandOut))
        .quoteWanted(brandOut, amountIn)
        .then(getOurQuote);
    },
    async quoteWanted(brandIn, amountOut) {
      return E(theirPaFor(brandIn, amountOut.brand))
        .quoteGiven(amountOut, brandIn)
        .then(getOurQuote);
    },
    async getPriceNotifier(brandIn, brandOut) {
      theirPaFor(brandIn, brandOut);
      return ourNotifier;
    },
    async quoteAtTime(deadline, amountIn, brandOut) {
      theirPaFor(amountIn.brand, brandOut);
      const theirAmountIn = await getTheirAmountIn(amountIn);
      return E(theirPa)
        .quoteAtTime(deadline, theirAmountIn, amountIn.brand)
        .then(getOurQuote);
    },
    quoteWhenLT: makeQuoteWhen('LT'),
    quoteWhenLTE: makeQuoteWhen('LTE'),
    quoteWhenGTE: makeQuoteWhen('GTE'),
    quoteWhenGT: makeQuoteWhen('GT'),
  };

  return priceAuthority;
};
