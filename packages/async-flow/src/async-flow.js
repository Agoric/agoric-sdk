import { annotateError, Fail, makeError, q, X } from '@endo/errors';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { VowShape } from '@agoric/vow';
import { PromiseWatcherI } from '@agoric/vow/src/watch-promise.js';
import { prepareVowTools as prepareWatchableVowTools } from '@agoric/vat-data/vow.js';
import { makeReplayMembrane } from './replay-membrane.js';
import { prepareLogStore } from './log-store.js';
import { vowishKey, prepareWeakBijection } from './weak-bijection.js';
import { makeEphemera } from './ephemera.js';
import { LogEntryShape } from './type-guards.js';

const { defineProperties } = Object;
const { apply } = Reflect;

const AsyncFlowIKit = harden({
  flow: M.interface('Flow', {
    restart: M.call().optional(M.raw(), M.boolean()).returns(),
    wake: M.call().returns(),
    getOutcome: M.call().returns(VowShape),
    dump: M.call().returns(M.arrayOf(LogEntryShape)),
    getOptFatalProblem: M.call().returns(M.opt(M.error())),
  }),
  admin: M.interface('FlowAdmin', {
    reset: M.call().returns(),
    done: M.call().returns(),
    panic: M.call(M.error()).returns(),
  }),
  wakeWatcher: PromiseWatcherI,
});

const AdminAsyncFlowI = M.interface('AsyncFlowAdmin', {
  getFailures: M.call().returns(M.mapOf(M.remotable('asyncFlow'), M.error())),
  wakeAll: M.call().returns(),
  getFlowForOutcomeVow: M.call(VowShape).returns(M.opt(M.remotable('flow'))),
});

/**
 * @param {Zone} outerZone
 * @param {PreparationOptions} [outerOptions]
 */
