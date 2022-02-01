import { E, Far } from '@endo/far';
import { makeIBCProtocolHandler } from './ibc.js';

export function buildRootObject(_vatPowers) {
  function createInstance(callbacks, powers = {}) {
    const ibcHandler = makeIBCProtocolHandler(
      E,
      (method, params) => E(callbacks).downcall(method, params),
      powers,
    );
    return harden(ibcHandler);
  }
  return Far('root', {
    createInstance,
  });
}
