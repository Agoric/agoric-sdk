// @ts-check

import { fulfillToStructure } from '@agoric/marshal';
import { assertRecord, assertArray } from './assertPassStyleOf.js';
import { assertAmounts } from './assertAmounts';

const { details: X } = assert;

/** @type {CoerceDeltas} */
const coerceDeltas = async (isEscrowAccount, hasSeat, deltas) => {
  assertArray(deltas, 'deltas');
  deltas = await fulfillToStructure(deltas);

  // We may want to handle this with static checking instead.
  // Discussion at: https://github.com/Agoric/agoric-sdk/issues/1017
  assert(
    deltas.length >= 2,
    X`Transfer requires two or more deltas, not ${deltas}`,
  );

  const coerceDelta = delta => {
    assertRecord(delta, 'delta');
    const { account, add, subtract } = delta;
    assert(
      isEscrowAccount(account),
      X`${account} was not a valid escrowAccount`,
    );
    assert(
      !hasSeat(account),
      X`assets could not be transferred from ${account} because someone else had the exclusive right to transfer`,
    );
    // TODO: write this function
    assertAmounts(add);
    assertAmounts(subtract);
    return harden({ account, add, subtract });
  };
  deltas = deltas.map(coerceDelta);

  // Keep track of escrowAccounts used, to prevent aliasing.
  const escrowAccountsSoFar = new Set();

  deltas.forEach(({ account }) => {
    assert(
      !escrowAccountsSoFar.has(account),
      X`escrowAccount (${account} was included twice in the transfer`,
    );
    escrowAccountsSoFar.add(account);
  });
};
harden(coerceDeltas);
export { coerceDeltas };
