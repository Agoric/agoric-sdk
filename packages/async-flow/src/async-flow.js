import { annotateError, Fail, makeError, X } from '@endo/errors';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { vowishKey, VowShape } from '@agoric/vow';
import { PromiseWatcherI } from '@agoric/vow/src/watch-promise.js';
import { prepareVowTools as prepareWatchableVowTools } from '@agoric/vat-data/vow.js';
import { makeReplayMembrane } from './replay-membrane.js';
import { prepareLogStore } from './log-store.js';
import { prepareWeakBijection } from './weak-bijection.js';
import { makeEphemera } from './ephemera.js';
import { LogEntryShape, FlowStateShape } from './type-guards.js';

const { defineProperties } = Object;

const AsyncFlowIKit = harden({
  flow: M.interface('Flow', {
    getFlowState: M.call().returns(FlowStateShape),
    restart: M.call().optional(M.boolean()).returns(),
    wake: M.call().returns(),
    getOutcome: M.call().returns(VowShape),
    dump: M.call().returns(M.arrayOf(LogEntryShape)),
    getOptFatalProblem: M.call().returns(M.opt(M.error())),
  }),
  admin: M.interface('FlowAdmin', {
    reset: M.call().returns(),
    complete: M.call().returns(),
    panic: M.call(M.error()).returns(M.not(M.any())), // only throws
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
    // TODO https://github.com/Agoric/agoric-sdk/issues/9231
    vowTools = prepareWatchableVowTools(outerZone),
    makeLogStore = prepareLogStore(outerZone),
    makeWeakBijection = prepareWeakBijection(outerZone),
  } = outerOptions;
  const { watch, makeVowKit } = vowTools;

  const failures = outerZone.mapStore('asyncFuncFailures', {
    keyShape: M.remotable('flow'), // flowState === 'Failed'
    valueShape: M.error(),
  });

  const eagerWakers = outerZone.setStore(`asyncFuncEagerWakers`, {
    keyShape: M.remotable('flow'), // flowState !== 'Done'
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
    valueShape: M.remotable('flow'), // flowState !== 'Done'
  });

  /**
   * @param {Zone} zone
   * @param {string} tag
   * @param {GuestAsyncFunc} guestAsyncFunc
   * @param {{ startEager?: boolean }} [options]
   */
  const prepareAsyncFlowKit = (zone, tag, guestAsyncFunc, options = {}) => {
    typeof guestAsyncFunc === 'function' ||
      Fail`guestAsyncFunc must be a callable function ${guestAsyncFunc}`;
    const {
      // May change default to false, once instances reliably wake up
      startEager = true,
    } = options;

    const internalMakeAsyncFlowKit = zone.exoClassKit(
      tag,
      AsyncFlowIKit,
      activationArgs => {
        harden(activationArgs);
        const log = makeLogStore();
        const bijection = makeWeakBijection();

        return {
          activationArgs, // replay starts by reactivating with these
          log, // log to be accumulated or replayed
          bijection, // membrane's guest-host mapping
          outcomeKit: makeVowKit(), // outcome of activation as host vow
          isDone: false, // persistently done
        };
      },
      {
        flow: {
          /**
           * @returns {FlowState}
           */
          getFlowState() {
            const { state, facets } = this;
            const { log, outcomeKit, isDone } = state;
            const { flow } = facets;
            const eph = tmp.for(flow);

            if (isDone) {
              eph.membrane === undefined ||
                Fail`Done flow must drop membrane ${flow} ${eph.membrane}`;
              !failures.has(flow) ||
                Fail`Done flow must not be in failures ${flow} ${failures.get(flow)}`;
              !eagerWakers.has(flow) ||
                Fail`Done flow must not be in eagerWakers ${flow}`;
              !flowForOutcomeVowKey.has(outcomeKit.vow) ||
                Fail`Done flow must drop flow lookup from vow ${outcomeKit.vow}`;
              (log.getIndex() === 0 && log.getLength() === 0) ||
                Fail`Done flow must empty log ${flow} ${log}`;
              return 'Done';
            }
            if (failures.has(flow)) {
              return 'Failed';
            }
            if (eph.membrane === undefined) {
              log.getIndex() === 0 ||
                Fail`Sleeping flow must play from log start ${flow} ${log.getIndex()}`;
              return 'Sleeping';
            }
            if (log.isReplaying()) {
              return 'Replaying';
            }
            return 'Running';
          },

          /**
           * Calls the guest function, either for the initial run or at the
           * start of a replay.
           *
           * @param {boolean} [eager]
           */
          restart(eager = startEager) {
            const { state, facets } = this;
            const { activationArgs, log, bijection, outcomeKit } = state;
            const { flow, admin, wakeWatcher } = facets;

            const startFlowState = flow.getFlowState();

            startFlowState !== 'Done' ||
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
            const guestArgs = membrane.hostToGuest(activationArgs);

            const flowState = flow.getFlowState();
            flowState === 'Running' ||
              flowState === 'Replaying' ||
              Fail`Restarted flow must be Running or Replaying ${flow}`;

            // In case some host vows were settled before the guest makes
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
              guestAsyncFunc(...guestArgs))();

            bijection.init(guestResultP, outcomeKit.vow);
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
                  admin.complete();
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
                  admin.complete();
                }
              },
            );
          },
          wake() {
            const { facets } = this;
            const { flow } = facets;
            const eph = tmp.for(flow);

            const flowState = flow.getFlowState();
            if (flowState === 'Done' || flowState === 'Failed') {
              return;
            }
            if (eph.membrane) {
              eph.membrane.wake();
            } else {
              flow.restart();
            }
          },
          getOutcome() {
            const { state } = this;
            const { outcomeKit } = state;
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
            if (eph.membrane) {
              eph.membrane.stop();
            }
            tmp.resetFor(flow);
            log.reset();
            bijection.reset();

            state.isDone = false;
          },
          complete() {
            const { state, facets } = this;
            const { log } = state;
            const { flow, admin } = facets;

            admin.reset();
            if (eagerWakers.has(flow)) {
              eagerWakers.delete(flow);
            }
            flowForOutcomeVowKey.delete(vowishKey(flow.getOutcome()));
            state.isDone = true;
            log.dispose();
            flow.getFlowState() === 'Done' ||
              Fail`Complete flow must be Done ${flow}`;
          },
          panic(fatalProblem) {
            const { state, facets } = this;
            const { bijection, log } = state;
            const { flow } = facets;
            const eph = tmp.for(flow);

            if (failures.has(flow)) {
              const prevErr = failures.get(flow);
              annotateError(
                prevErr,
                X`doubly failed somehow with ${fatalProblem}`,
              );
              // prevErr likely to be the more relevant diagnostic to report
              fatalProblem = prevErr;
            } else {
              failures.init(flow, fatalProblem);
            }

            if (eph.membrane) {
              eph.membrane.stop();
            }
            tmp.resetFor(flow);
            log.reset();
            bijection.reset();

            flow.getFlowState() === 'Failed' ||
              Fail`Paniced flow must be Failed ${flow}`;

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
    const makeAsyncFlowKit = activationArgs => {
      const asyncFlowKit = internalMakeAsyncFlowKit(activationArgs);
      const { flow } = asyncFlowKit;

      const vow = vowishKey(flow.getOutcome());
      flowForOutcomeVowKey.init(vowishKey(vow), flow);
      flow.restart();
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
    const hostFuncName = `${tag}_hostFlow`;
    const wrapperFunc = {
      [hostFuncName](...args) {
        const { flow } = makeAsyncFlowKit(args);
        return flow.getOutcome();
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
