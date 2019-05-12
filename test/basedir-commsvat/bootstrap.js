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
          ); // the promise for the presence of right root object

          // run tests
          const test = argv[0];
          const args = argv.slice(1);

          switch (test) {
            case 'left does: E(right.0).method() => returnData': {
              await E(vats.left).startTest(test, [rootRightPresence]);
              break;
            }

            case 'left does: E(right.1).method() => returnData': {
              const newRightObjPresence = await E(vats.right).createNewObj();
              await E(vats.left).startTest(test, [newRightObjPresence]);
              break;
            }

            // case 'methodWithArgs': {
            //   E(vats.left)
            //     .callMethodOnPresence(pPRootRight, args)
            //     .then(r => log(`bootstrap call resolved to ${r}`));
            //   break;
            // }

            // case 'methodWithRef': {
            //   // test equality - maintain object identity- make sure
            //   // that we aren't creating new presences
            //   pPRootRight.then(rootRightPresence => {
            //     E(vats.left)
            //       .callMethodOnPresenceWithRef(rootRightPresence)
            //       .then(r => log(`bootstrap call resolved to ${r}`));
            //   });
            //   break;
            // }

            // case 'methodWithOtherRef': {
            //   const newObj = await E(vats.left).createNewObj();
            //   pPRootRight.then(rootRightPresence => {
            //     E(vats.left)
            //       .callMethodOnPresenceWithOtherRef(rootRightPresence, newObj)
            //       .then(r => log(`bootstrap call resolved to ${r}`));
            //   });
            //   break;
            // }

            // case 'methodWithOtherRefTwice': {
            //   const newObj = await E(vats.left).createNewObj();
            //   pPRootRight.then(rootRightPresence => {
            //     E(vats.left)
            //       .callMethodOnPresenceWithOtherRefTwice(
            //         rootRightPresence,
            //         newObj,
            //       )
            //       .then(r => log(`bootstrap call resolved to ${r}`));
            //   });
            //   break;
            // }

            // case 'takeRefAndReturnItAsData': {
            //   const newObj = await E(vats.left).createNewObj();

            //   pPRootRight.then(rootRightPresence => {
            //     E(vats.left)
            //       .callMethodOnRefAndReturnItAsData(rootRightPresence, newObj)
            //       .then(r => log(`bootstrap call resolved to ${r}`));
            //   });
            //   break;
            // }

            // case 'takeRefAndReturnItAsDataRight': {
            //   const newObjRight = await E(vats.right).createNewObj();

            //   pPRootRight.then(rootRightPresence => {
            //     E(vats.left)
            //       .callMethodOnRefAndReturnItAsDataRight(
            //         rootRightPresence,
            //         newObjRight,
            //       )
            //       .then(r => log(`bootstrap call resolved to ${r}`));
            //   });
            //   break;
            // }

            // case 'getPromiseBack': {
            //   pPRootRight.then(rootRightPresence => {
            //     E(vats.left)
            //       .getPromiseBack(rootRightPresence)
            //       .then(r => log(`bootstrap call resolved to ${r}`));
            //   });
            //   break;
            // }

            // case 'sendPromiseForPresence': {
            //   E(vats.left)
            //     .callMethodOnPromiseForPresence(pPRootRight)
            //     .then(r => log(`bootstrap call resolved to ${r}`));
            //   break;
            // }
            default:
              throw new Error('test unexpected');
          }
        },
      }),
    helpers.vatID,
  );
}
