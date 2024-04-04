// @ts-check
/**
 * @file Example contract that uses orchestration
 */

import { makeDurableZone } from '@agoric/zone/durable.js';
import { V as E } from '@agoric/vat-data/vow.js';
import { M } from '@endo/patterns';

/**
 * @import * as orchestration from '../types'
 * @import * as vatData from '@agoric/vat-data'
 */

/**
 * @typedef {{
 *  hostConnectionId: orchestration.ConnectionId;
 *  controllerConnectionId: orchestration.ConnectionId;
 * }} StakeAtomTerms
 */

/**
 *
 * @param {ZCF<StakeAtomTerms>} zcf
 * @param {{
 *   orchestration: orchestration.Orchestration;
 * }} privateArgs
 * @param {vatData.Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  const { hostConnectionId, controllerConnectionId } = zcf.getTerms();
  const { orchestration } = privateArgs;

  const zone = makeDurableZone(baggage);

  const publicFacet = zone.exo(
    'StakeAtom',
    M.interface('StakeAtomI', {
      createAccount: M.callWhen().returns(M.remotable('ChainAccount')),
    }),
    {
      async createAccount() {
        return E(orchestration).createAccount(
          hostConnectionId,
          controllerConnectionId,
        );
      },
    },
  );

  return { publicFacet };
};
