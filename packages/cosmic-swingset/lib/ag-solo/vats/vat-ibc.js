import harden from '@agoric/harden';
import { makeIBCProtocolHandler } from './ibc';

function build(E, _log) {
  function createInstance(callbacks) {
    const ibcHandler = makeIBCProtocolHandler(E, (method, params) =>
      E(callbacks).downcall(method, params),
    );
    return harden(ibcHandler);
  }
  return harden({
    createInstance,
  });
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => build(E, helpers.log),
    helpers.vatID,
  );
}
