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
    E =>
      harden({
        async bootstrap(argv, vats) {
          log('=> bootstrap() called');

          // setup
          const LEFT_MACHINE_NAME = 'left';
          const RIGHT_MACHINE_NAME = 'right';
          const CHANNEL = 'channel';
          const INDEX_FOR_RIGHT_INITIAL_OBJ = 0;

          await E(vats.rightcomms).init(RIGHT_MACHINE_NAME, 'rightSigningKey');
          await E(vats.leftcomms).init(LEFT_MACHINE_NAME, 'leftSigningKey');

          await E(vats.rightcomms).connect(
            LEFT_MACHINE_NAME,
            'leftVerifyingKey',
            CHANNEL,
          );
          await E(vats.leftcomms).connect(
            RIGHT_MACHINE_NAME,
            'rightVerifyingKey',
            CHANNEL,
          );

          await E(vats.rightcomms).addEgress(
            LEFT_MACHINE_NAME,
            INDEX_FOR_RIGHT_INITIAL_OBJ,
            vats.right,
          );

          // in addIngress, we know the common index that we want to
          // use to communicate about something on the right machine,
          // but the leftcomms needs to export it to the kernel
          const rootRightPresence = await E(vats.leftcomms).addIngress(
            RIGHT_MACHINE_NAME,
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
