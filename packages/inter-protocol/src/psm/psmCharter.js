// @ts-check

import '@agoric/governance/src/exported.js';
import { makeScalarMapStore, M, makeHeapFarInstance, fit } from '@agoric/store';
import '@agoric/zoe/exported.js';
import '@agoric/zoe/src/contracts/exported.js';
import { InstanceHandleShape } from '@agoric/zoe/src/typeGuards.js';
import { BrandShape } from '@agoric/ertp';
import { TimestampShape } from '@agoric/swingset-vat/src/vats/timer/typeGuards.js';
import { E } from '@endo/far';

/**
 * @file
 *
 * This contract makes it possible for those who govern the PSM to call for
 * votes on changes. A more complete implementation would validate parameters,
 * constrain deadlines and possibly split the ability to call for votes into
 * separate capabilities for finer grain encapsulation.
 */

/**
 * @typedef {object} ParamChangesOfferArgs
 * @property {bigint} deadline
 * @property {Instance} instance
 * @property {Record<string, unknown>} params
 * @property {{paramPath: { key: string }}} [path]
 */
const ParamChangesOfferArgsShape = harden(
  M.split(
    {
      deadline: TimestampShape,
      instance: InstanceHandleShape,
      params: M.recordOf(M.string(), M.any()),
    },
    M.partial({
      path: { paramPath: { key: M.string() } },
    }),
  ),
);

/**
 * @param {ZCF<{binaryVoteCounterInstallation:Installation}>} zcf
 */
export const start = async zcf => {
  const { binaryVoteCounterInstallation: counter } = zcf.getTerms();
  /** @type {MapStore<Instance,GovernedContractFacetAccess<{},{}>>} */
  const instanceToGovernor = makeScalarMapStore();

  const makeParamInvitation = () => {
    /**
     * @param {ZCFSeat} seat
     * @param {ParamChangesOfferArgs} args
     */
    const voteOnParamChanges = (seat, args) => {
      fit(args, ParamChangesOfferArgsShape);
      seat.exit();

      const {
        params,
        instance,
        deadline,
        path = { paramPath: { key: 'governedApi' } },
      } = args;
      const psmGovernor = instanceToGovernor.get(instance);
      return E(psmGovernor).voteOnParamChanges(counter, deadline, {
        ...path,
        changes: params,
      });
    };

    return zcf.makeInvitation(voteOnParamChanges, 'vote on param changes');
  };

  const makeOfferFilterInvitation = (instance, strings, deadline) => {
    const voteOnOfferFilterHandler = seat => {
      seat.exit();

      const psmGovernor = instanceToGovernor.get(instance);
      return E(psmGovernor).voteOnOfferFilter(counter, deadline, strings);
    };

    return zcf.makeInvitation(voteOnOfferFilterHandler, 'vote on offer filter');
  };

  const MakerShape = M.interface('PSM Charter InvitationMakers', {
    VoteOnParamChange: M.call().returns(M.promise()),
    VoteOnPauseOffers: M.call(
      InstanceHandleShape,
      M.arrayOf(M.string()),
      TimestampShape,
    ).returns(M.promise()),
  });
  const invitationMakers = makeHeapFarInstance(
    'PSM Invitation Makers',
    MakerShape,
    {
      VoteOnParamChange: makeParamInvitation,
      VoteOnPauseOffers: makeOfferFilterInvitation,
    },
  );

  const charterMemberHandler = seat => {
    seat.exit();
    return harden({ invitationMakers });
  };

  const psmCharterCreatorI = M.interface('PSM Charter creatorFacet', {
    addInstance: M.call(InstanceHandleShape, M.any())
      .optional(BrandShape, BrandShape)
      .returns(),
    makeCharterMemberInvitation: M.call().returns(M.promise()),
  });

  const creatorFacet = makeHeapFarInstance(
    'PSM Charter creatorFacet',
    psmCharterCreatorI,
    {
      /**
       * @param {Instance} psmInstance
       * @param {GovernedContractFacetAccess<{},{}>} psmGovernorFacet
       * @param {Brand} [anchor] for diagnostic use only
       * @param {Brand} [minted] for diagnostic use only
       */
      addInstance: (psmInstance, psmGovernorFacet, anchor, minted) => {
        console.log('psmCharter: adding instance', { minted, anchor });
        instanceToGovernor.init(psmInstance, psmGovernorFacet);
      },
      makeCharterMemberInvitation: () =>
        zcf.makeInvitation(
          charterMemberHandler,
          'PSM charter member invitation',
        ),
    },
  );

  return harden({ creatorFacet });
};

export const INVITATION_MAKERS_DESC = 'PSM charter member invitation';
