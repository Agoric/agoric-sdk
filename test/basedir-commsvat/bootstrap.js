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
          const INDEX_FOR_RIGHT_INITIAL_OBJ = 0;

          D(devices.loopbox).registerInboundHandler(LEFT, vats.leftvattp);
          const leftsender = D(devices.loopbox).makeSender(LEFT);
          await E(vats.leftvattp).registerMailboxDevice(leftsender);
          await E(vats.leftcomms).init(vats.leftvattp);

          D(devices.loopbox).registerInboundHandler(RIGHT, vats.rightvattp);
          const rightsender = D(devices.loopbox).makeSender(RIGHT);
          await E(vats.rightvattp).registerMailboxDevice(rightsender);
          await E(vats.rightcomms).init(vats.rightvattp);

          await E(vats.rightcomms).addEgress(
            LEFT,
            INDEX_FOR_RIGHT_INITIAL_OBJ,
            vats.right,
          );

          // in addIngress, we know the common index that we want to
          // use to communicate about something on the right machine,
          // but the leftcomms needs to export it to the kernel
          const rootRightPresence = await E(vats.leftcomms).addIngress(
            RIGHT,
            INDEX_FOR_RIGHT_INITIAL_OBJ,
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
