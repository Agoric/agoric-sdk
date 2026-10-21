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
 *
 * @type {() => Promise<void>}
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
 * `allSteps` should contain only steps that are meaningful interruption
 * boundaries — i.e. that leave durable in-flight state whose recovery across an
 * interrupt is worth asserting. Each step in `allSteps` runs `allSteps.length +
 * 2` times, so the total work is quadratic in the number of steps; keep the
 * list to the genuinely mutating steps. Use `options.setup` for non-mutating
 * fixtures and `options.postcondition` for non-mutating outcome assertions so
 * they don't inflate the boundary count.
 *
 * @template [Input=any]
 * @template [Context=unknown]
 * @param {AvaT<Context>} t
 * @param {readonly TestStep<Input>[]} allSteps
 * @param {(t: AvaT<Context>) => ERef<void>} [doInterrupt]
 * @param {object} [options]
 * @param {(t: AvaT<Context>) => Partial<Input> | PromiseLike<Partial<Input>>} [options.setup]
 *   Produce the initial accumulator at the start of each run. Runs are never
 *   interrupted around setup, so use it for fixtures (e.g. funding a wallet)
 *   that are not themselves part of the interruption-resilience contract. It is
 *   invoked once per run, so it may create per-run state (e.g. a single-use
 *   actor) safely.
 * @param {(t: AvaT<Context>, accum: Partial<Input>, label: string) => ERef<void>} [options.postcondition]
 *   Assert the outcome after each run that completes all of its steps (the
 *   pre-interrupt run, the post-interrupt run, and each resumed run). Use for
 *   non-mutating outcome checks that need not be interruption boundaries.
 */
export const testInterruptedSteps = async (
  t,
  allSteps,
  doInterrupt,
  { setup, postcondition } = {},
) => {
  /**
   * @typedef {{
   *   label: string;
   *   accum: Partial<Input>;
   * }} RunState
   */

  /** @returns {Promise<Partial<Input>>} */
  const freshAccum = async () => (setup ? setup(t) : {});

  /**
   * @param {string} label
   * @param {readonly TestStep<Input>[]} steps
   * @param {RunState} [runState] when omitted, a fresh run is started, seeding
   *   the accumulator from `setup`.
   * @returns {Promise<RunState>}
   */
  const runSteps = async (label, steps, runState) => {
    await null;
    let accum = runState ? runState.accum : await freshAccum();
    const runLabel = runState ? runState.label : label;
    for (const [stepName, fn] of steps) {
      await t.notThrowsAsync(async () => {
        accum = await fn(accum, runLabel);
      }, `${label} ${stepName} must complete successfully`);
    }
    return { label: runLabel, accum };
  };

  /**
   * @param {RunState} runState
   * @returns {Promise<RunState>}
   */
  const complete = async runState => {
    await null;
    if (postcondition) {
      await postcondition(t, runState.accum, runState.label);
    }
    return runState;
  };

  // Sanity check
  await complete(await runSteps('pre-interrupt', allSteps));
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
      { label: `pause-before-${beforeStepName}`, accum: await freshAccum() },
    );
    pausedRuns.push({ runState, remainingSteps: allSteps.slice(i) });
  }

  // Run the user code that interrupts the steps.
  await doInterrupt(t);

  // Verify a complete run post-interrupt.
  await complete(await runSteps('post-interrupt', allSteps));

  // Verify completion of each paused step.
  for (const { runState, remainingSteps } of pausedRuns) {
    const [beforeStepName] = remainingSteps[0];
    await complete(
      await runSteps(`resumed-${beforeStepName}`, remainingSteps, runState),
    );
  }
};
harden(testInterruptedSteps);
