import { E, Far } from '@endo/far';
import { makeIBCProtocolHandler } from './ibc.js';

export function buildRootObject() {
  function createInstance(callbacks) {
    const ibcHandler = makeIBCProtocolHandler(E, (method, params) =>
      E(callbacks).downcall(method, params),
    );
    return harden(ibcHandler);
  }
  return Far('root', {
    createInstance,
  });
}
