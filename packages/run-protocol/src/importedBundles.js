import contractGovernorBundle from '../bundles/bundle-contractGovernor.js';
import committeeBundle from '../bundles/bundle-committee.js';
import noActionElectorateBundle from '../bundles/bundle-noActionElectorate.js';
import binaryVoteCounterBundle from '../bundles/bundle-binaryVoteCounter.js';

import liquidateBundle from '../bundles/bundle-liquidateMinimum.js';
import ammBundle from '../bundles/bundle-amm.js';
import vaultFactoryBundle from '../bundles/bundle-vaultFactory.js';
import centralSupplyBundle from '../bundles/bundle-centralSupply.js';

/** @type { Record<'contractGovernor' | 'committee' | 'noActionElectorate' | 'binaryVoteCounter', { moduleFormat: string }>} */
export const governanceBundles = {
  contractGovernor: contractGovernorBundle,
  committee: committeeBundle,
  noActionElectorate: noActionElectorateBundle,
  binaryVoteCounter: binaryVoteCounterBundle,
};
harden(governanceBundles);

/** @type { Record<'liquidate' | 'amm' | 'VaultFactory' | 'centralSupply', { moduleFormat: string }>} */
export const economyBundles = {
  liquidate: liquidateBundle,
  amm: ammBundle,
  VaultFactory: vaultFactoryBundle,
  centralSupply: centralSupplyBundle,
};
harden(economyBundles);

export { ammBundle };
