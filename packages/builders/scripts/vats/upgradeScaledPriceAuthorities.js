import { makeHelpers } from '@agoric/deploy-script-support';

/**
 * @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

/** @type {CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec:
      '@agoric/inter-protocol/src/proposals/upgrade-scaledPriceAuthorities.js',
    getManifestCall: [
      'getManifestForUpgradeScaledPriceAuthorities',
      {
        scaledPARef: publishRef(
          install('@agoric/zoe/src/contracts/scaledPriceAuthority.js'),
        ),
      },
    ],
  });

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);

  await writeCoreEval('upgradeScaledPriceAuthorities', defaultProposalBuilder);
};
