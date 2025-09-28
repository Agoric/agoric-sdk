/** @file Helper functions for resolver operations in tests */

import { E } from '@endo/far';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import type { ZoeService } from '@agoric/zoe';
import type { TxStatus } from '../src/resolver/constants.js';

/**
 * Helper to get resolver service from a creator facet.
 * Encapsulates the common pattern of making a resolver invitation,
 * offering it to zoe, and getting the resolver service from the result.
 *
 * @param zoe - Zoe service instance
 * @param creatorFacet - The creator facet that has makeResolverInvitation
 * @returns {Promise<any>} Combined resolver service with both new and deprecated patterns
 */
export const getResolverService = async (
  zoe: ZoeService,
  creatorFacet: any,
): Promise<any> => {
  const resolverInvitation = await E(creatorFacet).makeResolverInvitation();
  const resolverSeat = await E(zoe).offer(resolverInvitation);
  return E(resolverSeat).getOfferResult();
};

/**
 * @deprecated Use getResolverService instead, which provides both patterns
 * Helper to get resolver makers from a creator facet (deprecated pattern).
 * 
 * @param zoe - Zoe service instance
 * @param creatorFacet - The creator facet that has makeResolverInvitation
 * @returns {Promise<any>} Resolver invitation makers
 */
export const getResolverMakers = async (
  zoe: ZoeService,
  creatorFacet: any,
): Promise<any> => {
  const resolverService = await getResolverService(zoe, creatorFacet);
  return resolverService.invitationMakers;
};

/**
 * Helper to manually settle a transaction in tests using direct method call.
 * This should be called when a test flow includes a transaction operation
 * to resolve the waiting promise.
 *
 * @param resolverService - Resolver service instance
 * @param txNumber - Transaction number for txId
 * @param status - Transaction status
 * @param rejectionReason - Optional rejection reason for failed transactions
 * @param log - Optional logging function (defaults to console.log, pass () => {} to disable)
 */
export const settleTransaction = async (
  resolverService: any,
  txNumber: number = 0,
  status: Exclude<TxStatus, 'pending'> = 'success',
  rejectionReason?: string,
  log: (message: string, ...args: any[]) => void = console.log,
): Promise<void> => {
  await eventLoopIteration();
  await eventLoopIteration(); // XXX for some reason we need two iterations here to pass the tests

  log('Settling transaction directly via service...');

  await E(resolverService).settleTransaction({
    status,
    txId: `tx${txNumber}`,
    ...(rejectionReason && { rejectionReason }),
  });

  log(`Transaction tx${txNumber} settled with status: ${status}`);
};

/**
 * @deprecated Use settleTransaction with direct service instead
 * Helper to manually settle a transaction using the deprecated invitation makers pattern.
 * 
 * @param zoe - Zoe service instance
 * @param resolverMakers - ResolverInvitationMakers instance
 * @param txNumber - Transaction number for txId
 * @param status - Transaction status
 * @param log - Optional logging function
 */
export const settleTransactionViaInvitation = async (
  zoe: ZoeService,
  resolverMakers: any,
  txNumber: number = 0,
  status: Exclude<TxStatus, 'pending'> = 'success',
  log: (message: string, ...args: any[]) => void = console.log,
): Promise<string> => {
  await eventLoopIteration();
  await eventLoopIteration();

  log('Creating transaction settlement invitation (deprecated pattern)...');
  const settleInvitation = await E(resolverMakers).SettleTransaction();
  log('Got settlement invitation, making offer...');

  const settlementSeat = await E(zoe).offer(settleInvitation, {}, undefined, {
    status,
    txId: `tx${txNumber}`,
  });

  const result = (await E(settlementSeat).getOfferResult()) as string;
  log(`Transaction settlement got result:`, result);
  return result;
};
