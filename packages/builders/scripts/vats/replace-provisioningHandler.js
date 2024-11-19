import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async () =>
    harden({
      sourceSpec: '@agoric/vats/src/proposals/durable-provisioningHandler-proposal.js',
      getManifestCall: [
        'getConvertProvisioningHandlerDurable',
      ],
    });

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
    const { writeCoreProposal } = await makeHelpers(homeP, endowments);
    await writeCoreProposal('replace-provisioningHandler', defaultProposalBuilder);
  };