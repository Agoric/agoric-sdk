/* global process */
// @ts-check
import { makeHelpers } from '@agoric/deploy-script-support';

import { getManifestForInviteCommittee } from '../src/committee-proposal.js';

// Build proposal for sim-chain etc.
export const defaultProposalBuilder = async ({ publishRef, install }) => {
  const { ECON_COMMITTEE_ADDRESSES } = process.env;

  assert(ECON_COMMITTEE_ADDRESSES, 'ECON_COMMITTEE_ADDRESES is required');
  const voterAddresses = JSON.parse(ECON_COMMITTEE_ADDRESSES);

  return harden({
    sourceSpec: '../src/committee-proposal.js',
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
