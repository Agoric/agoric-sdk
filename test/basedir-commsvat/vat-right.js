import harden from '@agoric/harden';
import makePromise from '../../src/kernel/makePromise';

export default function setup(syscall, state, helpers) {
  function log(what) {
    console.log(what);
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

  let stashedPromise;
  let stashedResolver;
  let stashedRejector;
  function createNewPromise() {
    const p0 = makePromise();
    stashedPromise = p0.p;
    stashedResolver = p0.res;
    stashedRejector = p0.rej;
    return stashedPromise;
  }

  function resolve(what) {
    stashedResolver(what);
  }

  function reject(what) {
    stashedRejector(what);
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
          return createNewPromise();
        },
        resolveToFoo() {
          resolve('foo');
        },
        methodReturnsPromiseForRightPresence() {
          return createNewPromise();
        },
        resolveToNewObj() {
          resolve(this.createNewObj());
        },
        methodReturnsPromiseForLeftPresence() {
          return createNewPromise();
        },
        resolveToLeftPresence(leftPresence) {
          resolve(leftPresence);
        },
        methodReturnsPromiseReject() {
          log(`=> right.methodReturnsPromiseReject was invoked`);
          return createNewPromise();
        },
        rejectThatPromise() {
          reject(new Error('this was rejected'));
        },
        async methodWithPromise(promise) {
          const promiseResult = await promise;
          log(`promise resolves to ${promiseResult}`);
          return promiseResult;
        },
        methodOnPromiseForPresence(promiseForPresence) {
          return E(promiseForPresence).method();
        },
        createNewObj,
      }),
    helpers.vatID,
  );
}
