// @ts-check
import { makeRouterProtocol } from './router.js';

export function buildRootObject(_vatPowers) {
  return makeRouterProtocol(); // already Far('Router')
}
