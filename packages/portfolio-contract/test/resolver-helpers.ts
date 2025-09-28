/** @file Helper functions for resolver operations in tests */

import { E } from '@endo/far';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import type { ZoeService } from '@agoric/zoe';
import type { TxStatus } from '../src/resolver/constants.js';

/**
 * Helper to get resolver makers from a creator facet (original pattern).
 * This is the original behavior - kept for backward compatibility.
 *
 * @param zoe - Zoe service instance
 * @param creatorFacet - The creator facet that has makeResolverInvitation
 * @returns {Promise<any>} Object containing invitationMakers
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
 * Helper to get the new resolver service directly (new pattern).
 * 
 * @param zoe - Zoe service instance
 * @param creatorFacet - The creator facet that has makeResolverServiceInvitation
 * @returns {Promise<any>} Resolver service for direct method calls
 */
export const getResolverServiceDirect = async (
  zoe: ZoeService,
  creatorFacet: any,
): Promise<any> => {
  const resolverServiceInvitation = await E(creatorFacet).makeResolverServiceInvitation();
  const resolverServiceSeat = await E(zoe).offer(resolverServiceInvitation);
  return E(resolverServiceSeat).getOfferResult();
};

/**
 * @deprecated Use getResolverService().invitationMakers instead
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
 * Helper to manually settle a transaction using the old invitation makers pattern.
 * This should be called when a test flow includes a transaction operation
 * to resolve the waiting promise.
 *
 * @param zoe - Zoe service instance
 * @param resolverMakers - ResolverInvitationMakers instance  
 * @param txNumber - Transaction number for txId
 * @param status - Transaction status
 * @param rejectionReason - Optional rejection reason for failed transactions
 * @param log - Optional logging function (defaults to console.log, pass () => {} to disable)
 */
export const settleTransaction = async (
  zoe: ZoeService,
  resolverMakers: any,
  txNumber: number = 0,
  status: Exclude<TxStatus, 'pending'> = 'success',
  rejectionReason?: string,
  log: (message: string, ...args: any[]) => void = console.log,
): Promise<string> => {
  await eventLoopIteration();
  await eventLoopIteration(); // XXX for some reason we need two iterations here to pass the tests

  log('Creating transaction settlement invitation...');
  const settleInvitation = await E(resolverMakers).SettleTransaction();
  log('Got settlement invitation, making offer...');

  const settlementSeat = await E(zoe).offer(settleInvitation, {}, undefined, {
    status,
    txId: `tx${txNumber}`,
    ...(rejectionReason && { rejectionReason }),
  });

  const result = (await E(settlementSeat).getOfferResult()) as string;
  log(`Transaction settlement got result:`, result);
  return result;
};

/**
 * Helper to manually settle a transaction using the new direct service pattern.
 * 
 * @param resolverService - Resolver service instance (from getResolverServiceDirect)
 * @param txNumber - Transaction number for txId
 * @param status - Transaction status
 * @param rejectionReason - Optional rejection reason for failed transactions
 * @param log - Optional logging function
 */
export const settleTransactionDirect = async (
  resolverService: any,
  txNumber: number = 0,
  status: Exclude<TxStatus, 'pending'> = 'success',
  rejectionReason?: string,
  log: (message: string, ...args: any[]) => void = console.log,
): Promise<void> => {
  await eventLoopIteration();
  await eventLoopIteration();

  log('Settling transaction directly via service...');

  await E(resolverService).settleTransaction({
    status,
    txId: `tx${txNumber}`,
    ...(rejectionReason && { rejectionReason }),
  });

  log(`Transaction tx${txNumber} settled with status: ${status}`);
};
