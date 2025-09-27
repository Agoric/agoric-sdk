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
 * @returns {Promise<any>} Resolver service instance
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
 * Helper to manually settle a transaction in tests.
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
