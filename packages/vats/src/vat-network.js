// @ts-check
import { E } from '@agoric/eventual-send';
import { makeRouterProtocol } from '@agoric/swingset-vat/src/vats/network/router.js';

export function buildRootObject(_vatPowers) {
  return makeRouterProtocol(E); // already Far('Router')
}
