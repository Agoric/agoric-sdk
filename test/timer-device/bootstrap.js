const harden = require('@agoric/harden');

export default function setup(syscall, state, helpers) {
  const { log } = helpers;
  return helpers.makeLiveSlots(
    syscall,
    state,
    (E, D) =>
      harden({
        async bootstrap(argv, vats, devices) {
          if (argv[0] === 'timer') {
            log(`starting wake test`);
            const handler = harden({
              wake() {
                log(`handler.wake()`);
              },
            });
            D(devices.timer).setWakeup(3, handler);
          } else if (argv[0] === 'repeater') {
            log(`starting repeater test`);
            const handler = harden({
              wake(h) {
                log(`handler.wake(${h ? 'handler' : h})`);
              },
            });
            const rptr = D(devices.timer).createRepeater(3, 2);
            D(rptr).schedule(handler);
          } else if (argv[0] === 'repeater2') {
            log(`starting repeater test`);
            let handlerCalled = 0;
            const handler = harden({
              wake(h) {
                handlerCalled += 1;
                if (handlerCalled < 2) {
                  D(h).schedule(handler);
                }
                log(
                  `handler.wake(${
                    h ? 'handler' : h
                  }) called ${handlerCalled} times.`,
                );
              },
            });
            const rptr = D(devices.timer).createRepeater(3, 2);
            D(rptr).schedule(handler);
          } else {
            throw new Error(`unknown argv mode '${argv[0]}'`);
          }
        },
      }),
    helpers.vatID,
  );
}
