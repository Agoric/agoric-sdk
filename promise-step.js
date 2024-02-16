// @ts-check
import { passStyleOf, getTag, makeTagged } from '@endo/pass-style';
import { makePromiseKit } from '@endo/promise-kit';

import { M } from '@endo/patterns';
import { E, Far } from '@endo/far';
import {
  CallbackShape,
  callE,
  callSync,
  makeClosureKit,
  makeSyncMethodCallback,
} from './callback.js';
import { isUpgradeDisconnection } from './upgrade-api.js';

const { Fail } = assert;

const PROMISE_STEP_TAG = 'PromiseStep';

/**
 * @param {any} specimen
 */
const getPromiseStepSender = specimen => {
  harden(specimen);
  if (
    passStyleOf(specimen) === 'tagged' &&
    getTag(specimen) === PROMISE_STEP_TAG
  ) {
    const promiseStep = /** @type {PromiseStep<any>} */ (specimen);
    return promiseStep.payload.sender;
  }
  return undefined;
};

/**
 * @template T
 * @param {import('@endo/far').FarRef<{ promiseSend: PromiseSend<T> }>} sender
 * @returns {PromiseStep<T>}
 */
const wrapPromiseStep = sender => makeTagged(PROMISE_STEP_TAG, { sender });

export const makeWhen = () => {
  /**
   * @template T
   * @template [TResult1=T]
   * @template [TResult2=never]
   * @param {PromiseOrStep<T>} p
   * @param {import('./callback.js').Closure<(fulfillment: T) => TResult1> | null} [onFulfilled]
   * @param {import('./callback.js').Closure<(reason: any) => TResult2> | null} [onRejected]
   * @returns {Promise<T | TResult1 | TResult2>}
   */
  const when = async (p, onFulfilled = undefined, onRejected = undefined) => {
    await null; // prevent synchronous attacks

    try {
      let lastIncarnationNumber = -1;
      /**
       * @returns {PromiseOrStep<T>}
       */
      let retry = () => p;
      for (;;) {
        // A closer version of the (potentially retried) operation.
        let awaited;
        try {
          awaited = await callSync(retry);
        } catch (e) {
          if (isUpgradeDisconnection(e)) {
            // We've been disconnected from the promise, so we'll have to retry.
            const newIncarnation = e.incarnationNumber;
            if (newIncarnation > lastIncarnationNumber) {
              lastIncarnationNumber = newIncarnation;
              continue;
            }
          }
          throw e;
        }

        const sender = getPromiseStepSender(awaited);
        if (!sender) {
          // We've fulfilled.
          const fulfillment = /** @type {T} */ (awaited);
          if (onFulfilled == null) {
            return fulfillment;
          }

          return when(callE(onFulfilled, fulfillment), null, onRejected);
        }

        // Find the next step or settlement.
        retry = async () => {
          // We don't want to resolve immediately to a promise step because that
          // will create an infinite loop.  Just use a regular promise.
          return new Promise((resolve, reject) => {
            const resolver = Far('Resolver', { resolve });
            const resolveCb = makeSyncMethodCallback(resolver, 'resolve');
            E.sendOnly(sender).promiseSend('shorten', resolveCb).catch(reject);
          });
        };
      }
    } catch (e) {
      // Handle the errors.
      if (onRejected == null) {
        throw e;
      }
      return when(callE(onRejected, e));
    }
  };
  harden(when);
  return when;
};
harden(makeWhen);

/**
 * @template T
 * @typedef {(operation: string, resolve: import('./callback.js').Callback<(value: T) => void>, ...args: unknown[]) => void} PromiseSend
 */

/**
 * @template T
 * @typedef {{
 *   [Symbol.toStringTag]: PROMISE_STEP_TAG,
 *   payload: {
 *     sender:
 *       import('@endo/far').FarRef<{ promiseSend: PromiseSend<T> }>
 *   },
 *   [passStyle: symbol]: 'tagged' | string,
 * }} PromiseStep
 */

/**
 * @template T
 * @typedef {(
 *   T extends PromiseLike<infer U> ? Closest<U> :
 *   T extends PromiseStep<infer U> ? Closest<U> :
 *   T
 * )} Closest
 */

/**
 * @template T
 * @typedef {PromiseLike<T | PromiseStep<T>>} PromiseOrStep
 */

