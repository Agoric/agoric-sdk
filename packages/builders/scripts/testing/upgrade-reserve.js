import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec: '@agoric/vats/src/proposals/upgrade-reserve-proposal.js',
    getManifestCall: [
      'getManifestForReserveUpgrade',
      {
        contractRef: publishRef(
          install(
            '@agoric/inter-protocol/src/reserve/assetReserve.js',
            '../../inter-protocol/bundles/bundle-reserve.js',
          ),
        ),
      },
    ],
  });

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('upgrade-reserve', defaultProposalBuilder);
};
