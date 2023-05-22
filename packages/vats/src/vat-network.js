// @ts-check
import { makeRouterProtocol } from './network/router.js';

export function buildRootObject() {
  return makeRouterProtocol(); // already Far('Router')
}
