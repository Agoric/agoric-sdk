import { makeHelpers } from '@agoric/deploy-script-support';

/**
 * @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

/** @type {CoreEvalBuilder} */
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

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('hook-localchain', defaultProposalBuilder);
};
