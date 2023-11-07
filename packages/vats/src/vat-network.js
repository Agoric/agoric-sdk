// @ts-check
import { makeRouterProtocol } from '@agoric/network';

export function buildRootObject(_vatPowers, _args, _baggage) {
  return makeRouterProtocol(); // already Far('Router')
}
