import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForUpgradingMintHolder } from '@agoric/vats/src/proposals/upgrade-mintHolder-proposal.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }, opts) => {
  const { label } = opts;
  if (!label) {
    const error = `A bankAsset name is required for upgrade mintHolder`;
    console.error(error);
    throw Error(error);
  }

  return harden({
    sourceSpec: '@agoric/vats/src/proposals/upgrade-mintHolder-proposal.js',
    getManifestCall: [
      getManifestForUpgradingMintHolder.name,
      {
        label,
        contractRef: publishRef(install('@agoric/vats/src/mintHolder.js')),
      },
    ],
  });
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { scriptArgs } = endowments;
  const bankAsset = scriptArgs?.[0];
  const opts = { label: bankAsset };

  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval(`upgrade-mintHolder-${bankAsset}`, utils =>
    defaultProposalBuilder(utils, opts),
  );
};
