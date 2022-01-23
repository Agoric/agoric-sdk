// @ts-check
import { trackTurns } from './track-turns.js';

/// <reference path="index.d.ts" />

/**
 * Ensure that the resulting promise and its fulfillment values are frozen.
 *
 * @param {Promise<void>} p
 */
const hardenResult = p => {
  // Harden so that subsequent `.then`s cannot mutate the fulfillment.  We do
  // this as the first `.then` so that the caller cannot observe the unhardened
  // result.
  p.then(harden, harden);

  // Harden this Promise because it's our only opportunity to ensure
  // p1=E(x).foo() is hardened. The Handled Promise API does not (yet)
  // allow the handler to synchronously influence the promise returned
  // by the handled methods, so we must freeze it from the outside. See
  // #95 for details.
  //
  // We return the original promise because the HandledPromise handler may
  // rely on its identity (returnedP) being given to the caller.
  return harden(p);
};

/** @type {ProxyHandler<any>} */
const baseFreezableProxyHandler = {
  set(_target, _prop, _value) {
    return false;
  },
  isExtensible(_target) {
    return false;
  },
  setPrototypeOf(_target, _value) {
    return false;
  },
  deleteProperty(_target, _prop) {
    return false;
  },
};

/**
 * A Proxy handler for E(x).
 *
 * @param {*} x Any value passed to E(x)
 * @param {*} HandledPromise
 * @returns {ProxyHandler} the Proxy handler
 */
function EProxyHandler(x, HandledPromise) {
  return harden({
    ...baseFreezableProxyHandler,
    get(_target, p, _receiver) {
      return harden((...args) =>
        hardenResult(HandledPromise.applyMethod(x, p, harden(args))),
      );
    },
    apply(_target, _thisArg, argArray = []) {
      return hardenResult(HandledPromise.applyFunction(x, harden(argArray)));
    },
    has(_target, _p) {
      // We just pretend everything exists.
      return true;
    },
  });
}

/**
 * A Proxy handler for E.sendOnly(x)
 * It is a variant on the E(x) Proxy handler.
 *
 * @param {*} x Any value passed to E.sendOnly(x)
 * @param {*} HandledPromise
 * @returns {ProxyHandler} the Proxy handler
 */
function EsendOnlyProxyHandler(x, HandledPromise) {
  return harden({
    ...baseFreezableProxyHandler,
    get(_target, p, _receiver) {
      return harden((...args) => {
        HandledPromise.applyMethodSendOnly(x, p, harden(args));
        return undefined;
      });
    },
    apply(_target, _thisArg, argsArray = []) {
      HandledPromise.applyFunctionSendOnly(x, harden(argsArray));
      return undefined;
    },
    has(_target, _p) {
      // We just pretend that everything exists.
      return true;
    },
  });
}

export default function makeE(HandledPromise) {
  function E(x) {
    const handler = EProxyHandler(x, HandledPromise);
    return harden(new Proxy(() => {}, handler));
  }

  const makeEGetterProxy = x =>
    new Proxy(Object.create(null), {
      ...baseFreezableProxyHandler,
      has(_target, _prop) {
        return true;
      },
      get(_target, prop) {
        return hardenResult(HandledPromise.get(x, prop));
      },
    });

  E.get = makeEGetterProxy;
  E.resolve = HandledPromise.resolve;
  E.sendOnly = x => {
    const handler = EsendOnlyProxyHandler(x, HandledPromise);
    return harden(new Proxy(() => {}, handler));
  };

  E.when = (x, onfulfilled = undefined, onrejected = undefined) => {
    const [onsuccess, onfailure] = trackTurns([onfulfilled, onrejected]);
    return HandledPromise.resolve(x).then(onsuccess, onfailure);
  };

  return harden(E);
}
