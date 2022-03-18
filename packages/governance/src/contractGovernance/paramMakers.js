// ts-check

import { ParamTypes } from '../constants.js';

/** @param {bigint} value */
const makeGovernedNat = value => {
  return harden({ type: ParamTypes.NAT, value });
};

/** @param {Amount} value */
const makeGovernedAmount = value => {
  return harden({ type: ParamTypes.AMOUNT, value });
};

/** @param {Ratio} value */
const makeGovernedRatio = value => {
  return harden({ type: ParamTypes.RATIO, value });
};

/** @param {Brand} value */
const makeGovernedBrand = value => {
  return harden({ type: ParamTypes.BRAND, value });
};

const makeGovernedInstance = value => {
  return harden({ type: ParamTypes.INSTANCE, value });
};

const makeGovernedInstallation = value => {
  return harden({ type: ParamTypes.INSTALLATION, value });
};

/** @param {Amount} value */
const makeGovernedInvitation = value => {
  return harden({ type: ParamTypes.INVITATION, value });
};

/** @param {string} value */
const makeGovernedString = value => {
  return harden({ type: ParamTypes.STRING, value });
};

const makeGovernedUnknown = value => {
  return harden({ type: ParamTypes.UNKNOWN, value });
};

harden(makeGovernedAmount);
harden(makeGovernedBrand);
harden(makeGovernedInstallation);
harden(makeGovernedInstance);
harden(makeGovernedInvitation);
harden(makeGovernedNat);
harden(makeGovernedRatio);
harden(makeGovernedString);
harden(makeGovernedUnknown);

// ??? do we still need these?
export {
  makeGovernedAmount,
  makeGovernedBrand,
  makeGovernedInstallation,
  makeGovernedInstance,
  makeGovernedInvitation,
  makeGovernedNat,
  makeGovernedRatio,
  makeGovernedString,
  makeGovernedUnknown,
};
