import test from 'ava';
import { id, zeroPadValue, AbiCoder } from 'ethers';
import { createMockPendingTxOpts } from './mocks.ts';
import { handlePendingTx } from '../src/pending-tx-manager.ts';
import { TxType } from '@aglocal/portfolio-contract/src/resolver/constants.js';
import type { PendingTx } from '@aglocal/portfolio-contract/src/resolver/types.ts';
import { SMART_WALLET_CREATED_SIGNATURE } from '../src/watchers/wallet-watcher.ts';

const abiCoder = new AbiCoder();

const factoryAddress = '0x51e589D94b51d01B75442AE1504cD8c50d6127C9';
// address posted on vstorage is in lowercase
const expectedWalletAddr = '0x8cb4b25e77844fc0632aca14f1f9b23bdd654ebf';

const createSmartWalletCreatedLog = (
  walletAddr: string,
  owner: string,
  sourceChain: string,
  sourceAddress: string,
) => {
  const data = abiCoder.encode(
    ['string', 'string', 'string'],
    [owner, sourceChain, sourceAddress],
  );

  return {
    address: factoryAddress,
    topics: [
      SMART_WALLET_CREATED_SIGNATURE,
      zeroPadValue(walletAddr.toLowerCase(), 32),
    ],
    data,
    transactionHash: '0x123abc',
    blockNumber: 18500000,
  };
};

test('handlePendingTx processes MAKE_ACCOUNT transaction successfully', async t => {
  const opts = createMockPendingTxOpts();
  const txId = 'tx1';
  const chain = 'eip155:42161'; // Arbitrum
  const provider = opts.evmProviders[chain];
  const type = TxType.MAKE_ACCOUNT;

  const logMessages: string[] = [];
  const logger = (...args: any[]) => logMessages.push(args.join(' '));

  const makeAccountTx: PendingTx = {
    txId,
    type,
    status: 'pending',
    destinationAddress: `${chain}:${factoryAddress}`,
    expectedAddr: expectedWalletAddr,
  };

  setTimeout(() => {
    const mockLog = createSmartWalletCreatedLog(
      expectedWalletAddr,
      'agoric1owner123',
      'agoric-3',
      'agoric1source456',
    );

    const filter = {
      address: factoryAddress,
      topics: [
        SMART_WALLET_CREATED_SIGNATURE,
        zeroPadValue(expectedWalletAddr, 32),
      ],
    };

    (provider as any).emit(filter, mockLog);
  }, 50);

  await t.notThrowsAsync(async () => {
    await handlePendingTx(
      makeAccountTx,
      {
        ...opts,
        log: logger,
        timeoutMs: 3000,
      },
      undefined,
      new AbortController().signal,
    );
  });

  t.deepEqual(logMessages, [
    `[${txId}] handling ${type} tx`,
    `[${txId}] Watching SmartWalletCreated events emitted by ${factoryAddress}`,
    `[${txId}] SmartWalletCreated event detected: wallet:${expectedWalletAddr}`,
    `[${txId}] ✓ Address matches! Expected: ${expectedWalletAddr}, Found: ${expectedWalletAddr}`,
    `[${txId}] MAKE_ACCOUNT tx resolved`,
  ]);
});

