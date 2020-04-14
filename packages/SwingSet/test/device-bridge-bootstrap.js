const harden = require('@agoric/harden');

export default function setup(syscall, state, helpers) {
  const { log } = helpers;
  const handler = harden({
    inbound(...args) {
      log('inbound');
      log(JSON.stringify(args));
    },
  });
  return helpers.makeLiveSlots(
    syscall,
    state,
    (E, D) =>
      harden({
        async bootstrap(argv, vats, devices) {
          harden(argv);
          D(devices.bridge).registerInboundHandler(handler);
          const retval = D(devices.bridge).callOutbound(argv[0], argv[1]);
          log('outbound retval');
          log(JSON.stringify(retval));
        },
      }),
    helpers.vatID,
  );
}
