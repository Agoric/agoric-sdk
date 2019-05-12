import harden from '@agoric/harden';

export default function setup(syscall, state, helpers) {
  function log(what) {
    helpers.log(what);
  }
  return helpers.makeLiveSlots(
    syscall,
    state,
    E =>
      harden({
        startTest(test, args) {
          switch (test) {
            case 'left does: E(right.0).method() => returnData': {
              const rightRootPresence = args[0];
              E(rightRootPresence)
                .method()
                .then(r => log(`=> left vat receives the returnedData: ${r}`));
              break;
            }

            case 'left does: E(right.1).method() => returnData': {
              const rightNewObjPresence = args[0];
              E(rightNewObjPresence)
                .method()
                .then(r => log(`=> left vat receives the returnedData: ${r}`));
              break;
            }

            default:
              throw new Error(`test ${test} not recognized`);
          }
        },
        callMethodOnPresence(presence, args) {
          log(`=> left.callMethodOnPresence is called with args: [${args}]`);
          if (args.length <= 0) {
            
          } else {
            E(presence)
              .takeArgAndReturnData(args)
              .then(returnedData => {
                log(`=> left vat receives the returnedData: ${returnedData}`);
              });
          }
          return 'presence was called';
        },
        callMethodOnPresenceWithRef(presence) {
          E(presence)
            .takeReferenceEqualToTargetAndReturnData(presence)
            .then(returnedData => {
              log(`=> left vat receives the returnedData: ${returnedData}`);
            });
          return 'presence was called';
        },
        callMethodOnPresenceWithOtherRef(presence, otherRef) {
          E(presence)
            .takeReferenceDifferentThanTargetAndReturnData(otherRef)
            .then(returnedData => {
              log(`=> left vat receives the returnedData: ${returnedData}`);
            });
          return 'presence was called';
        },
        callMethodOnPresenceWithOtherRefTwice(presence, otherRef) {
          E(presence)
            .takeReferenceDifferentThanTargetAndReturnDataTwice(otherRef)
            .then(returnedData => {
              log(`=> left vat receives the returnedData: ${returnedData}`);
            });
          E(presence)
            .takeReferenceDifferentThanTargetAndReturnDataTwice(otherRef)
            .then(returnedData => {
              log(`=> left vat receives the returnedData: ${returnedData}`);
            });
          return 'presence was called';
        },
        callMethodOnRefAndReturnItAsData(presence, otherRef) {
          E(presence)
            .takeRefAndReturnItAsData(otherRef)
            .then(returnedDataRef => {
              E(returnedDataRef.ref)
                .hi()
                .then(r => log(`=> left vat receives the returnedData: ${r}`));
            });
          return 'callMethodOnRefAndReturnItAsData was called';
        },
        callMethodOnRefAndReturnItAsDataRight(presence, newRightObj) {
          E(presence)
            .takeRefAndReturnItAsData(newRightObj)
            .then(returnedDataRef => {
              E(returnedDataRef.ref)
                .eat()
                .then(r => log(`=> left vat receives the returnedData: ${r}`));
            });
          return 'callMethodOnRefAndReturnItAsData was called';
        },
        getPromiseBack(presence) {
          const p = E(presence).getPromiseBack();
          log(`left received ${p}`);
          p.then(r => {
            log(`left p resolved to ${r}`);
          });
          return 'called left.getPromiseBack';
        },
        callMethodOnPromiseForPresence(pPresence) {
          E(pPresence)
            .takeReferenceEqualToTargetAndCallMethod(pPresence)
            .then(returnedData => {
              log(`=> left vat receives the returnedData: ${returnedData}`);
            });
          return 'left vat called right';
        },
        createNewObj() {
          return {
            hi() {
              return 'hello';
            },
          };
        },
      }),
    helpers.vatID,
  );
}
