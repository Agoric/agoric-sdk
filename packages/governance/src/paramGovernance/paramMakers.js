// ts-check

import { ParamType } from './paramManager.js';

/** @param {bigint} value */
const makeGovernedNat = value => {
  return harden({ type: ParamType.NAT, value });
};

/** @param {Amount} value */
const makeGovernedAmount = value => {
  return harden({ type: ParamType.AMOUNT, value });
};

/** @param {Ratio} value */
const makeGovernedRatio = value => {
  return harden({ type: ParamType.RATIO, value });
};

/** @param {Brand} value */
const makeGovernedBrand = value => {
  return harden({ type: ParamType.BRAND, value });
};

const makeGovernedInstance = value => {
  return harden({ type: ParamType.INSTANCE, value });
};

const makeGovernedInstallation = value => {
  return harden({ type: ParamType.INSTALLATION, value });
};

/** @param {Amount} value */
const makeGovernedInvitation = value => {
  return harden({ type: ParamType.INVITATION, value });
};

/** @param {string} value */
const makeGovernedString = value => {
  return harden({ type: ParamType.STRING, value });
};

const makeGovernedUnknown = value => {
  return harden({ type: ParamType.UNKNOWN, value });
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
