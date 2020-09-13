// @ts-check
import { E } from '@agoric/eventual-send';
import { makeRouterProtocol } from '@agoric/swingset-vat/src/vats/network/router';

export function buildRootObject(_vatPowers) {
  return harden(makeRouterProtocol(E));
}
