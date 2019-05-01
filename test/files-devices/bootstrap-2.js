const harden = require('@agoric/harden');

export default function setup(syscall, state, helpers) {
  const { log } = helpers;
  return helpers.makeLiveSlots(
    syscall,
    state,
    (_E, D) =>
      harden({
        bootstrap(argv, vats, devices) {
          if (argv[0] === '1') {
            log(`calling d2.method1`);
            const ret = D(devices.d2).method1('hello');
            log(ret);
          } else if (argv[0] === '2') {
            log(`calling d2.method2`);
            const [d2, d3] = D(devices.d2).method2(); // [d2,d3]
            const ret2 = D(d3).method3(d2);
            log(ret2.key);
          } else if (argv[0] === '3') {
            log(`calling d2.method3`);
            // devices can't yet do sendOnly on pass-by-presence objects, but
            // they should still be able to accept and return them
            const o = harden({});
            const ret = D(devices.d2).method3(o);
            log(`ret ${ret === o}`);
          } else if (argv[0] === '4') {
            log(`calling d2.method4`);
            // now exercise sendOnly on pass-by-presence objects
            const o = harden({
              foo(obj) {
                log(`d2.m4 foo`);
                D(obj).bar('hello');
                log(`d2.m4 did bar`);
              },
            });
            const ret = D(devices.d2).method4(o);
            log(`ret ${ret}`);
          }
        },
      }),
    helpers.vatID,
  );
}
