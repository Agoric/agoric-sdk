/* global globalThis window */
// eslint-disable-next-line spaced-comment
/// <reference path="index.d.ts" />
// Shim globalThis when we don't have it.
if (typeof globalThis === 'undefined') {
  const myGlobal = typeof window === 'undefined' ? global : window;
  myGlobal.globalThis = myGlobal;
}

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
  function E(x) {
    const handler = EProxyHandler(x, HandledPromise);
    return harden(new Proxy({}, handler));
  }

  let EChain;
  const makers = {
    G(x) {
      // Return getter.
      return new Proxy(
        {},
        {
          has(_target, _prop) {
            return true;
          },
          get(_target, prop) {
            return EChain(HandledPromise.get(x, prop));
          },
        },
      );
    },
    D(x) {
      // Return deleter.
      return new Proxy(
        {},
        {
          has(_target, _prop) {
            return true;
          },
          get(_target, prop) {
            return EChain(HandledPromise.delete(x, prop));
          },
        },
      );
    },
    S(x) {
      // Return setter.
      return new Proxy(
        {},
        {
          has(_target, _prop) {
            return true;
          },
          get(_target, prop) {
            return harden(value => EChain(HandledPromise.set(x, prop, value)));
          },
        },
      );
    },
    M(x) {
      // Return method-caller.
      return new Proxy(
        {},
        {
          has(_target, _prop) {
            return true;
          },
          get(_target, prop) {
            return harden((...args) =>
              EChain(HandledPromise.applyMethod(x, prop, args)),
            );
          },
          apply(_target, _thisArg, args = []) {
            return EChain(HandledPromise.applyFunction(x, args));
          },
        },
      );
    },
    P(x) {
      // Return as promise.
      return Promise.resolve(x);
    },
  };

  EChain = x => {
    return new Proxy(
      {}, // empty shadow
      {
        has(_target, prop) {
          return Object.keys(makers).indexOf(prop) >= 0;
        },
        get(_target, prop) {
          return harden(makers[prop](x));
        },
      },
    );
  };

  E.C = EChain;
  return harden(E);
}
