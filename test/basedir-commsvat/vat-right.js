import harden from '@agoric/harden';

export default function setup(syscall, state, helpers) {
  function log(what) {
    helpers.log(what);
  }

  let ingressRef;
  let hasBeenCalled = false;

  return helpers.makeLiveSlots(
    syscall,
    state,
    E =>
      harden({
        method() {
          log(`=> right.method was invoked`);
          return 'called method';
        },
        takeArgAndReturnData(arg) {
          log(`=> right.takeArgAndReturnData got the arg: ${arg}`);
          return `${arg} was received`;
        },
        takeReferenceEqualToTargetAndReturnData(ref) {
          log(
            `=> right.takeReferenceEqualToTargetAndReturnData got the arg: ${ref}`,
          );
          return `ref was received`;
        },
        takeReferenceEqualToTargetAndCallMethod(ref) {
          log(
            `=> right.takeReferenceEqualToTargetAndCallMethod got the arg: ${ref}`,
          );
          return E(ref).method();
        },
        takeReferenceDifferentThanTargetAndReturnData(ref) {
          log(
            `=> right.takeReferenceDifferentThanTargetAndReturnData got the arg: ${ref}`,
          );
          return E(ref).hi();
        },
        takeReferenceDifferentThanTargetAndReturnDataTwice(ref) {
          if (hasBeenCalled) {
            log(`ref equal each time: ${ref === ingressRef}`);
          }
          log(
            `=> right.takeReferenceDifferentThanTargetAndReturnData got the arg: ${ref}`,
          );
          hasBeenCalled = true;
          ingressRef = ref;
          return E(ref).hi();
        },
        takeRefAndReturnItAsData(ref) {
          return { ref };
        },
        takeRefAndReturnIt(ref) {
          return ref;
        },
        getPromiseBack() {
          return new Promise((resolve, _reject) => {
            resolve('foo');
          });
        },
        createNewObj() {
          return {
            method() {
              log(`=> right.1.method was invoked`);
              return 'called method';
            },
          };
        },
      }),
    helpers.vatID,
  );
}
