/* global globalThis */
const harden = (globalThis.SES && globalThis.SES.harden) || Object.freeze;

/**
 * A Proxy handler for E(x).
 *
 * @param {*} x Any value passed to E(x)
 * @returns {ProxyHandler} the Proxy handler
 */
function EProxyHandler(x, HandledPromise) {
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
      return (...args) => harden(HandledPromise.applyMethod(x, p, args));
    },
    deleteProperty(_target, p) {
      return harden(HandledPromise.delete(x, p));
    },
    set(_target, p, value, _receiver) {
      return harden(HandledPromise.set(x, p, value));
    },
    apply(_target, _thisArg, argArray = []) {
      return harden(HandledPromise.apply(x, argArray));
    },
    has(_target, _p) {
      // We just pretend everything exists.
      return true;
    },
  });
}

export default function makeE(HandledPromise) {
  return harden(function E(x) {
    // p = E(x).name(args)
    //
    // E(x) returns a proxy on which you can call arbitrary methods. Each of
    // these method calls returns a promise. The method will be invoked on
    // whatever 'x' designates (or resolves to) in a future turn, not this
    // one.

    const handler = EProxyHandler(x, HandledPromise);
    return harden(new Proxy({}, handler));
  });
}
