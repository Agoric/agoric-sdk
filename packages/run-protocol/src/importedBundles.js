import contractGovernorBundle from '../bundles/bundle-contractGovernor.js';
import committeeBundle from '../bundles/bundle-committee.js';
import noActionElectorateBundle from '../bundles/bundle-noActionElectorate.js';
import binaryVoteCounterBundle from '../bundles/bundle-binaryVoteCounter.js';

import liquidateBundle from '../bundles/bundle-liquidateMinimum.js';
import ammBundle from '../bundles/bundle-amm.js';
import vaultFactoryBundle from '../bundles/bundle-vaultFactory.js';

/** @type { Record<string, { moduleFormat: string }>} */
export const governanceBundles = {
  contractGovernor: contractGovernorBundle,
  committee: committeeBundle,
  noActionElectorate: noActionElectorateBundle,
  binaryVoteCounter: binaryVoteCounterBundle,
};
harden(governanceBundles);

/** @type { Record<string, { moduleFormat: string }>} */
export const economyBundles = {
  liquidate: liquidateBundle,
  amm: ammBundle,
  VaultFactory: vaultFactoryBundle,
};
harden(economyBundles);

export { ammBundle };
