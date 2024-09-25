/* eslint-env node */
import { makeHelpers } from '@agoric/deploy-script-support';

import { getManifestForInviteCommittee } from '@agoric/inter-protocol/src/proposals/committee-proposal.js';

// Build proposal for sim-chain etc.
/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async (
  { publishRef, install },
  options = {},
) => {
  const {
    ECON_COMMITTEE_ADDRESSES = process.env.ECON_COMMITTEE_ADDRESSES,
    voterAddresses = JSON.parse(ECON_COMMITTEE_ADDRESSES),
  } = options;

  assert(voterAddresses, 'ECON_COMMITTEE_ADDRESSES is required');

  return harden({
    sourceSpec: '@agoric/inter-protocol/src/proposals/committee-proposal.js',
    getManifestCall: [
      getManifestForInviteCommittee.name,
      {
        voterAddresses,
        econCommitteeCharterRef: publishRef(
          install(
            '@agoric/inter-protocol/src/econCommitteeCharter.js',
            '../bundles/bundle-econCommitteeCharter.js',
            {
              persist: true,
            },
          ),
        ),
      },
    ],
  });
};

export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('gov-invite-committee', defaultProposalBuilder);
};
