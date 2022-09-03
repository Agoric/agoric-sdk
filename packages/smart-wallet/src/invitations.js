// @ts-check
import { E } from '@endo/far';

/**
 * Supports three cases
 * 1. source is a contract (in which case this takes an Instance to look up in zoe)
 * 2. the invitation is already in your Zoe "invitation" purse so we need to query it
 *    - use the find/query invitation by kvs thing
 * 3. continuing invitation in which the offer result from a previous invitation had an `invitationMakers` property
 *
 * @typedef {ContractInvitationSpec | PurseInvitationSpec | ContinuingInvitationSpec} InvitationSpec
 *
 * @typedef {{
 * source: 'contract',
 * instance: Instance,
 * publicInvitationMaker: string,
 * invitationArgs?: any[],
 * }} ContractInvitationSpec
 * @typedef {{
 * source: 'purse',
 * instance: Instance,
 * description: string,
 * }} PurseInvitationSpec
 * @typedef {{
 * source: 'continuing',
 * previousOffer: number,
 * invitationMakerName: string,
 * invitationArgs?: any[],
 * }} ContinuingInvitationSpec
 */

/**
 * @typedef {Pick<StandardInvitationDetails, 'description' | 'instance'>} InvitationsPurseQuery
 */

/**
 *
 * @param {ERef<ZoeService>} zoe
 * @param {(query: InvitationsPurseQuery) => ERef<Invitation>} findInPurse
 * @param {(fromOfferId: number) => import('./continuing').InvitationMakers} getInvitationContinuation
 */
export const makeInvitationsHelper = (
  zoe,
  findInPurse,
  getInvitationContinuation,
) => {
  // XXX make a helper with an invitation purse query object
  const invitationGetters = /** @type {const} */ ({
    /** @type {(spec: ContractInvitationSpec) => Promise<Invitation>} */
    contract(spec) {
      const { instance, publicInvitationMaker, invitationArgs = [] } = spec;
      const pf = E(zoe).getPublicFacet(instance);
      return E(pf)[publicInvitationMaker](...invitationArgs);
    },
    /** @type {(spec: PurseInvitationSpec) => Promise<Invitation>} */
    purse(spec) {
      // TODO validate
      const { instance, description } = spec;
      console.error({ instance, description });
      const match = findInPurse({ instance, description });
      return Promise.resolve(match);
    },
    /** @type {(spec: ContinuingInvitationSpec) => Promise<Invitation>} */
    continuing(spec) {
      console.log('making continuing invitation', spec);
      const { previousOffer, invitationArgs = [], invitationMakerName } = spec;
      const makers = getInvitationContinuation(previousOffer);
      assert(
        makers,
        `invalid value stored for previous offer ${previousOffer}`,
      );
      const make = makers[invitationMakerName];
      assert(make, `invalid maker name ${invitationMakerName}`);
      return make(...invitationArgs);
    },
  });
  /** @type {(spec: InvitationSpec) => ERef<Invitation>} */
  const invitationFromSpec = spec => {
    // xxx can this type inference be done without switch?
    switch (spec.source) {
      case 'contract':
        return invitationGetters.contract(spec);
      case 'purse':
        return invitationGetters.purse(spec);
      case 'continuing':
        return invitationGetters.continuing(spec);
      default:
        throw new Error('unrecognize invitation source');
    }
  };
  return invitationFromSpec;
};
harden(makeInvitationsHelper);
