/* global process */
// @ts-check
import { makeHelpers } from '@agoric/deploy-script-support';

import { getManifestForAddAssetToVault } from '../src/proposals/addAssetToVault.js';
import { getManifestForPsm } from '../src/proposals/startPSM.js';
import { makeInstallCache } from '../src/proposals/utils.js';

// Build proposal for sim-chain etc.
export const defaultProposalBuilder = async (
  { publishRef, install: install0, wrapInstall },
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

  const install = wrapInstall ? wrapInstall(install0) : install0;

  return harden({
    sourceSpec: '../src/proposals/addAssetToVault.js',
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

export const psmProposalBuilder = async (
  { publishRef, install: install0, wrapInstall },
  { anchorOptions = /** @type {object} */ ({}) } = {},
) => {
  const { denom = process.env.ANCHOR_DENOM, decimalPlaces = 6 } = anchorOptions;

  assert(denom, 'ANCHOR_DENOM is required');

  const install = wrapInstall ? wrapInstall(install0) : install0;

  return harden({
    sourceSpec: '../src/proposals/addAssetToVault.js',
    getManifestCall: [
      getManifestForPsm.name,
      {
        anchorOptions: {
          denom,
          decimalPlaces,
        },
        installKeys: {
          psm: publishRef(
            install('../src/psm/psm.js', '../bundles/bundle-psm.js'),
          ),
          mintHolder: publishRef(
            install(
              '@agoric/vats/src/mintHolder.js',
              '../../vats/bundles/bundle-mintHolder.js',
            ),
          ),
        },
      },
    ],
  });
};

export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);

  const tool = await makeInstallCache(homeP, {
    loadBundle: spec => import(spec),
  });

  await writeCoreProposal('gov-add-collateral', defaultProposalBuilder);
  await writeCoreProposal('gov-start-psm', opts =>
    psmProposalBuilder({ ...opts, wrapInstall: tool.wrapInstall }),
  );
};
