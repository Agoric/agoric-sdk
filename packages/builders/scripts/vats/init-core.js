import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
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

export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('gov-vats', defaultProposalBuilder);
};
