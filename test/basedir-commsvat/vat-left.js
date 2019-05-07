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
        callMethodOnPresence(presence, args) {
          log(`=> left.callMethodOnPresence is called with args: [${args}]`);
          if (args.length <= 0) {
            E(presence)
              .method()
              .then(r => log(`=> left vat receives the returnedData: ${r}`));
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
