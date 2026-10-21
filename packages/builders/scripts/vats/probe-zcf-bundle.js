import { makeHelpers } from '@agoric/deploy-script-support';

/**
 * @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

/** @type {CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec: '@agoric/vats/src/proposals/probeZcfBundle.js',
    getManifestCall: [
      'getManifestForProbeZcfBundleCap',
      {
        zoeRef: publishRef(install('@agoric/vats/src/vat-zoe.js')),
        zcfRef: publishRef(install('@agoric/zoe/src/contractFacet/vatRoot.js')),
        walletRef: publishRef(
          install('@agoric/smart-wallet/src/walletFactory.js'),
        ),
      },
    ],
  });

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('probeZcfBundle', defaultProposalBuilder);
};
