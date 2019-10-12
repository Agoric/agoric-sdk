import harden from '@agoric/harden';

// This vat contains the registry for the demo.

function makeRegistry() {
  const map = new Map();
  let i = 0;
  function get(id) {
    return map.get(id);
  }
  function set(name, obj) {
    i += 1;
    const id = `${name}#${i.toString(16)}`;
    map.set(id, obj);
    return id;
  }
  return {
    get,
    set,
  };
}

function build(E, log) {
  const sharedRegistry = makeRegistry();

  function getSharedRegistry() {
    return sharedRegistry;
  }

  return harden({ getSharedRegistry });
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => build(E, helpers.log),
    helpers.vatID,
  );
}
