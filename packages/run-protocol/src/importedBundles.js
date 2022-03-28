import contractGovernorBundle from '../bundles/bundle-contractGovernor.js';
import committeeBundle from '../bundles/bundle-committee.js';
import noActionElectorateBundle from '../bundles/bundle-noActionElectorate.js';
import binaryVoteCounterBundle from '../bundles/bundle-binaryVoteCounter.js';

import liquidateBundle from '../bundles/bundle-liquidateMinimum.js';
import ammBundle from '../bundles/bundle-amm.js';
import vaultFactoryBundle from '../bundles/bundle-vaultFactory.js';
import centralSupplyBundle from '../bundles/bundle-centralSupply.js';
import mintHolderBundle from '../bundles/bundle-mintHolder.js';
import reserveBundle from '../bundles/bundle-reserve.js';

export const governanceBundles = {
  contractGovernor: contractGovernorBundle,
  committee: committeeBundle,
  noActionElectorate: noActionElectorateBundle,
  binaryVoteCounter: binaryVoteCounterBundle,
};
harden(governanceBundles);

export const economyBundles = {
  liquidate: liquidateBundle,
  amm: ammBundle,
  VaultFactory: vaultFactoryBundle,
  centralSupply: centralSupplyBundle,
  mintHolder: mintHolderBundle,
};
harden(economyBundles);

export { reserveBundle, ammBundle };
