import harden from '@agoric/harden';

/**
 * A Proxy handler for E(x).
 *
 * @param {Promise} ep Promise with eventual send API
 * @returns {ProxyHandler} the Proxy handler
 */
function EProxyHandler(ep, HandledPromise) {
  return harden({
    get(_target, p, _receiver) {
      if (`${p}` !== p) {
        return undefined;
      }
      // Harden this Promise because it's our only opportunity to ensure
      // p1=E(x).foo() is hardened. The Handled Promise API does not (yet)
      // allow the handler to synchronously influence the promise returned
      // by the handled methods, so we must freeze it from the outside. See
      // #95 for details.
      return (...args) => harden(HandledPromise.applyMethod(ep, p, args));
    },
    deleteProperty(_target, p) {
      return harden(HandledPromise.delete(ep, p));
    },
    set(_target, p, value, _receiver) {
      return harden(HandledPromise.set(ep, p, value));
    },
    apply(_target, _thisArg, argArray = []) {
      return harden(HandledPromise.apply(ep, argArray));
    },
    has(_target, _p) {
      // We just pretend everything exists.
      return true;
    },
  });
}

export default function makeE(HandledPromise) {
  return function E(x) {
    // p = E(x).name(args)
    //
    // E(x) returns a proxy on which you can call arbitrary methods. Each of
    // these method calls returns a promise. The method will be invoked on
    // whatever 'x' designates (or resolves to) in a future turn, not this
    // one.

    const targetP = Promise.resolve(x);
    // targetP might resolve to a Presence
    const handler = EProxyHandler(targetP, HandledPromise);
    return harden(new Proxy({}, handler));
  };
}
