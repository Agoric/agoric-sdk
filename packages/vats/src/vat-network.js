// @ts-check
import { makeRouterProtocol } from '@agoric/swingset-vat/src/vats/network/router.js';

export function buildRootObject() {
  return makeRouterProtocol(); // already Far('Router')
}
