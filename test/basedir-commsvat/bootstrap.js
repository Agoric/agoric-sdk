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

          await E(vats.rightcomms).addEgress(
            LEFT_MACHINE_NAME,
            RIGHT_CLIST_INDEX,
            vats.right,
          );

          // in addIngress, we know the common index that we want to
          // use to communicate about something on the right machine,
          // but the leftcomms needs to export it to the kernel
          const pPRootRight = E(vats.leftcomms).addIngress(
            RIGHT_MACHINE_NAME,
            RIGHT_CLIST_INDEX,
          ); // the promise for the presence of right root object

          const test = argv[0];
          const args = argv.slice(1);
          if (test === 'method' || test === 'methodWithArgs') {
            E(vats.left)
              .callMethodOnPresence(pPRootRight, args)
              .then(
                r =>
                  log(
                    `=> the promise given by the call to left.callMethodOnPresence resolved to '${r}'`,
                  ),
                err =>
                  log(
                    `=> the promise given by the call to left.callMethodOnPresence was rejected '${err}''`,
                  ),
              );
          }
          if (test === 'methodWithRef') {
            // test equality - maintain object identity- make sure that we aren't creating new presences
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
          if (test === 'methodWithOtherRef') {
            const newObj = await E(vats.left).createNewObj();

            pPRootRight.then(
              rootRightPresence => {
                log(`rootRightPresence ${rootRightPresence}`);
                E(vats.left)
                  .callMethodOnPresenceWithOtherRef(rootRightPresence, newObj)
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
          if (test === 'methodWithOtherRefTwice') {
            const newObj = await E(vats.left).createNewObj();

            pPRootRight.then(
              rootRightPresence => {
                log(`rootRightPresence ${rootRightPresence}`);
                E(vats.left)
                  .callMethodOnPresenceWithOtherRefTwice(
                    rootRightPresence,
                    newObj,
                  )
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
          if (test === 'takeRefAndReturnItAsData') {
            const newObj = await E(vats.left).createNewObj();

            pPRootRight.then(
              rootRightPresence => {
                log(`rootRightPresence ${rootRightPresence}`);
                E(vats.left)
                  .callMethodOnRefAndReturnItAsData(rootRightPresence, newObj)
                  .then(
                    r =>
                      log(
                        `=> the promise given by the call to left.callMethodOnRefAndReturnItAsData resolved to '${r}'`,
                      ),
                    err =>
                      log(
                        `=> the promise given by the call to left.callMethodOnRefAndReturnItAsData was rejected '${err}''`,
                      ),
                  );
              },
              err => log(`${err}`),
            );
          }
          if (test === 'getPromiseBack') {
            pPRootRight.then(
              rootRightPresence => {
                E(vats.left).getPromiseBack(rootRightPresence);
              },
              err => log(`${err}`),
            );
          }
          if (test === 'sendPromiseForPresence') {
            E(vats.left)
              .callMethodOnPromiseForPresence(pPRootRight)
              .then(
                r =>
                  log(
                    `=> the promise given by the call to left.callMethodOnPromiseForPresence resolved to '${r}'`,
                  ),
                err =>
                  log(
                    `=> the promise given by the call to left.callMethodOnPromiseForPresence was rejected '${err}''`,
                  ),
              );
          }
        },
      }),
    helpers.vatID,
  );
}
