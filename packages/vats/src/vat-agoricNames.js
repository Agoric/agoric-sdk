// @ts-check
import { E, Far } from '@endo/far';
import { provide } from '@agoric/vat-data';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { prepareDurablePublishKit } from '@agoric/notifier';
import { prepareRecorder } from '@agoric/zoe/src/contractSupport/recorder.js';
import { makePromiseKit } from '@endo/promise-kit';
import { prepareNameHubKit } from './nameHub.js';

const { Fail } = assert;

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

  /** @param {string} kind */
  const provideNameHubKit = kind => {
    /[a-zA-z]+/.test(kind) || Fail`invalid kind: ${kind}`;
    return provide(baggage, kind, makeNameHubKit);
  };

  /**
   * @param {ERef<StorageNode>} nameStorage
   * @param {ERef<Marshaller>} marshaller
   * @param {string[]} kinds
   */
  const publishNameHubs = (nameStorage, marshaller, kinds) =>
    Promise.all(
      kinds.map(async kind => {
        /[a-zA-z]+/.test(kind) || Fail`invalid kind: ${kind}`;
        const kindAdmin = provideNameHubKit(kind).nameAdmin;
        const kindNode = await E(nameStorage).makeChildNode(kind);

        marshallerPK.resolve(marshaller);
        const makeRecorder = await recorderPK.promise;
        const { publisher } = makeDurablePublishKit();
        const recorder = makeRecorder(publisher, kindNode);

        kindAdmin.onUpdate(recorder);
      }),
    );

  return Far('vat-agoricNames', {
    getNameHub: () => agoricNames,
    getNameHubKit: () => ({ agoricNames, agoricNamesAdmin }),
    provideNameHubKit,
    provideNameHub: kind => provideNameHubKit(kind).nameHub,
    publishNameHubs,
  });
}
