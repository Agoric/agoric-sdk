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

          const LEFT_MACHINE_NAME = 'left';
          const RIGHT_MACHINE_NAME = 'right';
          const CHANNEL = 'channel';
          const RIGHT_CLIST_INDEX = 0;

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

          await E(vats.rightcomms).addExport(
            LEFT_MACHINE_NAME,
            RIGHT_CLIST_INDEX,
            vats.right,
          );

          const pPRootRight = E(vats.leftcomms).addImport(
            RIGHT_MACHINE_NAME,
            RIGHT_CLIST_INDEX,
          ); // the promise for the presence of right root object

          const test = argv[0];
          const args = argv.slice(1);
          if (test === 'method' || test === 'methodWithArgs') {
            E(vats.left).callMethodOnPresence(pPRootRight, args);
          }
          if (test === 'methodWithRef') {
            pPRootRight.then(
              rootRightPresence => {
                log(`rootRightPresence ${rootRightPresence}`);
                E(vats.left)
                  .callMethodOnPresenceWithRef(rootRightPresence)
                  .then(
                    r =>
                      log(
                        `=> the promise given by the call to left.callMethodOnPresenceWithRef resolved to '${r}'`,
                      ),
                    err =>
                      log(
                        `=> the promise given by the call to left.callMethodOnPresenceWithRef was rejected '${err}''`,
                      ),
                  );
              },
              err => log(`${err}`),
            );
          }
        },
      }),
    helpers.vatID,
  );
}
