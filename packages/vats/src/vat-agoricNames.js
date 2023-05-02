// @ts-check
import { E, Far } from '@endo/far';
import { provide } from '@agoric/vat-data';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { prepareDurablePublishKit } from '@agoric/notifier';
import { prepareRecorder } from '@agoric/zoe/src/contractSupport/recorder.js';
import { makePromiseKit } from '@endo/promise-kit';
import { BrandI } from '@agoric/ertp';
import { prepareNameHubKit } from './nameHub.js';

const { Fail } = assert;

const makeBrandStore = zone => {
  const brandStore = zone.mapStore('Brand', { durable: true });

  // XXX generalize past Nat; move into ERTP
  const makeNatBrand = zone.exoClass(
    'Brand',
    BrandI,
    (name, displayInfo) => ({ name, displayInfo }),
    {
      isMyIssuer(_allegedIssuer) {
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
export function buildRootObject(_vatPowers, _vatParameters, baggage) {
  const zone = makeDurableZone(baggage);
  const makeNameHubKit = prepareNameHubKit(zone);
  const { nameHub: agoricNames, nameAdmin: agoricNamesAdmin } = provide(
    baggage,
    'the agoricNames',
    makeNameHubKit,
  );

  const makeDurablePublishKit = prepareDurablePublishKit(
    baggage,
    'DurablePublishKit',
  );
  const marshallerPK = makePromiseKit();
  const recorderPK = makePromiseKit();
  marshallerPK.promise.then(marshaller => {
    const makeRecorder = prepareRecorder(baggage, marshaller);
    recorderPK.resolve(makeRecorder);
  });

  /**
   * @param {ERef<StorageNode>} nameStorage
   * @param {ERef<Marshaller>} marshaller
   * @param {string[]} kinds
   */
  const publishNameHubs = (nameStorage, marshaller, kinds) =>
    Promise.all(
      kinds.map(async kind => {
        /[a-zA-z]+/.test(kind) || Fail`invalid kind: ${kind}`;
        const { nameAdmin: kindAdmin } = await agoricNamesAdmin.provideChild(
          kind,
        );
        const kindNode = await E(nameStorage).makeChildNode(kind);

        marshallerPK.resolve(marshaller);
        const makeRecorder = await recorderPK.promise;
        const { publisher } = makeDurablePublishKit();
        const recorder = makeRecorder(publisher, kindNode);

        kindAdmin.onUpdate(recorder);
      }),
    );

  const brandStore = makeBrandStore(zone);

  /**
   * Provide a brand, with no mint nor issuer.
   *
   * @param {string} keyword
   * @param {DisplayInfo} displayInfo
   */
  const provideBrandIdentity = (keyword, displayInfo) =>
    brandStore.provide(keyword, displayInfo);

  return Far('vat-agoricNames', {
    getNameHub: () => agoricNames,
    getNameHubKit: () => ({ agoricNames, agoricNamesAdmin }),
    publishNameHubs,
    provideBrandIdentity,
  });
}
