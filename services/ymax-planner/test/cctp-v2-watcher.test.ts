/** @file CCTPv2 watcher tests - MessageReceived event monitoring */
import test from 'ava';
import { ethers, id, toBeHex, zeroPadValue } from 'ethers';
import type { PendingTx } from '@aglocal/portfolio-contract/src/resolver/types.ts';
import { TxType } from '@aglocal/portfolio-contract/src/resolver/constants.js';
import { createMockPendingTxOpts, mockFetch } from './mocks.ts';
import { handlePendingTx } from '../src/pending-tx-manager.ts';
import { CCTP_DOMAIN } from '../src/watchers/cctp-v2-watcher.ts';

// MessageTransmitterV2 address - same on all EVM chains (CREATE2 deterministic deployment)
// See: https://developers.circle.com/cctp/references/contract-addresses
const MESSAGE_TRANSMITTER_V2_ADDRESS =
  '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64';

// MessageReceived event signature
const MESSAGE_RECEIVED_SIGNATURE = id(
  'MessageReceived(address,uint32,uint64,bytes32,bytes)',
);

/**
 * Encode a BurnMessageV2 messageBody for testing.
 * Format:
 * - version (4 bytes, uint32) at index 0
 * - burnToken (32 bytes) at index 4
 * - mintRecipient (32 bytes) at index 36
 * - amount (32 bytes, uint256) at index 68
 * - messageSender (32 bytes) at index 100
 */
const encodeBurnMessageV2 = ({
  version = 1,
  burnToken,
  mintRecipient,
  amount,
  messageSender,
}: {
  version?: number;
  burnToken: string;
  mintRecipient: string;
  amount: bigint;
  messageSender: string;
}): string => {
  // Pad addresses to 32 bytes
  const burnTokenPadded = zeroPadValue(burnToken, 32);
  const mintRecipientPadded = zeroPadValue(mintRecipient, 32);
  const messageSenderPadded = zeroPadValue(messageSender, 32);

  // Encode as raw bytes (not ABI encoded with length prefix)
  // version (4 bytes) + burnToken (32) + mintRecipient (32) + amount (32) + messageSender (32)
  const versionHex = toBeHex(version, 4);
  const amountHex = zeroPadValue(toBeHex(amount), 32);

  return `0x${versionHex.slice(2)}${burnTokenPadded.slice(2)}${mintRecipientPadded.slice(2)}${amountHex.slice(2)}${messageSenderPadded.slice(2)}`;
};

/**
 * Create a mock MessageReceived log for testing.
 */
const createMockMessageReceivedLog = ({
  sourceDomain,
  amount,
  mintRecipient,
  nonce = 1n,
  caller = '0x0000000000000000000000000000000000000001',
  sender = '0x0000000000000000000000000000000000000002',
  burnToken = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  transactionHash = `0x${'abc'.repeat(21)}123`,
}: {
  sourceDomain: number;
  amount: bigint;
  mintRecipient: string;
  nonce?: bigint;
  caller?: string;
  sender?: string;
  burnToken?: string;
  transactionHash?: string;
}) => {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();

  // Encode BurnMessageV2
  const messageBody = encodeBurnMessageV2({
    burnToken,
    mintRecipient,
    amount,
    messageSender: sender,
  });

  // Encode non-indexed parameters: sourceDomain, nonce, sender, messageBody
  const data = abiCoder.encode(
    ['uint32', 'uint64', 'bytes32', 'bytes'],
    [sourceDomain, nonce, zeroPadValue(sender, 32), messageBody],
  );

  return {
    address: MESSAGE_TRANSMITTER_V2_ADDRESS,
    topics: [
      MESSAGE_RECEIVED_SIGNATURE,
      zeroPadValue(caller, 32), // indexed caller
    ],
    data,
    transactionHash,
    blockNumber: 18500000,
  };
};

