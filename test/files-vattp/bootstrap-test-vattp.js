const harden = require('@agoric/harden');

function build(E, D, log) {
  const receiver = harden({
    receive(body) {
      log(`ch.receive ${body}`);
    },
  });

  return harden({
    async bootstrap(argv, vats, devices) {
      D(devices.mailbox).registerInboundHandler(vats.vattp);
      await E(vats.vattp).registerMailboxDevice(devices.mailbox);
      const name = 'remote1';
      const { transmitter, setReceiver } = await E(vats.vattp).addRemote(name);
      // const receiver = await E(vats.comms).addRemote(name, transmitter);
      await E(setReceiver).setReceiver(receiver);

      if (argv[0] === '1') {
        log('not sending anything');
      } else if (argv[0] === '2') {
        E(transmitter).transmit('out1');
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
