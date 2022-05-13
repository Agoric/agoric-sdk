/* global process */
// @ts-check
import { makeHelpers } from '@agoric/deploy-script-support';

import { getManifestForAddAssetToVault } from '../src/vaultFactory/addAssetToVault.js';

// Build proposal for sim-chain etc.
export const defaultProposalBuilder = async (
  { publishRef, install },
  options = {},
) => {
  const {
    interchainOracle = 'ATOM',
    interchainDenom = process.env.INTERCHAIN_DENOM,
    interchainDecimals = 6,
    interchainKeyword = 'IbcATOM',
    interchainProposedName = interchainOracle,
  } = options;

  assert(interchainDenom, 'INTERCHAIN_DENOM is required');

  return harden({
    sourceSpec: '../src/vaultFactory/addAssetToVault.js',
    getManifestCall: [
      getManifestForAddAssetToVault.name,
      {
        interchainDenom,
        interchainDecimals,
        interchainKeyword,
        interchainProposedName,
        interchainOracle,
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
