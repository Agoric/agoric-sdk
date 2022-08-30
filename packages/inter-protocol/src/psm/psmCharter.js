// @ts-check

import '@agoric/governance/src/exported.js';
import '@agoric/zoe/exported.js';
import '@agoric/zoe/src/contracts/exported.js';

import { E, Far } from '@endo/far';

/**
 * @file
 *
 * This contract makes it possible for those who govern the PSM to call for
 * votes on changes. A more complete implementation would validate parameters,
 * constrain deadlines and possibly split the ability to call for votes into
 * separate capabilities for finer grain encapsulation.
 */

/**
 * @param {ZCF<{binaryVoteCounterInstallation:Installation}>} zcf
 * @param {{psm:GovernedContractFacetAccess<{},{}>}} privateArgs
 */
export const start = async (zcf, privateArgs) => {
  const { binaryVoteCounterInstallation: counter } = zcf.getTerms();
  const { psm } = privateArgs;

  const makeParamInvitaion = () => {
    /**
     * @param {Record<string, unknown>} params
     * @param {bigint} deadline
     * @param {{paramPath: { key: string }}} [path]
     */
    const voteOnParamChanges = (
      params,
      deadline,
      path = { paramPath: { key: 'governedApi' } },
    ) => {
      return E(psm).voteOnParamChanges(counter, deadline, {
        ...path,
        changes: params,
      });
    };

    return zcf.makeInvitation(
      () => Far('param change hook', { voteOnParamChanges }),
      'vote on param changes',
    );
  };

  const makeOfferFilterInvitation = () => {
    /**
     * @param {string[]} strings
     * @param {bigint} deadline
     */
    const voteOnOfferFilter = (strings, deadline) => {
      return E(psm).voteOnOfferFilter(counter, deadline, strings);
    };

    return zcf.makeInvitation(
      () => Far('offer filter hook', { voteOnOfferFilter }),
      'vote on offer filter',
    );
  };

  const invitationMakers = Far('PSM Invitation Makers', {
    VoteOnParamChange: makeParamInvitaion,
    VoteOnPauseOffers: makeOfferFilterInvitation,
  });

  const publicFacet = Far('votingAPI', {
    invitationMakers,
  });

  return harden({ publicFacet });
};
