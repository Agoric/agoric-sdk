/**
 * @import {HostInterface} from '@agoric/async-flow';
 * @import {VowTools} from '@agoric/vow';
 * @import {ZcfTools} from '../types.js';
 */

import { M, mustMatch } from '@endo/patterns';

const HandlerShape = M.remotable('OfferHandler');

/**
 * @param {ZCF} zcf
 * @param {VowTools} vowTools
 * @returns {HostInterface<ZcfTools>}
 */
export const makeZcfTools = (zcf, vowTools) =>
  harden({
    makeInvitation(offerHandler, description, customDetails, proposalShape) {
      mustMatch(offerHandler, HandlerShape);
      return vowTools.watch(
        zcf.makeInvitation(
          offerHandler,
          description,
          customDetails,
          proposalShape,
        ),
      );
    },
    atomicRearrange(transfers) {
      zcf.atomicRearrange(transfers);
    },
    assertUniqueKeyword(keyword) {
      zcf.assertUniqueKeyword(keyword);
    },
  });
