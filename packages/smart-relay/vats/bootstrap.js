import harden from '@agoric/harden';

console.debug(`loading bootstrap.js`);

function buildRootObject(E, D) {
  const root = {
    bootstrap(argv, vats, devices) {
      console.log(`bootstrap() invoked`);
    },
  };
  return harden(root);
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    buildRootObject,
    helpers.vatID,
  );
}