test('handlePendingTx processes CCTP_V2 transaction successfully', async t => {
  const opts = createMockPendingTxOpts();
  const txId = 'tx1' as const;
  opts.fetch = mockFetch({ txId });

  const destChain = 'eip155:42161'; // Arbitrum destination
  const srcChain = 'eip155:8453'; // Base source (domain 6)
  const amount = 1_000_000n; // 1 USDC
  const receiver = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const provider = opts.evmProviders[destChain];

  const logMessages: string[] = [];
  const logger = (...args: unknown[]) => logMessages.push(args.join(' '));

  const cctpV2Tx: PendingTx = {
    txId,
    type: TxType.CCTP_V2,
    status: 'pending',
    amount,
    destinationAddress: `${destChain}:${receiver}`,
    sourceAddress: `${srcChain}:0x1234567890123456789012345678901234567890`,
  };

  // Emit MessageReceived event after delay
  setTimeout(() => {
    const mockLog = createMockMessageReceivedLog({
      sourceDomain: CCTP_DOMAIN.Base, // 6
      amount,
      mintRecipient: receiver,
    });

    const filter = {
      address: opts.messageTransmitterV2Address,
      topics: [MESSAGE_RECEIVED_SIGNATURE],
    };

    (provider as any).emit(filter, mockLog);
  }, 50);

  await t.notThrowsAsync(async () => {
    await handlePendingTx(cctpV2Tx, {
      ...opts,
      log: logger,
      timeoutMs: 3000,
    });
  });

  // Verify the transaction was processed
  t.true(
    logMessages.some(msg => msg.includes('CCTPv2 tx resolved')),
    'Should resolve CCTPv2 transaction',
  );
});

test('handlePendingTx rejects CCTP_V2 on source domain mismatch', async t => {
  const opts = createMockPendingTxOpts();
  const txId = 'tx2' as const;
  opts.fetch = mockFetch({ txId });

  const destChain = 'eip155:42161'; // Arbitrum
  const srcChain = 'eip155:8453'; // Base (domain 6)
  const amount = 1_000_000n;
  const receiver = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const provider = opts.evmProviders[destChain];

  const logMessages: string[] = [];
  const logger = (...args: unknown[]) => logMessages.push(args.join(' '));

  const cctpV2Tx: PendingTx = {
    txId,
    type: TxType.CCTP_V2,
    status: 'pending',
    amount,
    destinationAddress: `${destChain}:${receiver}`,
    sourceAddress: `${srcChain}:0x1234567890123456789012345678901234567890`,
  };

  // Emit event with WRONG source domain (Ethereum=0 instead of Base=6)
  setTimeout(() => {
    const mockLog = createMockMessageReceivedLog({
      sourceDomain: CCTP_DOMAIN.Ethereum, // Wrong! Expected Base (6)
      amount,
      mintRecipient: receiver,
    });

    const filter = {
      address: opts.messageTransmitterV2Address,
      topics: [MESSAGE_RECEIVED_SIGNATURE],
    };

    (provider as any).emit(filter, mockLog);
  }, 50);

  await handlePendingTx(cctpV2Tx, {
    ...opts,
    log: logger,
    timeoutMs: 500, // Short timeout for test
  });

  // Should have logged domain mismatch
  t.true(
    logMessages.some(msg => msg.includes('Source domain mismatch')),
    'Should log source domain mismatch',
  );
});

test('handlePendingTx rejects CCTP_V2 on amount mismatch', async t => {
  const opts = createMockPendingTxOpts();
  const txId = 'tx3' as const;
  opts.fetch = mockFetch({ txId });

  const destChain = 'eip155:42161';
  const srcChain = 'eip155:8453';
  const expectedAmount = 1_000_000n;
  const wrongAmount = 500_000n; // Half of expected
  const receiver = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const provider = opts.evmProviders[destChain];

  const logMessages: string[] = [];
  const logger = (...args: unknown[]) => logMessages.push(args.join(' '));

  const cctpV2Tx: PendingTx = {
    txId,
    type: TxType.CCTP_V2,
    status: 'pending',
    amount: expectedAmount,
    destinationAddress: `${destChain}:${receiver}`,
    sourceAddress: `${srcChain}:0x1234567890123456789012345678901234567890`,
  };

  // Emit event with wrong amount
  setTimeout(() => {
    const mockLog = createMockMessageReceivedLog({
      sourceDomain: CCTP_DOMAIN.Base,
      amount: wrongAmount, // Wrong amount!
      mintRecipient: receiver,
    });

    const filter = {
      address: opts.messageTransmitterV2Address,
      topics: [MESSAGE_RECEIVED_SIGNATURE],
    };

    (provider as any).emit(filter, mockLog);
  }, 50);

  await handlePendingTx(cctpV2Tx, {
    ...opts,
    log: logger,
    timeoutMs: 500,
  });

  // Should have logged amount mismatch
  t.true(
    logMessages.some(msg => msg.includes('Amount mismatch')),
    'Should log amount mismatch',
  );
});

