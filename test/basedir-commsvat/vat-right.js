import harden from '@agoric/harden';

export default function setup(syscall, state, helpers) {
  function log(what) {
    helpers.log(what);
  }

  let ingressRef;
  let hasBeenCalled = false;

  function createNewObj() {
    return {
      method() {
        log(`=> right.1.method was invoked`);
        return 'called method';
      },
    };
  }

  return helpers.makeLiveSlots(
    syscall,
    state,
    E =>
      harden({
        method() {
          log(`=> right.method was invoked`);
          return 'called method';
        },
        methodWithArgs(arg) {
          log(`=> right.methodWithArgs got the arg: ${arg}`);
          return `${arg} was received`;
        },
        methodWithPresence(ref) {
          log(`=> right.methodWithPresence got the ref ${ref}`);
          // invoke method on ref object
          return E(ref).method();
        },
        methodWithPresenceTwice(ref) {
          if (hasBeenCalled) {
            log(`ref equal each time: ${ref === ingressRef}`);
          }
          log(`=> right.methodWithPresence got the ref ${ref}`);
          hasBeenCalled = true;
          ingressRef = ref;
          // invoke method on ref object
          return E(ref).method();
        },
        methodReturnsRightPresence() {
          return this.createNewObj();
        },
        methodReturnsLeftPresence(leftPresence) {
          return leftPresence;
        },
        methodReturnsPromise() {
          log(`=> right.methodReturnsPromise was invoked`);
          return new Promise((resolve, _reject) => {
            resolve('foo');
          });
        },
        methodReturnsPromiseForRightPresence() {
          return new Promise((resolve, _reject) => {
            resolve(this.createNewObj());
          });
        },
        methodReturnsPromiseForLeftPresence(leftPresence) {
          return new Promise((resolve, _reject) => {
            resolve(leftPresence);
          });
        },
        methodReturnsPromiseReject() {
          log(`=> right.methodReturnsPromiseReject was invoked`);
          return new Promise((_resolve, reject) => {
            reject(new Error('this was rejected'));
          });
        },
        createNewObj,
      }),
    helpers.vatID,
  );
}
