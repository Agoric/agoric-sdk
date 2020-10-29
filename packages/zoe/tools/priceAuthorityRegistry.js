// @ts-check

import { E } from '@agoric/eventual-send';
import { makeStore } from '@agoric/store';
import { assert, details } from '@agoric/assert';

import '../exported';

/**
 * @typedef {Object} Deleter
 * @property {() => void} delete
 */

/**
 * @typedef {Object} PriceAuthorityRegistryAdmin
 * @property {(pa: ERef<PriceAuthority>, brandIn: Brand, brandOut: Brand)
 * => Deleter} registerPriceAuthority Add a unique price authority for a given
 * pair
 */

/**
 * @typedef {Object} PriceAuthorityRegistry A price authority that is a facade
 * for other backing price authorities registered for a given asset and price
 * brand
 * @property {PriceAuthority} priceAuthority
 * @property {PriceAuthorityRegistryAdmin} adminFacet
 */

/**
 * @returns {PriceAuthorityRegistry}
 */
export const makePriceAuthorityRegistry = () => {
  /**
   * @typedef {Object} PriceAuthorityRecord A record indicating a registered
   * price authority
   * @property {ERef<PriceAuthority>} priceAuthority
   */

  /** @type {Store<Brand, Store<Brand, PriceAuthorityRecord>>} */
  const assetToPriceStore = makeStore('brandIn');

  /**
   * @param {Brand} brandIn
   * @param {Brand} brandOut
   */
  const lookup = (brandIn, brandOut) => {
    const priceStore = assetToPriceStore.get(brandIn);
    return priceStore.get(brandOut);
  };

  /**
   * This PriceAuthority is just a wrapper for multiple registered
   * PriceAuthorities.
   *
   * @type {PriceAuthority}
   */
  const priceAuthority = {
    async getQuoteIssuer(brandIn, brandOut) {
      const record = lookup(brandIn, brandOut);
      return E(record.priceAuthority).getQuoteIssuer(brandIn, brandOut);
    },
    async getAmountInQuote(amountIn, brandOut) {
      const record = lookup(amountIn.brand, brandOut);
      return E(record.priceAuthority).getAmountInQuote(amountIn, brandOut);
    },
    async getAmountOutQuote(brandIn, amountOut) {
      const record = lookup(brandIn, amountOut.brand);
      return E(record.priceAuthority).getAmountOutQuote(brandIn, amountOut);
    },
    async getPriceNotifier(brandIn, brandOut) {
      const record = lookup(brandIn, brandOut);
      return E(record.priceAuthority).getPriceNotifier(brandIn, brandOut);
    },
    async quoteAtTime(timer, deadline, amountIn, brandOut) {
      const record = lookup(amountIn.brand, brandOut);
      return E(record.priceAuthority).quoteAtTime(
        timer,
        deadline,
        amountIn,
        brandOut,
      );
    },
    async quoteWhenLT(amountIn, amountOutLimit) {
      const record = lookup(amountIn.brand, amountOutLimit.brand);
      return E(record.priceAuthority).quoteWhenLT(amountIn, amountOutLimit);
    },
    async quoteWhenLTE(amountIn, amountOutLimit) {
      const record = lookup(amountIn.brand, amountOutLimit.brand);
      return E(record.priceAuthority).quoteWhenLTE(amountIn, amountOutLimit);
    },
    async quoteWhenGTE(amountIn, amountOutLimit) {
      const record = lookup(amountIn.brand, amountOutLimit.brand);
      return E(record.priceAuthority).quoteWhenGT(amountIn, amountOutLimit);
    },
    async quoteWhenGT(amountIn, amountOutLimit) {
      const record = lookup(amountIn.brand, amountOutLimit.brand);
      return E(record.priceAuthority).quoteWhenGT(amountIn, amountOutLimit);
    },
  };

  /** @type {PriceAuthorityRegistryAdmin} */
  const adminFacet = {
    registerPriceAuthority(pa, brandIn, brandOut) {
      /** @type {Store<Brand, PriceAuthorityRecord>} */
      let priceStore;
      if (assetToPriceStore.has(brandIn)) {
        priceStore = assetToPriceStore.get(brandIn);
      } else {
        priceStore = makeStore('brandOut');
        assetToPriceStore.init(brandIn, priceStore);
      }

      // Put a box around the authority so that we can be ensured the deleter
      // won't delete the wrong thing.
      const record = {
        priceAuthority: pa,
      };

      // Set up the record.
      priceStore.init(brandOut, harden(record));

      return harden({
        delete() {
          assert.equal(
            priceStore.has(brandOut) && priceStore.get(brandOut),
            record,
            details`Price authority already dropped`,
          );
          priceStore.delete(brandOut);
        },
      });
    },
  };

  return harden({
    priceAuthority,
    adminFacet,
  });
};
