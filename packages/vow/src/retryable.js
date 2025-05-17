import { Fail } from '@endo/errors';
import { M } from '@endo/patterns';
import { PromiseWatcherI } from '@agoric/base-zone';
import { makeAsVow, toPassableCap, VowShape } from './vow-utils.js';

/**
 * @import {MapStore, WeakMapStore} from '@agoric/store'
 * @import {Zone} from '@agoric/base-zone'
 * @import {Vow, VowKit, IsRetryableReason, VowTools} from './types.js'
 * @import {Passable, PassableCap} from '@endo/pass-style'
 */

/**
 * @typedef {object} PreparationOptions
 * @property {() => VowKit<any>} makeVowKit
 * @property {IsRetryableReason} isRetryableReason
 */

/**
 * @typedef {(...args: Passable[]) => Promise<any>} RetryableFunc
 */

const { defineProperties } = Object;

const RetryableFlowIKit = harden({
  flow: M.interface('Flow', {
    restart: M.call().returns(),
    getOutcome: M.call().returns(VowShape),
  }),
  resultWatcher: PromiseWatcherI,
});

const AdminRetryableFlowI = M.interface('RetryableFlowAdmin', {
  getFlowForOutcomeVow: M.call(VowShape).returns(M.opt(M.remotable('flow'))),
});

/**
 * @param {Zone} outerZone
 * @param {PreparationOptions} outerOptions
 */
export const prepareRetryableTools = (outerZone, outerOptions) => {
  const { makeVowKit, isRetryableReason } = outerOptions;

  const asVow = makeAsVow(makeVowKit);

  /**
   * So we can give out wrapper functions easily and recover flow objects
   * for their activations later.
   */
  const flowForOutcomeVowKey =
    /** @type {MapStore<PassableCap, RetryableFlow>} */ (
      outerZone.mapStore('retryableFlowForOutcomeVow', {
        keyShape: M.remotable('toPassableCap'),
        valueShape: M.remotable('flow'), // isDone === false
      })
    );

  /**
   * @param {Zone} zone
   * @param {string} tag
   * @param {RetryableFunc} retryableFunc
   */
  const prepareRetryableFlowKit = (zone, tag, retryableFunc) => {
    typeof retryableFunc === 'function' ||
      Fail`retryableFunc must be a callable function ${retryableFunc}`;

    const internalMakeRetryableFlowKit = zone.exoClassKit(
      tag,
      RetryableFlowIKit,
      activationArgs => {
        harden(activationArgs);

        return {
          activationArgs, // restarting the retryable function uses the original args
          outcomeKit: makeVowKit(), // outcome of activation as vow
          lastRetryReason: undefined,
          runs: 0n,
          isDone: false, // persistently done
        };
      },
      {
        flow: {
          /**
           * Calls the retryable function, either for the initial run or when
           * the result of the previous run fails with a retryable reason.
           */
          restart() {
            const { state, facets } = this;
            const { activationArgs, isDone } = state;
            const { flow, resultWatcher } = facets;

            !isDone ||
              // separate line so I can set a breakpoint
              Fail`Cannot restart a done retryable flow ${flow}`;

            const runId = state.runs + 1n;
            state.runs = runId;

            let resultP;
            try {
              resultP = Promise.resolve(retryableFunc(...activationArgs));
            } catch (err) {
              resultP = Promise.reject(err);
            }

            outerZone.watchPromise(harden(resultP), resultWatcher, runId);
          },
          getOutcome() {
            const { state } = this;
            const { outcomeKit } = state;
            return outcomeKit.vow;
          },
        },
        resultWatcher: {
          onFulfilled(value, runId) {
            const { state } = this;
            const { runs, outcomeKit } = state;
            if (runId !== runs) return;
            !state.isDone ||
              Fail`Cannot resolve a done retryable flow ${this.facets.flow}`;
            outcomeKit.resolver.resolve(value);
            flowForOutcomeVowKey.delete(toPassableCap(outcomeKit.vow));
            state.isDone = true;
          },
          onRejected(reason, runId) {
            const { state } = this;
            const { runs, outcomeKit } = state;
            if (runId !== runs) return;
            !state.isDone ||
              Fail`Cannot reject a done retryable flow ${this.facets.flow}`;
            const retryReason = isRetryableReason(
              reason,
              state.lastRetryReason,
            );
            if (retryReason) {
              state.lastRetryReason = retryReason;
              this.facets.flow.restart();
            } else {
              outcomeKit.resolver.reject(reason);
              flowForOutcomeVowKey.delete(toPassableCap(outcomeKit.vow));
              state.isDone = true;
            }
          },
        },
      },
    );
    const makeRetryableFlowKit = activationArgs => {
      const retryableKit = internalMakeRetryableFlowKit(activationArgs);
      const { flow } = retryableKit;

      const vow = flow.getOutcome();
      flowForOutcomeVowKey.init(toPassableCap(vow), flow);
      flow.restart();
      return retryableKit;
    };
    return harden(makeRetryableFlowKit);
  };

  /**
   * @type {VowTools['retryable']}
   */
  const retryable = (zone, tag, retryableFunc) => {
    const makeRetryableKit = prepareRetryableFlowKit(zone, tag, retryableFunc);
    const wrapperFuncName = `${tag}_retryable`;

    const wrapperFunc = {
      /** @param {any[]} args */
      [wrapperFuncName](...args) {
        // Make sure any error results in a rejected vow
        return asVow(() => {
          zone.isStorable(harden(args)) ||
            Fail`retryable arguments must be storable ${args}`;
          const { flow } = makeRetryableKit(args);
          return flow.getOutcome();
        });
      },
    }[wrapperFuncName];
    defineProperties(wrapperFunc, {
      length: { value: retryableFunc.length },
    });
    // @ts-expect-error inferred generic func
    return harden(wrapperFunc);
  };

  const adminRetryableFlow = outerZone.exo(
    'AdminRetryableFlow',
    AdminRetryableFlowI,
    {
      /**
       * @param {Vow} outcomeVow
       */
      getFlowForOutcomeVow(outcomeVow) {
        return flowForOutcomeVowKey.get(toPassableCap(outcomeVow));
      },
    },
  );

  return harden({
    prepareRetryableFlowKit,
    adminRetryableFlow,
    retryable,
  });
};
harden(prepareRetryableTools);

/**
 * @typedef {ReturnType<prepareRetryableTools>} RetryableTools
 */

/**
 * @typedef {RetryableTools['adminRetryableFlow']} AdminRetryableFlow
 */

/**
 * @typedef {ReturnType<RetryableTools['prepareRetryableFlowKit']>} MakeRetryableFlowKit
 */

/**
 * @typedef {ReturnType<MakeRetryableFlowKit>} RetryableFlowKit
 */

/**
 * @typedef {RetryableFlowKit['flow']} RetryableFlow
 */