export const prepareAsyncFlowTools = (outerZone, outerOptions = {}) => {
  const {
    vowTools = prepareWatchableVowTools(outerZone),
    makeLogStore = prepareLogStore(outerZone),
    makeWeakBijection = prepareWeakBijection(outerZone),
  } = outerOptions;
  const { watch, makeVowKit } = vowTools;

  const failures = outerZone.mapStore('asyncFuncFailures', {
    keyShape: M.remotable('flow'),
    valueShape: M.error(),
  });

  const eagerWakers = outerZone.setStore(`asyncFuncEagerWakers`, {
    keyShape: M.remotable('flow'),
  });

  const tmp = makeEphemera(() => ({
    membrane: /** @type {ReplayMembrane} */ (
      /** @type {unknown} */ (undefined)
    ), // initialized by restart
  }));

  /**
   * So we can give out wrapper functions easily and recover flow objects
   * for their activations later.
   */
  const flowForOutcomeVowKey = outerZone.mapStore('flowForOutcomeVow', {
    keyShape: M.remotable('vowishKey'),
    valueShape: M.remotable('asyncFlow'),
  });

  /**
   * @param {Zone} zone
   * @param {string} tag
   * @param {GuestAsyncFunc} [optGuestAsyncFunc]
   * @param {{ startEager?: boolean }} [options]
   */
  const prepareAsyncFlowKit = (
    zone,
    tag,
    optGuestAsyncFunc = undefined,
    options = {},
  ) => {
    const {
      // May change default to false, once instances reliably wake up
      startEager = true,
    } = options;

    const internalMakeAsyncFlowKit = zone.exoClassKit(
      tag,
      AsyncFlowIKit,
      (activationThis, activationArgs) => {
        harden(activationThis);
        harden(activationArgs);
        const log = makeLogStore();
        const bijection = makeWeakBijection();

        return {
          activationThis, // replay starts by reactivating with these
          activationArgs, // replay starts by reactivating with these
          log, // log to be accumulated or replayed
          bijection, // membrane's guest-host mapping
          outcomeKit: makeVowKit(), // outcome of activation as host vow
          isDone: false, // persistently done
        };
      },
      {
        flow: {
          restart(func = optGuestAsyncFunc, eager = startEager) {
            if (func === undefined) {
              throw Fail`Function must either be in prepareAsyncFlowKit or restart args: ${q(
                tag,
              )}`;
            }
            const { state, facets } = this;
            const {
              activationThis,
              activationArgs,
              log,
              bijection,
              outcomeKit,
            } = state;
            const { flow, admin, wakeWatcher } = facets;

            if (failures.has(flow)) {
              failures.delete(flow);
            }

            !state.isDone ||
              // separate line so I can set a breakpoint
              Fail`Cannot restart a done flow ${flow}`;

            admin.reset();
            if (eager) {
              eagerWakers.add(flow);
            }

            const wakeWatch = vowish => {
              // Extra paranoid because we're getting
              // "promise watcher must be a virtual object"
              // in the general vicinity.
              zone.isStorable(vowish) ||
                Fail`vowish must be storable in this zone (usually, must be durable): ${vowish}`;
              zone.isStorable(wakeWatcher) ||
                Fail`wakeWatcher must be storable in this zone (usually, must be durable): ${wakeWatcher}`;
              watch(vowish, wakeWatcher);
            };
            const panic = err => admin.panic(err);
            const membrane = makeReplayMembrane(
              log,
              bijection,
              vowTools,
              wakeWatch,
              panic,
            );
            const eph = tmp.for(flow);
            eph.membrane = membrane;
            const guestThis = membrane.hostToGuest(activationThis);
            const guestArgs = membrane.hostToGuest(activationArgs);

            // In case some host promises were settled before the guest makes
            // the first call to a host object.
            membrane.wake();

            // We do *not* call the guestAsyncFunc by having the membrane make
            // a host wrapper for the function. Rather, we special case this
            // host-to-guest call by "manually" sending the arguments through
            // and calling the guest function ourselves. Likewise, we
            // special case the handling of the guestResultP, rather than
            // as the membrane to make a host vow for a guest promise.
            // To support this special casing, we store additional replay
            // data in this internal flow instance -- the host activationArgs
            // and the host outcome vow kit.
            const guestResultP = (async () =>
              // async IFFE ensures guestResultP is a fresh promise
              apply(func, guestThis, guestArgs))();

            bijection.define(guestResultP, outcomeKit.vow);
            // log is driven at first by guestAyncFunc interaction through the
            // membrane with the host activationArgs. At the end of its first
            // turn, it returns a promise for its eventual guest result.
            // It then proceeds to interact with the host through the membrane
            // in further turns by `await`ing (or otherwise registering)
            // on host vows turned into guest promises, and by calling
            // the guest presence of other host objects.
            //
            // `bijection.hasGuest(guestResultP)` can be false in a delayed
            // guest - to - host settling from a previous run.
            // In that case, the bijection was reset and all guest caps
            // created in the previous run were unregistered,
            // including `guestResultP`.
            void E.when(
              guestResultP,
              gFulfillment => {
                if (bijection.hasGuest(guestResultP)) {
                  outcomeKit.resolver.resolve(
                    membrane.guestToHost(gFulfillment),
                  );
                  admin.done();
                }
              },
              guestReason => {
                // The `guestResultP` might be a failure thrown by `panic`
                // indicating a failure to replay. In that case, we must not
                // settle the outcomeVow, since the outcome vow only represents
                // the settled result of the async function itself.
                // Fortunately, `panic` resets the bijection, again resulting
                // in the `guestResultP` being absent from the bijection,
                // so this leave the outcome vow unsettled, as it must.
                if (bijection.hasGuest(guestResultP)) {
                  outcomeKit.resolver.reject(membrane.guestToHost(guestReason));
                  admin.done();
                }
              },
            );
          },
          wake() {
            const { state, facets } = this;
            const { flow } = facets;
            const eph = tmp.for(flow);

            if (failures.has(flow)) {
              throw failures.get(flow);
            }
            if (state.isDone) {
              return;
            }
            if (eph.membrane) {
              eph.membrane.wake();
            } else {
              flow.restart();
            }
          },
          getOutcome() {
            const { state, facets } = this;
            const { outcomeKit } = state;
            const { flow } = facets;

            flow.wake();
            return outcomeKit.vow;
          },
          dump() {
            const { state } = this;
            const { log } = state;

            return log.dump();
          },
          getOptFatalProblem() {
            const { facets } = this;
            const { flow } = facets;

            return failures.has(flow) ? failures.get(flow) : undefined;
          },
        },
        admin: {
          reset() {
            const { state, facets } = this;
            const { bijection, log } = state;
            const { flow } = facets;
            const eph = tmp.for(flow);

            if (failures.has(flow)) {
              failures.delete(flow);
            }
            if (eagerWakers.has(flow)) {
              // For now, once an eagerWaker, always an eagerWaker
              // eagerWakers.delete(flow);
            }
            if (eph.membrane) {
              eph.membrane.stop();
            }
            tmp.resetFor(flow);
            log.reset();
            bijection.reset();

            state.isDone = false;
          },
          done() {
            const { state, facets } = this;
            const { log } = state;
            const { admin } = facets;

            admin.reset();
            state.isDone = true;
            log.dispose();
          },
          panic(fatalProblem) {
            const { state, facets } = this;
            const { bijection, log } = state;
            const { flow } = facets;
            const eph = tmp.for(flow);

            if (failures.has(flow)) {
              failures.set(flow, fatalProblem);
            } else {
              failures.init(flow, fatalProblem);
            }

            if (eph.membrane) {
              eph.membrane.stop();
            }
            tmp.resetFor(flow);
            log.reset();
            bijection.reset();

            // This is not an expected throw, so in theory arbitrary chaos
            // may ensue from throwing it. But at this point
            // we should have successfully isolated this activation from
            // having any observable effects on the host, aside from
            // console logging and
            // resource exhaustion, including infinite loops
            const err = makeError(
              X`In a replay failure: see getFailures() for more information`,
            );
            annotateError(err, X`due to ${fatalProblem}`);
            throw err;
          },
        },
        wakeWatcher: {
          onFulfilled(_fulfillment) {
            const { facets } = this;
            facets.flow.wake();
          },
          onRejected(_fulfillment) {
            const { facets } = this;
            facets.flow.wake();
          },
        },
      },
    );
    const makeAsyncFlowKit = (activationThis, activationArgs) => {
      const asyncFlowKit = internalMakeAsyncFlowKit(
        activationThis,
        activationArgs,
      );
      asyncFlowKit.flow.restart();
      return asyncFlowKit;
    };
    return harden(makeAsyncFlowKit);
  };

  /**
   * @param {Zone} zone
   * @param {string} tag
   * @param {GuestAsyncFunc} guestFunc
   * @param {{ startEager?: boolean }} [options]
   * @returns {HostAsyncFuncWrapper}
   */
  const asyncFlow = (zone, tag, guestFunc, options = undefined) => {
    const makeAsyncFlowKit = prepareAsyncFlowKit(zone, tag, guestFunc, options);
    const hostFuncName = `${guestFunc.name || 'anon'}_hostWrapper`;
    const wrapperFunc = {
      [hostFuncName](...args) {
        const { flow } = makeAsyncFlowKit(this, args);
        const outcomeVow = flow.getOutcome();
        flowForOutcomeVowKey.init(vowishKey(outcomeVow), flow);
        return outcomeVow;
      },
    }[hostFuncName];
    defineProperties(wrapperFunc, {
      length: { value: guestFunc.length },
    });
    return harden(wrapperFunc);
  };

  const adminAsyncFlow = outerZone.exo('AdminAsyncFlow', AdminAsyncFlowI, {
    getFailures() {
      return failures.snapshot();
    },
    wakeAll() {
      // [...stuff.keys()] in order to snapshot before iterating
      const failuresToRestart = [...failures.keys()];
      const flowsToWake = [...eagerWakers.keys()];
      for (const flow of failuresToRestart) {
        flow.restart();
      }
      for (const flow of flowsToWake) {
        flow.wake();
      }
    },
    getFlowForOutcomeVow(outcomeVow) {
      return flowForOutcomeVowKey.get(vowishKey(outcomeVow));
    },
  });

  // Cannot call this until everything is prepared
  // adminAsyncFlow.wakeAll();

  return harden({
    prepareAsyncFlowKit,
    asyncFlow,
    adminAsyncFlow,
  });
};
harden(prepareAsyncFlowTools);

/**
 * @typedef {ReturnType<prepareAsyncFlowTools>} AsyncFlowTools
 */

/**
 * @typedef {AsyncFlowTools['adminAsyncFlow']} AdminAsyncFlow
 */

/**
 * @typedef {ReturnType<AsyncFlowTools['prepareAsyncFlowKit']>} MakeAsyncFlowKit
 */

/**
 * @typedef {ReturnType<MakeAsyncFlowKit>} AsyncFlowKit
 */

/**
 * @typedef {AsyncFlowKit['flow']} AsyncFlow
 */
