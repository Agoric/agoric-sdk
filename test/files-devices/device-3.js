const harden = require('@agoric/harden');

export default function setup(syscall, state, helpers, endowments) {
  const { log } = helpers;

  log(state.get());

  return helpers.makeDeviceSlots(
    syscall,
    state,
    s => {
      const { SO } = s;
      return harden({
        setState(arg) {
          state.set(arg);
          return 'ok';
        },
        getState() {
          return harden(state.get());
        },
      });
    },
    helpers.name,
  );
}
