import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';

/**
 * A rudimentary state machine. Starts with a list of allowed transitions. Can
 * get or verify the current state, change to an allowed next state (optionally
 * verifying the current state), and verify an allowed transition. The state
 * machine has each of the states as a property so the properties can be used
 * instead of the raw strings.
 *
 * allowedTransitions is an array of arrays which gets turned into a
 * map. The map maps string states to an array of potential next
 * states. For example,
 * const allowedTransitions = [
  ['open', ['closed']],
  ['closed', []],
 * ];
 */
const makeStateMachine = (initialState, allowedTransitionsArray) => {
  let state = initialState;

  const allowedTransitions = new Map(allowedTransitionsArray);
  function makeConstants(map, base = {}) {
    for (const k of map.keys()) {
      base[k] = k;
    }
    return Object.freeze(base);
  }

  const checkCurrentState = candidate =>
    assert.equal(state, candidate, details`expected ${state} === ${candidate}`);
  const result = {
    canTransitionTo: nextState =>
      allowedTransitions.get(state).includes(nextState),
    check: checkCurrentState,
    transitionTo: (nextState, prev = undefined, log = undefined) => {
      if (prev) {
        checkCurrentState(prev);
      }
      assert(allowedTransitions.get(state).includes(nextState));
      if (log) {
        log(`transition from ${state} to ${nextState}`);
      }
      state = nextState;
    },
    getStatus: _ => state,
  };
  return makeConstants(allowedTransitions, result);
};

harden(makeStateMachine);
export { makeStateMachine };
