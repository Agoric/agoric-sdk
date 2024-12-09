import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForUpgradingMintHolder } from '@agoric/vats/src/proposals/upgrade-mintHolder-proposal.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec: '@agoric/vats/src/proposals/upgrade-mintHolder-proposal.js',
    getManifestCall: [
      getManifestForUpgradingMintHolder.name,
      {
        contractRef: publishRef(install('@agoric/vats/src/mintHolder.js')),
      },
    ],
  });

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('upgrade-mintHolder-atom', defaultProposalBuilder);
};
