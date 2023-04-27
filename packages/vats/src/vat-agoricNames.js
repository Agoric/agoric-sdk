// @ts-check
import { Far } from '@endo/far';
import { provide } from '@agoric/vat-data';
import { makeDurableZone } from '@agoric/zone/durable.js';
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

  /** @param {string} kind */
  const provideNameHubKit = kind => {
    /[a-zA-z]+/.test(kind) || Fail`invalid kind: ${kind}`;
    return provide(baggage, kind, makeNameHubKit);
  };

  return Far('vat-agoricNames', {
    getNameHub: () => agoricNames,
    getNameHubKit: () => ({ agoricNames, agoricNamesAdmin }),
    provideNameHubKit,
    provideNameHub: kind => provideNameHubKit(kind).nameHub,
  });
}
