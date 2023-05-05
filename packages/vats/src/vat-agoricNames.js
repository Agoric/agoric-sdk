// @ts-check
// @jessy-check
import { E, Far } from '@endo/far';
import { BrandI } from '@agoric/ertp';
import { provide } from '@agoric/vat-data';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { makeNameHubKit } from './nameHub.js';

/** @param {import('@agoric/zone').Zone} zone */
const makeBrandStore = zone => {
  const brandStore = zone.mapStore('Brand', { durable: true });

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
      // Give information to UI on how to display the amount.
      getDisplayInfo() {
        const { displayInfo } = this.state;
        return displayInfo;
      },
      getAmountShape() {
        return undefined;
      },
    },
  );

  return {
    provide: (keyword, displayInfo) =>
      provide(brandStore, keyword, () => makeNatBrand(keyword, displayInfo)),
  };
};

/**
 * @param {unknown} _vatPowers
 * @param {unknown} _vatParameters
 * @param {import('@agoric/vat-data').Baggage} baggage
 */
export const buildRootObject = (_vatPowers, _vatParameters, baggage) => {
  const zone = makeDurableZone(baggage);
  const kit = makeNameHubKit(); // TODO: durable
  const { nameHub: agoricNames, nameAdmin: agoricNamesAdmin } = kit;

  /**
   * @param {ERef<StorageNode>} nameStorage
   * @param {ERef<BoardVat>} vatBoard
   * @param {string[]} kinds brand, issuer, ...
   */
  const publishNameHubs = async (nameStorage, vatBoard, kinds) => {
    await Promise.all(
      kinds.map(async kind => {
        /** @type {import('./types.js').NameAdmin} */
        const kindAdmin = await E(agoricNamesAdmin).lookupAdmin(kind);

        const kindNode = await E(nameStorage).makeChildNode(kind);
        const recorderKit = await E(vatBoard).makePublishingRecorderKit(
          kindNode,
        );
        kindAdmin.onUpdate(recorderKit.recorder);
      }),
    );
  };

  const brandStore = makeBrandStore(zone);

  /**
   * Provide a brand, with no mint nor issuer.
   *
   * @param {string} keyword
   * @param {DisplayInfo} displayInfo
   */
  const provideInertBrand = (keyword, displayInfo) =>
    brandStore.provide(keyword, displayInfo);

  return Far('vat-agoricNames', {
    getNameHub: () => agoricNames,
    getNameHubKit: () => kit,
    publishNameHubs,
    provideInertBrand,
  });
};
