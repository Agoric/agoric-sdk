// ts-check

import { ParamType } from './paramManager.js';

/** @param {bigint} value */
const makeGovernedNat = value => {
  return harden({ type: ParamType.NAT, value });
};

/** @param {Amount} value */
const makeGovernedInvitation = value => {
  return harden({ type: ParamType.INVITATION, value });
};

harden(makeGovernedInvitation);
harden(makeGovernedNat);

// TODO remove this file
export { makeGovernedInvitation, makeGovernedNat };
