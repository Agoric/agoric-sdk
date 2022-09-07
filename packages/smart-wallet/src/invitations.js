// @ts-check
import { AmountMath } from '@agoric/ertp';
import { E } from '@endo/far';

/**
 * Supports three cases
 * 1. source is a contract (in which case this takes an Instance to look up in zoe)
 * 2. the invitation is already in your Zoe "invitation" purse so we need to query it
 *    - use the find/query invitation by kvs thing
 * 3. continuing invitation in which the offer result from a previous invitation had an `invitationMakers` property
 *
 * @typedef {ContractInvitationSpec | PurseInvitationSpec | ContinuingInvitationSpec} InvitationSpec
 */
/**
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
 * @param {Brand<'set'>} invitationBrand
 * @param {Purse<'set'>} invitationsPurse
 * @param {(fromOfferId: number) => import('./types').RemoteInvitationMakers} getInvitationContinuation
 */
export const makeInvitationsHelper = (
  zoe,
  invitationBrand,
  invitationsPurse,
  getInvitationContinuation,
) => {
  // TODO(6062) validate params with patterns
  const invitationGetters = /** @type {const} */ ({
    /** @type {(spec: ContractInvitationSpec) => Promise<Invitation>} */
    contract(spec) {
      const { instance, publicInvitationMaker, invitationArgs = [] } = spec;
      const pf = E(zoe).getPublicFacet(instance);
      return E(pf)[publicInvitationMaker](...invitationArgs);
    },
    /** @type {(spec: PurseInvitationSpec) => Promise<Invitation>} */
    async purse(spec) {
      const { instance, description } = spec;
      assert(instance && description, 'missing instance or description');
      /** @type {Amount<'set'>} */
      const purseAmount = await E(invitationsPurse).getCurrentAmount();
      const match = AmountMath.getValue(invitationBrand, purseAmount).find(
        details =>
          details.description === description && details.instance === instance,
      );
      assert(match, `no matching purse for ${{ instance, description }}`);
      const toWithDraw = AmountMath.make(invitationBrand, harden([match]));
      console.log('.... ', { toWithDraw });

      return E(invitationsPurse).withdraw(toWithDraw);
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
      return E(makers)[invitationMakerName](...invitationArgs);
    },
  });
  /** @type {(spec: InvitationSpec) => ERef<Invitation>} */
  const invitationFromSpec = spec => {
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
