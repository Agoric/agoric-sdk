// @ts-check

/**
 * Constants for Validator state.
 *
 * @type {BondingStatus}
 */
const Status = {
  // validator has eligible tokens but is not currently active. Tokens may
  // be withdrawn without encumbrance
  UNBONDED: 'unbonded',

  // validator is in the active set
  BONDED: 'bonded',

  // validator is no longer bonded, or would like to remove all tokens
  UNBONDING: 'unbonding',

  // validator has unbonded and removed all tokens
  HAS_LEFT: 'has_left',
};

harden(Status);

export { Status };
