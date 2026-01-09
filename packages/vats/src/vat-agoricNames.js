// @jessy-check
import { E, Far } from '@endo/far';
import { BrandI } from '@agoric/ertp';
import { provide } from '@agoric/vat-data';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { provideLazy } from '@agoric/store';
import { prepareNameHubKit } from './nameHub.js';

/**
 * @import {Zone} from '@agoric/zone';
 * @import {Baggage} from '@agoric/vat-data';
 * @import {NameAdmin} from './types.js';
 * @import {DisplayInfo} from '@agoric/ertp';
 * @import {Brand} from '@agoric/ertp';
 * @import {StorageNode} from '@agoric/internal/src/lib-chainStorage.js';
 * @import {ERef} from '@agoric/vow';
 */

/** @param {Zone} zone */
const prepareNatBrand = zone => {
  // XXX generalize past Nat; move into ERTP
  /** @type {(name: string, d: DisplayInfo) => Brand} */
  const makeNatBrand = zone.exoClass(
    'Brand',
    BrandI,
    (name, displayInfo) => ({ name, displayInfo }),
    {
      async isMyIssuer(_allegedIssuer) {
        return false;
      },
      getAllegedName() {
        const { name } = this.state;
        return name;
      },
      /** @deprecated */
      getDisplayInfo() {
        const { displayInfo } = this.state;
        return displayInfo;
      },
      getAmountShape() {
        return undefined;
      },
    },
  );
  return makeNatBrand;
};

/**
 * @param {unknown} _vatPowers
 * @param {unknown} _vatParameters
 * @param {Baggage} baggage
 */
export const buildRootObject = (_vatPowers, _vatParameters, baggage) => {
  const zone = makeDurableZone(baggage);
  const makeNameHubKit = prepareNameHubKit(zone);
  const makeNatBrand = prepareNatBrand(zone);

  const brandStore = zone.mapStore('Brand');
  const kit = provide(baggage, 'agoricNamesKit', makeNameHubKit);
  const { nameHub: agoricNames, nameAdmin: agoricNamesAdmin } = kit;

  /**
   * @param {ERef<StorageNode>} nameStorage
   * @param {ERef<BoardVat>} vatBoard
   * @param {string[]} kinds brand, issuer, ...
   */
  const publishNameHubs = async (nameStorage, vatBoard, kinds) => {
    await Promise.all(
      kinds.map(async kind => {
        /** @type {NameAdmin} */
        const kindAdmin = await E(agoricNamesAdmin).lookupAdmin(kind);

        const kindNode = await E(nameStorage).makeChildNode(kind);
        const recorderKit =
          await E(vatBoard).makePublishingRecorderKit(kindNode);
        kindAdmin.onUpdate(recorderKit.recorder);
      }),
    );
  };

  return Far('vat-agoricNames', {
    getNameHub: () => agoricNames,
    getNameHubKit: () => kit,
    publishNameHubs,
    /**
     * Provide a brand, with no associated mint nor issuer.
     *
     * @param {string} keyword
     * @param {DisplayInfo} displayInfo
     */
    provideInertBrand: (keyword, displayInfo) =>
      provideLazy(brandStore, keyword, () =>
        makeNatBrand(keyword, displayInfo),
      ),
  });
};
