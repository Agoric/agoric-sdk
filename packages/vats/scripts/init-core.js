import { makeHelpers } from '@agoric/deploy-script-support';

export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec: '../src/core/startWalletFactory.js',
    getManifestCall: [
      'getManifestForWalletFactory',
      {
        installKeys: {
          provisionPool: publishRef(
            install(
              '../src/provisionPool.js',
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
