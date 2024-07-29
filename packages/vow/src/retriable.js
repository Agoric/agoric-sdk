import { Fail } from '@endo/errors';
import { M } from '@endo/patterns';
import { PromiseWatcherI } from '@agoric/base-zone';
import { toPassableCap, VowShape } from './vow-utils.js';

/**
 * @import {WeakMapStore} from '@agoric/store'
 * @import {Zone} from '@agoric/base-zone'
 * @import {Vow, VowKit, IsRetryableReason} from './types.js'
 * @import {Passable} from '@endo/pass-style'
 */

/**
 * @typedef {object} PreparationOptions
 * @property {() => VowKit<any>} makeVowKit
 * @property {IsRetryableReason} isRetryableReason
 */

/**
 * @template {Passable[]} [TArgs=Passable[]]
 * @template {any} [TRet=any]
 * @typedef {(...args: TArgs) => Promise<TRet>} RetriableFunc
 */

const { defineProperties } = Object;

const RetriableFlowIKit = harden({
  flow: M.interface('Flow', {
    restart: M.call().returns(),
    getOutcome: M.call().returns(VowShape),
  }),
  resultWatcher: PromiseWatcherI,
});

const AdminRetriableFlowI = M.interface('RetriableFlowAdmin', {
  getFlowForOutcomeVow: M.call(VowShape).returns(M.opt(M.remotable('flow'))),
});

/**
 * @param {Zone} outerZone
 * @param {PreparationOptions} outerOptions
 */
export const prepareRetriableTools = (outerZone, outerOptions) => {
  const { makeVowKit, isRetryableReason } = outerOptions;

  /**
   * So we can give out wrapper functions easily and recover flow objects
   * for their activations later.
   */
  const flowForOutcomeVowKey = outerZone.mapStore(
    'retriableFlowForOutcomeVow',
    {
      keyShape: M.remotable('toPassableCap'),
      valueShape: M.remotable('flow'), // isDone === false
    },
  );

  /**
   * @param {Zone} zone
   * @param {string} tag
   * @param {RetriableFunc} retriableFunc
   */
  const prepareRetriableFlowKit = (zone, tag, retriableFunc) => {
    typeof retriableFunc === 'function' ||
      Fail`retriableFunc must be a callable function ${retriableFunc}`;

    const internalMakeRetriableFlowKit = zone.exoClassKit(
      tag,
      RetriableFlowIKit,
      activationArgs => {
        harden(activationArgs);

        return {
          activationArgs, // restarting the retriable function uses the original args
          outcomeKit: makeVowKit(), // outcome of activation as vow
          lastRetryReason: undefined,
          runs: 0n,
          isDone: false, // persistently done
        };
      },
      {
        flow: {
          /**
           * Calls the retriable function, either for the initial run or when
           * the result of the previous run fails with a retriable reason.
           */
          restart() {
            const { state, facets } = this;
            const { activationArgs, isDone } = state;
            const { flow, resultWatcher } = facets;

            !isDone ||
              // separate line so I can set a breakpoint
              Fail`Cannot restart a done retriable flow ${flow}`;

            const runId = state.runs + 1n;
            state.runs = runId;

            let resultP;
            try {
              resultP = Promise.resolve(retriableFunc(...activationArgs));
            } catch (err) {
              resultP = Promise.resolve(() => Promise.reject(err));
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
              Fail`Cannot resolve a done retriable flow ${this.facets.flow}`;
            outcomeKit.resolver.resolve(value);
            flowForOutcomeVowKey.delete(toPassableCap(outcomeKit.vow));
            state.isDone = true;
          },
          onRejected(reason, runId) {
            const { state } = this;
            const { runs, outcomeKit } = state;
            if (runId !== runs) return;
            !state.isDone ||
              Fail`Cannot reject a done retriable flow ${this.facets.flow}`;
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
    const makeRetriableFlowKit = activationArgs => {
      const retriableKit = internalMakeRetriableFlowKit(activationArgs);
      const { flow } = retriableKit;

      const vow = flow.getOutcome();
      flowForOutcomeVowKey.init(toPassableCap(vow), flow);
      flow.restart();
      return retriableKit;
    };
    return harden(makeRetriableFlowKit);
  };

  /**
   * @template {RetriableFunc} F
   * @param {Zone} zone
   * @param {string} tag
   * @param {F} retriableFunc
   */
  const retriable = (zone, tag, retriableFunc) => {
    const makeRetriableKit = prepareRetriableFlowKit(zone, tag, retriableFunc);
    const wrapperFuncName = `${tag}_retriable`;

    const wrapperFunc = {
      /** @type {(...args: Parameters<F>) => Vow<Awaited<ReturnType<F>>>} */
      [wrapperFuncName](...args) {
        const { flow } = makeRetriableKit(args);
        return flow.getOutcome();
      },
    }[wrapperFuncName];
    defineProperties(wrapperFunc, {
      length: { value: retriableFunc.length },
    });
    return harden(wrapperFunc);
  };

  const adminRetriableFlow = outerZone.exo(
    'AdminRetriableFlow',
    AdminRetriableFlowI,
    {
      getFlowForOutcomeVow(outcomeVow) {
        return flowForOutcomeVowKey.get(toPassableCap(outcomeVow));
      },
    },
  );

  return harden({
    prepareRetriableFlowKit,
    adminRetriableFlow,
    retriable,
  });
};
harden(prepareRetriableTools);

/**
 * @typedef {ReturnType<prepareRetriableTools>} RetriableTools
 */

/**
 * @typedef {RetriableTools['adminRetriableFlow']} AdminRetriableFlow
 */

/**
 * @typedef {ReturnType<RetriableTools['prepareRetriableFlowKit']>} MakeRetriableFlowKit
 */

/**
 * @typedef {ReturnType<MakeRetriableFlowKit>} RetriableFlowKit
 */

/**
 * @typedef {RetriableFlowKit['flow']} RetriableFlow
 */
