// @ts-check
import { E } from '@endo/far';
import { makeRouterProtocol } from '@agoric/swingset-vat/src/vats/network/router.js';

export function buildRootObject(_vatPowers) {
  // @ts-expect-error UNTIL Endo updated https://github.com/endojs/endo/pull/1095/
  return makeRouterProtocol(E); // already Far('Router')
}
