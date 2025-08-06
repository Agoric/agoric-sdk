/** @file Helper functions for confirming CCTP transactions in tests */

import { E } from '@endo/far';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import type { ZoeService } from '@agoric/zoe';
import type { CaipChainId } from '@agoric/orchestration';

/**
 * Helper to manually confirm a CCTP transaction in tests.
 * This should be called when a test flow includes a CCTP operation
 * (e.g., @noble to @Arbitrum) to resolve the waiting promise.
 *
 * @param zoe - Zoe service instance
 * @param creatorFacet - Portfolio contract creator facet
 * @param txDetails - Transaction details matching the CCTP operation
 * @param remoteAxelarChain - The destination chain for the CCTP operation
 */
export const confirmCCTPTransaction = async (
  zoe: ZoeService,
  creatorFacet: any,
  txDetails: {
    amount: bigint;
    remoteAddress: `0x${string}`;
    status: 'confirmed' | 'failed' | 'pending';
  },
  remoteAxelarChain: CaipChainId,
) => {
  // Wait a bit longer for the CCTP registration to happen
  await eventLoopIteration();
  await eventLoopIteration();

  try {
    console.log('Getting confirmation invitation...');
    const confirmInvitation =
      await E(creatorFacet).makeConfirmCCTPTransactionInvitation();
    console.log('Got invitation, making offer...');

    const confirmationSeat = await E(zoe).offer(
      confirmInvitation,
      {},
      undefined,
      {
        txDetails,
        remoteAxelarChain,
      },
    );

    const result = await E(confirmationSeat).getOfferResult();
    console.log(`CCTP confirmation got result:`, result);
    return result;
  } catch (error) {
    console.warn(
      'CCTP confirmation failed, but transaction may have already completed:',
      error.message,
    );
    // Don't throw - the transaction might have completed another way
    return {
      success: false,
      message: 'Confirmation failed but transaction may have completed',
    };
  }
};

/**
 * Helper to confirm CCTP transaction with the standard test EVM address.
 * Uses the same mock address that's used throughout the test suite.
 * Will retry until a pending transaction is found and confirmed.
 */
export const confirmCCTPWithMockReceiver = async (
  zoe: ZoeService,
  creatorFacet: any,
  amount: bigint,
  remoteAxelarChain: CaipChainId,
  status: 'confirmed' | 'failed' | 'pending' = 'confirmed',
) => {
  // Use the standard mock EVM address from the test suite
  const mockRemoteAddress = '0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092';

  console.log(`\n=== CCTP CONFIRMATION STARTED ===`);
  console.log(
    `Confirming CCTP transaction for ${amount} to ${mockRemoteAddress} on ${remoteAxelarChain}`,
  );
  console.log(`Amount value:`, amount);
  console.log(`Will retry until pending transaction is found...`);

  // Retry up to 5 times with 100ms intervals (500ms total) to fail faster during resolver issues
  for (let attempt = 1; attempt <= 5; attempt++) {
    console.log(`=== CCTP CONFIRMATION ATTEMPT ${attempt} ===`);

    const result = await confirmCCTPTransaction(
      zoe,
      creatorFacet,
      {
        amount,
        remoteAddress: mockRemoteAddress,
        status,
      },
      remoteAxelarChain,
    );

    console.log(`Attempt ${attempt} result:`, result);

    if ((result as any).success) {
      console.log(`=== CCTP CONFIRMATION SUCCEEDED ON ATTEMPT ${attempt} ===`);
      return result;
    }

    // If we didn't find a pending transaction, wait and try again
    if (
      (result as any).message?.includes('No pending CCTP transaction found')
    ) {
      console.log(
        `No pending transaction found on attempt ${attempt}, waiting 100ms...`,
      );
      await new Promise(resolve => setTimeout(resolve, 100));
      continue;
    }

    // If it's some other error, return immediately
    console.log(
      `=== CCTP CONFIRMATION FAILED WITH ERROR ON ATTEMPT ${attempt} ===`,
    );
    return result;
  }

  console.log(`=== CCTP CONFIRMATION FAILED AFTER 5 ATTEMPTS ===`);
  return {
    success: false,
    message: 'Failed to find pending CCTP transaction after 5 attempts',
  };
};
