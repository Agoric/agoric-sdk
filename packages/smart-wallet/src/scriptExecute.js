import { PromiseWatcherI } from '@agoric/base-zone';
import { Fail } from '@endo/errors';
import { E } from '@endo/eventual-send';

/**
 * @import {AsyncFlowTools} from '@agoric/async-flow';
 * @import {VowTools, Vow} from '@agoric/vow';
 * @import {Zone} from '@agoric/base-zone';
 * @import {AllPowers, ExecuteScriptAction, ExecuteScriptHelper, ScriptExecutionStatus} from './smartWallet.js';
 */

/**
 * @typedef {Vow} ActiveFlowsValue
 */

/**
 * @param {Record<string, any>} endowments
 * @param {Partial<AllPowers>} powers
 * @param {string} script
 */
export const executeScriptGuest = async (endowments, powers, script) => {
  const { tracer, otherEndowments } = endowments;

  const trace = tracer.trace.bind(tracer);

  const globals = harden({
    E,
    trace,
    ...otherEndowments,
  });

  // Evaluate the code in the context of the globals.
  const compartment = new Compartment(globals);
  harden(compartment.globalThis);

  // Ensure that any adversarial execution happens in a new stack
  // If we could validate the script syntax synchronously, we would.
  await null;

  // TODO: we're not validating `script` is valid on its own, unlike the SES
  // shim's makeFunctionConstructor. Without an `AsyncFunction` constructor
  // there is no way to do so, but the evaluation is still safe and sandboxed.
  // This allows a `return` in the source script, no good way around it.
  const fn = compartment.evaluate(`(async function(powers) {${script}})`);

  const resP = fn(powers);
  // discard the "return" value if any
  await resP;
};
harden(executeScriptGuest);

/**
 * @param {Zone} zone
 * @param {VowTools} vowTools
 * @param {AsyncFlowTools} asyncFlowTools
 */
export const prepareExecuteScript = (zone, { watch }, { asyncFlow }) => {
  const executeScriptFlow = asyncFlow(zone, 'ExecuteFlow', executeScriptGuest, {
    enableEventualSend: true,
  });

  /**
   * @param {ExecuteScriptHelper} walletHelper
   * @param {string} executionId
   * @param {ScriptExecutionStatus} status
   */
  const finalizeExecution = (walletHelper, executionId, status) => {
    const activeFlows = walletHelper.getActiveFlows();
    activeFlows.has(executionId) ||
      Fail`Unknown script execution ${executionId}`;
    activeFlows.delete(executionId);
    walletHelper.updateStatus(executionId, status);
  };

  const executeWatcher = zone.exo('ExecuteOutcomeWatcher', PromiseWatcherI, {
    onFulfilled(_, walletHelper, executionId) {
      finalizeExecution(walletHelper, executionId, {
        eventType: 'finish',
        success: true,
      });
    },
    onRejected(reason, walletHelper, executionId) {
      let error;

      try {
        error = String(reason);
      } catch (err) {
        try {
          error = `Could not serialize error: ${err}`;
        } catch {
          error = `Could not serialize error`;
        }
      }

      finalizeExecution(walletHelper, executionId, {
        eventType: 'finish',
        success: false,
        error,
      });
    },
  });

  const makeTracer = zone.exoClass(
    'Tracer',
    undefined,
    (executionId, address) => ({ executionId, address, count: 0 }),
    {
      trace(...args) {
        const { state } = this;
        const { executionId, address } = state;
        state.count += 1;
        console.log(
          `wallet`,
          address,
          `script execution`,
          executionId,
          `${state.count}:`,
          ...args,
        );
      },
    },
  );

  /**
   * @param {ExecuteScriptHelper} walletHelper
   * @param {ExecuteScriptAction} action
   */
  const initiateScriptExecution = (
    walletHelper,
    { jsCode, jsonPermit, executionId },
  ) => {
    const activeFlows = walletHelper.getActiveFlows();

    !activeFlows.has(executionId) ||
      Fail`Wallet already has active script execution for id ${executionId}`;

    let permit;
    try {
      permit = JSON.parse(jsonPermit);
    } catch (err) {
      Fail`Invalid permit ${jsonPermit} for script execution ${executionId}: ${err}`;
    }

    const powers = walletHelper.providePowers(permit);

    const endowments = {
      tracer: makeTracer(executionId, powers.address),
    };

    // executeScriptFlow will not execute user script synchronously
    const vow = executeScriptFlow(endowments, powers, jsCode);
    void watch(vow, executeWatcher, walletHelper, executionId);

    activeFlows.init(executionId, vow);

    walletHelper.updateStatus(executionId, {
      eventType: 'start',
      jsCode,
      jsonPermit,
    });
  };

  return initiateScriptExecution;
};
