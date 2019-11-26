import harden from '@agoric/harden';

console.log(`loading bootstrap.js`);

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    (E, D) =>
      harden({
        async bootstrap(argv, vats, devices) {
          console.log('bootstrap() called');
          D(devices.mailbox).registerInboundHandler(vats.vattp);
          await E(vats.vattp).registerMailboxDevice(devices.mailbox);
          await E(vats.comms).init(vats.vattp);
          const m = await E(vats.mint).makeMint();
          const purse1 = await E(m).mint(100, 'purse1');
          await E(vats.comms).addEgress('solo', 1, purse1);
          console.log('all vats initialized');
        },
      }),
    helpers.vatID,
  );
}
