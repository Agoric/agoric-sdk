import { M } from '@endo/patterns';
import {
  prepareGuardedAttenuator,
  makeSyncMethodCallback,
} from '@agoric/internal/src/callback.js';
import { getMethodNames } from '@agoric/internal';
import { orchestrationAccountInvitationMakers } from '../utils/orchestrationAccount.js';

/**
 * @import {MakeAttenuator} from '@agoric/internal/src/callback.js';
 * @import {InvitationMakers} from '@agoric/smart-wallet/src/types.js';
 * @import {Zone} from '@agoric/zone';
 * @import {MethodGuard} from '@endo/patterns';
 * @import {CosmosOrchestrationAccountKit} from './cosmos-orchestration-account.js';
 */

/**
 * XXX parameterize this
 *
 * @typedef {{
 *   Restake: (
 *     validator: import('../cosmos-api.js').CosmosValidatorAddress,
 *     opts: import('../examples/restake.kit.js').RepeaterOpts,
 *   ) => Promise<Invitation>;
 *   CancelRestake: () => Promise<Invitation>;
 * }} NewMethods
 */

/**
 * @param {Zone} zone
 * @param {Record<string, MethodGuard>} methodGuards
 */
export const prepareCombineInvitationMakers = (zone, methodGuards) => {
  const CombinedInterfaceGuard = M.interface('ResolvedContinuingOfferResult', {
    ...orchestrationAccountInvitationMakers,
    ...methodGuards,
  });

  /**
   * @typedef {CosmosOrchestrationAccountKit['invitationMakers']} CosmosOrchAccountInvMakers
   */

  // @type {MakeAttenuator<CosmosOrchAccountInvMakers & NewMethods>}
  // Index signature for type 'string' is missing in type
  const mixin = prepareGuardedAttenuator(zone, CombinedInterfaceGuard, {
    tag: 'ResolvedContinuingOfferResult',
  });

  /**
   * @param {...InvitationMakers} invitationMakers
   */
  const mixinResolvedContinuingOfferResult = (...invitationMakers) => {
    const overrides = {};
    for (const invMakers of invitationMakers) {
      // remove '__getInterfaceGuard__', '__getMethodNames__'
      const names = getMethodNames(invMakers).slice(0, -2);
      for (const key of names) {
        overrides[key] = makeSyncMethodCallback(invMakers, key);
      }
    }
    return mixin({
      overrides,
    });
  };

  return mixinResolvedContinuingOfferResult;
};

/** @typedef {ReturnType<typeof prepareCombineInvitationMakers>} MakeCombineInvitationMakers */
