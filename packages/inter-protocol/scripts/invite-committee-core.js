/* global process */
import { makeHelpers } from '@agoric/deploy-script-support';

import { getManifestForInviteCommittee } from '../src/proposals/committee-proposal.js';

// Build proposal for sim-chain etc.
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
    sourceSpec: '../src/proposals/committee-proposal.js',
    getManifestCall: [
      getManifestForInviteCommittee.name,
      {
        voterAddresses,
        econCommitteeCharterRef: publishRef(
          install(
            '../src/econCommitteeCharter.js',
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
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('gov-invite-committee', defaultProposalBuilder);
};
