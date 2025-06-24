import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) => {
  const vatNameToEntrypoint = {
    localchain: '@agoric/vats/src/vat-localchain.js',
    transfer: '@agoric/vats/src/vat-transfer.js',
  };

  return harden({
    sourceSpec: '@agoric/vats/src/proposals/localchain-hook-msg-send.js',
    getManifestCall: [
      'getManifestForMsgSendToTransfer',
      {
        bundleRefs: Object.fromEntries(
          Object.entries(vatNameToEntrypoint).map(
            ([name, entrypoint]) =>
              /** @type {const} */ ([name, publishRef(install(entrypoint))]),
          ),
        ),
      },
    ],
  });
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('hook-localchain', defaultProposalBuilder);
};
