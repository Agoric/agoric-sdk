const harden = require('@agoric/harden');

export default function setup(syscall, state, helpers, _endowments) {
  const { log } = helpers;

  return helpers.makeDeviceSlots(
    syscall,
    state,
    s => {
      const { SO } = s;
      return harden({
        method1(arg) {
          log(`method1 ${arg}`);
          return 'done';
        },
        method2() {
          const d2 = harden({});
          const d3 = harden({
            method3(arg) {
              log(`method3 ${arg === d2}`);
              return harden({ key: 'value' });
            },
          });
          log(`method2`);
          return harden([d2, d3]);
        },
        method3(o) {
          log(`method3`);
          return o;
        },
        method4(o) {
          log(`method4`);
          const obj = harden({
            bar(arg) {
              log(`method4.bar ${arg}`);
            },
          });
          SO(o).foo(obj);
          return 'method4 done';
        },
        method5(arg) {
          log(`method5 ${arg}`);
          return 'ok';
        },
        setState(arg) {
          state.set(`deviceState-${arg}`);
          return 'ok';
        },
        getState() {
          return state.get();
        },
      });
    },
    helpers.name,
  );
}
