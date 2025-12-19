/**
 * @import {HostInterface, HostOf} from '@agoric/async-flow';
 * @import {Vow, VowTools} from '@agoric/vow';
 * @import {Pattern} from '@endo/patterns';
 * @import {ZcfTools} from '../types.js';
 */

import { M, mustMatch } from '@endo/patterns';

const HandlerShape = M.remotable('OfferHandler');

/**
 * ZcfTools methods that are generic currently don't survive the HostInterface
 * type below. So, we manually define their Vow transformation here and supply
 * them as the Overrides type parameter.
 *
 * @typedef {object} GenericZcfToolsOverrides
 * @property {<R, A = undefined>(
 *   offerHandler: OfferHandler<ERef<R>, A>,
 *   description: string,
 *   customDetails?: object,
 *   proposalShape?: Pattern,
 * ) => Vow<Invitation<R, A>>} makeInvitation
 */

/**
 * @param {ZCF} zcf
 * @param {VowTools} vowTools
 * @returns {HostInterface<ZcfTools, GenericZcfToolsOverrides>}
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
