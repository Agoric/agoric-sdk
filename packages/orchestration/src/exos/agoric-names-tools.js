import { VowShape } from '@agoric/vow';
import { E } from '@endo/far';
import { M, makeCopyMap } from '@endo/patterns';
import { BrandShape } from '@agoric/ertp';

const { Fail } = assert;

/**
 * @import {NameHub} from '@agoric/vats';
 * @import {AssetInfo} from '@agoric/vats/src/vat-bank.js';
 * @import {Remote} from '@agoric/internal';
 * @import {Vow, VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 */

/**
 * Perform remote calls to agoricNames in membrane-friendly way. This is an
 * interim approach until https://github.com/Agoric/agoric-sdk/issues/9541,
 * https://github.com/Agoric/agoric-sdk/pull/9322, or
 * https://github.com/Agoric/agoric-sdk/pull/9519
 *
 * XXX consider exposing `has`, `entries`, `keys`, `values` from `NameHub`
 *
 * @param {Zone} zone
 * @param {{ agoricNames: Remote<NameHub>; vowTools: VowTools }} powers
 */
export const makeResumableAgoricNamesHack = (
  zone,
  { agoricNames, vowTools: { watch } },
) => {
  const makeResumableAgoricNamesHackKit = zone.exoClassKit(
    'ResumableAgoricNamesHack',
    {
      public: M.interface('ResumableAgoricNamesHackI', {
        lookup: M.call().rest(M.arrayOf(M.string())).returns(VowShape),
        findBrandInVBank: M.call(BrandShape).returns(VowShape),
      }),
      vbankAssetEntriesWatcher: M.interface('vbankAssetEntriesWatcher', {
        onFulfilled: M.call(M.arrayOf(M.record()))
          .optional({ brand: BrandShape })
          .returns(VowShape),
      }),
    },
    () => ({
      vbankAssetsByBrand: zone.mapStore('vbankAssetsByBrand', {
        keyShape: BrandShape,
        valueShape: M.any(),
      }),
    }),
    {
      vbankAssetEntriesWatcher: {
        /**
         * @param {AssetInfo[]} assets
         * @param {{ brand: Brand<'nat'> }} ctx
         */
        onFulfilled(assets, { brand }) {
          const { vbankAssetsByBrand } = this.state;
          vbankAssetsByBrand.addAll(makeCopyMap(assets.map(a => [a.brand, a])));
          if (!vbankAssetsByBrand.has(brand)) {
            return watch(
              Promise.reject(
                Fail`brand ${brand} not in agoricNames.vbankAsset`,
              ),
            );
          }
          return watch(vbankAssetsByBrand.get(brand));
        },
      },
      public: {
        /** @param {...string} args */
        lookup(...args) {
          return watch(E(agoricNames).lookup(...args));
        },
        /**
         * @param {Brand<'nat'>} brand
         * @returns {Vow<AssetInfo>}
         */
        findBrandInVBank(brand) {
          const { vbankAssetsByBrand } = this.state;
          if (vbankAssetsByBrand.has(brand)) {
            return watch(vbankAssetsByBrand.get(brand));
          }
          const vbankAssetNameHubP = E(agoricNames).lookup('vbankAsset');
          const vbankAssetEntriesP = E(vbankAssetNameHubP).values();
          return watch(
            vbankAssetEntriesP,
            this.facets.vbankAssetEntriesWatcher,
            { brand },
          );
        },
      },
    },
  );
  return makeResumableAgoricNamesHackKit().public;
};
/** @typedef {ReturnType<typeof makeResumableAgoricNamesHack>} AgNamesTools */
