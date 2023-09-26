// @ts-check
import { makeRouterProtocol } from '@agoric/network';

export function buildRootObject() {
  return makeRouterProtocol(); // already Far('Router')
}
