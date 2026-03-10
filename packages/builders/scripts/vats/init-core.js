import { makeHelpers } from '@agoric/deploy-script-support';
import { interProtocolBundleSpecs } from '@agoric/inter-protocol/source-spec-registry.js';
import { smartWalletSourceSpecRegistry } from '@agoric/smart-wallet/source-spec-registry.js';
import { buildBundlePath } from '../lib/build-bundle.js';

/**
 * @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

/** @type {CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) => {
  const provisionPool = interProtocolBundleSpecs.provisionPool;
  const walletFactory = smartWalletSourceSpecRegistry.walletFactory;
  const provisionPoolPath = await buildBundlePath(
    import.meta.url,
    provisionPool,
  );
  const walletFactoryPath = await buildBundlePath(
    import.meta.url,
    walletFactory,
  );

  return harden({
    sourceSpec: '@agoric/vats/src/core/startWalletFactory.js',
    getManifestCall: [
      'getManifestForWalletFactory',
      {
        installKeys: {
          provisionPool: publishRef(
            install(provisionPool.packagePath, provisionPoolPath),
          ),
          walletFactory: publishRef(
            install(walletFactory.packagePath, walletFactoryPath),
          ),
        },
      },
    ],
  });
};

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('gov-vats', defaultProposalBuilder);
};
