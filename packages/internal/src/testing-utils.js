// @ts-check
/**
 * @file note this cannot be called test-utils.js due to
 *   https://github.com/Agoric/agoric-sdk/issues/7503
 */
/* global setImmediate */
/**
 * @import {MapStore} from '@agoric/store';
 * @import {ExecutionContext as AvaT} from 'ava';
 * @import {ERef} from '@endo/eventual-send';
 */

/**
 * A workaround for some issues with fake time in tests.
 *
 * Lines of test code can depend on async promises outside the test resolving
 * before they run. Awaiting this function result ensures that all promises that
 * can do resolve. Note that this doesn't mean all outstanding promises.
 */
export const eventLoopIteration = async () =>
  new Promise(resolve => setImmediate(resolve));
harden(eventLoopIteration);

/** @type {(value: any) => string} */
const stringOrTag = value => {
  if (typeof value === 'string') {
    return value;
  } else if (typeof value === 'object' && Symbol.toStringTag in value) {
    return value[Symbol.toStringTag];
  }
  return String(value);
};
/**
 * @param {MapStore} store
 * @returns {object} tree of the contents of the store
 */
export const inspectMapStore = store => {
  /** @type {Record<string, unknown>} */
  const obj = {};
  for (const key of store.keys()) {
    const value = store.get(key);
    const hasKeys =
      typeof value === 'object' && value != null && 'keys' in value;
    const index = stringOrTag(key);
    if (hasKeys && 'get' in value) {
      obj[index] = inspectMapStore(value);
    } else if (hasKeys) {
      obj[index] = Array.from(value.keys());
    } else {
      obj[index] =
        value instanceof Object && Symbol.toStringTag in value
          ? value[Symbol.toStringTag]
          : value;
    }
  }
  return obj;
};
harden(inspectMapStore);

/**
 * @template [Input=any]
 * @typedef {readonly [
 *   stepName: string,
 *   fn: (input: Partial<Input>, label: string) => Partial<Input> | PromiseLike<Partial<Input>>,
 * ]} TestStep
 */

/**
 * For each step, run to just before that point and pause for continuation after
 * interrupt.
 *
 * @template [Input=any]
 * @template [Context=unknown]
 * @param {AvaT<Context>} t
 * @param {readonly TestStep<Input>[]} allSteps
 * @param {(t: AvaT<Context>) => ERef<void>} [doInterrupt]
 */
export const testInterruptedSteps = async (t, allSteps, doInterrupt) => {
  /**
   * @typedef {{
   *   label: string;
   *   accum: Partial<Input>;
   * }} RunState
   */

  /**
   * @param {string} label
   * @param {readonly TestStep<Input>[]} steps
   * @param {RunState} [runState]
   * @returns {Promise<RunState>}
   */
  const runSteps = async (label, steps, runState = { label, accum: {} }) => {
    await null;
    let accum = runState.accum;
    const runLabel = runState.label;
    for (const [stepName, fn] of steps) {
      await t.notThrowsAsync(async () => {
        accum = await fn(accum, runLabel);
      }, `${label} ${stepName} must complete successfully`);
    }
    return { label: runLabel, accum };
  };

  // Sanity check
  await runSteps('pre-interrupt', allSteps);
  if (!doInterrupt) {
    return;
  }

  /**
   * @type {{
   *   runState: RunState;
   *   remainingSteps: readonly TestStep<Input>[];
   * }[]}
   */
  const pausedRuns = [];
  for (let i = 0; i < allSteps.length; i += 1) {
    const [beforeStepName] = allSteps[i];
    const runState = await runSteps(
      `pre-${beforeStepName}`,
      allSteps.slice(0, i),
      { label: `pause-before-${beforeStepName}`, accum: {} },
    );
    pausedRuns.push({ runState, remainingSteps: allSteps.slice(i) });
  }

  // Run the user code that interrupts the steps.
  await doInterrupt(t);

  // Verify a complete run post-interrupt.
  await runSteps('post-interrupt', allSteps);

  // Verify completion of each paused step.
  for (const { runState, remainingSteps } of pausedRuns) {
    const [beforeStepName] = remainingSteps[0];
    await runSteps(`resumed-${beforeStepName}`, remainingSteps, runState);
  }
};
harden(testInterruptedSteps);