test('handlePendingTx logs timeout on MAKE_ACCOUNT transaction with no matching event', async t => {
  const opts = createMockPendingTxOpts();
  const txId = 'tx2';
  const chain = 'eip155:42161'; // Arbitrum
  const provider = opts.evmProviders[chain];
  const type = TxType.MAKE_ACCOUNT;

  const logMessages: string[] = [];
  const logger = (...args: any[]) => logMessages.push(args.join(' '));

  const makeAccountTx: PendingTx = {
    txId,
    type,
    status: 'pending',
    destinationAddress: `${chain}:${factoryAddress}`,
    expectedAddr: expectedWalletAddr,
  };

  setTimeout(() => {
    const mockLog = createSmartWalletCreatedLog(
      expectedWalletAddr,
      'agoric1owner123',
      'agoric-3',
      'agoric1source456',
    );

    const filter = {
      address: factoryAddress,
      topics: [
        SMART_WALLET_CREATED_SIGNATURE,
        zeroPadValue(expectedWalletAddr, 32),
      ],
    };

    (provider as any).emit(filter, mockLog);
  }, 3010);

  await t.notThrowsAsync(async () => {
    await handlePendingTx(
      makeAccountTx,
      {
        ...opts,
        log: logger,
        timeoutMs: 3000,
      },
      undefined,
      new AbortController().signal,
    );
  });

  t.deepEqual(logMessages, [
    `[${txId}] handling ${type} tx`,
    `[${txId}] Watching SmartWalletCreated events emitted by ${factoryAddress}`,
    `[${txId}] ✗ No matching SmartWalletCreated event found within 0.05 minutes`,
    `[${txId}] SmartWalletCreated event detected: wallet:${expectedWalletAddr}`,
    `[${txId}] ✓ Address matches! Expected: ${expectedWalletAddr}, Found: ${expectedWalletAddr}`,
    `[${txId}] MAKE_ACCOUNT tx resolved`,
  ]);
});

test('handlePendingTx ignores non-matching wallet addresses', async t => {
  const opts = createMockPendingTxOpts();
  const txId = 'tx3';
  const chain = 'eip155:42161'; // Arbitrum
  const provider = opts.evmProviders[chain];
  const type = TxType.MAKE_ACCOUNT;

  // Use a different address - getAddress normalizes it to checksummed format
  const wrongWalletAddrChecksummed =
    '0x742d35cc6635c0532925a3b8d9deb1c9e5eb2b64';

  const logMessages: string[] = [];
  const logger = (...args: any[]) => logMessages.push(args.join(' '));

  const makeAccountTx: PendingTx = {
    txId,
    type,
    status: 'pending',
    destinationAddress: `${chain}:${factoryAddress}`,
    expectedAddr: expectedWalletAddr,
  };

  // Emit wrong address first
  setTimeout(() => {
    const mockLog = createSmartWalletCreatedLog(
      wrongWalletAddrChecksummed,
      'agoric1owner123',
      'agoric-3',
      'agoric1source456',
    );

    const filter = {
      address: factoryAddress,
      topics: [
        SMART_WALLET_CREATED_SIGNATURE,
        zeroPadValue(expectedWalletAddr, 32),
      ],
    };

    (provider as any).emit(filter, mockLog);
  }, 30);

  setTimeout(() => {
    const mockLog = createSmartWalletCreatedLog(
      expectedWalletAddr,
      'agoric1owner123',
      'agoric-3',
      'agoric1source456',
    );

    const filter = {
      address: factoryAddress,
      topics: [
        SMART_WALLET_CREATED_SIGNATURE,
        zeroPadValue(expectedWalletAddr, 32),
      ],
    };

    (provider as any).emit(filter, mockLog);
  }, 60);

  await t.notThrowsAsync(async () => {
    await handlePendingTx(
      makeAccountTx,
      {
        ...opts,
        log: logger,
        timeoutMs: 3000,
      },
      undefined,
      new AbortController().signal,
    );
  });

  t.deepEqual(logMessages, [
    `[${txId}] handling ${type} tx`,
    `[${txId}] Watching SmartWalletCreated events emitted by ${factoryAddress}`,
    `[${txId}] SmartWalletCreated event detected: wallet:${wrongWalletAddrChecksummed}`,
    `[${txId}] Address mismatch. Expected: ${expectedWalletAddr}, Found: ${wrongWalletAddrChecksummed}`,
    `[${txId}] SmartWalletCreated event detected: wallet:${expectedWalletAddr}`,
    `[${txId}] ✓ Address matches! Expected: ${expectedWalletAddr}, Found: ${expectedWalletAddr}`,
    `[${txId}] MAKE_ACCOUNT tx resolved`,
  ]);
});
