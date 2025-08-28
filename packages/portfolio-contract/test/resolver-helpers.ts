/** @file Helper functions for resolver operations in tests */

import { E } from '@endo/far';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import type { UserSeat, ZoeService } from '@agoric/zoe';
import type { CaipChainId } from '@agoric/orchestration';
import type { ResolverInvitationMakers } from '../src/resolver/resolver.exo.js';
import type { TxStatus } from '../src/resolver/constants.js';
import type { TransactionKey } from '../src/resolver/types.js';

/**
 * Helper to get resolver makers from a creator facet.
 * Encapsulates the common pattern of making a resolver invitation,
 * offering it to zoe, and getting the resolver makers from the result.
 *
 * @param zoe - Zoe service instance
 * @param creatorFacet - The creator facet that has makeResolverInvitation
 * @returns Promise<ResolverInvitationMakers>
 */
export const getResolverMakers = async (
  zoe: ZoeService,
  creatorFacet: any,
): Promise<ResolverInvitationMakers> => {
  const resolverInvitation = await E(creatorFacet).makeResolverInvitation();
  const resolverSeat = (await E(zoe).offer(resolverInvitation)) as UserSeat<{
    invitationMakers: ResolverInvitationMakers;
  }>;
  return (await E(resolverSeat).getOfferResult()).invitationMakers;
};

/**
 * Helper to manually settle a transaction in tests.
 * This should be called when a test flow includes a transaction operation
 * to resolve the waiting promise.
 *
 * @param zoe - Zoe service instance
 * @param resolverMakers - ResolverInvitationMakers instance
 * @param transactionKey - Unique transaction key
 * @param status - Transaction status
 * @param txNumber - Transaction number for txId
 * @param log - Optional logging function (defaults to console.log, pass () => {} to disable)
 */
export const settleTransaction = async (
  zoe: ZoeService,
  resolverMakers: ResolverInvitationMakers,
  transactionKey: TransactionKey,
  status: Exclude<TxStatus, 'pending'>,
  txNumber: number = 0,
  log: (message: string, ...args: any[]) => void = console.log,
): Promise<string> => {
  await eventLoopIteration();
  await eventLoopIteration(); // XXX for some reason we need two iterations here to pass the tests

  log('Creating transaction settlement invitation...');
  const settleInvitation = await E(resolverMakers).SettleTransaction();
  log('Got settlement invitation, making offer...');

  const settlementSeat = await E(zoe).offer(settleInvitation, {}, undefined, {
    transactionKey,
    status,
    txId: `tx${txNumber}`,
  });

  const result = (await E(settlementSeat).getOfferResult()) as string;
  log(`Transaction settlement got result:`, result);
  return result;
};

/**
 * Helper to settle CCTP transaction with the standard test EVM address.
 * Uses the same mock address that's used throughout the test suite.
 * Will retry until a pending transaction is found and settled.
 *
 * @param zoe - Zoe service instance
 * @param resolverMakers - ResolverInvitationMakers instance
 * @param amount - Transaction amount
 * @param remoteAxelarChain - The destination chain
 * @param status - Transaction status to settle
 * @param log - Optional logging function (defaults to console.log, pass () => {} to disable)
 */
export const settleCCTPWithMockReceiver = async (
  zoe: ZoeService,
  resolverMakers: ResolverInvitationMakers,
  amount: bigint,
  remoteAxelarChain: CaipChainId,
  txNumber: number = 0,
  status: Exclude<TxStatus, 'pending'> = 'success',
  log: (message: string, ...args: any[]) => void = console.log,
  mockRemoteAddress: `0x${string}` = '0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092',
): Promise<string> => {
  await eventLoopIteration();
  const transactionKey: TransactionKey = `cctp:${remoteAxelarChain}:${mockRemoteAddress}:${amount}`;
  const result = await settleTransaction(
    zoe,
    resolverMakers,
    transactionKey,
    status,
    txNumber,
    log,
  );

  log(result);
  if (!result.includes('failed')) {
    log(`=== CCTP SETTLEMENT SUCCEEDED ===`);
    return result;
  }
  return 'CCTP transaction settlement failed.';
};
