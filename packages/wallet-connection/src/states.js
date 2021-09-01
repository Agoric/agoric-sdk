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

const common = [
  // Allow the 'reset' event to go back to the 'idle' state.
  transition('reset', 'idle',
    reduce(ctx => ({ ...ctx, error: null })),
  ),
  // Make the 'error' event go to the 'error' state.
  transition('error', 'error',
    reduce((ctx, ev) => ({ ...ctx, error: ev.error }))
  ),
];

/**
 * Create a state machine for the wallet connection.
 */
export const makeConnectionMachine = () => createMachine({
  idle: state(
    ...common,
    transition('locate', 'locating',
      reduce((ctx, ev) => ({ ...ctx, suggestedDappPetname: ev.suggestedDappPetname }))
    ),
    transition('connect', 'connecting'),
  ),
  locating: state(
    ...common,
    immediate('connecting', guard(({ location }) => !!location)),
    transition('located', 'connecting',
      reduce((ctx, ev) => ({ ...ctx, location: ev.href })),
    ),
  ),
  connecting: state(
    ...common,
    transition('connected', 'bridged'),
  ),
  bridged: state(
    ...common,
  ),
  error: state(
    ...common,
  ),
}, () => ({ error: null, location: null, suggestedDappPetname: null }));
