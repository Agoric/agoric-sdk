/* global process */
// @ts-check
import { makeHelpers } from '@agoric/deploy-script-support';

import { getManifestForAddAssetToVault } from '../src/vaultFactory/addAssetToVault.js';

// Build proposal for sim-chain etc.
export const defaultProposalBuilder = async ({ publishRef, install }) => {
  const { INTERCHAIN_DENOM } = process.env;

  assert(INTERCHAIN_DENOM, 'INTERCHAIN_DENOM is required');

  return harden({
    sourceSpec: '../src/vaultFactory/addAssetToVault.js',
    getManifestCall: [
      getManifestForAddAssetToVault.name,
      {
        denom: INTERCHAIN_DENOM,
        scaledPriceAuthorityRef: publishRef(
          install(
            '@agoric/zoe/src/contracts/scaledPriceAuthority.js',
            '../bundles/bundle-scaledPriceAuthority.js',
            { persist: true },
          ),
        ),
      },
    ],
  });
};

export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('gov-add-collateral', defaultProposalBuilder);
};