/**
 * @template T
 * @typedef {object} PromiseStepKit
 * @property {PromiseStep<T>} promise
 * @property {import('./callback.js').Callback<(value: T) => void>} resolve
 * @property {import('./callback.js').Callback<(reason: T) => void>} reject
 * @property {import('@endo/far').FarRef<{ resolve(value: T): void; reject(reason: T): void; }>} settler
 */

/** @typedef {<T>(opts?: { recurse?: boolean }) => PromiseStepKit<T>} MakePromiseStepKit */

/**
 * @param {import('@agoric/base-zone').Zone} zone
 */
const preparePromiseSender = zone => {
  const makePromiseSender = zone.exoClass(
    'PromiseSender',
    M.interface('PromiseStep', {
      promiseSend: M.call(M.string(), CallbackShape)
        .rest(M.any())
        .returns(M.any()),
    }),
    handlers => ({ handlers }),
    {
      /** @type {PromiseSend<any>} */
      promiseSend(op, win, ...args) {
        op !== 'fallback' || Fail`Cannot call fallback directly`;
        const handlerOp = this.state.handlers[op];
        let result;
        if (handlerOp) {
          result = callE(handlerOp, ...args);
        } else {
          const fallback = this.state.handlers.fallback;
          fallback || Fail`No fallback for ${op}`;
          result = callE(fallback, op, ...args);
        }
        void callE(win, result);
      },
    },
  );

  return makePromiseSender;
};

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {ReturnType<typeof preparePromiseSender>} makePromiseSender
 */
const preparePromiseStep = (zone, makePromiseSender) => {
  /**
   * @template T
   * @param {Record<string, import('./callback.js').Callback<any>>} handlerKit
   * @returns {PromiseStep<T>}
   */
  const makePromiseStep = handlerKit =>
    wrapPromiseStep(makePromiseSender(handlerKit));

  harden(makePromiseStep);
  return makePromiseStep;
};

/**
 *
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {ReturnType<preparePromiseStep>} makePromiseStep
 */
const prepareRejected = (zone, makePromiseStep) => {
  const makeRejectedPromiseHandler = zone.exoClass(
    'RejectedPromiseHandler',
    M.interface('RejectedPromiseHandler', {
      when: M.call(M.or(CallbackShape, M.null(), M.undefined())).returns(M.any),
      fallback: M.call().rest(M.any()).returns(M.any),
    }),
    reason => ({ reason }),
    {
      /**
       * @param {any} fail
       */
      when(fail) {
        if (fail == null) {
          throw this.state.reason;
        }
        return callE(fail, this.state.reason);
      },
      fallback() {
        // eslint-disable-next-line no-use-before-define
        return makeRejected(this.state.reason);
      },
    },
  );

  /**
   * @param {any} reason
   * @returns {PromiseStep<never>}
   */
  const makeRejected = reason =>
    makePromiseStep(makeClosureKit(makeRejectedPromiseHandler(reason)));
  harden(makeRejected);

  return makeRejected;
};

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {object} powers
 * @param {ReturnType<typeof makeWhen>} powers.when
 * @param {ReturnType<typeof preparePromiseSender>} powers.makePromiseSender
 * @param {MakePromiseStepKit} powers.makePromiseStepKit
 */
const prepareExtractSender = (
  zone,
  { when, makePromiseStepKit, makePromiseSender },
) => {
  /**
   * @param {any} object
   */
  const makeSettledPromiseHandler = zone.exoClass(
    'SettledPromiseHandler',
    M.interface('SettledPromiseHandler', {
      shorten: M.call().returns(M.any()),
      when: M.call()
        .optional(M.or(CallbackShape, M.null(), M.undefined()))
        .returns(M.any()),
    }),
    object => ({ object }),
    {
      shorten() {
        return this.state.object;
      },
      when() {
        return this.state.object;
      },
    },
  );

  /**
   * @param {any} object
   */
  const makeSettledPromiseSender = object =>
    makePromiseSender(makeSettledPromiseHandler(object));

  /**
   *
   * @param {any} object
   * @param {typeof Promise.prototype.then} objectThen
   */
  const makeThenablePromiseSender = (object, objectThen) =>
    makePromiseSender(
      makeClosureKit(
        Far('ThenablePromiseSender', {
          shorten() {
            const result = makePromiseKit();
            try {
              objectThen.call(object, result.resolve, result.resolve);
            } catch (e) {
              result.resolve(e);
            }
            return result.promise;
          },
          when() {
            const result = makePromiseStepKit();
            void when(object, result.resolve, result.reject);
            return result.promise;
          },
          /**
           * @param {string} op
           * @param {...unknown} args
           */
          fallback(op, ...args) {
            const promise = this.shorten();
            const result = makePromiseStepKit();
            void E.sendOnly(
              // eslint-disable-next-line no-use-before-define
              extractSender(promise),
            ).promiseSend(op, result.resolve, ...args);
            return result.promise;
          },
        }),
      ),
    );

  /**
   * @param {any} object
   * @returns {import('@endo/far').FarRef<{ promiseSend: PromiseSend<any> }>}
   */
  const extractSender = object => {
    const sender = getPromiseStepSender(object);
    if (sender) {
      return sender;
    }

    const objectThen = object && object.then;
    if (typeof objectThen !== 'function') {
      return makeSettledPromiseSender(object);
    }

    return makeThenablePromiseSender(object, objectThen);
  };

  harden(extractSender);
  return extractSender;
};

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {object} powers
 * @param {ReturnType<typeof prepareRejected>} powers.makeRejected
 * @param {ReturnType<typeof prepareExtractSender>} powers.extractSender
 */
