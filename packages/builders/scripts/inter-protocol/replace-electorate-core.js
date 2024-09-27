import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForReplaceElectorate } from '@agoric/inter-protocol/src/proposals/replaceElectorate.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }, opts) => {
  return harden({
    sourceSpec: '@agoric/inter-protocol/src/proposals/replaceElectorate.js',
    getManifestCall: [
      getManifestForReplaceElectorate.name,
      {
        ...opts,
        economicCommitteeRef: publishRef(
          install(
            '@agoric/governance/src/committee.js',
            '../bundles/bundle-committee.js',
          ),
        ),
      },
    ],
  });
};

export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('replace-committee', defaultProposalBuilder);
};
