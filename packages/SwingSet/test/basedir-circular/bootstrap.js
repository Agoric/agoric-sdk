/* global harden */

function build(E, _log) {
  return {
    bootstrap(argv, vats) {
      const pa = E(vats.bob).genPromise1();
      const pb = E(vats.bob).genPromise2();
      E(vats.bob).usePromises([pa], [pb]);
    },
  };
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => harden(build(E, helpers.log)),
    helpers.vatID,
  );
}
