import { AmountMath } from '@agoric/ertp';
import { mustMatch } from '@endo/patterns';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { Fail } from '@endo/errors';
import { E } from '@endo/far';
import { shape } from './typeGuards.js';

// A safety limit
const MAX_PIPE_LENGTH = 2;

/** @import {AgoricContractInvitationSpec, ContinuingInvitationSpec, ContractInvitationSpec, InvitationSpec, PurseInvitationSpec} from './types-index.js'; */

/**
 * @typedef {Pick<InvitationDetails, 'description' | 'instance'>} InvitationsPurseQuery
 */

/**
 * @param {ERef<ZoeService>} zoe
 * @param {ERef<import('@agoric/vats').NameHub>} agoricNames
 * @param {Brand<'set'>} invitationBrand
 * @param {Purse<'set', InvitationDetails>} invitationsPurse
 * @param {(fromOfferId: string) => import('./types.js').InvitationMakers} getInvitationContinuation
 */
export const makeInvitationsHelper = (
  zoe,
  agoricNames,
  invitationBrand,
  invitationsPurse,
  getInvitationContinuation,
) => {
  const invitationGetters = /** @type {const} */ ({
    /** @type {(spec: AgoricContractInvitationSpec) => Promise<Invitation>} */
    async agoricContract(spec) {
      mustMatch(spec, shape.AgoricContractInvitationSpec);

      const { instancePath, callPipe } = spec;
      instancePath.length >= 1 || Fail`instancePath path list empy`;
      callPipe.length <= MAX_PIPE_LENGTH ||
        Fail`callPipe longer than MAX_PIPE_LENGTH=${MAX_PIPE_LENGTH}`;
      const instance = E(agoricNames).lookup('instance', ...instancePath);
      let eref = E(zoe).getPublicFacet(instance);
      for (const [methodName, methodArgs = []] of callPipe) {
        eref = E(eref)[methodName](...methodArgs);
      }

      const invitation = await eref;
      mustMatch(invitation, InvitationShape);
      return invitation;
    },
    /** @type {(spec: ContractInvitationSpec) => Promise<Invitation>} */
    contract(spec) {
      mustMatch(spec, shape.ContractInvitationSpec);

      const { instance, publicInvitationMaker, invitationArgs = [] } = spec;
      // @ts-expect-error TODO map marshaled references to within-vat types
      const pf = E(zoe).getPublicFacet(instance);
      return E(pf)[publicInvitationMaker](...invitationArgs);
    },
    /** @type {(spec: PurseInvitationSpec) => Promise<Invitation>} */
    async purse(spec) {
      mustMatch(spec, shape.PurseInvitationSpec);

      const { instance, description } = spec;
      (instance && description) || Fail`missing instance or description`;
      const purseAmount = await E(invitationsPurse).getCurrentAmount();
      const invitations = AmountMath.getValue(invitationBrand, purseAmount);

      const matches = invitations.filter(
        details =>
          description === details.description && instance === details.instance,
      );
      if (matches.length === 0) {
        // look up diagnostic info
        const dCount = invitations.filter(
          details => description === details.description,
        ).length;
        const iCount = invitations.filter(
          details => instance === details.instance,
        ).length;
        assert.fail(
          `no invitation match (${dCount} description and ${iCount} instance)`,
        );
      } else if (matches.length > 1) {
        // TODO? allow further disambiguation
        console.warn('multiple invitation matches, picking the first');
      }

      const match = matches[0];

      const toWithDraw = AmountMath.make(invitationBrand, harden([match]));
      console.log('.... ', { toWithDraw });

      return E(invitationsPurse).withdraw(toWithDraw);
    },
    /** @type {(spec: ContinuingInvitationSpec) => Promise<Invitation>} */
    continuing(spec) {
      mustMatch(spec, shape.ContinuingInvitationSpec);

      const { previousOffer, invitationArgs = [], invitationMakerName } = spec;
      const makers = getInvitationContinuation(String(previousOffer));
      if (!makers) {
        Fail`invalid value stored for previous offer ${previousOffer}`;
      }
      return E(makers)[invitationMakerName](...invitationArgs);
    },
  });
  /** @type {(spec: InvitationSpec) => ERef<Invitation>} */
  const invitationFromSpec = spec => {
    switch (spec.source) {
      case 'agoricContract':
        return invitationGetters.agoricContract(spec);
      case 'contract':
        return invitationGetters.contract(spec);
      case 'purse':
        return invitationGetters.purse(spec);
      case 'continuing':
        return invitationGetters.continuing(spec);
      default:
        throw Error('unrecognize invitation source');
    }
  };
  return invitationFromSpec;
};
harden(makeInvitationsHelper);
