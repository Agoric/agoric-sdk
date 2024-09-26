/* global process */

import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForReplaceCommitteeAndCharter } from '@agoric/inter-protocol/src/proposals/replaceCommitteeAndCharter';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }, opts) => {
  return harden({
    sourceSpec:
      '@agoric/inter-protocol/src/proposals/replaceCommitteeAndCharter.js',
    getManifestCall: [
      getManifestForReplaceCommitteeAndCharter.name,
      {
        ...opts,
        economicCommitteeRef: publishRef(
          install(
            '@agoric/governance/src/committee.js',
            '@agoric/governance/bundles/bundle-committee.js',
          ),
        ),
        economicCharterRef: publishRef(
          install(
            '@agoric/inter-protocol/src/econCommitteeCharter.js',
            '@agoric/inter-protocol/bundles/bundle-econCommitteeCharter.js',
          ),
        ),
      },
    ],
  });
};

export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('replace-committee-and-charter', defaultProposalBuilder);
};
