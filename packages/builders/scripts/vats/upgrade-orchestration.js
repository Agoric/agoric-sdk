import { makeHelpers } from '@agoric/deploy-script-support';
import { upgradeVatsProposalBuilder } from './upgrade-vats.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async powers => {
  const bundleRecord = {
    ibc: '@agoric/vats/src/vat-ibc.js',
    network: '@agoric/vats/src/vat-network.js',
    localchain: '@agoric/vats/src/vat-localchain.js',
    transfer: '@agoric/vats/src/vat-transfer.js',
    orchestration: '@agoric/orchestration/src/vat-orchestration.js',
  };

  return upgradeVatsProposalBuilder(powers, bundleRecord);
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('upgrade-orchestration', defaultProposalBuilder);
};
