// @ts-check

import '@agoric/governance/src/exported.js';
import { makeScalarMapStore } from '@agoric/store';
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
 */
export const start = async zcf => {
  const { binaryVoteCounterInstallation: counter } = zcf.getTerms();
  /** @type {MapStore<Instance,GovernedContractFacetAccess<{},{}>>} */
  const instanceToCreator = makeScalarMapStore();

  /** @param {Instance} instance */
  const makeParamInvitaion = instance => {
    const psm = instanceToCreator.get(instance);
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

  /** @param {Instance} instance */
  const makeOfferFilterInvitation = instance => {
    const psm = instanceToCreator.get(instance);
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

  const charterMemberHandler = seat => {
    seat.exit();
    return invitationMakers;
  };

  const creatorFacet = Far('psm charter creator', {
    /**
     * @param {Instance} psmInstance
     * @param {GovernedContractFacetAccess<{},{}>} psmCreatorFacet
     * @param {Brand} [anchor] for diagnostic use only
     * @param {Brand} [minted] for diagnostic use only
     */
    addInstance: (psmInstance, psmCreatorFacet, anchor, minted) => {
      console.log('psmCharter: adding instance', { minted, anchor });
      instanceToCreator.init(psmInstance, psmCreatorFacet);
    },
    makeCharterMemberInvitation: () =>
      zcf.makeInvitation(charterMemberHandler, 'PSM charter member invitation'),
  });

  return harden({ creatorFacet });
};
