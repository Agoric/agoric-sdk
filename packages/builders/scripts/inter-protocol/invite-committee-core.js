/* eslint-env node */
import { makeHelpers } from '@agoric/deploy-script-support';

import { getManifestForInviteCommittee } from '@agoric/inter-protocol/src/proposals/committee-proposal.js';
import { interProtocolBundleSpecs } from '@agoric/inter-protocol/source-spec-registry.js';
import { buildBundlePath } from '../lib/build-bundle.js';

/**
 * @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

// Build proposal for sim-chain etc.
/** @type {CoreEvalBuilder} */
export const defaultProposalBuilder = async (
  { publishRef, install },
  options = {},
) => {
  const {
    ECON_COMMITTEE_ADDRESSES = process.env.ECON_COMMITTEE_ADDRESSES,
    voterAddresses = JSON.parse(ECON_COMMITTEE_ADDRESSES),
  } = options;

  assert(voterAddresses, 'ECON_COMMITTEE_ADDRESSES is required');

  const econCommitteeCharter = interProtocolBundleSpecs.econCommitteeCharter;
  const econCommitteeCharterPath = await buildBundlePath(
    import.meta.url,
    econCommitteeCharter,
  );

  return harden({
    sourceSpec: '@agoric/inter-protocol/src/proposals/committee-proposal.js',
    getManifestCall: [
      getManifestForInviteCommittee.name,
      {
        voterAddresses,
        econCommitteeCharterRef: publishRef(
          install(econCommitteeCharter.packagePath, econCommitteeCharterPath, {
            persist: true,
          }),
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
