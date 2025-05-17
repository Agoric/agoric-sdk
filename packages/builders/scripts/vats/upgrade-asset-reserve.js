import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec: '@agoric/vats/src/proposals/upgrade-asset-reserve-proposal.js',
    getManifestCall: [
      'getManifestForUpgradingAssetReserve',
      {
        assetReserveRef: publishRef(
          install('@agoric/inter-protocol/src/reserve/assetReserve.js'),
        ),
      },
    ],
  });

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('upgrade-asset-reserve', defaultProposalBuilder);
};
