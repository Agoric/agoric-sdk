/** @file Helper functions for resolver operations in tests */

import { E } from '@endo/far';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import type { UserSeat, ZoeService } from '@agoric/zoe';
import type {
  ResolverInvitationMakers,
  ResolverKit,
} from '../src/resolver/resolver.exo.js';
import type { TxStatus } from '../src/resolver/constants.js';

/**
 * Helper to get a resolver kit from a creator facet's invitation makers.
 * Encapsulates the common pattern of making a resolver invitation,
 * offering it to zoe, and getting the resolver makers from the result.
 *
 * @param creatorFacet - The creator facet that has makeResolverInvitation
 * @param zoe - Zoe service instance
 */
export const getResolverHelperKitForInvitationMakers = async (
  creatorFacet: any,
  zoe: ZoeService,
): Promise<{ zoe: ZoeService; invitationMakers: ResolverInvitationMakers }> => {
  const resolverInvitation = await E(creatorFacet).makeResolverInvitation();
  const resolverSeat = (await E(zoe).offer(resolverInvitation)) as UserSeat<{
    invitationMakers: ResolverInvitationMakers;
  }>;
  const { invitationMakers } = await E(resolverSeat).getOfferResult();
  return { zoe, invitationMakers };
};

/**
 * Helper to get a resolver kit from a creator facet's resolver service.
 *
 * @param creatorFacet - The creator facet that has getResolverService
 * @returns {Promise<ResolverKit['service']>}
 */
export const getResolverHelperKitForInvokeService = async (
  creatorFacet: any,
  _zoe?: ZoeService,
): Promise<{ resolverService: ResolverKit['service'] }> => {
  const resolverService = await E(creatorFacet).getResolverService();
  return { resolverService };
};

export type ResolverHelperKit =
  | Awaited<ReturnType<typeof getResolverHelperKitForInvitationMakers>>
  | Awaited<ReturnType<typeof getResolverHelperKitForInvokeService>>;

/**
 * Helper to manually settle a transaction in tests.
 * This should be called when a test flow includes a transaction operation
 * to resolve the waiting promise.
 *
 * @param helperKit - ResolverHelperKit
 * @param txNumber - Transaction number for txId
 * @param status - Transaction status
 * @param log - Optional logging function (defaults to console.log, pass () => {} to disable)
 */
export const settleTransaction = async (
  helperKit: ResolverHelperKit,
  txNumber: number = 0,
  status: Exclude<TxStatus, 'pending'> = 'success',
  log: (message: string, ...args: any[]) => void = console.log,
): Promise<void> => {
  await eventLoopIteration();
  await eventLoopIteration(); // XXX for some reason we need two iterations here to pass the tests

  if ('resolverService' in helperKit) {
    log('Calling resolver transaction settlement ...');

    await E(helperKit.resolverService).settleTransaction({
      status,
      txId: `tx${txNumber}`,
    });
  } else {
    log('Creating transaction settlement invitation...');
    const settleInvitation = await E(
      helperKit.invitationMakers,
    ).SettleTransaction();
    log('Got settlement invitation, making offer...');

    const settlementSeat = await E(helperKit.zoe).offer(
      settleInvitation,
      {},
      undefined,
      {
        status,
        txId: `tx${txNumber}`,
      },
    );

    const result = (await E(settlementSeat).getOfferResult()) as string;
    log(`Transaction settlement got result:`, result);
  }
};
