/** @file Helper functions for resolver operations in tests */

import { E } from '@endo/far';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import type { ZoeService } from '@agoric/zoe';
import type { CaipChainId } from '@agoric/orchestration';
import type {
  CCTPSettlementResult,
  ResolverInvitationMakers,
} from '../src/resolver/types.js';

/**
 * Helper to manually settle a CCTP transaction in tests.
 * This should be called when a test flow includes a CCTP operation
 * (e.g., @noble to @Arbitrum) to resolve the waiting promise.
 *
 * Supports two usage patterns:
 * 1. With resolverMakers (preferred for realistic testing)
 * 2. With creatorFacet (backward compatibility)
 *
 * @param zoe - Zoe service instance
 * @param resolverSource - Either ResolverInvitationMakers or creatorFacet
 * @param txDetails - Transaction details matching the CCTP operation
 * @param remoteAxelarChain - The destination chain for the CCTP operation
 * @param log - Optional logging function (defaults to console.log, pass () => {} to disable)
 */
export const settleCCTPTransaction = async (
  zoe: ZoeService,
  resolverSource: ResolverInvitationMakers | any, // creatorFacet for backward compatibility
  txDetails: {
    amount: bigint;
    remoteAddress: `0x${string}`;
    status: 'confirmed' | 'failed' | 'pending';
  },
  remoteAxelarChain: CaipChainId,
  log: (message: string, ...args: any[]) => void = console.log,
): Promise<CCTPSettlementResult> => {
  await eventLoopIteration();
  await eventLoopIteration(); // XXX for some reason we need two iterations here to pass the tests

  let resolverMakers: ResolverInvitationMakers;

  if ('makeSettleCCTPTransactionInvitation' in resolverSource) {
    resolverMakers = resolverSource;
    log('Using provided resolver makers...');
  } else {
    log('Getting resolver invitation from creator facet...');
    const resolverInvitation = await E(resolverSource).makeResolverInvitation();
    log('Got resolver invitation, making offer...');

    const resolverSeat = await E(zoe).offer(resolverInvitation);
    resolverMakers = (await E(
      resolverSeat,
    ).getOfferResult()) as ResolverInvitationMakers;
    log('Got resolver makers from creator facet...');
  }

  log('Creating CCTP settlement invitation...');
  const settleInvitation =
    await E(resolverMakers).makeSettleCCTPTransactionInvitation();
  log('Got settlement invitation, making offer...');

  const settlementSeat = await E(zoe).offer(settleInvitation, {}, undefined, {
    txDetails,
    remoteAxelarChain,
  });

  const result = (await E(
    settlementSeat,
  ).getOfferResult()) as CCTPSettlementResult;
  log(`CCTP settlement got result:`, result);
  return result;
};

/**
 * Helper to settle CCTP transaction with the standard test EVM address.
 * Uses the same mock address that's used throughout the test suite.
 * Will retry until a pending transaction is found and settled.
 *
 * Supports two usage patterns:
 * 1. With resolverMakers (preferred for realistic testing)
 * 2. With creatorFacet (backward compatibility)
 *
 * @param zoe - Zoe service instance
 * @param resolverSource - Either ResolverInvitationMakers or creatorFacet
 * @param amount - Transaction amount
 * @param remoteAxelarChain - The destination chain
 * @param status - Transaction status to settle
 * @param log - Optional logging function (defaults to console.log, pass () => {} to disable)
 */
export const settleCCTPWithMockReceiver = async (
  zoe: ZoeService,
  resolverSource: ResolverInvitationMakers | any, // creatorFacet for backward compatibility
  amount: bigint,
  remoteAxelarChain: CaipChainId,
  status: 'confirmed' | 'failed' | 'pending' = 'confirmed',
  log: (message: string, ...args: any[]) => void = console.log,
): Promise<CCTPSettlementResult> => {
  // Use the standard mock EVM address from the test suite
  const mockRemoteAddress = '0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092';

  // Retry up to 5 times with 100ms intervals (500ms total) to fail faster during resolver issues
  for (let attempt = 1; attempt <= 5; attempt++) {
    const result = await settleCCTPTransaction(
      zoe,
      resolverSource,
      {
        amount,
        remoteAddress: mockRemoteAddress,
        status,
      },
      remoteAxelarChain,
      log,
    );

    if ((result as any).success) {
      log(`=== CCTP SETTLEMENT SUCCEEDED ON ATTEMPT ${attempt} ===`);
      return result;
    }

    // If we didn't find a pending transaction, wait and try again
    if (
      (result as any).message?.includes('No pending CCTP transaction found')
    ) {
      log(
        `No pending transaction found on attempt ${attempt}, waiting 100ms...`,
      );
      await new Promise(resolve => setTimeout(resolve, 100));
      continue;
    }

    // If it's some other error, return immediately
    log(`=== CCTP SETTLEMENT FAILED WITH ERROR ON ATTEMPT ${attempt} ===`);
    return result;
  }

  log(`=== CCTP SETTLEMENT FAILED AFTER 5 ATTEMPTS ===`);
  return {
    success: false,
    message: 'Failed to find pending CCTP transaction after 5 attempts',
    key: 'unknown',
    txDetails: {
      amount,
      remoteAddress: mockRemoteAddress,
      status,
    },
    remoteAxelarChain,
  };
};
