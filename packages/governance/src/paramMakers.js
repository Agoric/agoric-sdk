// ts-check

import { ParamType } from './paramManager.js';

// It might be cleaner if these returned objects with behavior that included the
// type assertion from paramManager, and other polymorphism, but this is enough
// to get us a much simpler calling style.

const makeGovernedNat = (name, value) => {
  return harden({ name, type: ParamType.NAT, value });
};

const makeGovernedAmount = (name, value) => {
  return harden({ name, type: ParamType.AMOUNT, value });
};

const makeGovernedRatio = (name, value) => {
  return harden({ name, type: ParamType.RATIO, value });
};

const makeGovernedBrand = (name, value) => {
  return harden({ name, type: ParamType.BRAND, value });
};

const makeGovernedInstance = (name, value) => {
  return harden({ name, type: ParamType.INSTANCE, value });
};

const makeGovernedInstallation = (name, value) => {
  return harden({ name, type: ParamType.INSTALLATION, value });
};

const makeGovernedString = (name, value) => {
  return harden({ name, type: ParamType.STRING, value });
};

const makeGovernedUnknown = (name, value) => {
  return harden({ name, type: ParamType.UNKNOWN, value });
};

harden(makeGovernedAmount);
harden(makeGovernedBrand);
harden(makeGovernedInstallation);
harden(makeGovernedInstance);
harden(makeGovernedNat);
harden(makeGovernedRatio);
harden(makeGovernedString);
harden(makeGovernedUnknown);

export {
  makeGovernedAmount,
  makeGovernedBrand,
  makeGovernedInstallation,
  makeGovernedInstance,
  makeGovernedNat,
  makeGovernedRatio,
  makeGovernedString,
  makeGovernedUnknown,
};
