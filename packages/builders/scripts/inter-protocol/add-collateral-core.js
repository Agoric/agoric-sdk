/* eslint-env node */
import { makeHelpers } from '@agoric/deploy-script-support';

import { interProtocolBundleSpecs } from '@agoric/inter-protocol/source-spec-registry.js';
import { getManifestForAddAssetToVault } from '@agoric/inter-protocol/src/proposals/addAssetToVault.js';
import { getManifestForPsm } from '@agoric/inter-protocol/src/proposals/startPSM.js';
import { makeInstallCache } from '@agoric/inter-protocol/src/proposals/utils.js';
import { vatsSourceSpecRegistry } from '@agoric/vats/source-spec-registry.js';
import { buildBundlePath } from '../lib/build-bundle.js';

/**
 * @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {InterchainAssetOptions} from '@agoric/inter-protocol/src/proposals/addAssetToVault.js';
 * @import {DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

/** @type {CoreEvalBuilder} */
export const defaultProposalBuilder = async (
  { publishRef, install: install0, wrapInstall },
  {
    debtLimitValue = undefined,
    interestRateValue = undefined,
    interchainAssetOptions = /** @type {object} */ ({}),
  } = {},
  { env = process.env } = {},
) => {
  /** @type {InterchainAssetOptions} */
  const {
    issuerBoardId = env.INTERCHAIN_ISSUER_BOARD_ID,
    denom = env.INTERCHAIN_DENOM,
    keyword = 'ATOM',
    issuerName = keyword,
    oracleBrand = issuerName,
    decimalPlaces = 6,
    proposedName = issuerName,
    initialPrice = undefined,
  } = interchainAssetOptions;

  if (!denom) {
    assert(issuerBoardId, 'INTERCHAIN_ISSUER_BOARD_ID is required');
  }

  const install = wrapInstall ? wrapInstall(install0) : install0;
  const scaledPriceAuthorityPath = await buildBundlePath(
    import.meta.url,
    '@agoric/zoe/src/contracts/scaledPriceAuthority.js',
    'scaledPriceAuthority',
  );

  return harden({
    sourceSpec: '@agoric/inter-protocol/src/proposals/addAssetToVault.js',
    getManifestCall: [
      getManifestForAddAssetToVault.name,
      {
        debtLimitValue: debtLimitValue && BigInt(debtLimitValue),
        interestRateValue: interestRateValue && BigInt(interestRateValue),
        interchainAssetOptions: {
          denom,
          issuerBoardId,
          decimalPlaces,
          initialPrice,
          keyword,
          issuerName,
          proposedName,
          oracleBrand,
        },
        scaledPriceAuthorityRef: publishRef(
          install(
            '@agoric/zoe/src/contracts/scaledPriceAuthority.js',
            scaledPriceAuthorityPath,
            { persist: true },
          ),
        ),
      },
    ],
  });
};

/** @type {CoreEvalBuilder} */
export const psmProposalBuilder = async (
  { publishRef, install: install0, wrapInstall },
  { anchorOptions = /** @type {object} */ ({}) } = {},
  { env = process.env } = {},
) => {
  const { denom = env.ANCHOR_DENOM, decimalPlaces = 6 } = anchorOptions;

  assert(denom, 'ANCHOR_DENOM is required');

  const install = wrapInstall ? wrapInstall(install0) : install0;
  const psm = interProtocolBundleSpecs.psm;
  const mintHolder = vatsSourceSpecRegistry.mintHolder;
  const psmPath = await buildBundlePath(import.meta.url, psm);
  const mintHolderPath = await buildBundlePath(import.meta.url, mintHolder);

  return harden({
    sourceSpec: '@agoric/inter-protocol/src/proposals/startPSM.js',
    getManifestCall: [
      getManifestForPsm.name,
      {
        anchorOptions: {
          ...anchorOptions,
          denom,
          decimalPlaces,
        },
        installKeys: {
          psm: publishRef(install(psm.packagePath, psmPath)),
          mintHolder: publishRef(
            install(mintHolder.packagePath, mintHolderPath),
          ),
        },
      },
    ],
  });
};

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);

  const tool = await makeInstallCache(homeP, {
    loadBundle: spec => import(spec),
  });

  await writeCoreEval('gov-add-collateral', defaultProposalBuilder);
  await writeCoreEval('gov-start-psm', opts =>
    psmProposalBuilder({
      ...opts,
      // @ts-expect-error XXX makeInstallCache types
      wrapInstall: tool.wrapInstall,
    }),
  );
};