export const preparePromiseStepKit = (
  zone,
  { makeRejected, extractSender },
) => {
  const makePromiseStepInternals = zone.exoClassKit(
    'PromiseStepInternals',
    harden({
      sender: M.interface('PromiseStepSender', {
        promiseSend: M.call(M.string(), CallbackShape).rest(M.any()).returns(),
      }),
      settler: M.interface('PromiseStepSettler', {
        resolve: M.call(M.any()).returns(),
        reject: M.call(M.any()).returns(),
      }),
    }),
    /**
     * @template T
     * @param {Parameters<MakePromiseStepKit>[0]} opts
     */
    opts => {
      /**
       * @type {{
       *   pending?: [string, import('./callback.js').Callback<(value: any) => void>, ...unknown[]][],
       *   sender?: import('@endo/far').FarRef<{ promiseSend: PromiseSend<T> }>,
       *   opts: typeof opts,
       * }}
       */
      const state = {
        pending: [],
        sender: undefined,
        opts,
      };
      return state;
    },
    {
      sender: {
        /**
         * @type {PromiseSend<any>}
         */
        promiseSend(...args) {
          if (this.state.pending) {
            this.state.pending = [...this.state.pending, args];
            return;
          }

          const sender = this.state.sender;
          assert(sender);
          void E.sendOnly(sender).promiseSend(...args);
        },
      },
      settler: {
        /**
         * @param {any} value
         */
        resolve(value) {
          if (!this.state.pending) {
            return;
          }

          const sender = extractSender(value);
          this.state.sender = sender;
          for (const args of this.state.pending) {
            void E.sendOnly(sender).promiseSend(...args);
          }
          this.state.pending = undefined;
        },
        /**
         * @param {any} reason
         */
        reject(reason) {
          this.facets.settler.resolve(makeRejected(reason));
        },
      },
    },
  );

  /** @type {MakePromiseStepKit} */
  const makePromiseStepKit = opts => {
    const { sender, settler } = makePromiseStepInternals(opts);
    const promise = wrapPromiseStep(sender);
    const settlerCallbacks = makeClosureKit(settler);
    return harden({ ...settlerCallbacks, promise, settler });
  };
  harden(makePromiseStepKit);

  return makePromiseStepKit;
};
harden(preparePromiseStepKit);

/**
 * @param {import('@agoric/base-zone').Zone} zone
 */
export const prepareModule = zone => {
  // Break a cycle between the different pieces.
  /** @type {MakePromiseStepKit} */
  let makePromiseStepKit;

  /** @type {MakePromiseStepKit} */
  const earlyPromiseStepKit = opts => makePromiseStepKit(opts);

  // Assemble the pieces.
  const when = makeWhen();
  const makePromiseSender = preparePromiseSender(zone);
  const makePromiseStep = preparePromiseStep(zone, makePromiseSender);
  const makeRejected = prepareRejected(zone, makePromiseStep);
  const extractSender = prepareExtractSender(zone, {
    when,
    makePromiseStepKit: earlyPromiseStepKit,
    makePromiseSender,
  });
  makePromiseStepKit = preparePromiseStepKit(zone, {
    extractSender,
    makeRejected,
  });

  return harden({ makePromiseStepKit, makePromiseStep, when });
};
harden(prepareModule);
