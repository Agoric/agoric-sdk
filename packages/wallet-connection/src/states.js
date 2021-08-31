// @ts-check
import { createMachine, guard, immediate, invoke, reduce as rawReduce, state, transition } from 'robot3';

/**
 * @typedef {Object} Context
 * @property {any?} error
 * @property {string?} location
 */

/**
 * @type {(fn: import('robot3').ReduceFunction<Context, any>) =>
 * import('robot3').Reducer<Context, any>}
 */
const reduce = rawReduce;

const abortable = [
  // Allow the 'reset' transition to start back at the idle state.
  transition('reset', 'idle'),
  // Make the 'error' transition go to the error state.
  transition('error', 'error',
    reduce((ctx, ev) => ({ ...ctx, error: ev.error }))
  ),
];

/**
 * @param {(ctx: Context) => Promise<any>} [backoff]
 */
export const makeMachine = (backoff = undefined) => createMachine({
  idle: state(
    ...abortable,
    transition('locate', 'locating'),
    transition('connect', 'connecting'),
  ),
  locating: state(
    ...abortable,
    immediate('connecting', guard(({ location }) => !!location)),
    transition('located', 'connecting',
      reduce((ctx, ev) => ({ ...ctx, location: ev.href })),
    ),
  ),
  connecting: state(
    ...abortable,
    transition('connected', 'bridged'),
  ),
  bridged: state(
    ...abortable,
  ),
  error: state(
    ...abortable,
    immediate('retry', guard(() => !!backoff)),
  ),
  retry: invoke(backoff,
    ...abortable,
    transition('done', 'locating'),
  ),
}, () => ({ error: null, location: null }));
