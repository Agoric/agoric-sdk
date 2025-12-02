import { makeHelpers } from '@agoric/deploy-script-support';

/**
 * @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

/** @type {CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec: '@agoric/vats/src/core/startWalletFactory.js',
    getManifestCall: [
      'getManifestForWalletFactory',
      {
        installKeys: {
          provisionPool: publishRef(
            install(
              '@agoric/inter-protocol/src/provisionPool.js',
              '../bundles/bundle-provisionPool.js',
            ),
          ),
          walletFactory: publishRef(
            install(
              '@agoric/smart-wallet/src/walletFactory.js',
              '../../smart-wallet/bundles/bundle-walletFactory.js',
            ),
          ),
        },
      },
    ],
  });

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('gov-vats', defaultProposalBuilder);
};