test('handlePendingTx rejects CCTP_V2 on recipient mismatch', async t => {
  const opts = createMockPendingTxOpts();
  const txId = 'tx4' as const;
  opts.fetch = mockFetch({ txId });

  const destChain = 'eip155:42161';
  const srcChain = 'eip155:8453';
  const amount = 1_000_000n;
  const expectedReceiver = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const wrongReceiver = '0xDeaDBeefDeAdBeEfDeAdBeEfDeAdBeEfDeAdBeEf'; // Wrong recipient
  const provider = opts.evmProviders[destChain];

  const logMessages: string[] = [];
  const logger = (...args: unknown[]) => logMessages.push(args.join(' '));

  const cctpV2Tx: PendingTx = {
    txId,
    type: TxType.CCTP_V2,
    status: 'pending',
    amount,
    destinationAddress: `${destChain}:${expectedReceiver}`,
    sourceAddress: `${srcChain}:0x1234567890123456789012345678901234567890`,
  };

  // Emit event with wrong recipient
  setTimeout(() => {
    const mockLog = createMockMessageReceivedLog({
      sourceDomain: CCTP_DOMAIN.Base,
      amount,
      mintRecipient: wrongReceiver, // Wrong recipient!
    });

    const filter = {
      address: opts.messageTransmitterV2Address,
      topics: [MESSAGE_RECEIVED_SIGNATURE],
    };

    (provider as any).emit(filter, mockLog);
  }, 50);

  await handlePendingTx(cctpV2Tx, {
    ...opts,
    log: logger,
    timeoutMs: 500,
  });

  // Should have logged recipient mismatch
  t.true(
    logMessages.some(msg => msg.includes('Recipient mismatch')),
    'Should log recipient mismatch',
  );
});

test('CCTP_DOMAIN mapping is correct', t => {
  t.is(CCTP_DOMAIN.Ethereum, 0);
  t.is(CCTP_DOMAIN.Avalanche, 1);
  t.is(CCTP_DOMAIN.Optimism, 2);
  t.is(CCTP_DOMAIN.Arbitrum, 3);
  t.is(CCTP_DOMAIN.Noble, 4);
  t.is(CCTP_DOMAIN.Solana, 5);
  t.is(CCTP_DOMAIN.Base, 6);
});

test('encodeBurnMessageV2 produces correct format', t => {
  const burnToken = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  const mintRecipient = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const amount = 1_000_000n;
  const messageSender = '0x1234567890123456789012345678901234567890';

  const encoded = encodeBurnMessageV2({
    burnToken,
    mintRecipient,
    amount,
    messageSender,
  });

  // Should be 0x + 4 bytes version + 32 bytes each for 4 fields = 132 bytes = 264 hex chars + 2 for 0x
  t.is(
    encoded.length,
    266,
    'Encoded message should be 132 bytes (266 hex chars with 0x)',
  );
  t.true(encoded.startsWith('0x00000001'), 'Should start with version 1');

  // Extract and verify amount (bytes 68-100 = chars 136-200 in hex, plus 2 for 0x prefix)
  const amountHex = encoded.slice(2 + 136, 2 + 200);
  const decodedAmount = BigInt(`0x${amountHex}`);
  t.is(decodedAmount, amount, 'Amount should be correctly encoded');
});
