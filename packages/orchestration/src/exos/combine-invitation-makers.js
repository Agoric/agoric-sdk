import { M } from '@endo/patterns';
import {
  prepareGuardedAttenuator,
  makeSyncMethodCallback,
} from '@agoric/internal/src/callback.js';
import { getMethodNames } from '@agoric/internal';

/**
 * @import {InvitationMakers} from '@agoric/smart-wallet/src/types.js';
 * @import {Zone} from '@agoric/zone';
 */

// TODO use a helper from Endo https://github.com/endojs/endo/issues/2448
/**
 * Takes two or more InvitationMaker exos and combines them into a new one.
 * Combine with `publicTopics` to form a {@link ContinuingOfferResult} that can
 * be returned to a smart-wallet client.
 *
 * Useful for writing your own invitationMakers while preserving
 * platform-provided ones like `Delegate`, `Transfer`, `Send`.
 *
 * @param {Zone} zone
 * @param {import('@endo/patterns').InterfaceGuard[]} interfaceGuards
 */
export const prepareCombineInvitationMakers = (zone, ...interfaceGuards) => {
  const methodGuards = interfaceGuards.map(ig => ig.payload.methodGuards);
  const CombinedInterfaceGuard = M.interface(
    'CombinedInvitationMakers interface',
    Object.assign({}, ...methodGuards),
  );

  const mixin = prepareGuardedAttenuator(zone, CombinedInterfaceGuard, {
    tag: 'CombinedInvitationMakers',
  });

  /**
   * @template {InvitationMakers[]} IM
   * @param {IM} invitationMakers
   * @returns {IM[number]}
   */
  const combineInvitationMakers = (...invitationMakers) => {
    const overrides = {};
    for (const invMakers of invitationMakers) {
      // remove '__getInterfaceGuard__', '__getMethodNames__'
      const names = getMethodNames(invMakers).filter(n => !n.startsWith('__'));
      for (const key of names) {
        overrides[key] = makeSyncMethodCallback(invMakers, key);
      }
    }
    return mixin({
      overrides,
    });
  };

  return combineInvitationMakers;
};

/** @typedef {ReturnType<typeof prepareCombineInvitationMakers>} MakeCombineInvitationMakers */
/** @typedef {ReturnType<MakeCombineInvitationMakers>} CombinedInvitationMakers */
