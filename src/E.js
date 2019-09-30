import harden from '@agoric/harden';

/**
 * A Proxy handler for E(x).
 *
 * @param {Promise} ep Promise with eventual send API
 * @returns {ProxyHandler} the Proxy handler
 */
function EPromiseHandler(ep) {
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
      return (...args) => harden(ep.post(p, args));
    },
    deleteProperty(_target, p) {
      return harden(ep.delete(p));
    },
    set(_target, p, value, _receiver) {
      return harden(ep.put(p, value));
    },
    apply(_target, _thisArg, argArray = []) {
      return harden(ep.post(undefined, argArray));
    },
    has(_target, _p) {
      // We just pretend everything exists.
      return true;
    },
  });
}

export default function E(x) {
  // p = E(x).name(args)
  //
  // E(x) returns a proxy on which you can call arbitrary methods. Each of
  // these method calls returns a promise. The method will be invoked on
  // whatever 'x' designates (or resolves to) in a future turn, not this
  // one.

  const targetP = Promise.resolve(x);
  // targetP might resolve to a Presence
  const handler = EPromiseHandler(targetP);
  return harden(new Proxy({}, handler));
}

// Like Promise.resolve, except that if applied to a presence, it
// would be better for it to return the remote promise for this
// specimen, rather than a fresh local promise fulfilled by this
// specimen.
// TODO: for now, just alias Promise.resolve.
E.resolve = specimen => Promise.resolve(specimen);
