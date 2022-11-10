import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { assert, details as X } from '@agoric/assert';
import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
import { makeNotifier } from '@agoric/notifier';

/** @template T @typedef {import('@endo/eventual-send').EOnly<T>} EOnly */

/**
 * @param {object} opts
 * @param {ERef<Mint<'set'>>} [opts.quoteMint]
 * @param {ERef<PriceAuthority>} opts.sourcePriceAuthority
 * @param {Brand} opts.sourceBrandIn
 * @param {Brand} opts.sourceBrandOut
 * @param {Brand} [opts.actualBrandIn]
 * @param {Brand} [opts.actualBrandOut]
 * @param {(amountIn: Amount) => Amount} [opts.makeSourceAmountIn]
 * @param {(amountOut: Amount) => Amount} [opts.makeSourceAmountOut]
 * @param {(sourceAmountIn: Amount) => Amount} [opts.transformSourceAmountIn]
 * @param {(sourceAmountOut: Amount) => Amount} [opts.transformSourceAmountOut]
 */
export const makePriceAuthorityTransform = async ({
  quoteMint = makeIssuerKit('quote', AssetKind.SET).mint,
  sourcePriceAuthority,
  sourceBrandIn,
  sourceBrandOut,
  actualBrandIn = sourceBrandIn,
  actualBrandOut = sourceBrandOut,
  makeSourceAmountIn = x => x,
  makeSourceAmountOut = x => x,
  transformSourceAmountIn = x => x,
  transformSourceAmountOut = x => x,
}) => {
  const quoteIssuer = E(quoteMint).getIssuer();
  const quoteBrand = await E(quoteIssuer).getBrand();

  /**
   * Ensure that the brandIn/brandOut pair is supported.
   *
   * @param {Brand} brandIn
   * @param {Brand} brandOut
   */
  const assertBrands = (brandIn, brandOut) => {
    assert.equal(
      brandIn,
      actualBrandIn,
      X`Desired brandIn ${brandIn} must match ${actualBrandIn}`,
    );
    assert.equal(
      brandOut,
      actualBrandOut,
      X`Desired brandOut ${brandOut} must match ${actualBrandOut}`,
    );
  };

  /**
   * @param {PriceQuote} sourceQuote
   * @returns {Promise<PriceQuote>}
   */
  const scaleQuote = async sourceQuote => {
    const { quotePayment: sourceQuotePayment } = sourceQuote;

    const sourceQuoteIssuer = E(sourcePriceAuthority).getQuoteIssuer(
      sourceBrandIn,
      sourceBrandOut,
    );

    const { value: sourceQuoteValue } = await E(sourceQuoteIssuer).getAmountOf(
      sourceQuotePayment,
    );

    assert.equal(
      sourceQuoteValue.length,
      1,
      X`sourceQuoteValue.length ${sourceQuoteValue.length} is not 1`,
    );

    const {
      amountIn: sourceAmountIn,
      amountOut: sourceAmountOut,
      timer,
      timestamp,
    } = sourceQuoteValue[0];
    const amountIn = transformSourceAmountIn(sourceAmountIn);
    const amountOut = transformSourceAmountOut(sourceAmountOut);

    const quoteAmount = {
      brand: quoteBrand,
      value: [{ amountIn, amountOut, timer, timestamp }],
    };
    const quotePayment = await E(quoteMint).mintPayment({
      brand: quoteBrand,
      value: [quoteAmount],
    });
    return harden({ quoteAmount, quotePayment });
  };

  /**
   * Create a quoteWhen* function.
   *
   * @param {string} sourceMethod
   */
  const makeQuoteWhenOut = sourceMethod => {
    /**
     * Return a quote when sourceMethod fires.
     *
     * @param {Amount} amountIn the input value to the calcAmountTrigger
     * @param {Amount} amountOutLimit the value to compare with the output
     * of calcAmountTrigger
     */
    const quoteWhenOut = async (amountIn, amountOutLimit) => {
      AmountMath.coerce(actualBrandIn, amountIn);
      AmountMath.coerce(actualBrandOut, amountOutLimit);

      const sourceQuote = await E(sourcePriceAuthority)[sourceMethod](
        makeSourceAmountIn(amountIn),
        makeSourceAmountOut(amountOutLimit),
      );

      return scaleQuote(sourceQuote);
    };
    return quoteWhenOut;
  };

  /**
   * Create a mutableQuoteWhen* function.
   *
   * @param {string} sourceMethod
   */
  const makeMutableQuote = sourceMethod => {
    /**
     * @param {Amount} amountIn
     * @param {Amount} amountOutLimit
     */
    const mutableQuoteWhenOut = (amountIn, amountOutLimit) => {
      AmountMath.coerce(actualBrandIn, amountIn);
      AmountMath.coerce(actualBrandOut, amountOutLimit);

      /** @type {ERef<MutableQuote>} */
      const sourceMutableQuote = E(sourcePriceAuthority)[sourceMethod](
        makeSourceAmountIn(amountIn),
        makeSourceAmountOut(amountOutLimit),
      );

      /** @type {EOnly<MutableQuote>} */
      const mutableQuote = Far('MutableQuote', {
        cancel: e => E(sourceMutableQuote).cancel(e),
        updateLevel: (newAmountIn, newAmountOutLimit) => {
          AmountMath.coerce(actualBrandIn, newAmountIn);
          AmountMath.coerce(actualBrandOut, newAmountOutLimit);

          return E(sourceMutableQuote).updateLevel(
            makeSourceAmountIn(newAmountIn),
            makeSourceAmountOut(newAmountOutLimit),
          );
        },
        getPromise: () => E(sourceMutableQuote).getPromise().then(scaleQuote),
      });
      return mutableQuote;
    };
    return mutableQuoteWhenOut;
  };

  /** @type {EOnly<PriceAuthority>} */
  const priceAuthority = Far('PriceAuthority', {
    getQuoteIssuer(brandIn, brandOut) {
      assertBrands(brandIn, brandOut);
      return quoteIssuer;
    },
    getTimerService(brandIn, brandOut) {
      assertBrands(brandIn, brandOut);
      return E(sourcePriceAuthority).getTimerService(
        sourceBrandIn,
        sourceBrandOut,
      );
    },
    makeQuoteNotifier(amountIn, brandOut) {
      AmountMath.coerce(actualBrandIn, amountIn);
      assertBrands(amountIn.brand, brandOut);

      const notifier = E(sourcePriceAuthority).makeQuoteNotifier(
        makeSourceAmountIn(amountIn),
        sourceBrandOut,
      );

      // Wrap our underlying notifier with scaled quotes.
      const scaledBaseNotifier = harden({
        async getUpdateSince(updateCount = undefined) {
          // We use the same updateCount as our underlying notifier.
          const record = await E(notifier).getUpdateSince(updateCount);

          const quote = await scaleQuote(record.value);
          return harden({
            value: quote,
            updateCount: record.updateCount,
          });
        },
      });

      /** @type {Notifier<PriceQuote>} */
      const scaledNotifier = Far('QuoteNotifier', {
        ...makeNotifier(scaledBaseNotifier),
        // TODO stop exposing baseNotifier methods directly.
        ...scaledBaseNotifier,
      });
      return scaledNotifier;
    },
    async quoteGiven(amountIn, brandOut) {
      AmountMath.coerce(actualBrandIn, amountIn);
      assertBrands(amountIn.brand, brandOut);

      const sourceQuote = await E(sourcePriceAuthority).quoteGiven(
        makeSourceAmountIn(amountIn),
        sourceBrandOut,
      );
      return scaleQuote(sourceQuote);
    },
    async quoteWanted(brandIn, amountOut) {
      AmountMath.coerce(actualBrandOut, amountOut);
      assertBrands(brandIn, amountOut.brand);

      const sourceQuote = await E(sourcePriceAuthority).quoteWanted(
        sourceBrandIn,
        makeSourceAmountOut(amountOut),
      );
      return scaleQuote(sourceQuote);
    },
    async quoteAtTime(deadline, amountIn, brandOut) {
      assert.typeof(deadline, 'bigint');
      AmountMath.coerce(actualBrandIn, amountIn);
      assertBrands(amountIn.brand, brandOut);

      const sourceQuote = await E(sourcePriceAuthority).quoteAtTime(
        deadline,
        makeSourceAmountIn(amountIn),
        sourceBrandOut,
      );
      return scaleQuote(sourceQuote);
    },
    quoteWhenLT: makeQuoteWhenOut('quoteWhenLT'),
    quoteWhenLTE: makeQuoteWhenOut('quoteWhenLTE'),
    quoteWhenGTE: makeQuoteWhenOut('quoteWhenGTE'),
    quoteWhenGT: makeQuoteWhenOut('quoteWhenGT'),
    mutableQuoteWhenLT: makeMutableQuote('mutableQuoteWhenLT'),
    mutableQuoteWhenLTE: makeMutableQuote('mutableQuoteWhenLTE'),
    mutableQuoteWhenGT: makeMutableQuote('mutableQuoteWhenGT'),
    mutableQuoteWhenGTE: makeMutableQuote('mutableQuoteWhenGTE'),
  });

  return priceAuthority;
};
