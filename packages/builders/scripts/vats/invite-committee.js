import { makeHelpers } from '@agoric/deploy-script-support';

/**
 * @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

/**
 * Invite the economic committee members and stand up the charter through which
 * they govern provisionPool. Formerly
 * `@agoric/builders/scripts/inter-protocol/invite-committee-core.js`; the
 * behavior now lives in `@agoric/vats` and the charter contract in
 * `@agoric/governance`.
 *
 * @type {CoreEvalBuilder}
 */
export const defaultProposalBuilder = async (
  { publishRef, install },
  options = {},
) => {
  const {
    ECON_COMMITTEE_ADDRESSES = process.env.ECON_COMMITTEE_ADDRESSES,
    voterAddresses = ECON_COMMITTEE_ADDRESSES
      ? JSON.parse(ECON_COMMITTEE_ADDRESSES)
      : {},
  } = options;

  return harden({
    sourceSpec: '@agoric/vats/src/proposals/invite-committee.js',
    getManifestCall: [
      'getManifestForInviteCommittee',
      {
        voterAddresses,
        econCommitteeCharterRef: publishRef(
          install('@agoric/governance/src/econCommitteeCharter.js'),
        ),
      },
    ],
  });
};

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('gov-invite-committee', defaultProposalBuilder);
};
