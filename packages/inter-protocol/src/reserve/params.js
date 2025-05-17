// @jessie-check

import { CONTRACT_ELECTORATE, ParamTypes } from '@agoric/governance';

/**
 * @import {AdminFacet, ContractOf, InvitationAmount, ZCFMint} from '@agoric/zoe';
 */

/**
 * @param {InvitationAmount} poserInvitationAmount
 */
const makeReserveTerms = poserInvitationAmount => ({
  governedParams: harden({
    [CONTRACT_ELECTORATE]: {
      type: ParamTypes.INVITATION,
      value: poserInvitationAmount,
    },
  }),
});

harden(makeReserveTerms);

export { makeReserveTerms };
