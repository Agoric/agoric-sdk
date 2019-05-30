const harden = require('@agoric/harden');

function build(E, D, log) {
  const commsHandler = harden({
    inbound(peer, body) {
      log(`ch.inbound ${peer} ${body}`);
    },
  });

  return harden({
    async bootstrap(argv, vats, devices) {
      D(devices.mailbox).registerInboundHandler(vats.vattp);
      await E(vats.vattp).registerMailboxDevice(devices.mailbox);
      await E(vats.vattp).registerCommsHandler(commsHandler);
      // await E(vats.comms).init(vats.vattp);

      if (argv[0] === '1') {
        log('not sending anything');
      } else if (argv[0] === '2') {
        E(vats.vattp).send('peer1', 'out1');
      } else {
        throw new Error(`unknown argv mode '${argv[0]}'`);
      }
    },
  });
}

export default function setup(syscall, state, helpers) {
  const { log } = helpers;
  return helpers.makeLiveSlots(
    syscall,
    state,
    (E, D) => build(E, D, log),
    helpers.vatID,
  );
}
