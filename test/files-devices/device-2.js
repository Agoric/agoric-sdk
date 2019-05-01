const harden = require('@agoric/harden');

export default function setup(syscall, helpers, _endowments) {
  const { log } = helpers;
  return helpers.makeDeviceSlots(
    syscall,
    harden({
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
    }),
    helpers.name,
  );
}
