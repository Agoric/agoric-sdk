// @ts-check
import { vivifySingleton } from '@agoric/vat-data';
import { makeRouterProtocol } from './router.js';

export function buildRootObject(_vatPowers, _vatParameters, baggage) {
  return vivifySingleton(
    baggage,
    'routerProtocol',
    makeRouterProtocol(baggage),
  );
}
