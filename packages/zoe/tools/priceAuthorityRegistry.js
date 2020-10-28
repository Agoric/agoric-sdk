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
 * @property {(pa: ERef<PriceAuthority>, assetBrand: Brand, priceBrand: Brand)
 * => Deleter} registerPriceAuthority Add a unique price authority for a given
 * asset/price pair
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
  const assetToPriceStore = makeStore('assetBrand');

  /**
   * @param {Brand} assetBrand
   * @param {Brand} priceBrand
   */
  const lookup = (assetBrand, priceBrand) => {
    const priceStore = assetToPriceStore.get(assetBrand);
    return priceStore.get(priceBrand);
  };

  /**
   * This PriceAuthority is just a wrapper for multiple registered
   * PriceAuthorities.
   *
   * @type {PriceAuthority}
   */
  const priceAuthority = {
    async getQuoteIssuer(assetBrand, priceBrand) {
      const record = lookup(assetBrand, priceBrand);
      return E(record.priceAuthority).getQuoteIssuer(assetBrand, priceBrand);
    },
    async getInputPrice(amountIn, brandOut) {
      const record = lookup(amountIn.brand, brandOut);
      return E(record.priceAuthority).getInputPrice(amountIn, brandOut);
    },
    async getOutputPrice(amountOut, brandIn) {
      const record = lookup(brandIn, amountOut.brand);
      return E(record.priceAuthority).getOutputPrice(amountOut, brandIn);
    },
    async getPriceNotifier(assetBrand, priceBrand) {
      const record = lookup(assetBrand, priceBrand);
      return E(record.priceAuthority).getPriceNotifier(assetBrand, priceBrand);
    },
    async priceAtTime(timer, deadline, assetAmount, priceBrand) {
      const record = lookup(assetAmount.brand, priceBrand);
      return E(record.priceAuthority).priceAtTime(
        timer,
        deadline,
        assetAmount,
        priceBrand,
      );
    },
    async priceWhenLT(assetAmount, priceLimit) {
      const record = lookup(assetAmount.brand, priceLimit.brand);
      return E(record.priceAuthority).priceWhenLT(assetAmount, priceLimit);
    },
    async priceWhenLTE(assetAmount, priceLimit) {
      const record = lookup(assetAmount.brand, priceLimit.brand);
      return E(record.priceAuthority).priceWhenLTE(assetAmount, priceLimit);
    },
    async priceWhenGTE(assetAmount, priceLimit) {
      const record = lookup(assetAmount.brand, priceLimit.brand);
      return E(record.priceAuthority).priceWhenGT(assetAmount, priceLimit);
    },
    async priceWhenGT(assetAmount, priceLimit) {
      const record = lookup(assetAmount.brand, priceLimit.brand);
      return E(record.priceAuthority).priceWhenGT(assetAmount, priceLimit);
    },
  };

  /** @type {PriceAuthorityRegistryAdmin} */
  const adminFacet = {
    registerPriceAuthority(pa, assetBrand, priceBrand) {
      /** @type {Store<Brand, PriceAuthorityRecord>} */
      let priceStore;
      if (assetToPriceStore.has(assetBrand)) {
        priceStore = assetToPriceStore.get(assetBrand);
      } else {
        priceStore = makeStore('priceBrand');
        assetToPriceStore.init(assetBrand, priceStore);
      }

      // Put a box around the authority so that we can be ensured the deleter
      // won't delete the wrong thing.
      const record = {
        priceAuthority: pa,
      };

      // Set up the record.
      priceStore.init(priceBrand, harden(record));

      return harden({
        delete() {
          assert.equal(
            priceStore.has(priceBrand) && priceStore.get(priceBrand),
            record,
            details`Price authority already dropped`,
          );
          priceStore.delete(priceBrand);
        },
      });
    },
  };

  return harden({
    priceAuthority,
    adminFacet,
  });
};
