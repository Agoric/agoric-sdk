// @ts-check
import { trackTurns } from './track-turns.js';

/// <reference path="index.d.ts" />

/** @type {ProxyHandler<any>} */
const baseFreezableProxyHandler = {
  set: (_target, _prop, _value) => false,
  isExtensible: _target => false,
  setPrototypeOf: (_target, _value) => false,
  deleteProperty: (_target, _prop) => false,
};

/**
 * A Proxy handler for E(x).
 *
 * @param {*} x Any value passed to E(x)
 * @param {*} HandledPromise
 * @returns {ProxyHandler} the Proxy handler
 */
const EProxyHandler = (x, HandledPromise) =>
  harden({
    ...baseFreezableProxyHandler,
    get:
      (_target, p, _receiver) =>
      (...args) =>
        harden(HandledPromise.applyMethod(x, p, harden(args))),
    apply: (_target, _thisArg, argArray = []) =>
      harden(HandledPromise.applyFunction(x, harden(argArray))),
    has: (_target, _p) => true,
  });

/**
 * A Proxy handler for E.sendOnly(x)
 * It is a variant on the E(x) Proxy handler.
 *
 * @param {*} x Any value passed to E.sendOnly(x)
 * @param {*} HandledPromise
 * @returns {ProxyHandler} the Proxy handler
 */
const EsendOnlyProxyHandler = (x, HandledPromise) =>
  harden({
    ...baseFreezableProxyHandler,
    get:
      (_target, p, _receiver) =>
      (...args) => {
        HandledPromise.applyMethodSendOnly(x, p, harden(args));
        return undefined;
      },
    apply: (_target, _thisArg, argsArray = []) => {
      HandledPromise.applyFunctionSendOnly(x, harden(argsArray));
      return undefined;
    },
    has: (_target, _p) => true,
  });

export default HandledPromise => {
  const E = x => {
    const handler = EProxyHandler(x, HandledPromise);
    return harden(new Proxy(() => {}, handler));
  };

  const makeEGetterProxy = x =>
    new Proxy(Object.create(null), {
      ...baseFreezableProxyHandler,
      has: (_target, _prop) => true,
      get: (_target, prop) => harden(HandledPromise.get(x, prop)),
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
};
