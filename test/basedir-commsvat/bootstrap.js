import harden from '@agoric/harden';

console.log(`=> loading bootstrap.js`);

export default function setup(syscall, state, helpers) {
  function log(what) {
    helpers.log(what);
  }
  log(`=> setup called`);

  return helpers.makeLiveSlots(
    syscall,
    state,
    (E, D) =>
      harden({
        async bootstrap(argv, vats, devices) {
          log('=> bootstrap() called');

          // setup
          const LEFT = 'left';
          const RIGHT = 'right';
          const RIGHT_OBJECT_INDEX = 12;

          D(devices.loopbox).registerInboundHandler(LEFT, vats.leftvattp);
          const leftsender = D(devices.loopbox).makeSender(LEFT);
          await E(vats.leftvattp).registerMailboxDevice(leftsender);

          const {
            transmitter: txToRightForLeft,
            setReceiver: setRxFromRightForLeft,
          } = await E(vats.leftvattp).addRemote(RIGHT);
          const rxFromRightForLeft = await E(vats.leftcomms).addRemote(
            RIGHT,
            txToRightForLeft,
          );
          await E(setRxFromRightForLeft).setReceiver(rxFromRightForLeft);

          D(devices.loopbox).registerInboundHandler(RIGHT, vats.rightvattp);
          const rightsender = D(devices.loopbox).makeSender(RIGHT);
          await E(vats.rightvattp).registerMailboxDevice(rightsender);

          const {
            transmitter: txToLeftForRight,
            setReceiver: setRxFromLeftForRight,
          } = await E(vats.rightvattp).addRemote(LEFT);
          const rxFromLeftForRight = await E(vats.rightcomms).addRemote(
            LEFT,
            txToLeftForRight,
          );
          await E(setRxFromLeftForRight).setReceiver(rxFromLeftForRight);

          await E(vats.rightcomms).addEgress(
            LEFT,
            RIGHT_OBJECT_INDEX,
            vats.right,
          );

          // in addIngress, we know the common index that we want to
          // use to communicate about something on the right machine,
          // but the leftcomms needs to export it to the kernel
          const rootRightPresence = await E(vats.leftcomms).addIngress(
            RIGHT,
            RIGHT_OBJECT_INDEX,
          );

          // run tests
          const test = argv[0];
          const rootLeftPresence = vats.left;

          await E(vats.left).startTest(test, [
            rootRightPresence,
            rootLeftPresence,
          ]);
        },
      }),
    helpers.vatID,
  );
}
