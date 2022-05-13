/* global process */
// @ts-check
import { makeHelpers } from '@agoric/deploy-script-support';

import { getManifestForAddAssetToVault } from '../src/vaultFactory/addAssetToVault.js';

// Build proposal for sim-chain etc.
export const defaultProposalBuilder = async (
  { publishRef, install },
  { interchainAssetOptions = /** @type {object} */ ({}) } = {},
) => {
  const {
    oracleBrand = 'ATOM',
    denom = process.env.INTERCHAIN_DENOM,
    decimalPlaces = 6,
    keyword = 'IbcATOM',
    proposedName = oracleBrand,
  } = interchainAssetOptions;

  assert(denom, 'INTERCHAIN_DENOM is required');

  return harden({
    sourceSpec: '../src/vaultFactory/addAssetToVault.js',
    getManifestCall: [
      getManifestForAddAssetToVault.name,
      {
        interchainAssetOptions: {
          denom,
          decimalPlaces,
          keyword,
          proposedName,
          oracleBrand,
        },
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
